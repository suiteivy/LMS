-- Migration: Add level_ids column to subjects table for level scoping
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS level_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN subjects.level_ids IS 'Array of class_level IDs this subject is scoped to. NULL or empty array means available to all levels (default rule).';

-- Index for level array containment queries
CREATE INDEX IF NOT EXISTS idx_subjects_level_ids ON subjects USING GIN(level_ids);
