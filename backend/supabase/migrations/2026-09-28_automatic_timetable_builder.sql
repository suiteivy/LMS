-- Migration: 2026-09-28_automatic_timetable_builder.sql
-- Standalone Automatic Timetable Builder: schema extensions, teacher assignment,
-- room field redefinition backfill, and institution timetable configs.

DO $$
BEGIN

  -- 1. Timetables: Add explicit teacher_id for direct teacher assignment per slot
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timetables' AND column_name = 'teacher_id'
  ) THEN
    ALTER TABLE public.timetables 
      ADD COLUMN teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL;
  END IF;

  -- 2. Timetables: Add draft status flag
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timetables' AND column_name = 'is_draft'
  ) THEN
    ALTER TABLE public.timetables 
      ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- 3. Timetables: Add elective slot indicators for Senior Secondary parallel sessions (Part C)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timetables' AND column_name = 'is_elective'
  ) THEN
    ALTER TABLE public.timetables 
      ADD COLUMN is_elective BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timetables' AND column_name = 'track_id'
  ) THEN
    ALTER TABLE public.timetables 
      ADD COLUMN track_id UUID REFERENCES public.institution_tracks(id) ON DELETE SET NULL;
  END IF;

  -- 4. Create indexes for high performance querying
  CREATE INDEX IF NOT EXISTS idx_timetables_teacher_id ON public.timetables(teacher_id);
  CREATE INDEX IF NOT EXISTS idx_timetables_is_draft ON public.timetables(is_draft);
  CREATE INDEX IF NOT EXISTS idx_timetables_track_id ON public.timetables(track_id);

  -- 5. Timetable Configurations Table (Institution-scoped)
  CREATE TABLE IF NOT EXISTS public.timetable_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    school_start_time TIME NOT NULL DEFAULT '08:00',
    school_end_time TIME NOT NULL DEFAULT '16:00',
    period_duration_minutes INTEGER NOT NULL DEFAULT 40,
    active_days JSONB NOT NULL DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    break_periods JSONB NOT NULL DEFAULT '[
      {"name": "Morning Break", "start_time": "10:00", "end_time": "10:30"},
      {"name": "Lunch Break", "start_time": "12:30", "end_time": "13:30"}
    ]'::jsonb,
    subject_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    special_constraints JSONB NOT NULL DEFAULT '{
      "double_period_subjects": [],
      "morning_only_subjects": [],
      "no_back_to_back_subjects": []
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_timetable_configs_institution UNIQUE (institution_id)
  );

  -- Enable RLS
  ALTER TABLE public.timetable_configs ENABLE ROW LEVEL SECURITY;

  -- RLS policies for timetable_configs
  DROP POLICY IF EXISTS "timetable_configs_institution_isolation" ON public.timetable_configs;
  CREATE POLICY "timetable_configs_institution_isolation" ON public.timetable_configs
    FOR ALL USING (
      institution_id = get_current_user_institution_id() 
      OR get_current_user_role() = 'master_admin'
    );

  -- 6. Backfill existing timetables: populate teacher_id from subjects.teacher_id where null
  UPDATE public.timetables t
  SET teacher_id = s.teacher_id
  FROM public.subjects s
  WHERE t.subject_id = s.id
    AND t.teacher_id IS NULL
    AND s.teacher_id IS NOT NULL;

  -- 7. Backfill existing timetables: enforce room_number redefinition (class identity)
  UPDATE public.timetables t
  SET room_number = COALESCE(
    c.display_name,
    CASE 
      WHEN c.grade_level IS NOT NULL AND c.stream IS NOT NULL THEN 'Grade ' || c.grade_level || ' ' || c.stream
      WHEN c.grade_level IS NOT NULL THEN 'Grade ' || c.grade_level
      WHEN c.form_level IS NOT NULL AND c.stream IS NOT NULL THEN 'Form ' || c.form_level || ' ' || c.stream
      WHEN c.form_level IS NOT NULL THEN 'Form ' || c.form_level
      ELSE 'Class'
    END
  )
  FROM public.classes c
  WHERE t.class_id = c.id
    AND (
      t.room_number IS NULL 
      OR t.room_number = '' 
      OR t.room_number ~* '^Room'
      OR t.room_number ~* '^Lab'
      OR t.room_number ~* '^Hall'
    );

END $$;
