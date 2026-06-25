-- Add conversation-level expiration for direct chats.
-- Conversations are considered expired after 7 days of inactivity by backend policy.

ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_expires_at
    ON conversations(expires_at);

-- Backfill existing conversations to expire 7 days from their last activity.
UPDATE conversations
SET expires_at = COALESCE(last_message_at, created_at) + INTERVAL '7 days'
WHERE expires_at IS NULL;
