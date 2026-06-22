-- 20260622_create_user_sessions.sql
-- Migration script for active sessions tracking

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    user_agent TEXT,
    device_type TEXT,
    os_name TEXT,
    ip_address TEXT,
    location TEXT,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id)
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_owner_all" ON user_sessions;
CREATE POLICY "user_sessions_owner_all" ON user_sessions
FOR ALL USING (
    user_id = auth.uid()
);
