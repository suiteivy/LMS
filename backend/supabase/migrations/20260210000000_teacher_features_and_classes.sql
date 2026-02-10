-- Combined Migration: Teacher Features, Classes, and User Role Refactor
-- This script sets up the base tables and then refactors them to use Role-Based IDs.
-- It is designed to be idempotent (safe to re-run).

-- ==========================================
-- PART 1: BASE TABLES & UTILITIES
-- ==========================================

-- Helper for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, 
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Initially UUID, will be refactored
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
DROP TRIGGER IF EXISTS update_classes_modtime ON classes;
CREATE TRIGGER update_classes_modtime BEFORE UPDATE ON classes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Initially UUID
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id)
);

-- Fix enrollments columns if missing (Idempotency)
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
        -- Ensure student_id exists (renaming user_id if needed)
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'student_id') THEN
            IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'user_id') THEN
                ALTER TABLE enrollments RENAME COLUMN user_id TO student_id;
            ELSE
                 ALTER TABLE enrollments ADD COLUMN student_id UUID REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END IF;

        -- Ensure class_id exists
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'class_id') THEN
             ALTER TABLE enrollments ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);

-- 3. Courses Table Modifications
ALTER TABLE courses ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
-- Ensure teacher_id exists (it typically does in courses, but strictly checking)
-- We won't add teacher_id here if it's missing from base schema, assuming it exists.

-- 4. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Initially UUID
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    total_points INTEGER DEFAULT 100,
    status TEXT CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
DROP TRIGGER IF EXISTS update_assignments_modtime ON assignments;
CREATE TRIGGER update_assignments_modtime BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 5. Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Initially UUID
    content TEXT,
    grade NUMERIC,
    feedback TEXT,
    status TEXT CHECK (status IN ('submitted', 'graded', 'late', 'pending')) DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- Fix submissions columns
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'submissions') THEN
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'student_id') THEN
            IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'user_id') THEN
                ALTER TABLE submissions RENAME COLUMN user_id TO student_id;
            ELSE
                 ALTER TABLE submissions ADD COLUMN student_id UUID REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
DROP TRIGGER IF EXISTS update_submissions_modtime ON submissions;
CREATE TRIGGER update_submissions_modtime BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Initially UUID
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, class_id, date)
);

-- Fix attendance columns
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance') THEN
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'student_id') THEN
            IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'user_id') THEN
                ALTER TABLE attendance RENAME COLUMN user_id TO student_id;
            ELSE
                 ALTER TABLE attendance ADD COLUMN student_id UUID REFERENCES users(id) ON DELETE CASCADE;
            END IF;
        END IF;
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'class_id') THEN
             ALTER TABLE attendance ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'date') THEN
             ALTER TABLE attendance ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_student_class ON attendance(student_id, class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);


-- ==========================================
-- PART 2: USER ROLE REFACTORING
-- ==========================================

-- 1. Create ID Generation Sequence/Function
CREATE SEQUENCE IF NOT EXISTS global_id_seq;

CREATE OR REPLACE FUNCTION generate_custom_id(prefix TEXT) RETURNS TEXT AS $$
BEGIN
    RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('global_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. Create Role Tables
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('ADM'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('TEA'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    department TEXT,
    qualification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY DEFAULT generate_custom_id('STU'),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    grade_level TEXT,
    parent_contact TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Migrate Existing Users (Safe Insert)
INSERT INTO admins (user_id) SELECT id FROM users WHERE role = 'admin' ON CONFLICT (user_id) DO NOTHING;
INSERT INTO teachers (user_id) SELECT id FROM users WHERE role = 'teacher' ON CONFLICT (user_id) DO NOTHING;
INSERT INTO students (user_id) SELECT id FROM users WHERE role = 'student' ON CONFLICT (user_id) DO NOTHING;


-- 4. Refactor Foreign Keys in Existing Tables
-- We assume if column 'teacher_id' is UUID, it needs migration.
-- If it is TEXT, it is already migrated.

-- --- CLASSES ---
DO $$
BEGIN
    -- Case 1: Old UUID column exists
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'teacher_id' AND data_type = 'uuid') THEN
        ALTER TABLE classes ADD COLUMN IF NOT EXISTS new_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        UPDATE classes c SET new_teacher_id = t.id FROM teachers t WHERE c.teacher_id = t.user_id;
        ALTER TABLE classes DROP COLUMN teacher_id CASCADE;
        ALTER TABLE classes RENAME COLUMN new_teacher_id TO teacher_id;
        CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
    -- Case 2: Rename failed (new_teacher_id exists)
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'new_teacher_id') THEN
        ALTER TABLE classes RENAME COLUMN new_teacher_id TO teacher_id;
        CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
    -- Case 3: Column missing
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'teacher_id') THEN
        ALTER TABLE classes ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
    END IF;
