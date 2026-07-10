ALTER TABLE IF EXISTS public.fee_structures
  ADD COLUMN IF NOT EXISTS academic_year_id UUID,
  ADD COLUMN IF NOT EXISTS term_id UUID,
  ADD COLUMN IF NOT EXISTS level_scope TEXT,
  ADD COLUMN IF NOT EXISTS level_value INTEGER,
  ADD COLUMN IF NOT EXISTS level_from INTEGER,
  ADD COLUMN IF NOT EXISTS level_to INTEGER;

CREATE INDEX IF NOT EXISTS idx_fee_structures_academic_year_id
  ON public.fee_structures (academic_year_id)
  WHERE academic_year_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_term_id
  ON public.fee_structures (term_id)
  WHERE term_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_level_scope
  ON public.fee_structures (level_scope)
  WHERE level_scope IS NOT NULL;
