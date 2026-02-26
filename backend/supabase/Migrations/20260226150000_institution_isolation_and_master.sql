-- Migration: Institution Isolation and Master Admin Flag
-- Created: 2026-02-26

-- 1. Add is_master to admins
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- 2. Expand institution_id to missing tables for strict scoping
ALTER TABLE public.bursaries ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.library_config ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.fund_allocations ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.teacher_payouts ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.parent_students ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);

-- 3. Update handle_user_role_entry trigger to designate first admin as Master
CREATE OR REPLACE FUNCTION public.handle_user_role_entry()
RETURNS trigger AS $$
DECLARE
    v_is_master BOOLEAN := false;
BEGIN
  IF NEW.role = 'admin' THEN
    -- Check if this is the first admin for this institution
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE institution_id = NEW.institution_id) THEN
        v_is_master := true;
    END IF;
    INSERT INTO public.admins (user_id, institution_id, is_master) 
    VALUES (NEW.id, NEW.institution_id, v_is_master) 
    ON CONFLICT (user_id) DO UPDATE SET is_master = EXCLUDED.is_master;
  ELSIF NEW.role = 'teacher' THEN
    INSERT INTO public.teachers (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'student' THEN
    INSERT INTO public.students (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'parent' THEN
    INSERT INTO public.parents (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  ELSIF NEW.role = 'bursary' THEN
    INSERT INTO public.bursars (user_id, institution_id) VALUES (NEW.id, NEW.institution_id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Master Admin Status Transfer Function
CREATE OR REPLACE FUNCTION public.transfer_master_status(p_old_admin_user_id UUID, p_new_admin_user_id UUID)
RETURNS void AS $$
DECLARE
    v_inst_id UUID;
BEGIN
    -- Only the current Master Admin can transfer status
    SELECT institution_id INTO v_inst_id FROM public.admins WHERE user_id = p_old_admin_user_id AND is_master = true;
    IF v_inst_id IS NULL THEN
        RAISE EXCEPTION 'Sender is not a Master Admin';
    END IF;

    -- Recipient must be an admin in the same institution
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = p_new_admin_user_id AND institution_id = v_inst_id) THEN
        RAISE EXCEPTION 'Recipient must be an admin in the same institution';
    END IF;

    UPDATE public.admins SET is_master = false WHERE user_id = p_old_admin_user_id;
    UPDATE public.admins SET is_master = true WHERE user_id = p_new_admin_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Strict Institution-level Isolation (RLS Refresh)
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institution_id FROM public.users WHERE id = auth.uid();
$$;

DO $$
DECLARE
    t text;
    tables_to_scope text[] := ARRAY[
        'users', 'admins', 'teachers', 'students', 'parents', 'bursars', 
        'classes', 'enrollments', 'subjects', 'lessons', 'timetables', 
        'assignments', 'submissions', 'attendance', 'resources', 
        'announcements', 'exams', 'exam_results', 'books', 'borrowed_books', 
        'fee_structures', 'payments', 'bursaries', 'bursary_applications', 
        'funds', 'fund_allocations', 'financial_transactions', 'teacher_payouts', 
        'teacher_attendance', 'messages', 'notifications'
    ];
BEGIN
    FOR t IN SELECT unnest(tables_to_scope)
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "strict_institution_isolation" ON public.%I', t);
        
        IF t = 'users' THEN
            -- Users can see themselves OR anyone in their institution
            EXECUTE format('CREATE POLICY "strict_institution_isolation" ON public.%I FOR ALL USING (id = auth.uid() OR institution_id = public.get_current_user_institution_id())', t);
        ELSE
            -- Strict isolation based on institution_id
            EXECUTE format('CREATE POLICY "strict_institution_isolation" ON public.%I FOR ALL USING (institution_id = public.get_current_user_institution_id())', t);
        END IF;
    END LOOP;
END $$;

-- Policy for institutions themselves: Admins can see their own institution details
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.institutions;
CREATE POLICY "strict_institution_isolation" ON public.institutions FOR ALL USING (id = public.get_current_user_institution_id());
