ALTER TABLE IF EXISTS public.fee_structures
  ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE INDEX IF NOT EXISTS idx_fee_structures_due_date
  ON public.fee_structures (due_date)
  WHERE due_date IS NOT NULL;
