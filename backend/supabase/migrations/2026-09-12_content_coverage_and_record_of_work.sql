-- Migration: Content Coverage Plans and Record of Work (Phase 6 / Part J)
-- Adds subject coverage plans, HOD roles, record of work, exam deadlines, and competency bands.

-- 1. Subject Coverage Plans (J1)
CREATE TABLE IF NOT EXISTS public.subject_coverage_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    strand TEXT,
    sub_strand TEXT,
    week_start INTEGER,
    week_end INTEGER,
    duration_weeks INTEGER,
    order_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    target_completion_date DATE,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HOD fields on subjects and subject_teachers
ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS hod_teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.subject_teachers
    ADD COLUMN IF NOT EXISTS is_hod BOOLEAN DEFAULT false;

-- 3. Record of Work (J2)
CREATE TABLE IF NOT EXISTS public.record_of_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    coverage_plan_id UUID REFERENCES public.subject_coverage_plans(id) ON DELETE SET NULL,
    week_number INTEGER NOT NULL,
    lesson_number INTEGER,
    date DATE,
    topic TEXT NOT NULL,
    sub_topic TEXT,
    learning_objectives TEXT,
    activities_references TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'deferred')),
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    remarks TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Exams Enhancements (J3)
ALTER TABLE public.exams
    ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ;

ALTER TABLE public.exam_results
    ADD COLUMN IF NOT EXISTS competency_band TEXT;

-- 5. Row Level Security
ALTER TABLE public.subject_coverage_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.subject_coverage_plans;
CREATE POLICY "strict_institution_isolation" ON public.subject_coverage_plans
    FOR ALL USING (
        institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin'
    );

ALTER TABLE public.record_of_work ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.record_of_work;
CREATE POLICY "strict_institution_isolation" ON public.record_of_work
    FOR ALL USING (
        institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin'
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coverage_subject_term ON public.subject_coverage_plans(subject_id, term, academic_year);
CREATE INDEX IF NOT EXISTS idx_record_of_work_teacher ON public.record_of_work(teacher_id, subject_id, week_number);
