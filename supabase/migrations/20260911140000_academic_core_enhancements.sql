-- Migration: 20260911140000_academic_core_enhancements.sql
-- Academic Core: Resources target audience, attendance actual times & deadlines, assignments term & grading style

DO $$
BEGIN
  -- resources enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'target_audience') THEN
    ALTER TABLE resources ADD COLUMN target_audience text NOT NULL DEFAULT 'everyone';
    ALTER TABLE resources ADD CONSTRAINT chk_resources_target_audience CHECK (target_audience IN ('everyone', 'staff_only'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'class_id') THEN
    ALTER TABLE resources ADD COLUMN class_id uuid REFERENCES classes(id) ON DELETE SET NULL;
  END IF;

  -- attendance enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'actual_start_time') THEN
    ALTER TABLE attendance ADD COLUMN actual_start_time time;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'actual_end_time') THEN
    ALTER TABLE attendance ADD COLUMN actual_end_time time;
  END IF;

  -- terms enhancements (for deadline lock)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'terms' AND column_name = 'attendance_deadline') THEN
    ALTER TABLE terms ADD COLUMN attendance_deadline text DEFAULT '23:59';
  END IF;

  -- assignments enhancements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'term_id') THEN
    ALTER TABLE assignments ADD COLUMN term_id uuid REFERENCES terms(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'grading_style') THEN
    ALTER TABLE assignments ADD COLUMN grading_style text DEFAULT 'points';
  END IF;
END $$;
