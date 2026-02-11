-- Migration: Nuclear RLS Fix and Function Hardening (v3)
-- Description: Wipes all policies across all tables and fixes non-security-definer functions causing recursion/500s.
-- Created: 2026-02-11 15:15:00

BEGIN;

-- 1. DROP ALL POLICIES GLOBAL CLEANUP
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

-- Execute for all known tables
SELECT public.drop_all_policies(t) FROM unnest(ARRAY[
    'institutions', 'users', 'subjects', 'lessons', 'bursaries', 
    'fee_structures', 'bursary_applications', 'teacher_payouts', 
    'payments', 'parents', 'submissions', 'grades', 'library_config', 
    'attendance', 'admins', 'teachers', 'students', 'classes', 
    'enrollments', 'resources', 'book', 'library', 'assignments', 
    'announcements', 'books', 'borrowed_books'
]) AS t;

DROP FUNCTION public.drop_all_policies(TEXT);

-- 2. FIX PROBLEMATIC FUNCTIONS (Make them SECURITY DEFINER with fixed search_path)
-- Note: Student and Teacher IDs are TEXT (Custom IDs like STU-XXXX)

DROP FUNCTION IF EXISTS public.get_current_user_role();
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

DROP FUNCTION IF EXISTS public.current_user_student_id();
CREATE OR REPLACE FUNCTION public.current_user_student_id()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.students WHERE user_id = auth.uid();
$$;

DROP FUNCTION IF EXISTS public.current_user_teacher_id();
CREATE OR REPLACE FUNCTION public.current_user_teacher_id()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT id FROM public.teachers WHERE user_id = auth.uid();
$$;

-- 3. APPLY CLEAN, CONSOLIDATED POLICIES

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_users" ON public.users FOR SELECT USING (
    auth.uid() = id OR role IN ('admin', 'teacher')
);
CREATE POLICY "manage_users" ON public.users FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "allow_signup" ON public.users FOR INSERT WITH CHECK (true);

-- ADMINS, TEACHERS, STUDENTS, PARENTS (Role-specific tables)
DO $$ 
DECLARE 
    t TEXT;
BEGIN 
    FOR t IN SELECT unnest(ARRAY['admins', 'teachers', 'students', 'parents']) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('CREATE POLICY "select_%I" ON public.%I FOR SELECT USING (true)', t, t);
        EXECUTE format('CREATE POLICY "manage_%I" ON public.%I FOR ALL USING (public.get_current_user_role() = ''admin'')', t, t);
    END LOOP;
END $$;

-- ACADEMIC MODULE
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "manage_subjects" ON public.subjects FOR ALL USING (public.get_current_user_role() IN ('admin', 'teacher'));

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "manage_assignments" ON public.assignments FOR ALL USING (public.get_current_user_role() IN ('admin', 'teacher'));

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_submissions" ON public.submissions FOR SELECT USING (
    student_id = public.current_user_student_id() OR public.get_current_user_role() IN ('admin', 'teacher')
);
CREATE POLICY "manage_submissions" ON public.submissions FOR ALL USING (
    student_id = public.current_user_student_id() OR public.get_current_user_role() IN ('admin', 'teacher')
);

-- LIBRARY MODULE
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_books" ON public.books FOR SELECT USING (true);
CREATE POLICY "manage_books" ON public.books FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_borrows" ON public.borrowed_books FOR SELECT USING (student_id = public.current_user_student_id());
CREATE POLICY "admin_manage_borrows" ON public.borrowed_books FOR ALL USING (public.get_current_user_role() = 'admin');

-- FINANCE MODULE
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_payments" ON public.payments FOR SELECT USING (student_id = public.current_user_student_id());
CREATE POLICY "admin_manage_payments" ON public.payments FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.bursaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_bursaries" ON public.bursaries FOR SELECT USING (true);
CREATE POLICY "admin_manage_bursaries" ON public.bursaries FOR ALL USING (public.get_current_user_role() = 'admin');

ALTER TABLE public.bursary_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_apps" ON public.bursary_applications FOR SELECT USING (student_id = public.current_user_student_id());
CREATE POLICY "admin_manage_apps" ON public.bursary_applications FOR ALL USING (public.get_current_user_role() = 'admin');

COMMIT;
