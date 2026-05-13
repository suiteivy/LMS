CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    push_notifications BOOLEAN DEFAULT true,
    submission_alerts BOOLEAN DEFAULT true,
    system_alerts BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    subscription_alerts BOOLEAN DEFAULT true,
    issues_requests_alerts BOOLEAN DEFAULT true,
    support_cases_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strict_institution_isolation" ON user_preferences;
CREATE POLICY "strict_institution_isolation" ON user_preferences FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

-- Add updated_at trigger
DROP TRIGGER IF EXISTS tr_update_updated_at ON user_preferences;
CREATE TRIGGER tr_update_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
