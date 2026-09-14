-- Migration: Custom Roles data_scope, metadata, and granular permissions
ALTER TABLE public.roles
ADD COLUMN IF NOT EXISTS data_scope TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.roles.data_scope IS 'Scope of accessible data: all (whole school), levels (assigned grade levels), classes (assigned classes)';
COMMENT ON COLUMN public.roles.metadata IS 'Role configuration metadata including assigned level/class IDs and action permissions';

-- Insert additional permissions for custom roles builder
INSERT INTO public.permissions (name, description, category)
VALUES
    ('academic:publish_reports', 'Can publish report cards and release official grades', 'Academic'),
    ('attendance:approve_teacher', 'Can approve self-reported teacher attendance', 'Attendance'),
    ('timetables:read', 'Can view institution and class timetables', 'Timetable'),
    ('timetables:write', 'Can create and edit draft timetables', 'Timetable'),
    ('timetables:publish', 'Can publish and activate official timetables', 'Timetable'),
    ('bursary:read', 'Can view bursary applications and awards', 'Finance'),
    ('bursary:write', 'Can review, approve, and disburse bursaries', 'Finance'),
    ('users:read', 'Can view user directory and profiles', 'Users'),
    ('users:approve_changes', 'Can review and approve student/staff profile change requests', 'Users'),
    ('classes:read', 'Can view classes and student rosters', 'Classes')
ON CONFLICT (name) DO UPDATE 
SET description = EXCLUDED.description, category = EXCLUDED.category;
