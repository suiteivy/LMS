-- Migration: 2026-09-19_academic_transcripts_and_report_configurations.sql
-- Description: Adds tables for admin-configured report criteria across Term, Year, and Overall classifications, plus audit tracking.

-- 1. Academic Report & Transcript Configurations (Per Institution, Per Classification)
CREATE TABLE IF NOT EXISTS public.academic_report_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    report_classification TEXT NOT NULL CHECK (report_classification IN ('term', 'year', 'overall')),
    show_fee_balance BOOLEAN NOT NULL DEFAULT true,
    show_pending_section BOOLEAN NOT NULL DEFAULT true,
    show_compulsory_elective BOOLEAN NOT NULL DEFAULT true,
    show_summary_averages BOOLEAN NOT NULL DEFAULT true,
    summary_format TEXT NOT NULL DEFAULT 'auto' CHECK (summary_format IN ('auto', 'numeric', 'descriptor_distribution')),
    show_key_legend BOOLEAN NOT NULL DEFAULT true,
    show_teacher_remarks BOOLEAN NOT NULL DEFAULT false,
    show_attendance BOOLEAN NOT NULL DEFAULT true,
    overall_layout_mode TEXT NOT NULL DEFAULT 'period_grouped' CHECK (overall_layout_mode IN ('period_grouped', 'consolidated_subjects')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_inst_report_class UNIQUE(institution_id, report_classification)
);

CREATE INDEX IF NOT EXISTS idx_academic_report_configs_inst
ON public.academic_report_configurations(institution_id, report_classification);

-- 2. Audit table for report downloads and generations
CREATE TABLE IF NOT EXISTS public.academic_report_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    classification TEXT NOT NULL CHECK (classification IN ('term', 'year', 'overall')),
    period_identifier TEXT NOT NULL,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academic_report_downloads_student
ON public.academic_report_downloads(institution_id, student_id, classification);

-- 3. Seed default configurations for all active institutions
INSERT INTO public.academic_report_configurations (
    institution_id,
    report_classification,
    show_fee_balance,
    show_pending_section,
    show_compulsory_elective,
    show_summary_averages,
    summary_format,
    show_key_legend,
    show_teacher_remarks,
    show_attendance,
    overall_layout_mode
)
SELECT 
    i.id,
    c.classification,
    c.show_fee_balance,
    c.show_pending_section,
    c.show_compulsory_elective,
    c.show_summary_averages,
    'auto',
    true,
    false,
    c.show_attendance,
    'period_grouped'
FROM public.institutions i
CROSS JOIN (
    VALUES 
        ('term', true, true, true, true, true),
        ('year', true, true, true, true, true),
        ('overall', true, true, true, true, false)
) AS c(classification, show_fee_balance, show_pending_section, show_compulsory_elective, show_summary_averages, show_attendance)
ON CONFLICT (institution_id, report_classification) DO NOTHING;
