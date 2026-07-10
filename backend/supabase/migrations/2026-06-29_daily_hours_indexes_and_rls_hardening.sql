BEGIN;

-- Query-performance indexes for real-volume recompute and reads
CREATE INDEX IF NOT EXISTS idx_attendance_inst_date_student
  ON attendance(institution_id, date, student_id);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_inst_date_teacher
  ON teacher_attendance(institution_id, date, teacher_id);

CREATE INDEX IF NOT EXISTS idx_timetables_inst_day
  ON timetables(institution_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_class_enrollments_inst_class_student
  ON class_enrollments(institution_id, class_id, student_id);

CREATE INDEX IF NOT EXISTS idx_subjects_inst_teacher
  ON subjects(institution_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_subject_teachers_inst_subject_teacher
  ON subject_teachers(institution_id, subject_id, teacher_id);

-- Add explicit WITH CHECK predicates for write-path hardening under RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_hours_logs'
      AND policyname = 'strict_institution_isolation'
  ) THEN
    DROP POLICY "strict_institution_isolation" ON daily_hours_logs;
  END IF;

  CREATE POLICY "strict_institution_isolation" ON daily_hours_logs
  FOR ALL
  USING (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
  )
  WITH CHECK (
    institution_id = get_current_user_institution_id()
    OR get_current_user_role() = 'master_admin'
  );
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_hours_contributions'
      AND policyname = 'strict_institution_isolation'
  ) THEN
    DROP POLICY "strict_institution_isolation" ON daily_hours_contributions;
  END IF;

  CREATE POLICY "strict_institution_isolation" ON daily_hours_contributions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM daily_hours_logs l
      WHERE l.id = daily_hours_contributions.daily_hours_log_id
        AND (
          l.institution_id = get_current_user_institution_id()
          OR get_current_user_role() = 'master_admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM daily_hours_logs l
      WHERE l.id = daily_hours_contributions.daily_hours_log_id
        AND (
          l.institution_id = get_current_user_institution_id()
          OR get_current_user_role() = 'master_admin'
        )
    )
  );
END $$;

COMMIT;
