BEGIN;

CREATE TABLE IF NOT EXISTS daily_hours_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL,
  person_type TEXT NOT NULL CHECK (person_type IN ('TEACHER', 'STUDENT')),
  date DATE NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, person_id, person_type, date)
);

CREATE TABLE IF NOT EXISTS daily_hours_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_hours_log_id UUID NOT NULL REFERENCES daily_hours_logs(id) ON DELETE CASCADE,
  timetable_entry_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (daily_hours_log_id, timetable_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_hours_logs_scope_date
  ON daily_hours_logs(institution_id, person_type, person_id, date)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_daily_hours_contrib_log
  ON daily_hours_contributions(daily_hours_log_id);

ALTER TABLE daily_hours_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_hours_logs'
      AND policyname = 'strict_institution_isolation'
  ) THEN
    CREATE POLICY "strict_institution_isolation" ON daily_hours_logs
    FOR ALL
    USING (institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin');
  END IF;
END $$;

ALTER TABLE daily_hours_contributions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_hours_contributions'
      AND policyname = 'strict_institution_isolation'
  ) THEN
    CREATE POLICY "strict_institution_isolation" ON daily_hours_contributions
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM daily_hours_logs l
        WHERE l.id = daily_hours_contributions.daily_hours_log_id
          AND (l.institution_id = get_current_user_institution_id() OR get_current_user_role() = 'master_admin')
      )
    );
  END IF;
END $$;

COMMIT;
