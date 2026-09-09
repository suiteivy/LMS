-- Drop hire_date and specialization from teachers table
-- Item #1 of Enhancements batch: These fields are unused in active workflows
-- Decision: Hard-drop (no historical data needed)
ALTER TABLE teachers DROP COLUMN IF EXISTS hire_date;
ALTER TABLE teachers DROP COLUMN IF EXISTS specialization;
