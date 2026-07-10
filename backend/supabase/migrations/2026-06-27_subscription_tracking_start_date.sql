-- Add dedicated subscription tracking start date column
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS subscription_tracking_start_date TIMESTAMPTZ;

-- Backfill from legacy trial_start_date when available
UPDATE public.institutions
SET subscription_tracking_start_date = COALESCE(subscription_tracking_start_date, trial_start_date, created_at)
WHERE subscription_tracking_start_date IS NULL;

-- Drop legacy trial_start_date column
ALTER TABLE public.institutions
DROP COLUMN IF EXISTS trial_start_date;

-- Optional cleanup of legacy trial_end_date (free trial model removed)
ALTER TABLE public.institutions
DROP COLUMN IF EXISTS trial_end_date;
