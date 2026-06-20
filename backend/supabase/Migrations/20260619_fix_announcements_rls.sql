-- Fix announcements RLS: add explicit WITH CHECK for write operations
-- The existing FOR ALL USING(...) policy may silently block INSERT/UPDATE/DELETE
-- because PostgreSQL requires WITH CHECK for write ops when not explicitly set.

-- Drop the old policy and recreate with both USING and WITH CHECK
DROP POLICY IF EXISTS "strict_institution_isolation" ON announcements;

CREATE POLICY "strict_institution_isolation" ON announcements
FOR ALL
USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

-- Also fix the messages table to ensure consistency
DROP POLICY IF EXISTS "strict_institution_isolation" ON messages;

CREATE POLICY "strict_institution_isolation" ON messages
FOR ALL
USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);
