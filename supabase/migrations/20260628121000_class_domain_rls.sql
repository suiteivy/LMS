ALTER TABLE public.class_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strict_institution_isolation" ON public.class_categories;
CREATE POLICY "strict_institution_isolation"
ON public.class_categories
FOR ALL
USING (
  institution_id = public.get_current_user_institution_id()
  OR public.get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "strict_institution_isolation" ON public.class_levels;
CREATE POLICY "strict_institution_isolation"
ON public.class_levels
FOR ALL
USING (
  institution_id = public.get_current_user_institution_id()
  OR public.get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "strict_institution_isolation" ON public.class_streams;
CREATE POLICY "strict_institution_isolation"
ON public.class_streams
FOR ALL
USING (
  institution_id = public.get_current_user_institution_id()
  OR public.get_current_user_role() = 'master_admin'
);
