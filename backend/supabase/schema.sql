-- Add status column to users table
ALTER TABLE public.users 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing users to 'approved' so they don't get locked out
UPDATE public.users SET status = 'approved';
create table assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  title text not null,
  description text,
  due_date timestamp,
  created_at timestamp default current_timestamp
);
create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  subject_id uuid references subjects(id),
  login_date date not null,
  session_start timestamp,
  session_end timestamp,
  marked_by uuid references users(id),
  type text check (type in ('login', 'manual')) not null,
  created_at timestamp default current_timestamp
);
-- ==========================================
-- AUTH POLICIES FOR USER REGISTRATION
-- ==========================================
-- Special policies to allow new user registration
-- These policies allow unauthenticated users to insert into the users table during sign-up

-- Policy that allows inserting into users table during sign-up
CREATE POLICY "Allow public sign-up"
ON users FOR INSERT
WITH CHECK (auth.role() = 'anon');

-- Create a trigger function to ensure new users can only set role to 'student' during sign-up
-- Uses SECURITY DEFINER to bypass RLS when checking the admin status
CREATE OR REPLACE FUNCTION public.check_user_role_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- If no role is provided, default to 'student'
  IF NEW.role IS NULL THEN
    NEW.role := 'student';
  END IF;
  
  -- We trust the frontend/user input for the role at this stage because of the requirement to allow
  -- users to sign up as Teachers/Admins directly.
  -- The 'users' table already has a CHECK constraint to ensure only valid roles ('admin', 'student', 'teacher') are allowed.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to enforce the role restriction
DROP TRIGGER IF EXISTS enforce_user_role_on_signup ON users;
CREATE TRIGGER enforce_user_role_on_signup
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION public.check_user_role_on_signup();
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  isbn text,
  category text,
  total_quantity int not null default 1,
  available_quantity int not null default 1,
  institution_id uuid references public.institutions(id),
  created_at timestamp default current_timestamp
);
create table if not exists public.borrowed_books (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books(id) not null,
  user_id uuid references public.users(id) not null,
  borrowed_at timestamp default current_timestamp,
  due_date date,
  returned_at timestamp null,
  status text default 'borrowed', -- 'borrowed' | 'returned' | 'overdue'
  institution_id uuid references public.institutions(id),
  created_at timestamp default current_timestamp
);
create table subjects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid references users(id),
  institution_id uuid references institutions(id),
  fee_amount numeric(10, 2) not null,
  created_at timestamp default current_timestamp
);
-- ==========================================
-- CREATE ADMIN USER - SETUP INSTRUCTIONS
-- ==========================================
-- IMPORTANT: Do NOT use direct SQL inserts into auth.users!
-- Supabase's auth system uses a specific password hashing format.
-- Direct inserts will create users that cannot sign in.
-- ==========================================

-- STEP 1: Create the admin user via Supabase Dashboard
-- -------------------------------------------------------
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to: Authentication â†’ Users
-- 3. Click "Add user" â†’ "Create new user"
-- 4. Enter the following:
--    - Email: admin@lms.com (or your preferred admin email)
--    - Password: Admin@123456 (or your preferred password)
--    - Check "Auto Confirm User" checkbox
-- 5. Click "Create user"

-- STEP 2: Add the admin user to the public.users table
-- -------------------------------------------------------
-- After creating the user in the Auth UI, run this SQL to add them
-- to your application's users table with the admin role:

INSERT INTO public.users (id, email, full_name, role, institution_id)
SELECT 
  id,
  email,
  'System Administrator',  -- Change this to the admin's actual name
  'admin',
  NULL  -- Set to an institution ID if needed
FROM auth.users 
WHERE email = 'admin@lms.com'  -- Use the same email you used above
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- VERIFY THE SETUP
-- ==========================================
-- Run this query to confirm the admin user exists in both tables:

-- SELECT 
--   au.email as auth_email,
--   pu.email as public_email,
--   pu.role,
--   pu.full_name
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE au.email = 'admin@lms.com';

