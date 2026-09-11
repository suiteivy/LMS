-- Integrity and security advisory fixes
-- 1. Fix mutable search_path on tenant consistency functions
-- 2. Fix variable shadowing in support_tickets INSERT policy
-- 3. Reconcile user_sessions RLS policies (allow SELECT for own sessions to support Realtime)
-- 4. Clean up legacy duplicate RLS policies on class_enrollments, fee_structures, teacher_attendance
-- 5. Add RLS policies for un-policied tables (currencies, category_types, school_category_types, promotion_cycles, promotion_decisions)

-- ---------------------------------------------------------------------------
-- 1) Function search_path security hardening
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_class_enrollments_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_student_institution UUID;
    v_class_institution UUID;
BEGIN
    IF NEW.institution_id IS NULL THEN
        RAISE EXCEPTION 'class_enrollments.institution_id cannot be null';
    END IF;

    SELECT institution_id
    INTO v_student_institution
    FROM public.students
    WHERE id = NEW.student_id;

    SELECT institution_id
    INTO v_class_institution
    FROM public.classes
    WHERE id = NEW.class_id;

    IF v_student_institution IS NULL OR v_class_institution IS NULL THEN
        RAISE EXCEPTION 'class_enrollments references missing tenant source rows';
    END IF;

    IF NEW.institution_id IS DISTINCT FROM v_student_institution
       OR NEW.institution_id IS DISTINCT FROM v_class_institution THEN
        RAISE EXCEPTION 'class_enrollments tenant mismatch with referenced student/class';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_subject_teachers_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_subject_institution UUID;
    v_teacher_institution UUID;
BEGIN
    IF NEW.institution_id IS NULL THEN
        RAISE EXCEPTION 'subject_teachers.institution_id cannot be null';
    END IF;

    SELECT institution_id
    INTO v_subject_institution
    FROM public.subjects
    WHERE id = NEW.subject_id;

    SELECT institution_id
    INTO v_teacher_institution
    FROM public.teachers
    WHERE id = NEW.teacher_id;

    IF v_subject_institution IS NULL OR v_teacher_institution IS NULL THEN
        RAISE EXCEPTION 'subject_teachers references missing tenant source rows';
    END IF;

    IF NEW.institution_id IS DISTINCT FROM v_subject_institution
       OR NEW.institution_id IS DISTINCT FROM v_teacher_institution THEN
        RAISE EXCEPTION 'subject_teachers tenant mismatch with referenced subject/teacher';
    END IF;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Support tickets policy fix (qualify support_tickets.institution_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
    (
        user_id = auth.uid()
        AND institution_id = get_current_user_institution_id()
        AND (
            assigned_to_id IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.users u
                WHERE u.id = support_tickets.assigned_to_id
                  AND u.institution_id = support_tickets.institution_id
            )
        )
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
);

-- ---------------------------------------------------------------------------
-- 3) user_sessions RLS reconciliation
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "No client access user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_owner_all" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role full access user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;

CREATE POLICY "user_sessions_select_own" ON public.user_sessions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role full access user sessions" ON public.user_sessions
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4) Clean up legacy duplicate policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "class_enrollments_select" ON public.class_enrollments;
DROP POLICY IF EXISTS "fee_structures_all" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures_select" ON public.fee_structures;
DROP POLICY IF EXISTS "teacher_attendance_all" ON public.teacher_attendance;
DROP POLICY IF EXISTS "teacher_attendance_select" ON public.teacher_attendance;

-- ---------------------------------------------------------------------------
-- 5) RLS policies for un-policied tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "currencies_read_active" ON public.currencies;
CREATE POLICY "currencies_read_active" ON public.currencies
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "currencies_master_admin_manage" ON public.currencies;
CREATE POLICY "currencies_master_admin_manage" ON public.currencies
FOR ALL USING (get_current_user_role() = 'master_admin');

ALTER TABLE public.category_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "category_types_read" ON public.category_types;
CREATE POLICY "category_types_read" ON public.category_types
FOR SELECT USING (true);

DROP POLICY IF EXISTS "category_types_master_admin_manage" ON public.category_types;
CREATE POLICY "category_types_master_admin_manage" ON public.category_types
FOR ALL USING (get_current_user_role() = 'master_admin');

ALTER TABLE public.school_category_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_category_types_read" ON public.school_category_types;
CREATE POLICY "school_category_types_read" ON public.school_category_types
FOR SELECT USING (true);

DROP POLICY IF EXISTS "school_category_types_master_admin_manage" ON public.school_category_types;
CREATE POLICY "school_category_types_master_admin_manage" ON public.school_category_types
FOR ALL USING (get_current_user_role() = 'master_admin');

ALTER TABLE public.promotion_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promotion_cycles_select" ON public.promotion_cycles;
CREATE POLICY "promotion_cycles_select" ON public.promotion_cycles
FOR SELECT USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "promotion_cycles_manage" ON public.promotion_cycles;
CREATE POLICY "promotion_cycles_manage" ON public.promotion_cycles
FOR ALL USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

ALTER TABLE public.promotion_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promotion_decisions_select" ON public.promotion_decisions;
CREATE POLICY "promotion_decisions_select" ON public.promotion_decisions
FOR SELECT USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "promotion_decisions_manage" ON public.promotion_decisions;
CREATE POLICY "promotion_decisions_manage" ON public.promotion_decisions
FOR ALL USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);
