-- Migration: 20260912120000_cbc_native_curriculum.sql
-- CBC Native Curriculum Baseline: Bands, Two-Level Content, Descriptors, Tracks, Checkpoints

DO $$
BEGIN

  -- 1. Classes: Ensure CBC band support and prepare migration from form_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'cbc_band') THEN
    ALTER TABLE public.classes ADD COLUMN cbc_band TEXT DEFAULT 'primary';
  END IF;

  -- 2. Two-Level Subject Content Structure (Plain labels: Topic Area and Topic)
  CREATE TABLE IF NOT EXISTS public.subject_topic_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.subject_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    topic_area_id UUID NOT NULL REFERENCES public.subject_topic_areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 3. Topic Area tagging on Assignments & Resources
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'topic_area_id') THEN
    ALTER TABLE public.assignments ADD COLUMN topic_area_id UUID REFERENCES public.subject_topic_areas(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'topic_id') THEN
    ALTER TABLE public.assignments ADD COLUMN topic_id UUID REFERENCES public.subject_topics(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'topic_area_id') THEN
    ALTER TABLE public.resources ADD COLUMN topic_area_id UUID REFERENCES public.subject_topic_areas(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'topic_id') THEN
    ALTER TABLE public.resources ADD COLUMN topic_id UUID REFERENCES public.subject_topics(id) ON DELETE SET NULL;
  END IF;

  -- 4. Evidence-Based Descriptor Evaluations (Rubric / CBC Descriptor Assessments)
  -- 4 Descriptors: below_expectation, approaching_expectation, meeting_expectation, exceeding_expectation
  CREATE TABLE IF NOT EXISTS public.content_evidence_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    topic_area_id UUID NOT NULL REFERENCES public.subject_topic_areas(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.subject_topics(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('observation', 'project', 'task')),
    descriptor TEXT NOT NULL CHECK (descriptor IN ('below_expectation', 'approaching_expectation', 'meeting_expectation', 'exceeding_expectation')),
    teacher_notes TEXT,
    evaluated_by TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 5. Report Cards: Personal & Social Competencies and CBC Topic-Level Descriptors
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'learner_development') THEN
    ALTER TABLE public.report_cards ADD COLUMN learner_development JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_cards' AND column_name = 'curriculum_type') THEN
    ALTER TABLE public.report_cards ADD COLUMN curriculum_type TEXT DEFAULT 'cbc';
  END IF;

  -- 6. Senior Secondary Tracks (Grade 10–12) — Configurable per institution
  CREATE TABLE IF NOT EXISTS public.institution_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, name)
  );

  CREATE TABLE IF NOT EXISTS public.track_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.institution_tracks(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    is_compulsory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(track_id, subject_id)
  );

  CREATE TABLE IF NOT EXISTS public.student_track_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.institution_tracks(id) ON DELETE CASCADE,
    elective_subject_ids JSONB DEFAULT '[]'::jsonb,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, academic_year_id)
  );

  -- 7. External National Assessment Checkpoints (Lightweight historical tracking)
  CREATE TABLE IF NOT EXISTS public.national_assessment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    checkpoint_name TEXT NOT NULL CHECK (checkpoint_name IN ('KPSEA', 'KJSEA', 'KSCE_EQUIVALENT', 'SENIOR_CHECKPOINT')),
    assessment_year INTEGER NOT NULL,
    overall_descriptor TEXT NOT NULL,
    index_number TEXT,
    placement_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 8. Enable Row Level Security on newly created tables
  ALTER TABLE public.subject_topic_areas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.subject_topics ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.content_evidence_entries ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.institution_tracks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.track_subjects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.student_track_enrollments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.national_assessment_records ENABLE ROW LEVEL SECURITY;

  -- 9. RLS Policies (read / manage within institution or master_admin)
  DROP POLICY IF EXISTS "subject_topic_areas_institution_isolation" ON public.subject_topic_areas;
  CREATE POLICY "subject_topic_areas_institution_isolation" ON public.subject_topic_areas
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

  DROP POLICY IF EXISTS "subject_topics_institution_isolation" ON public.subject_topics;
  CREATE POLICY "subject_topics_institution_isolation" ON public.subject_topics
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

  DROP POLICY IF EXISTS "content_evidence_entries_institution_isolation" ON public.content_evidence_entries;
  CREATE POLICY "content_evidence_entries_institution_isolation" ON public.content_evidence_entries
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

  DROP POLICY IF EXISTS "institution_tracks_institution_isolation" ON public.institution_tracks;
  CREATE POLICY "institution_tracks_institution_isolation" ON public.institution_tracks
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

  DROP POLICY IF EXISTS "track_subjects_institution_isolation" ON public.track_subjects;
  CREATE POLICY "track_subjects_institution_isolation" ON public.track_subjects
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

  DROP POLICY IF EXISTS "student_track_enrollments_institution_isolation" ON public.student_track_enrollments;
  CREATE POLICY "student_track_enrollments_institution_isolation" ON public.student_track_enrollments
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

  DROP POLICY IF EXISTS "national_assessment_records_institution_isolation" ON public.national_assessment_records;
  CREATE POLICY "national_assessment_records_institution_isolation" ON public.national_assessment_records
    FOR ALL USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');

END $$;
