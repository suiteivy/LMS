-- Migration to add email_domain to institutions table
-- Date: 2026-03-16

-- 1. Add email_domain column
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS email_domain TEXT;

-- 2. Populate initial email_domain for existing institutions
-- Converts "Momentum Institution" to "momentum.edu"
UPDATE institutions 
SET email_domain = LOWER(REPLACE(name, ' ', '')) || '.edu'
WHERE email_domain IS NULL;

-- 3. Add constraint to ensure email_domain is unique (optional but recommended for custom domains)
-- ALTER TABLE institutions ADD CONSTRAINT unique_email_domain UNIQUE (email_domain);
