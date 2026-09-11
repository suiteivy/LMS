-- Cross-module integrity phase 2
-- Item 1 runtime-critical schema backfill into primary migration history.

-- ---------------------------------------------------------------------------
-- 1) Class enrollments (attendance/roster dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    institution_id UUID REFERENCES public.institutions(id),
    UNIQUE(student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id
    ON public.class_enrollments(class_id);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_institution_id
    ON public.class_enrollments(institution_id);

-- ---------------------------------------------------------------------------
-- 2) Subject teachers (subject staffing dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_id
    ON public.subject_teachers(teacher_id);

CREATE INDEX IF NOT EXISTS idx_subject_teachers_institution_id
    ON public.subject_teachers(institution_id);

-- ---------------------------------------------------------------------------
-- 3) Academic reports (reporting dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    report_type TEXT CHECK (report_type IN ('end-of-term', 'individual', 'statistical', 'ranking')) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_reports_institution_term_year
    ON public.academic_reports(institution_id, term, academic_year);

CREATE INDEX IF NOT EXISTS idx_academic_reports_student_id
    ON public.academic_reports(student_id);

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

DROP POLICY IF EXISTS "academic_reports_insert" ON public.academic_reports;
CREATE POLICY "academic_reports_insert" ON public.academic_reports
FOR INSERT WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "academic_reports_update" ON public.academic_reports;
CREATE POLICY "academic_reports_update" ON public.academic_reports
FOR UPDATE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "academic_reports_delete" ON public.academic_reports;
CREATE POLICY "academic_reports_delete" ON public.academic_reports
FOR DELETE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

-- ---------------------------------------------------------------------------
-- 4) Fee structures (finance dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    due_date DATE,
    academic_year TEXT,
    academic_year_id UUID,
    term TEXT,
    term_id UUID,
    level_scope TEXT,
    level_value INTEGER,
    level_from INTEGER,
    level_to INTEGER,
    is_active BOOLEAN DEFAULT true,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_institution_active_due
    ON public.fee_structures(institution_id, is_active, due_date);

-- ---------------------------------------------------------------------------
-- 5) Financial transactions (finance ledger dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES public.institutions(id),
    type TEXT CHECK (type IN ('fee_payment', 'salary_payout', 'expense', 'grant', 'other')),
    direction TEXT CHECK (direction IN ('inflow', 'outflow')),
    amount NUMERIC(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    method TEXT,
    status TEXT DEFAULT 'completed',
    reference_id TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_institution_date
    ON public.financial_transactions(institution_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_status
    ON public.financial_transactions(type, status);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id
    ON public.financial_transactions(user_id);

-- ---------------------------------------------------------------------------
-- 6) Teacher attendance (teacher ops dependency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    notes TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date
    ON public.teacher_attendance(teacher_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_institution_date
    ON public.teacher_attendance(institution_id, date DESC);

-- ---------------------------------------------------------------------------
-- 7) RLS parity for newly backfilled runtime tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.class_enrollments;
CREATE POLICY "strict_institution_isolation" ON public.class_enrollments
FOR SELECT USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "class_enrollments_insert" ON public.class_enrollments;
CREATE POLICY "class_enrollments_insert" ON public.class_enrollments
FOR INSERT WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "class_enrollments_update" ON public.class_enrollments;
CREATE POLICY "class_enrollments_update" ON public.class_enrollments
FOR UPDATE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "class_enrollments_delete" ON public.class_enrollments;
CREATE POLICY "class_enrollments_delete" ON public.class_enrollments
FOR DELETE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.subject_teachers;
CREATE POLICY "strict_institution_isolation" ON public.subject_teachers
FOR SELECT USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "subject_teachers_insert" ON public.subject_teachers;
CREATE POLICY "subject_teachers_insert" ON public.subject_teachers
FOR INSERT WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "subject_teachers_update" ON public.subject_teachers;
CREATE POLICY "subject_teachers_update" ON public.subject_teachers
FOR UPDATE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "subject_teachers_delete" ON public.subject_teachers;
CREATE POLICY "subject_teachers_delete" ON public.subject_teachers
FOR DELETE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.fee_structures;
CREATE POLICY "strict_institution_isolation" ON public.fee_structures
FOR SELECT USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "fee_structures_insert" ON public.fee_structures;
CREATE POLICY "fee_structures_insert" ON public.fee_structures
FOR INSERT WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "fee_structures_update" ON public.fee_structures;
CREATE POLICY "fee_structures_update" ON public.fee_structures
FOR UPDATE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "fee_structures_delete" ON public.fee_structures;
CREATE POLICY "fee_structures_delete" ON public.fee_structures
FOR DELETE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.financial_transactions;
CREATE POLICY "strict_institution_isolation" ON public.financial_transactions
FOR SELECT USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "financial_transactions_insert" ON public.financial_transactions;
CREATE POLICY "financial_transactions_insert" ON public.financial_transactions
FOR INSERT WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "financial_transactions_update" ON public.financial_transactions;
CREATE POLICY "financial_transactions_update" ON public.financial_transactions
FOR UPDATE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "financial_transactions_delete" ON public.financial_transactions;
CREATE POLICY "financial_transactions_delete" ON public.financial_transactions
FOR DELETE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.teacher_attendance;
CREATE POLICY "strict_institution_isolation" ON public.teacher_attendance
FOR SELECT USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "teacher_attendance_insert" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_insert" ON public.teacher_attendance
FOR INSERT WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "teacher_attendance_update" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_update" ON public.teacher_attendance
FOR UPDATE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
)
WITH CHECK (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "teacher_attendance_delete" ON public.teacher_attendance;
CREATE POLICY "teacher_attendance_delete" ON public.teacher_attendance
FOR DELETE USING (
    (institution_id = get_current_user_institution_id() AND get_current_user_role() IN ('admin', 'teacher', 'master_admin'))
    OR get_current_user_role() = 'master_admin'
);
