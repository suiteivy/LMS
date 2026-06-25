-- Direct Messaging Threads (1:1)
-- Adds conversation/thread model, per-user visibility, edit history,
-- and soft-delete metadata while preserving legacy messages compatibility.

-- ---------------------------------------------------------
-- 1) Conversations
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'DIRECT' CHECK (type IN ('DIRECT', 'GROUP')),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    direct_key TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use a non-partial unique index so ON CONFLICT (institution_id, direct_key)
-- can always target this index reliably.
DROP INDEX IF EXISTS idx_conversations_direct_unique;
CREATE UNIQUE INDEX idx_conversations_direct_unique
    ON conversations(institution_id, direct_key);

CREATE INDEX IF NOT EXISTS idx_conversations_institution_last_message
    ON conversations(institution_id, last_message_at DESC);

-- ---------------------------------------------------------
-- 2) Conversation participants
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    last_delivered_at TIMESTAMPTZ,
    last_read_at TIMESTAMPTZ,
    is_typing BOOLEAN DEFAULT false,
    UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_deleted
    ON conversation_participants(user_id, deleted_at);

-- ---------------------------------------------------------
-- 3) Message metadata extensions (legacy-safe)
-- ---------------------------------------------------------
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_for_everyone_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hidden_for_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON messages(conversation_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_conversation_client_request
    ON messages(conversation_id, sender_id, client_request_id)
    WHERE client_request_id IS NOT NULL;

-- ---------------------------------------------------------
-- 4) Message edit history
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_edit_history_message
    ON message_edit_history(message_id);

-- ---------------------------------------------------------
-- 5) updated_at trigger bindings
-- ---------------------------------------------------------
DROP TRIGGER IF EXISTS tr_update_conversations_updated_at ON conversations;
CREATE TRIGGER tr_update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------
-- 6) Backfill: map legacy 1:1 messages into DIRECT conversations
-- ---------------------------------------------------------
WITH legacy_pairs AS (
    SELECT
        LEAST(sender_id::text, receiver_id::text) AS u_min,
        GREATEST(sender_id::text, receiver_id::text) AS u_max,
        sender_id,
        receiver_id,
        institution_id,
        MAX(created_at) AS last_message_at
    FROM messages
    WHERE sender_id IS NOT NULL
      AND receiver_id IS NOT NULL
      AND institution_id IS NOT NULL
    GROUP BY 1, 2, sender_id, receiver_id, institution_id
), collapsed_pairs AS (
    SELECT
        u_min,
        u_max,
        institution_id,
        MAX(last_message_at) AS last_message_at
    FROM legacy_pairs
    GROUP BY 1, 2, 3
), inserted_conversations AS (
    INSERT INTO conversations (type, institution_id, direct_key, last_message_at)
    SELECT
        'DIRECT',
        cp.institution_id,
        (cp.u_min || ':' || cp.u_max) AS direct_key,
        cp.last_message_at
    FROM collapsed_pairs cp
    ON CONFLICT (institution_id, direct_key) DO UPDATE
    SET last_message_at = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at)
    RETURNING id, institution_id, direct_key
)
INSERT INTO conversation_participants (conversation_id, user_id)
SELECT DISTINCT c.id, p.user_id::uuid
FROM (
    SELECT institution_id, (u_min || ':' || u_max) AS direct_key, u_min AS user_id FROM collapsed_pairs
    UNION ALL
    SELECT institution_id, (u_min || ':' || u_max) AS direct_key, u_max AS user_id FROM collapsed_pairs
) p
JOIN conversations c
  ON c.institution_id = p.institution_id
 AND c.direct_key = p.direct_key
ON CONFLICT (conversation_id, user_id) DO NOTHING;

UPDATE messages m
SET conversation_id = c.id
FROM conversations c
WHERE m.conversation_id IS NULL
  AND m.sender_id IS NOT NULL
  AND m.receiver_id IS NOT NULL
  AND m.institution_id = c.institution_id
  AND c.direct_key = (LEAST(m.sender_id::text, m.receiver_id::text) || ':' || GREATEST(m.sender_id::text, m.receiver_id::text));