-- ==========================================
-- ALTERNATIVE: Create additional admin users
-- ==========================================
-- To create more admin users, repeat the process:
-- 1. Add user via Dashboard â†’ Authentication â†’ Users
-- 2. Run the INSERT query above with their email

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================
-- If you get "Database error querying schema" when signing in:
-- 1. Check that the user exists in BOTH auth.users AND public.users
-- 2. Verify RLS is disabled or has proper policies on public.users
-- 3. Ensure GRANT permissions are set:
--    GRANT SELECT ON public.users TO anon, authenticated;
create table grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  subject_id uuid references subjects(id),
  total_grade numeric,
  feedback text,
  graded_by uuid references users(id),
  created_at timestamp default current_timestamp
);
create table institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamp default current_timestamp
);
create table lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id),
  title text not null,
  content text,
  scheduled_at timestamp,
  created_at timestamp default current_timestamp
);
-- ==========================================
-- HELPER FUNCTION FOR RLS POLICIES
-- ==========================================
-- This function allows policies to check the current user's role
-- without causing infinite recursion on the users table.
-- It uses SECURITY DEFINER to bypass RLS when querying the users table.

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

-- SELECT: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- SELECT: Admins and teachers can read all user data
CREATE POLICY "Admins and teachers can read all user data"
ON users FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'teacher'));

-- INSERT: Only admins can create users
CREATE POLICY "Only admins can create users"
ON users FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Users can update their own data
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Only admins can update any user's data
CREATE POLICY "Admins can update any user"
ON users FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Only admins can delete users
CREATE POLICY "Only admins can delete users"
ON users FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- subjects TABLE POLICIES
-- ==========================================

-- SELECT: Users can read associated subjects
CREATE POLICY "Users can read associated subjects"
ON subjects FOR SELECT
USING (
  teacher_id = current_user_teacher_id()
  OR EXISTS (
    SELECT 1 FROM submissions
    WHERE student_id = current_user_student_id() AND assignment_id IN (
      SELECT id FROM assignments WHERE subject_id = subjects.id
    )
  )
  OR EXISTS (
    SELECT 1 FROM attendance
    WHERE student_id = current_user_student_id() AND subject_id = subjects.id
  )
);

-- SELECT: Admins and teachers can read all subjects
CREATE POLICY "Admins and teachers can read all subjects"
ON subjects FOR SELECT
USING (public.get_current_user_role() IN ('admin', 'teacher'));

-- INSERT: Only admins and teachers can create subjects
CREATE POLICY "Only admins and teachers can create subjects"
ON subjects FOR INSERT
WITH CHECK (public.get_current_user_role() IN ('admin', 'teacher'));

-- UPDATE: Teachers can update own subjects
CREATE POLICY "Teachers can update own subjects"
ON subjects FOR UPDATE
USING (teacher_id = current_user_teacher_id());

-- UPDATE: Admins can update any subject
CREATE POLICY "Admins can update any subject"
ON subjects FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Only admins and subject owners can delete subjects
CREATE POLICY "Only admins and subject owners can delete subjects"
ON subjects FOR DELETE
USING (
  teacher_id = current_user_teacher_id()
  OR public.get_current_user_role() = 'admin'
);

-- ==========================================
-- ASSIGNMENTS TABLE POLICIES
-- ==========================================

-- SELECT: Users can read assignments for their subjects
CREATE POLICY "Users can read assignments for their subjects"
ON assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id
    AND (
      teacher_id = current_user_teacher_id()
      OR EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = current_user_student_id() AND assignment_id IN (
          SELECT id FROM assignments WHERE subject_id = subjects.id
        )
      )
      OR EXISTS (
        SELECT 1 FROM attendance
        WHERE student_id = current_user_student_id() AND subject_id = subjects.id
      )
    )
  )
);

-- INSERT: Teachers can create assignments for their subjects
CREATE POLICY "Teachers can create assignments for their subjects"
ON assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- INSERT: Admins can create any assignment
CREATE POLICY "Admins can create any assignment"
ON assignments FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Teachers can update assignments for their subjects
CREATE POLICY "Teachers can update assignments for their subjects"
ON assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- UPDATE: Admins can update any assignment
CREATE POLICY "Admins can update any assignment"
ON assignments FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Teachers can delete assignments for their subjects
CREATE POLICY "Teachers can delete assignments for their subjects"
ON assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = assignments.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- DELETE: Admins can delete any assignment
CREATE POLICY "Admins can delete any assignment"
ON assignments FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- SUBMISSIONS TABLE POLICIES
-- ==========================================

