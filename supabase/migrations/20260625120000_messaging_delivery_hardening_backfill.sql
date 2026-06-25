-- Backfill/hardening migration for environments that already applied
-- earlier direct-messaging migrations before delivery/idempotency fields existed.

-- 1) Ensure conversations unique index is compatible with ON CONFLICT (institution_id, direct_key)
DO $$
DECLARE
    idx_def text;
BEGIN
    SELECT indexdef
    INTO idx_def
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_conversations_direct_unique';

    IF idx_def IS NOT NULL AND idx_def ILIKE '%WHERE%' THEN
        EXECUTE 'DROP INDEX IF EXISTS public.idx_conversations_direct_unique';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_direct_unique
    ON conversations(institution_id, direct_key);

-- 2) Delivery watermark column for 1:1 message status progression
ALTER TABLE conversation_participants
    ADD COLUMN IF NOT EXISTS last_delivered_at TIMESTAMPTZ;

-- 3) Client idempotency key for optimistic-send reconciliation
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_sender_conversation_client_request
    ON messages(conversation_id, sender_id, client_request_id)
    WHERE client_request_id IS NOT NULL;