END $$;

-- --- ENROLLMENTS ---
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'student_id' AND data_type = 'uuid') THEN
        ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS new_student_id TEXT REFERENCES students(id) ON DELETE CASCADE;
        UPDATE enrollments e SET new_student_id = s.id FROM students s WHERE e.student_id = s.user_id;
        DELETE FROM enrollments WHERE new_student_id IS NULL;
        ALTER TABLE enrollments ALTER COLUMN new_student_id SET NOT NULL;
        ALTER TABLE enrollments DROP COLUMN student_id CASCADE;
        ALTER TABLE enrollments RENAME COLUMN new_student_id TO student_id;
        
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_class_id_key;
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_class_unique;
        ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_class_unique UNIQUE(student_id, class_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'new_student_id') THEN
        ALTER TABLE enrollments RENAME COLUMN new_student_id TO student_id;
        ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_class_unique UNIQUE(student_id, class_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollments' AND column_name = 'student_id') THEN
        ALTER TABLE enrollments ADD COLUMN student_id TEXT REFERENCES students(id) ON DELETE CASCADE NOT NULL;
        ALTER TABLE enrollments ADD CONSTRAINT enrollments_student_class_unique UNIQUE(student_id, class_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    END IF;
END $$;

-- --- ASSIGNMENTS ---
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'teacher_id' AND data_type = 'uuid') THEN
        ALTER TABLE assignments ADD COLUMN IF NOT EXISTS new_teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE;
        UPDATE assignments a SET new_teacher_id = t.id FROM teachers t WHERE a.teacher_id = t.user_id;
        DELETE FROM assignments WHERE new_teacher_id IS NULL;
        ALTER TABLE assignments ALTER COLUMN new_teacher_id SET NOT NULL;
        ALTER TABLE assignments DROP COLUMN teacher_id CASCADE;
        ALTER TABLE assignments RENAME COLUMN new_teacher_id TO teacher_id;
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'new_teacher_id') THEN
        ALTER TABLE assignments RENAME COLUMN new_teacher_id TO teacher_id;
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'teacher_id') THEN
        ALTER TABLE assignments ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE;
        -- Assuming NULL allowed if created fresh here to avoid validation error, or empty table
    END IF;
END $$;

-- --- SUBMISSIONS ---
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'student_id' AND data_type = 'uuid') THEN
        ALTER TABLE submissions ADD COLUMN IF NOT EXISTS new_student_id TEXT REFERENCES students(id) ON DELETE CASCADE;
        UPDATE submissions sub SET new_student_id = s.id FROM students s WHERE sub.student_id = s.user_id;
        DELETE FROM submissions WHERE new_student_id IS NULL;
        ALTER TABLE submissions ALTER COLUMN new_student_id SET NOT NULL;
        ALTER TABLE submissions DROP COLUMN student_id CASCADE;
        ALTER TABLE submissions RENAME COLUMN new_student_id TO student_id;

        ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assignment_id_student_id_key;
        ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assignment_student_unique;
        ALTER TABLE submissions ADD CONSTRAINT submissions_assignment_student_unique UNIQUE(assignment_id, student_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'new_student_id') THEN
        ALTER TABLE submissions RENAME COLUMN new_student_id TO student_id;
        ALTER TABLE submissions ADD CONSTRAINT submissions_assignment_student_unique UNIQUE(assignment_id, student_id);
        CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'student_id') THEN
         ALTER TABLE submissions ADD COLUMN student_id TEXT REFERENCES students(id) ON DELETE CASCADE NOT NULL;
         ALTER TABLE submissions ADD CONSTRAINT submissions_assignment_student_unique UNIQUE(assignment_id, student_id);
         CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
    END IF;
