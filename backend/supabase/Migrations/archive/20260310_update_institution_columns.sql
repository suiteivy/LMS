-- Migration: Add addon_diary and custom_student_limit to institutions
-- Date: 2026-03-10

-- Add addon_diary column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'institutions' AND COLUMN_NAME = 'addon_diary') THEN
        ALTER TABLE institutions ADD COLUMN addon_diary BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add custom_student_limit column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'institutions' AND COLUMN_NAME = 'custom_student_limit') THEN
        ALTER TABLE institutions ADD COLUMN custom_student_limit INTEGER;
    END IF;
END $$;

-- Update the check constraint for subscription_plan to ensure 'custom' is included (if not already)
-- Note: It's already in the schema.sql as 'custom', but we'll ensure it's allowed.
-- ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_subscription_plan_check;
-- ALTER TABLE institutions ADD CONSTRAINT institutions_subscription_plan_check CHECK (subscription_plan IN ('trial', 'beta_free', 'basic', 'pro', 'premium', 'custom'));
