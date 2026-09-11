-- Post-apply hardening fixes for already-applied migration versions.
-- This migration forward-applies policy fixes without rewriting remote history.

-- ---------------------------------------------------------------------------
-- 1) Academic reports: allow master_admin global read while preserving tenant
--    scope for non-master roles.
-- ---------------------------------------------------------------------------
ALTER TABLE public.academic_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_reports_isolation" ON public.academic_reports;
CREATE POLICY "academic_reports_isolation" ON public.academic_reports
FOR SELECT USING (
    (
        get_current_user_role() = 'master_admin'
        OR (
            institution_id = get_current_user_institution_id()
            AND (
                get_current_user_role() IN ('admin', 'teacher', 'master_admin')
                OR (status = 'published' AND (
                    student_id = current_user_student_id()
                    OR EXISTS (
                        SELECT 1
                        FROM public.parent_students ps
                        JOIN public.parents p ON ps.parent_id = p.id
                        WHERE ps.student_id = public.academic_reports.student_id
                          AND p.user_id = auth.uid()
                    )
                ))
            )
        )
    )
);

-- ---------------------------------------------------------------------------
-- 2) Ticket messages: prevent sender impersonation.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

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
