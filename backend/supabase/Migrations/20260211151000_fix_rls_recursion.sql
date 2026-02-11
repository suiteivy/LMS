-- Migration: Fix RLS Recursion and Consolidate Policies
-- Description: Drops all existing policies and applies a clean, recursion-proof set.
-- Created: 2026-02-11 15:05:00

BEGIN;

-- 1. Helper Function to Drop All Policies on a Table
CREATE OR REPLACE FUNCTION public.drop_all_policies(table_name TEXT) 
RETURNS VOID AS $$
DECLARE
    pol_name TEXT;
BEGIN
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol_name, table_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Execute Cleanup for all core tables
SELECT public.drop_all_policies(t) FROM unnest(ARRAY[
    'users', 'admins', 'teachers', 'students', 'parents', 
    'classes', 'enrollments', 'subjects', 'assignments', 'submissions', 
    'attendance', 'resources', 'announcements', 
    'library_config', 'books', 'borrowed_books', 'book', 'library',
    'fee_structures', 'payments', 'bursaries', 'bursary_applications', 'teacher_payouts'
]) AS t;

-- Drop the helper function
DROP FUNCTION public.drop_all_policies(TEXT);

-- 3. Robust Helper Function for Roles
-- SECURITY DEFINER and SET search_path are critical for stability and security.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 4. Re-apply Consolidation Logic for handle_user_role_entry
CREATE OR REPLACE FUNCTION public.handle_user_role_entry()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO public.admins (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'teacher' THEN
    INSERT INTO public.teachers (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'student' THEN
    INSERT INTO public.students (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'parent' THEN
    INSERT INTO public.parents (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. APPLY CLEAN POLICIES

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_user" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admin_teacher_select_users" ON public.users FOR SELECT USING (role IN ('admin', 'teacher'));
CREATE POLICY "admin_manage_users" ON public.users FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "allow_signup" ON public.users FOR INSERT WITH CHECK (true);

-- ADMINS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_admins" ON public.admins FOR SELECT USING (true);
CREATE POLICY "manage_admins" ON public.admins FOR ALL USING (public.get_current_user_role() = 'admin');

-- TEACHERS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "manage_teachers" ON public.teachers FOR ALL USING (public.get_current_user_role() = 'admin');

-- STUDENTS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_students" ON public.students FOR SELECT USING (true);
CREATE POLICY "manage_students" ON public.students FOR ALL USING (public.get_current_user_role() = 'admin');

-- PARENTS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_parents" ON public.parents FOR SELECT USING (true);
CREATE POLICY "manage_parents" ON public.parents FOR ALL USING (public.get_current_user_role() = 'admin');

-- LIBRARY (singular/preserved)
ALTER TABLE public.book ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_book" ON public.book FOR SELECT USING (true);
CREATE POLICY "manage_book" ON public.book FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_library" ON public.library FOR SELECT USING (true);
CREATE POLICY "manage_library" ON public.library FOR ALL USING (public.get_current_user_role() = 'admin');

-- ACADEMIC MODULE
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "manage_subjects" ON public.subjects FOR ALL USING (public.get_current_user_role() IN ('admin', 'teacher'));

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "manage_assignments" ON public.assignments FOR ALL USING (public.get_current_user_role() IN ('admin', 'teacher'));

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_submissions" ON public.submissions FOR SELECT USING (
    student_id = (SELECT id FROM public.students WHERE user_id = auth.uid()) 
    OR public.get_current_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "manage_submissions" ON public.submissions FOR ALL USING (
    student_id = (SELECT id FROM public.students WHERE user_id = auth.uid()) 
    OR public.get_current_user_role() IN ('admin', 'teacher')
);

-- LIBRARY MODULE (plural)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_books" ON public.books FOR SELECT USING (true);
CREATE POLICY "manage_books" ON public.books FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_borrows" ON public.borrowed_books FOR SELECT USING (student_id = (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_borrows" ON public.borrowed_books FOR ALL USING (public.get_current_user_role() = 'admin');

-- FINANCE MODULE
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_payments" ON public.payments FOR SELECT USING (student_id = (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.bursaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_bursaries" ON public.bursaries FOR SELECT USING (true);
CREATE POLICY "admin_manage_bursaries" ON public.bursaries FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.bursary_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_apps" ON public.bursary_applications FOR SELECT USING (student_id = (SELECT id FROM public.students WHERE user_id = auth.uid()));
CREATE POLICY "admin_manage_apps" ON public.bursary_applications FOR ALL USING (public.get_current_user_role() = 'admin');

-- Ensure missing columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='file_url') THEN
        ALTER TABLE public.submissions ADD COLUMN file_url TEXT;
    END IF;
END $$;

COMMIT;
