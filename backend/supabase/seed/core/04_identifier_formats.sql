-- ============================================================================
-- Seed File: 04_identifier_formats.sql
-- Environment: Core (All environments)
-- Purpose: Canonical entity identifier formatting rules (Student 0001, Staff ST0001, Parent PA0001, Admin AD0001).
-- ============================================================================

INSERT INTO public.identifier_formats (person_type, prefix, min_digits, updated_at)
VALUES
    ('student', '', 4, NOW()),
    ('staff', 'ST', 4, NOW()),
    ('parent', 'PA', 4, NOW()),
    ('admin', 'AD', 4, NOW())
ON CONFLICT (person_type) DO UPDATE SET
    prefix = EXCLUDED.prefix,
    min_digits = EXCLUDED.min_digits,
    updated_at = NOW();
