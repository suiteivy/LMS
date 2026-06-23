-- Migration: Add timezone field to institutions table
-- Date-driven active term resolution requires knowing the institution's timezone.

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

COMMENT ON COLUMN institutions.timezone IS 'IANA timezone identifier (e.g. Africa/Nairobi, America/New_York). Used for date-driven active term resolution.';

-- Set a sensible default for existing institutions (UTC is already the default)
-- Update specific institutions as needed via the admin settings UI.
