-- Migration: Add Free Trial and Subscription Fields to Institutions

-- Add subscription tracking fields to institutions
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial' CHECK (subscription_plan IN ('trial', 'basic', 'pro', 'premium'));
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT TRUE;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days';

-- Update existing institutions
UPDATE institutions SET 
  subscription_status = 'trial',
  subscription_plan = 'trial',
  has_used_trial = TRUE,
  trial_start_date = NOW(),
  trial_end_date = NOW() + INTERVAL '30 days'
WHERE trial_start_date IS NULL;