END $$;

-- --- ATTENDANCE ---
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'student_id' AND data_type = 'uuid') THEN
        ALTER TABLE attendance ADD COLUMN IF NOT EXISTS new_student_id TEXT REFERENCES students(id) ON DELETE CASCADE;
        UPDATE attendance a SET new_student_id = s.id FROM students s WHERE a.student_id = s.user_id;
        DELETE FROM attendance WHERE new_student_id IS NULL;
        ALTER TABLE attendance ALTER COLUMN new_student_id SET NOT NULL;
        ALTER TABLE attendance DROP COLUMN student_id CASCADE;
        ALTER TABLE attendance RENAME COLUMN new_student_id TO student_id;

        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_id_class_id_date_key;
        ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_student_class_date_unique;
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_class_date_unique UNIQUE(student_id, class_id, date);
        CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'new_student_id') THEN
        ALTER TABLE attendance RENAME COLUMN new_student_id TO student_id;
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_class_date_unique UNIQUE(student_id, class_id, date);
        CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'student_id') THEN
        ALTER TABLE attendance ADD COLUMN student_id TEXT REFERENCES students(id) ON DELETE CASCADE NOT NULL;
        ALTER TABLE attendance ADD CONSTRAINT attendance_student_class_date_unique UNIQUE(student_id, class_id, date);
        CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
    END IF;
END $$;

-- --- COURSES (Refactor) ---
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'teacher_id' AND data_type = 'uuid') THEN
        ALTER TABLE courses ADD COLUMN IF NOT EXISTS new_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        UPDATE courses c SET new_teacher_id = t.id FROM teachers t WHERE c.teacher_id = t.user_id;
        ALTER TABLE courses DROP COLUMN teacher_id CASCADE;
        ALTER TABLE courses RENAME COLUMN new_teacher_id TO teacher_id;
        CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'new_teacher_id') THEN
        ALTER TABLE courses RENAME COLUMN new_teacher_id TO teacher_id;
        CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'teacher_id') THEN
        ALTER TABLE courses ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
    END IF;
END $$;


-- ==========================================
-- PART 3: FINAL TABLES (RESOURCES) & RLS
-- ==========================================

-- Resources Table (Created here to ensure it uses correct Schema if created fresh, or updated)
-- Actually, if we created it in Part 1 with UUID dependencies (on courses), it propagates.
-- But 'resources' only depends on 'courses' (UUID default) and user checks. 
-- Resources itself doesn't have a teacher_id/student_id column, it links to course.
-- So we can define it normally.

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('pdf', 'video', 'link', 'other')) DEFAULT 'other',
    url TEXT NOT NULL,
    size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_course ON resources(course_id);
DROP TRIGGER IF EXISTS update_resources_modtime ON resources;
CREATE TRIGGER update_resources_modtime BEFORE UPDATE ON resources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- Helper Functions for RLS (Safe replacements using New IDs)

-- Helper to get current user's role ID
CREATE OR REPLACE FUNCTION current_user_student_id() RETURNS TEXT AS $$
    SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_teacher_id() RETURNS TEXT AS $$
    SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Check if user is enrolled in class (Takes TEXT student_id)
DROP FUNCTION IF EXISTS is_student_in_class;
CREATE OR REPLACE FUNCTION is_student_in_class(p_class_id UUID, p_student_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM enrollments
    WHERE class_id = p_class_id AND student_id = p_student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is teacher of the course (Takes TEXT teacher_id)
DROP FUNCTION IF EXISTS is_teacher_of_course;
CREATE OR REPLACE FUNCTION is_teacher_of_course(p_course_id UUID, p_teacher_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM courses
    WHERE id = p_course_id AND teacher_id = p_teacher_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Enable RLS everywhere
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;


-- -------------------------
-- POLICIES
-- -------------------------

-- 1. ROLE TABLES
DROP POLICY IF EXISTS "Users view own admin profile" ON admins;
CREATE POLICY "Users view own admin profile" ON admins FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins view all admins" ON admins;
CREATE POLICY "Admins view all admins" ON admins FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users view own teacher profile" ON teachers;
CREATE POLICY "Users view own teacher profile" ON teachers FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins/Teachers view teachers" ON teachers;
CREATE POLICY "Admins/Teachers view teachers" ON teachers FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));
DROP POLICY IF EXISTS "Students view teachers" ON teachers;
CREATE POLICY "Students view teachers" ON teachers FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student'));

