-- Auto-publish any pending resources and default future inserts to approved
UPDATE public.resources
SET status = 'approved'
WHERE status = 'pending';

-- Alter default status on resources table if default exists
ALTER TABLE public.resources ALTER COLUMN status SET DEFAULT 'approved';
