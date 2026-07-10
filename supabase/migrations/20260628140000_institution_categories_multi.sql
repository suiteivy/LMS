CREATE TABLE IF NOT EXISTS public.institution_categories (
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.school_categories(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (institution_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_categories_institution_id
  ON public.institution_categories (institution_id);

CREATE INDEX IF NOT EXISTS idx_institution_categories_category_id
  ON public.institution_categories (category_id);

INSERT INTO public.institution_categories (institution_id, category_id)
SELECT i.id, i.category_id
FROM public.institutions i
WHERE i.category_id IS NOT NULL
ON CONFLICT (institution_id, category_id) DO NOTHING;

ALTER TABLE public.institution_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strict_institution_isolation" ON public.institution_categories;
CREATE POLICY "strict_institution_isolation"
ON public.institution_categories
FOR ALL
USING (
  institution_id = public.get_current_user_institution_id()
  OR public.get_current_user_role() = 'master_admin'
);