DROP POLICY IF EXISTS "Users view own student profile" ON students;
CREATE POLICY "Users view own student profile" ON students FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Teachers/Admins view students" ON students;
CREATE POLICY "Teachers/Admins view students" ON students FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));


-- 2. COURSES
DROP POLICY IF EXISTS "Admins can insert courses" ON courses;
CREATE POLICY "Admins can insert courses" ON courses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Teachers can update own courses" ON courses;
CREATE POLICY "Teachers can update own courses" ON courses FOR UPDATE USING (teacher_id = current_user_teacher_id());

DROP POLICY IF EXISTS "Everyone can view courses" ON courses;
CREATE POLICY "Everyone can view courses" ON courses FOR SELECT USING (true);


-- 3. CLASSES
DROP POLICY IF EXISTS "View classes" ON classes;
CREATE POLICY "View classes" ON classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage classes" ON classes;
CREATE POLICY "Admins manage classes" ON classes FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- 4. ENROLLMENTS
DROP POLICY IF EXISTS "View enrollments" ON enrollments;
CREATE POLICY "View enrollments" ON enrollments FOR SELECT USING (
  student_id = current_user_student_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

DROP POLICY IF EXISTS "Manage enrollments" ON enrollments;
CREATE POLICY "Manage enrollments" ON enrollments FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));


-- 5. ASSIGNMENTS
DROP POLICY IF EXISTS "View assignments" ON assignments;
CREATE POLICY "View assignments" ON assignments FOR SELECT USING (
  teacher_id = current_user_teacher_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  (
    -- Student check
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = assignments.course_id
      AND is_student_in_class(c.class_id, current_user_student_id())
    )
  )
);

DROP POLICY IF EXISTS "Manage assignments" ON assignments;
CREATE POLICY "Manage assignments" ON assignments FOR ALL USING (
  teacher_id = current_user_teacher_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);


-- 6. SUBMISSIONS
DROP POLICY IF EXISTS "View submissions" ON submissions;
CREATE POLICY "View submissions" ON submissions FOR SELECT USING (
  student_id = current_user_student_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
      AND a.teacher_id = current_user_teacher_id()
  )
);

DROP POLICY IF EXISTS "Student manage own submissions" ON submissions;
CREATE POLICY "Student manage own submissions" ON submissions FOR ALL USING (student_id = current_user_student_id());

DROP POLICY IF EXISTS "Teacher grade submissions" ON submissions;
CREATE POLICY "Teacher grade submissions" ON submissions FOR UPDATE USING (
  EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
      AND a.teacher_id = current_user_teacher_id()
  )
);


-- 7. ATTENDANCE
DROP POLICY IF EXISTS "View attendance" ON attendance;
CREATE POLICY "View attendance" ON attendance FOR SELECT USING (
  student_id = current_user_student_id() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);

DROP POLICY IF EXISTS "Manage attendance" ON attendance;
CREATE POLICY "Manage attendance" ON attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
);


-- 8. RESOURCES
DROP POLICY IF EXISTS "View resources" ON resources;
CREATE POLICY "View resources" ON resources FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = resources.course_id
      AND (
          c.teacher_id = current_user_teacher_id() OR
          is_student_in_class(c.class_id, current_user_student_id())
      )
  )
);

DROP POLICY IF EXISTS "Manage resources" ON resources;
CREATE POLICY "Manage resources" ON resources FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
  EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = resources.course_id
      AND c.teacher_id = current_user_teacher_id()
  )
);
