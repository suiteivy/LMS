-- Migration: Remove strict name uniqueness constraint per institution
-- This allows duplicate names (common for students) while relying on unique emails and IDs.

DROP INDEX IF EXISTS idx_unique_user_name_per_institution;
