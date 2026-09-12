-- Migration: 20260912123500_education_level_vocabulary.sql
-- Description: Standardize vocabulary to "Education Level" (playgroup, pre_primary, primary, junior_secondary, senior_secondary)

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS education_level TEXT;
UPDATE public.classes SET education_level = cbc_band WHERE education_level IS NULL AND cbc_band IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_classes_education_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.education_level IS NOT NULL AND NEW.cbc_band IS NULL THEN
    NEW.cbc_band := NEW.education_level;
  ELSIF NEW.cbc_band IS NOT NULL AND NEW.education_level IS NULL THEN
    NEW.education_level := NEW.cbc_band;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_classes_education_level ON public.classes;
CREATE TRIGGER trg_sync_classes_education_level
BEFORE INSERT OR UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION sync_classes_education_level();
