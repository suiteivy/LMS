-- 1. Create user_preferences table
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
-- Add updated_at trigger for user_preferences
DROP TRIGGER IF EXISTS tr_update_updated_at ON user_preferences;
CREATE TRIGGER tr_update_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- 2. Ensure academic_reports RLS policy exists
ALTER TABLE academic_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_reports_isolation" ON academic_reports;
CREATE POLICY "academic_reports_isolation" ON academic_reports
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    AND (
        get_current_user_role() IN ('admin', 'teacher', 'master_admin') 
        OR (status = 'published' AND (
            student_id = current_user_student_id() 
            OR EXISTS (
                SELECT 1 FROM parent_students ps
                JOIN parents p ON ps.parent_id = p.id
                WHERE ps.student_id = academic_reports.student_id 
                AND p.user_id = auth.uid()
            )
        ))
    )
);
-- 3. Ensure v_classes_detailed view is updated with capacity
DROP VIEW IF EXISTS v_classes_detailed;
CREATE VIEW v_classes_detailed AS
 SELECT c.id,
    c.institution_id,
    c.created_at,
    c.updated_at,
    c.teacher_id,
    c.capacity,
    c.grade_level,
    c.form_level,
    c.stream,
    c.display_name,
    i.name AS institution_name,
    sc.name AS school_category_name,
    sc.level_label
   FROM classes c
     JOIN institutions i ON c.institution_id = i.id
     LEFT JOIN school_categories sc ON i.category_id = sc.id;
