-- Migration: 20260920121500_allow_early_years_class_levels_check_constraint.sql
-- Description: Update class_levels check constraint to support Early Years levels: Playgroup (-2), PP1 (-1), PP2 (0)

ALTER TABLE public.class_levels DROP CONSTRAINT IF EXISTS chk_class_levels_level_number_positive;
ALTER TABLE public.class_levels DROP CONSTRAINT IF EXISTS chk_class_levels_level_number_valid;

ALTER TABLE public.class_levels ADD CONSTRAINT chk_class_levels_level_number_valid CHECK (level_number >= -2);