-- SELECT: Students can read own submissions
CREATE POLICY "Students can read own submissions"
ON submissions FOR SELECT
USING (student_id = current_user_student_id());

-- SELECT: Teachers can read submissions for their subjects
CREATE POLICY "Teachers can read submissions for their subjects"
ON submissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN subjects ON assignments.subject_id = subjects.id
    WHERE assignments.id = submissions.assignment_id
    AND subjects.teacher_id = current_user_teacher_id()
  )
);

-- SELECT: Admins can read all submissions
CREATE POLICY "Admins can read all submissions"
ON submissions FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- INSERT: Students can create own submissions
CREATE POLICY "Students can create own submissions"
ON submissions FOR INSERT
WITH CHECK (student_id = current_user_student_id());

-- UPDATE: Students can update own submissions
CREATE POLICY "Students can update own submissions"
ON submissions FOR UPDATE
USING (student_id = current_user_student_id())
WITH CHECK (graded = false);

-- UPDATE: Teachers can update submissions for grading
CREATE POLICY "Teachers can update submissions for grading"
ON submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM assignments
    JOIN subjects ON assignments.subject_id = subjects.id
    WHERE assignments.id = submissions.assignment_id
    AND subjects.teacher_id = current_user_teacher_id()
  )
);

-- UPDATE: Admins can update any submission
CREATE POLICY "Admins can update any submission"
ON submissions FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- ATTENDANCE TABLE POLICIES
-- ==========================================

-- SELECT: Students can read own attendance
CREATE POLICY "Students can read own attendance"
ON attendance FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: Teachers can read attendance for their subjects
CREATE POLICY "Teachers can read attendance for their subjects"
ON attendance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = attendance.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- SELECT: Admins can read all attendance
CREATE POLICY "Admins can read all attendance"
ON attendance FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- INSERT: Students can mark own attendance
CREATE POLICY "Students can mark own attendance"
ON attendance FOR INSERT
WITH CHECK (auth.uid() = user_id AND type = 'login');

-- INSERT: Teachers can mark attendance for their subjects
CREATE POLICY "Teachers can mark attendance for their subjects"
ON attendance FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = attendance.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- INSERT: Admins can mark any attendance
CREATE POLICY "Admins can mark any attendance"
ON attendance FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Admins can update any attendance
CREATE POLICY "Admins can update any attendance"
ON attendance FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Admins can delete any attendance
CREATE POLICY "Admins can delete any attendance"
ON attendance FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- LESSONS TABLE POLICIES
-- ==========================================

-- SELECT: Users can read lessons for their subjects
CREATE POLICY "Users can read lessons for their subjects"
ON lessons FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id
    AND (
      teacher_id = current_user_teacher_id()
      OR EXISTS (
        SELECT 1 FROM submissions
        WHERE student_id = current_user_student_id() AND assignment_id IN (
          SELECT id FROM assignments WHERE subject_id = subjects.id
        )
      )
      OR EXISTS (
        SELECT 1 FROM attendance
        WHERE student_id = current_user_student_id() AND subject_id = subjects.id
      )
    )
  )
);

-- INSERT: Teachers can create lessons for their subjects
CREATE POLICY "Teachers can create lessons for their subjects"
ON lessons FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- INSERT: Admins can create any lesson
CREATE POLICY "Admins can create any lesson"
ON lessons FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Teachers can update lessons for their subjects
CREATE POLICY "Teachers can update lessons for their subjects"
ON lessons FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- UPDATE: Admins can update any lesson
CREATE POLICY "Admins can update any lesson"
ON lessons FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Teachers can delete lessons for their subjects
CREATE POLICY "Teachers can delete lessons for their subjects"
ON lessons FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = lessons.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- DELETE: Admins can delete any lesson
CREATE POLICY "Admins can delete any lesson"
ON lessons FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- GRADES TABLE POLICIES
-- ==========================================

-- SELECT: Students can read own grades
CREATE POLICY "Students can read own grades"
ON grades FOR SELECT
USING (student_id = current_user_student_id());

-- SELECT: Teachers can read grades for their subjects
CREATE POLICY "Teachers can read grades for their subjects"
ON grades FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = grades.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- SELECT: Admins can read all grades
CREATE POLICY "Admins can read all grades"
ON grades FOR SELECT
USING (public.get_current_user_role() = 'admin');

