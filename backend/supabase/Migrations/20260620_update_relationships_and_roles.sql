-- 1. Student-Parent Relationship Constraint
ALTER TABLE parent_students DROP CONSTRAINT IF EXISTS parent_students_parent_id_student_id_key;
ALTER TABLE parent_students ADD CONSTRAINT parent_students_student_id_key UNIQUE (student_id);

-- 2. Teaching & Class Assignments Constraints
-- Clean up duplicate class teacher assignments by setting duplicates to NULL (keep one)
WITH duplicate_teachers AS (
    SELECT teacher_id, MIN(id::text)::uuid as keep_class_id
    FROM classes
    WHERE teacher_id IS NOT NULL
    GROUP BY teacher_id
    HAVING COUNT(*) > 1
)
UPDATE classes c
SET teacher_id = NULL
FROM duplicate_teachers dt
WHERE c.teacher_id = dt.teacher_id AND c.id != dt.keep_class_id;

-- Add unique constraint to teacher_id in classes table
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_teacher_id_key;
ALTER TABLE classes ADD CONSTRAINT classes_teacher_id_key UNIQUE (teacher_id);

-- Create the subject_teachers table to allow multiple teachers to be assigned to a single subject
CREATE TABLE IF NOT EXISTS subject_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, teacher_id)
);

-- Enable RLS on subject_teachers
ALTER TABLE subject_teachers ENABLE ROW LEVEL SECURITY;

-- Add strict institution isolation RLS policy for subject_teachers
DROP POLICY IF EXISTS "strict_institution_isolation" ON subject_teachers;
CREATE POLICY "strict_institution_isolation" ON subject_teachers
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- Populate subject_teachers with existing subject assignments
INSERT INTO subject_teachers (subject_id, teacher_id, institution_id)
SELECT id, teacher_id, institution_id
FROM subjects
WHERE teacher_id IS NOT NULL
ON CONFLICT (subject_id, teacher_id) DO NOTHING;

-- 3. Custom Role & Permission Management
-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, institution_id)
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
DROP POLICY IF EXISTS "permissions_read_all" ON permissions;
CREATE POLICY "permissions_read_all" ON permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "strict_institution_isolation" ON roles;
CREATE POLICY "strict_institution_isolation" ON roles FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "strict_institution_isolation" ON role_permissions;
CREATE POLICY "strict_institution_isolation" ON role_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND (r.institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin'))
);

DROP POLICY IF EXISTS "strict_institution_isolation" ON user_roles;
CREATE POLICY "strict_institution_isolation" ON user_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM roles r WHERE r.id = user_roles.role_id AND (r.institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin'))
);

-- Seed default permissions
INSERT INTO permissions (name, description, category) VALUES
    ('attendance:read', 'Can view attendance records', 'Attendance'),
    ('attendance:write', 'Can record and edit attendance records', 'Attendance'),
    ('academic:read', 'Can view academic reports and exam results', 'Academic'),
    ('academic:write', 'Can manage subjects, assignments, exams, and reports', 'Academic'),
    ('finance:read', 'Can view financial transactions and fee structures', 'Finance'),
    ('finance:write', 'Can manage fee structures, payments, payouts, and funds', 'Finance'),
    ('library:read', 'Can view library books and configuration', 'Library'),
    ('library:write', 'Can borrow, return, and manage library catalog', 'Library'),
    ('messages:read', 'Can read and search messages', 'Communication'),
    ('messages:write', 'Can send messages', 'Communication'),
    ('announcements:write', 'Can create announcements', 'Communication'),
    ('users:manage', 'Can view and manage institutional users', 'Users'),
    ('classes:manage', 'Can configure classes and enrollments', 'Classes')
ON CONFLICT (name) DO NOTHING;

-- Seed default roles for all existing institutions
DO $$
DECLARE
    inst RECORD;
    v_role_id UUID;
    v_perm_id UUID;
BEGIN
    FOR inst IN SELECT id FROM institutions LOOP
        -- Admin Role
        INSERT INTO roles (name, description, institution_id)
        VALUES ('Admin', 'Administrator with full operational permissions', inst.id)
        ON CONFLICT (name, institution_id) DO NOTHING;
        
        -- Teacher Role
        INSERT INTO roles (name, description, institution_id)
        VALUES ('Teacher', 'Academic instructor and class manager', inst.id)
        ON CONFLICT (name, institution_id) DO NOTHING;

        -- Student Role
        INSERT INTO roles (name, description, institution_id)
        VALUES ('Student', 'Enrolled learner profile', inst.id)
        ON CONFLICT (name, institution_id) DO NOTHING;

        -- Parent Role
        INSERT INTO roles (name, description, institution_id)
        VALUES ('Parent', 'Parent or guardian profile', inst.id)
        ON CONFLICT (name, institution_id) DO NOTHING;

        -- Bursar Role
        INSERT INTO roles (name, description, institution_id)
        VALUES ('Bursar', 'Financial manager and payment handler', inst.id)
        ON CONFLICT (name, institution_id) DO NOTHING;

        -- Librarian Role
        INSERT INTO roles (name, description, institution_id)
        VALUES ('Librarian', 'Library coordinator and catalog manager', inst.id)
        ON CONFLICT (name, institution_id) DO NOTHING;
    END LOOP;
