-- 20260624_password_hardening_phase2.sql
-- Adds first-login enforcement, security-answer storage, and one-time credential delivery links.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users
ADD COLUMN IF NOT EXISTS requires_security_questions_setup BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS user_security_answers (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    question1_hash TEXT NOT NULL,
    question1_salt TEXT NOT NULL,
    question2_hash TEXT NOT NULL,
    question2_salt TEXT NOT NULL,
    question3_hash TEXT NOT NULL,
    question3_salt TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_security_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own security answers" ON user_security_answers;
CREATE POLICY "Users can manage own security answers"
ON user_security_answers FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Service role full access security answers" ON user_security_answers;
CREATE POLICY "Service role full access security answers"
ON user_security_answers FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
CREATE TABLE IF NOT EXISTS credential_delivery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_email TEXT NOT NULL,
    temporary_password TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credential_delivery_tokens_token
ON credential_delivery_tokens(token);
CREATE INDEX IF NOT EXISTS idx_credential_delivery_tokens_expires_at
ON credential_delivery_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_credential_delivery_tokens_consumed_at
ON credential_delivery_tokens(consumed_at);
ALTER TABLE credential_delivery_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access credential tokens" ON credential_delivery_tokens;
CREATE POLICY "Service role full access credential tokens"
ON credential_delivery_tokens FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "No client access credential tokens" ON credential_delivery_tokens;
CREATE POLICY "No client access credential tokens"
ON credential_delivery_tokens FOR ALL
USING (false)
WITH CHECK (false);
