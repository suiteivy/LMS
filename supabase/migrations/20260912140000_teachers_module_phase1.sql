-- Migration: 20260912140000_teachers_module_phase1.sql
-- Phase 1: Critical bug fixes for Teachers Module
-- A3: Create subject_classes if missing (fixes attendance breakage)
-- A2: Update v_classes_detailed view for CBC migration compatibility
-- D1: Add confirmation_status to teacher_attendance for self-check-in sync
-- B7: Create record_change_log for audit trail

DO $$
BEGIN

  -- ============================================================
  -- A3: Ensure subject_classes table exists
  -- The table is defined in schema.sql but may not have been created
  -- in the live Supabase project, causing PGRST205 errors in attendance
  -- and exams controllers.
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.subject_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id, class_id)
  );

  ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;

  -- Drop first to avoid duplicate policy errors on re-run
  DROP POLICY IF EXISTS "strict_institution_isolation" ON public.subject_classes;
  CREATE POLICY "strict_institution_isolation" ON public.subject_classes
    FOR ALL USING (
      institution_id = get_current_user_institution_id()
      OR get_current_user_role() = 'master_admin'
    );

  -- ============================================================
  -- A2: Recreate v_classes_detailed to include cbc_band and
  -- make form_level ordering optional (CBC migration compatibility).
  -- The old view orders by form_level which is the legacy field
  -- being replaced; this view now includes cbc_band and class_type.
  -- ============================================================
  DROP VIEW IF EXISTS public.v_classes_detailed;
  CREATE VIEW public.v_classes_detailed AS
    SELECT
      c.id,
      c.institution_id,
      c.created_at,
      c.updated_at,
      c.teacher_id,
      c.capacity,
      c.grade_level,
      c.form_level,
      c.stream,
      c.display_name,
      c.class_type,
      c.cbc_band,
      COALESCE(c.display_name,
        CASE
          WHEN c.class_type = 'Form' AND c.form_level IS NOT NULL
            THEN 'Form ' || c.form_level || COALESCE(' ' || c.stream, '')
          WHEN c.grade_level IS NOT NULL
            THEN 'Grade ' || c.grade_level || COALESCE(' ' || c.stream, '')
          ELSE 'Class'
        END
      ) AS name,
      i.name AS institution_name,
      sc.name AS school_category_name,
      sc.level_label
    FROM public.classes c
      JOIN public.institutions i ON c.institution_id = i.id
      LEFT JOIN public.school_categories sc ON i.category_id = sc.id;

  -- ============================================================
  -- D1: Add confirmation_status to teacher_attendance
  -- Allows distinguishing self-reported from admin-confirmed attendance
  -- ============================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teacher_attendance') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teacher_attendance' AND column_name = 'confirmation_status') THEN
      ALTER TABLE public.teacher_attendance ADD COLUMN confirmation_status TEXT DEFAULT 'admin_confirmed'
        CHECK (confirmation_status IN ('self_reported', 'admin_confirmed'));
    END IF;
  END IF;

  -- Also check if there is an `attendance` table used for teacher attendance
  -- (some deployments use a unified attendance table with a type column)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'confirmation_status') THEN
      ALTER TABLE public.attendance ADD COLUMN confirmation_status TEXT DEFAULT NULL;
    END IF;
  END IF;

  -- ============================================================
  -- B7: Create record_change_log for audit trail on modifications
  -- Required for grade corrections, report card edits, exam results
  -- ============================================================
  CREATE TABLE IF NOT EXISTS public.record_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    changed_by UUID NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE public.record_change_log ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "admin_and_self_read" ON public.record_change_log;
  CREATE POLICY "admin_and_self_read" ON public.record_change_log
    FOR ALL USING (
      institution_id = get_current_user_institution_id()
      AND (
        get_current_user_role() IN ('admin', 'master_admin')
        OR changed_by = auth.uid()
      )
    );

END $$;