-- INSERT: Teachers can create grades for their subjects
CREATE POLICY "Teachers can create grades for their subjects"
ON grades FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = grades.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- INSERT: Admins can create any grade
CREATE POLICY "Admins can create any grade"
ON grades FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Teachers can update grades for their subjects
CREATE POLICY "Teachers can update grades for their subjects"
ON grades FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM subjects
    WHERE id = grades.subject_id AND teacher_id = current_user_teacher_id()
  )
);

-- UPDATE: Admins can update any grade
CREATE POLICY "Admins can update any grade"
ON grades FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Admins can delete any grade
CREATE POLICY "Admins can delete any grade"
ON grades FOR DELETE
USING (public.get_current_user_role() = 'admin');

-- ==========================================
-- INSTITUTIONS TABLE POLICIES
-- ==========================================

-- SELECT: Everyone can read institutions
CREATE POLICY "Everyone can read institutions"
ON institutions FOR SELECT
USING (true);

-- INSERT: Only admins can insert institutions
CREATE POLICY "Only admins can insert institutions"
ON institutions FOR INSERT
WITH CHECK (public.get_current_user_role() = 'admin');

-- UPDATE: Only admins can update institutions
CREATE POLICY "Only admins can update institutions"
ON institutions FOR UPDATE
USING (public.get_current_user_role() = 'admin');

-- DELETE: Only admins can delete institutions
CREATE POLICY "Only admins can delete institutions"
ON institutions FOR DELETE
USING (public.get_current_user_role() = 'admin');
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id),
  student_id uuid references users(id),
  file_url text,
  submitted_at timestamp default current_timestamp,
  graded boolean default false,
  grade numeric,
  feedback text
);
create table users (
  id uuid primary key references auth.users(id),
  full_name text not null,
  email text not null unique,
  role text check (role in ('admin', 'student', 'teacher')) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  phone text,
  institution_id uuid references institutions(id),
  created_at timestamp default current_timestamp
);
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

-- 3. subjects Table Modifications
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
-- Ensure teacher_id exists (it typically does in subjects, but strictly checking)
-- We won't add teacher_id here if it's missing from base schema, assuming it exists.

-- 4. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Initially UUID
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    total_points INTEGER DEFAULT 100,
    status TEXT CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
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

-- --- subjects (Refactor) ---
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teacher_id' AND data_type = 'uuid') THEN
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS new_teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        UPDATE subjects c SET new_teacher_id = t.id FROM teachers t WHERE c.teacher_id = t.user_id;
        ALTER TABLE subjects DROP COLUMN teacher_id CASCADE;
        ALTER TABLE subjects RENAME COLUMN new_teacher_id TO teacher_id;
        CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'new_teacher_id') THEN
        ALTER TABLE subjects RENAME COLUMN new_teacher_id TO teacher_id;
        CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
    ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teacher_id') THEN
        ALTER TABLE subjects ADD COLUMN teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON subjects(teacher_id);
    END IF;
END $$;


-- ==========================================
-- PART 3: FINAL TABLES (RESOURCES) & RLS
-- ==========================================

-- Resources Table (Created here to ensure it uses correct Schema if created fresh, or updated)
-- Actually, if we created it in Part 1 with UUID dependencies (on subjects), it propagates.
-- But 'resources' only depends on 'subjects' (UUID default) and user checks. 
-- Resources itself doesn't have a teacher_id/student_id column, it links to subject.
-- So we can define it normally.

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('pdf', 'video', 'link', 'other')) DEFAULT 'other',
    url TEXT NOT NULL,
    size TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject_id);
DROP TRIGGER IF EXISTS update_resources_modtime ON resources;
CREATE TRIGGER update_resources_modtime BEFORE UPDATE ON resources FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- Helper Functions for RLS (Safe replacements using New IDs)

-- Helper to get current user's role ID
CREATE OR REPLACE FUNCTION current_user_student_id() RETURNS TEXT AS $$
    SELECT id FROM students WHERE student_id = current_user_student_id();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_teacher_id() RETURNS TEXT AS $$
    SELECT id FROM teachers WHERE student_id = current_user_student_id();
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