END $$;

-- Associate default permissions to roles for each institution
DO $$
DECLARE
    r RECORD;
    p RECORD;
BEGIN
    FOR r IN SELECT id, name FROM roles LOOP
        IF r.name = 'Admin' THEN
            FOR p IN SELECT id FROM permissions LOOP
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (r.id, p.id) ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        ELSIF r.name = 'Teacher' THEN
            FOR p IN SELECT id FROM permissions WHERE name IN ('attendance:read', 'attendance:write', 'academic:read', 'academic:write', 'messages:read', 'messages:write', 'announcements:write', 'library:read') LOOP
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (r.id, p.id) ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        ELSIF r.name = 'Student' THEN
            FOR p IN SELECT id FROM permissions WHERE name IN ('academic:read', 'library:read', 'messages:read', 'messages:write') LOOP
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (r.id, p.id) ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        ELSIF r.name = 'Parent' THEN
            FOR p IN SELECT id FROM permissions WHERE name IN ('academic:read', 'messages:read', 'messages:write') LOOP
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (r.id, p.id) ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        ELSIF r.name = 'Bursar' THEN
            FOR p IN SELECT id FROM permissions WHERE name IN ('finance:read', 'finance:write', 'messages:read', 'messages:write') LOOP
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (r.id, p.id) ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        ELSIF r.name = 'Librarian' THEN
            FOR p IN SELECT id FROM permissions WHERE name IN ('library:read', 'library:write', 'messages:read', 'messages:write') LOOP
                INSERT INTO role_permissions (role_id, permission_id)
                VALUES (r.id, p.id) ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Migrate existing user roles into the new user_roles table
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.institution_id = u.institution_id AND LOWER(r.name) = (
    CASE 
        WHEN u.role = 'bursary' THEN 'bursar'
        ELSE u.role
    END
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Trigger to automatically create role-specific profile entries and setup default roles for new users
CREATE OR REPLACE FUNCTION handle_user_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_role_name TEXT;
    v_institution_id UUID;
    v_is_main BOOLEAN := false;
BEGIN
    SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id;
    SELECT institution_id INTO v_institution_id FROM users WHERE id = NEW.user_id;

    IF LOWER(v_role_name) = 'admin' THEN
        IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = NEW.user_id) THEN
            IF NOT EXISTS (SELECT 1 FROM admins WHERE institution_id = v_institution_id) THEN
                v_is_main := true;
            END IF;
            INSERT INTO admins (user_id, institution_id, is_main)
            VALUES (NEW.user_id, v_institution_id, v_is_main)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    ELSIF LOWER(v_role_name) = 'teacher' THEN
        IF NOT EXISTS (SELECT 1 FROM teachers WHERE user_id = NEW.user_id) THEN
            INSERT INTO teachers (user_id, institution_id)
            VALUES (NEW.user_id, v_institution_id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    ELSIF LOWER(v_role_name) = 'student' THEN
        IF NOT EXISTS (SELECT 1 FROM students WHERE user_id = NEW.user_id) THEN
            INSERT INTO students (user_id, institution_id)
            VALUES (NEW.user_id, v_institution_id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    ELSIF LOWER(v_role_name) = 'parent' THEN
        IF NOT EXISTS (SELECT 1 FROM parents WHERE user_id = NEW.user_id) THEN
            INSERT INTO parents (user_id, institution_id)
            VALUES (NEW.user_id, v_institution_id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    ELSIF LOWER(v_role_name) = 'bursar' OR LOWER(v_role_name) = 'bursary' THEN
        IF NOT EXISTS (SELECT 1 FROM bursars WHERE user_id = NEW.user_id) THEN
            INSERT INTO bursars (user_id, institution_id)
            VALUES (NEW.user_id, v_institution_id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_user_role_assignment ON user_roles;
CREATE TRIGGER tr_user_role_assignment
AFTER INSERT ON user_roles
FOR EACH ROW EXECUTE FUNCTION handle_user_role_assignment();
