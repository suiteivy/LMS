-- Migration: Configurable Assessment Weighting and Subject Teacher Report Card Assessment Selection
-- Created: 2026-09-15

CREATE TABLE IF NOT EXISTS institution_assessment_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    exam_weight NUMERIC NOT NULL DEFAULT 60,
    continuous_assessment_weight NUMERIC NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(institution_id, subject_id)
);

CREATE TABLE IF NOT EXISTS subject_report_card_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL,
    assessment_type TEXT NOT NULL DEFAULT 'assignment',
    is_included BOOLEAN NOT NULL DEFAULT true,
    selected_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(institution_id, subject_id, class_id, term_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_inst_assess_weights ON institution_assessment_weights(institution_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_subj_report_card_assess ON subject_report_card_assessments(institution_id, subject_id, class_id, term_id);