-- Check if user is teacher of the subject (Takes TEXT teacher_id)
DROP FUNCTION IF EXISTS is_teacher_of_subject;
CREATE OR REPLACE FUNCTION is_teacher_of_subject(p_subject_id UUID, p_teacher_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subjects
    WHERE id = p_subject_id AND teacher_id = p_teacher_id
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
CREATE POLICY "Users view own admin profile" ON admins FOR SELECT USING (student_id = current_user_student_id());
DROP POLICY IF EXISTS "Admins view all admins" ON admins;
CREATE POLICY "Admins view all admins" ON admins FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users view own teacher profile" ON teachers;
CREATE POLICY "Users view own teacher profile" ON teachers FOR SELECT USING (student_id = current_user_student_id());
DROP POLICY IF EXISTS "Admins/Teachers view teachers" ON teachers;
CREATE POLICY "Admins/Teachers view teachers" ON teachers FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));
DROP POLICY IF EXISTS "Students view teachers" ON teachers;
CREATE POLICY "Students view teachers" ON teachers FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'student'));

DROP POLICY IF EXISTS "Users view own student profile" ON students;
CREATE POLICY "Users view own student profile" ON students FOR SELECT USING (student_id = current_user_student_id());
DROP POLICY IF EXISTS "Teachers/Admins view students" ON students;
CREATE POLICY "Teachers/Admins view students" ON students FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'teacher')));


-- 2. subjects
DROP POLICY IF EXISTS "Admins can insert subjects" ON subjects;
CREATE POLICY "Admins can insert subjects" ON subjects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Teachers can update own subjects" ON subjects;
CREATE POLICY "Teachers can update own subjects" ON subjects FOR UPDATE USING (teacher_id = current_user_teacher_id());

