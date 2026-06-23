-- ==========================================
-- MIGRATION: Add grading_scale_id to students
-- Allows per-student grading scale linkage
-- Date: 2026-06-23
-- ==========================================

-- Add nullable FK column — nullable so existing students
-- can fall back to institution default scale.
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS grading_scale_id UUID
    REFERENCES grading_scales(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_grading_scale
    ON students(grading_scale_id);

-- Optional: backfill from institution default
-- Uncomment if you want to link all students to their institution's
-- most-recently-created active scale:
-- UPDATE students s
-- SET grading_scale_id = (
--     SELECT gs.id
--     FROM grading_scales gs
--     WHERE gs.institution_id = s.institution_id
--       AND gs.is_active = true
--     ORDER BY gs.created_at DESC
--     LIMIT 1
-- )
-- WHERE s.grading_scale_id IS NULL;
