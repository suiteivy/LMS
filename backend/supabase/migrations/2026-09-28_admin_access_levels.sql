-- Migration: 2026-09-28_admin_access_levels.sql
-- Description: Add access_level to admins table ('read_write' | 'read_only')

ALTER TABLE public.admins
    ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'read_write' CHECK (access_level IN ('read_write', 'read_only'));

-- Ensure main admins and existing records have valid access_level
UPDATE public.admins
SET access_level = 'read_write'
WHERE is_main = true OR access_level IS NULL;

-- Enforce invariant: Main admin must always have read_write access
CREATE OR REPLACE FUNCTION check_admin_access_level_invariants()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_main = true AND NEW.access_level != 'read_write' THEN
        NEW.access_level := 'read_write';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_admin_access_level_invariants ON public.admins;
CREATE TRIGGER tr_admin_access_level_invariants
BEFORE INSERT OR UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION check_admin_access_level_invariants();