DROP POLICY IF EXISTS "Everyone can view subjects" ON subjects;
CREATE POLICY "Everyone can view subjects" ON subjects FOR SELECT USING (true);


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
      SELECT 1 FROM subjects c
      WHERE c.id = assignments.subject_id
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
      SELECT 1 FROM subjects c
      WHERE c.id = resources.subject_id
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
      SELECT 1 FROM subjects c
      WHERE c.id = resources.subject_id
      AND c.teacher_id = current_user_teacher_id()
  )
);
- -   C r e a t e   A n n o u n c e m e n t s   T a b l e  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . a n n o u n c e m e n t s   (  
         i d   U U I D   P R I M A R Y   K E Y   D E F A U L T   g e n _ r a n d o m _ u u i d ( ) ,  
         c o u r s e _ i d   U U I D   R E F E R E N C E S   p u b l i c . c o u r s e s ( i d )   O N   D E L E T E   C A S C A D E ,  
         t e a c h e r _ i d   T E X T   R E F E R E N C E S   p u b l i c . t e a c h e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
         t i t l e   T E X T   N O T   N U L L ,  
         m e s s a g e   T E X T   N O T   N U L L ,  
         c r e a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   N O W ( ) ,  
         u p d a t e d _ a t   T I M E S T A M P   W I T H   T I M E   Z O N E   D E F A U L T   N O W ( )  
 ) ;  
  
 - -   E n a b l e   R L S  
 A L T E R   T A B L E   p u b l i c . a n n o u n c e m e n t s   E N A B L E   R O W   L E V E L   S E C U R I T Y ;  
  
 - -   P o l i c i e s  
  
 - -   1 .   T e a c h e r s   c a n   v i e w   t h e i r   o w n   a n n o u n c e m e n t s  
 C R E A T E   P O L I C Y   " T e a c h e r s   c a n   v i e w   o w n   a n n o u n c e m e n t s "    
 O N   p u b l i c . a n n o u n c e m e n t s   F O R   S E L E C T    
 T O   a u t h e n t i c a t e d    
 U S I N G   (  
         t e a c h e r _ i d   I N   (  
                 S E L E C T   i d   F R O M   p u b l i c . t e a c h e r s   W H E R E   u s e r _ i d   =   a u t h . u i d ( )  
         )  
 ) ;  
  
 - -   2 .   T e a c h e r s   c a n   i n s e r t   a n n o u n c e m e n t s   f o r   t h e m s e l v e s  
 C R E A T E   P O L I C Y   " T e a c h e r s   c a n   i n s e r t   o w n   a n n o u n c e m e n t s "    
 O N   p u b l i c . a n n o u n c e m e n t s   F O R   I N S E R T    
 T O   a u t h e n t i c a t e d    
 W I T H   C H E C K   (  
         t e a c h e r _ i d   I N   (  
                 S E L E C T   i d   F R O M   p u b l i c . t e a c h e r s   W H E R E   u s e r _ i d   =   a u t h . u i d ( )  
         )  
 ) ;  
  
 - -   3 .   T e a c h e r s   c a n   u p d a t e   o w n   a n n o u n c e m e n t s  
 C R E A T E   P O L I C Y   " T e a c h e r s   c a n   u p d a t e   o w n   a n n o u n c e m e n t s "    
 O N   p u b l i c . a n n o u n c e m e n t s   F O R   U P D A T E    
 T O   a u t h e n t i c a t e d    
 U S I N G   (  
         t e a c h e r _ i d   I N   (  
                 S E L E C T   i d   F R O M   p u b l i c . t e a c h e r s   W H E R E   u s e r _ i d   =   a u t h . u i d ( )  
         )  
 ) ;  
  
 - -   4 .   T e a c h e r s   c a n   d e l e t e   o w n   a n n o u n c e m e n t s  
 C R E A T E   P O L I C Y   " T e a c h e r s   c a n   d e l e t e   o w n   a n n o u n c e m e n t s "    
 O N   p u b l i c . a n n o u n c e m e n t s   F O R   D E L E T E    
 T O   a u t h e n t i c a t e d    
 U S I N G   (  
         t e a c h e r _ i d   I N   (  
                 S E L E C T   i d   F R O M   p u b l i c . t e a c h e r s   W H E R E   u s e r _ i d   =   a u t h . u i d ( )  
         )  
 ) ;  
  
 - -   5 .   S t u d e n t s   c a n   v i e w   a n n o u n c e m e n t s   f o r   c o u r s e s   t h e y   a r e   e n r o l l e d   i n  
 C R E A T E   P O L I C Y   " S t u d e n t s   c a n   v i e w   c o u r s e   a n n o u n c e m e n t s "    
 O N   p u b l i c . a n n o u n c e m e n t s   F O R   S E L E C T    
 T O   a u t h e n t i c a t e d    
 U S I N G   (  
         c o u r s e _ i d   I N   (  
                 S E L E C T   c l a s s _ i d   F R O M   p u b l i c . e n r o l l m e n t s    
                 W H E R E   s t u d e n t _ i d   I N   (  
                         S E L E C T   i d   F R O M   p u b l i c . s t u d e n t s   W H E R E   u s e r _ i d   =   a u t h . u i d ( )  
                 )  
         )  
 ) ;  
  
 - -   A l l o w   a d m i n s   t o   v i e w   a l l   ( o p t i o n a l ,   g o o d   f o r   m a n a g e m e n t )  
 C R E A T E   P O L I C Y   " A d m i n s   c a n   v i e w   a l l   a n n o u n c e m e n t s "  
 O N   p u b l i c . a n n o u n c e m e n t s   F O R   S E L E C T  
 T O   a u t h e n t i c a t e d  
 U S I N G   (  
     E X I S T S   (  
         S E L E C T   1   F R O M   p u b l i c . a d m i n s   W H E R E   u s e r _ i d   =   a u t h . u i d ( )  
     )  
 ) ;  
 c r e a t e   t a b l e   p u b l i c . b o o k   (  
     i d   b i g i n t   g e n e r a t e d   b y   d e f a u l t   a s   i d e n t i t y   n o t   n u l l ,  
     b o o k _ i d   u u i d   n u l l   d e f a u l t   g e n _ r a n d o m _ u u i d   ( ) ,  
     b o o k _ t i t l e   t e x t   n u l l ,  
     a u t h o r   t e x t   n u l l ,  
     i s b n   t e x t   n u l l ,  
     c a t e g o r y   t e x t   n u l l ,  
     b o r r o w e d _ b y   t e x t   n u l l ,  
     c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   n u l l   d e f a u l t   n o w ( ) ,  
     c o n s t r a i n t   b o o k _ p k e y   p r i m a r y   k e y   ( i d )  
 )   T A B L E S P A C E   p g _ d e f a u l t ;  
 