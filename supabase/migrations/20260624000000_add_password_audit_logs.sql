-- 20260624_add_password_audit_logs.sql
-- Adds centralized password/auth recovery audit trail.

CREATE TABLE IF NOT EXISTS password_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL CHECK (
        action IN (
            'change_password',
            'admin_reset_password',
            'forgot_password_request',
            'reset_password'
        )
    ),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_email TEXT,
    outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'requested')),
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_password_audit_logs_created_at ON password_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_audit_logs_actor_user_id ON password_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_password_audit_logs_target_user_id ON password_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_password_audit_logs_target_email ON password_audit_logs(target_email);
ALTER TABLE password_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master admins can view password audit logs" ON password_audit_logs;
CREATE POLICY "Master admins can view password audit logs"
ON password_audit_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM users
        WHERE id = auth.uid()
          AND role = 'master_admin'
    )
);
DROP POLICY IF EXISTS "No direct client writes password audit logs" ON password_audit_logs;
CREATE POLICY "No direct client writes password audit logs"
ON password_audit_logs
FOR ALL
USING (false)
WITH CHECK (false);
