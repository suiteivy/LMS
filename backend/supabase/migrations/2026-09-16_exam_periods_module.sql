-- Migration: Exam Periods Module
-- Creates exam_periods table for institutional exam period scheduling and gates exam paper creation.

CREATE TABLE IF NOT EXISTS public.exam_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    term TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline TIMESTAMPTZ,
    applicable_class_ids JSONB DEFAULT '[]'::jsonb,
    applicable_subject_ids JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add exam_period_id to exams table
ALTER TABLE public.exams
    ADD COLUMN IF NOT EXISTS exam_period_id UUID REFERENCES public.exam_periods(id) ON DELETE SET NULL;

-- Row Level Security
ALTER TABLE public.exam_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.exam_periods;
CREATE POLICY "strict_institution_isolation" ON public.exam_periods
    FOR ALL USING (
        institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin'
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_periods_inst_status ON public.exam_periods(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_exam_periods_term_year ON public.exam_periods(term, academic_year);
CREATE INDEX IF NOT EXISTS idx_exams_period_id ON public.exams(exam_period_id);
