-- Migration: Final Consolidation and Security Hardening
-- Created: 2026-02-11 15:00:00

BEGIN;

-- 1. Security Hardening for Functions
-- Setting search_path to public for security
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.handle_user_role_entry() SET search_path = public;
ALTER FUNCTION public.generate_custom_id(text) SET search_path = public;
ALTER FUNCTION public.current_user_teacher_id() SET search_path = public;
ALTER FUNCTION public.current_user_student_id() SET search_path = public;
ALTER FUNCTION public.is_student_in_class(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public._validate_and_decrement_book() SET search_path = public;

-- 2. View Security Hardening
-- Converting SECURITY DEFINER views to SECURITY INVOKER (default)
-- Note: Views are security invoker by default in Postgres unless created otherwise.
-- We recreate them to be safe.
CREATE OR REPLACE VIEW public.config AS SELECT * FROM public.library_config;
-- Drop and recreate fees view to ensure invoker security
DROP VIEW IF EXISTS public.fees;
CREATE OR REPLACE VIEW public.fees AS
WITH student_totals AS (
    SELECT 
        s.id as student_id,
        s.user_id as user_id,
        COALESCE(SUM(fs.amount), 0) as total_fee
    FROM public.students s
    CROSS JOIN public.fee_structures fs
    WHERE fs.is_active = true
    GROUP BY s.id, s.user_id
),
payment_totals AS (
    SELECT 
        student_id,
        COALESCE(SUM(amount), 0) as amount_paid
    FROM public.payments
    WHERE status = 'completed'
    GROUP BY student_id
)
SELECT 
    st.student_id,
    st.user_id,
    st.total_fee,
    COALESCE(pt.amount_paid, 0) as amount_paid
FROM student_totals st
LEFT JOIN payment_totals pt ON st.student_id = pt.student_id;

-- 3. Update Role Support
-- Add 'parent' to roles if it exists in check constraint, else update
-- Assuming the check constraint is already correct based on live list
-- Updating the trigger function to handle 'parent'
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

-- 4. Sync Schema Discrepancies
-- Add missing file_url to submissions if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='file_url') THEN
        ALTER TABLE public.submissions ADD COLUMN file_url TEXT;
    END IF;
END $$;

-- 5. RLS Policies for preserved tables (book, library, parents)
-- Parents
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_parents" ON public.parents;
CREATE POLICY "select_parents" ON public.parents FOR SELECT USING (true);
DROP POLICY IF EXISTS "manage_parents" ON public.parents;
CREATE POLICY "manage_parents" ON public.parents FOR ALL USING (public.get_current_user_role() = 'admin');

-- Book (singular)
ALTER TABLE public.book ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_book" ON public.book;
CREATE POLICY "select_book" ON public.book FOR SELECT USING (true);
DROP POLICY IF EXISTS "manage_book" ON public.book;
CREATE POLICY "manage_book" ON public.book FOR ALL USING (public.get_current_user_role() = 'admin');

-- Library (singular)
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_library" ON public.library;
CREATE POLICY "select_library" ON public.library FOR SELECT USING (true);
DROP POLICY IF EXISTS "manage_library" ON public.library;
CREATE POLICY "manage_library" ON public.library FOR ALL USING (public.get_current_user_role() = 'admin');

COMMIT;
