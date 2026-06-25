-- Enforce one active class enrollment per student.
-- 1) Deduplicate existing rows by keeping the most recent enrollment per student.
-- 2) Add a unique constraint/index on student_id.

BEGIN;

WITH ranked AS (
  SELECT
    id,
    student_id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id
      ORDER BY enrolled_at DESC, id DESC
    ) AS rn
  FROM public.class_enrollments
)
DELETE FROM public.class_enrollments ce
USING ranked r
WHERE ce.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS class_enrollments_student_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS class_enrollments_student_id_unique
  ON public.class_enrollments (student_id);

COMMIT;
