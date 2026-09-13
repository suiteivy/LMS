-- Data Retention & Lifecycle Management
-- Adds soft deletion, departure timestamps, and archive markers for students and teachers

-- 1. Add departed_at and status fields to students if not present
ALTER TABLE IF EXISTS students
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'graduated', 'withdrawn', 'suspended', 'expelled')),
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 2. Add departed_at and status fields to teachers if not present
ALTER TABLE IF EXISTS teachers
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resigned', 'retired', 'terminated', 'on_leave')),
  ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 3. Add soft delete and retention columns to academic_reports & exam_results
ALTER TABLE IF EXISTS academic_reports
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years'),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS exam_results
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years'),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- 4. Set retention_until for existing records
UPDATE academic_reports
SET retention_until = COALESCE(retention_until, created_at + INTERVAL '7 years')
WHERE retention_until IS NULL;

UPDATE exam_results
SET retention_until = COALESCE(retention_until, created_at + INTERVAL '7 years')
WHERE retention_until IS NULL;

-- 5. Indexes for retention pruning queries
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);
CREATE INDEX IF NOT EXISTS idx_academic_reports_retention ON academic_reports(retention_until);
CREATE INDEX IF NOT EXISTS idx_exam_results_retention ON exam_results(retention_until);
CREATE INDEX IF NOT EXISTS idx_students_departed_at ON students(departed_at);
CREATE INDEX IF NOT EXISTS idx_teachers_departed_at ON teachers(departed_at);
