-- Migration: Rename Course to Subject and Add Phone Field (Idempotent Version)

-- 1. Add phone field to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Rename courses table to subjects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        ALTER TABLE public.courses RENAME TO subjects;
    END IF;
END $$;

-- 3. Rename course_id columns in related tables
DO $$
BEGIN
    -- announcements
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'announcements' AND column_name = 'course_id') THEN
        ALTER TABLE public.announcements RENAME COLUMN course_id TO subject_id;
    END IF;
    -- assignments
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'course_id') THEN
        ALTER TABLE public.assignments RENAME COLUMN course_id TO subject_id;
    END IF;
    -- resources
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resources' AND column_name = 'course_id') THEN
        ALTER TABLE public.resources RENAME COLUMN course_id TO subject_id;
    END IF;
    -- attendance
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'course_id') THEN
        ALTER TABLE public.attendance RENAME COLUMN course_id TO subject_id;
    END IF;
    -- grades
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'grades' AND column_name = 'course_id') THEN
        ALTER TABLE public.grades RENAME COLUMN course_id TO subject_id;
    END IF;
    -- lessons
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'course_id') THEN
        ALTER TABLE public.lessons RENAME COLUMN course_id TO subject_id;
    END IF;
END $$;

-- 4. Update foreign key constraint names
DO $$
BEGIN
    -- announcements
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'announcements' AND constraint_name = 'announcements_course_id_fkey') THEN
        ALTER TABLE public.announcements RENAME CONSTRAINT announcements_course_id_fkey TO announcements_subject_id_fkey;
    END IF;
    -- assignments
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'assignments' AND constraint_name = 'assignments_course_id_fkey') THEN
        ALTER TABLE public.assignments RENAME CONSTRAINT assignments_course_id_fkey TO assignments_subject_id_fkey;
    END IF;
    -- resources
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'resources' AND constraint_name = 'resources_course_id_fkey') THEN
        ALTER TABLE public.resources RENAME CONSTRAINT resources_course_id_fkey TO resources_subject_id_fkey;
    END IF;
    -- attendance
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'attendance' AND constraint_name = 'attendance_course_id_fkey') THEN
        ALTER TABLE public.attendance RENAME CONSTRAINT attendance_course_id_fkey TO attendance_subject_id_fkey;
    END IF;
    -- grades
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'grades' AND constraint_name = 'grades_course_id_fkey') THEN
        ALTER TABLE public.grades RENAME CONSTRAINT grades_course_id_fkey TO grades_subject_id_fkey;
    END IF;
    -- lessons
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'lessons' AND constraint_name = 'lessons_course_id_fkey') THEN
        ALTER TABLE public.lessons RENAME CONSTRAINT lessons_course_id_fkey TO lessons_subject_id_fkey;
    END IF;
    -- subjects (formerly courses)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'subjects' AND constraint_name = 'courses_teacher_id_fkey') THEN
        ALTER TABLE public.subjects RENAME CONSTRAINT courses_teacher_id_fkey TO subjects_teacher_id_fkey;
    END IF;
END $$;

-- 5. Rename Functions (Optional but recommended for consistency)
DROP FUNCTION IF EXISTS public.is_teacher_of_course(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.is_teacher_of_subject(p_subject_id UUID, p_teacher_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subjects
    WHERE id = p_subject_id AND teacher_id = p_teacher_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
