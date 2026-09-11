-- Multi-tenant integrity hardening for cross-module backfill.
-- Adds tenant consistency guards and tightens support ticket tenant checks.

-- ---------------------------------------------------------------------------
-- 1) Tenant consistency guards for class_enrollments
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_class_enrollments_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS tr_class_enrollments_tenant_consistency ON public.class_enrollments;
CREATE TRIGGER tr_class_enrollments_tenant_consistency
BEFORE INSERT OR UPDATE ON public.class_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_class_enrollments_tenant_consistency();

-- ---------------------------------------------------------------------------
-- 2) Tenant consistency guards for subject_teachers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_subject_teachers_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS tr_subject_teachers_tenant_consistency ON public.subject_teachers;
CREATE TRIGGER tr_subject_teachers_tenant_consistency
BEFORE INSERT OR UPDATE ON public.subject_teachers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_subject_teachers_tenant_consistency();

-- ---------------------------------------------------------------------------
-- 3) Tighten support ticket tenant-scoped policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
USING (
    (
        institution_id = get_current_user_institution_id()
        AND (user_id = auth.uid() OR assigned_to_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
);

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
                WHERE u.id = assigned_to_id
                  AND u.institution_id = institution_id
            )
        )
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
);

DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.support_tickets st
        WHERE st.id = public.ticket_messages.ticket_id
          AND st.institution_id = get_current_user_institution_id()
          AND (st.user_id = auth.uid() OR st.assigned_to_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
);

DROP POLICY IF EXISTS "Users can add messages to their tickets" ON public.ticket_messages;
CREATE POLICY "Users can add messages to their tickets"
ON public.ticket_messages
FOR INSERT
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.support_tickets st
        WHERE st.id = public.ticket_messages.ticket_id
          AND (
              (
                  st.institution_id = get_current_user_institution_id()
                  AND (st.user_id = auth.uid() OR st.assigned_to_id = auth.uid())
              )
              OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
          )
    )
);
