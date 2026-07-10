CREATE TABLE IF NOT EXISTS public.category_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_category_types (
    category_id UUID NOT NULL REFERENCES public.school_categories(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES public.category_types(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (category_id, type_id)
);

INSERT INTO public.category_types (name, sort_order)
SELECT DISTINCT
    TRIM(sc.level_label) AS name,
    CASE
        WHEN LOWER(TRIM(sc.level_label)) = 'kg' THEN 10
        WHEN LOWER(TRIM(sc.level_label)) = 'grade' THEN 20
        WHEN LOWER(TRIM(sc.level_label)) = 'form' THEN 30
        ELSE 100
    END AS sort_order
FROM public.school_categories sc
WHERE TRIM(COALESCE(sc.level_label, '')) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.school_category_types (category_id, type_id)
SELECT sc.id, ct.id
FROM public.school_categories sc
JOIN public.category_types ct ON ct.name = TRIM(sc.level_label)
WHERE TRIM(COALESCE(sc.level_label, '')) <> ''
ON CONFLICT (category_id, type_id) DO NOTHING;

ALTER TABLE public.class_categories
ADD COLUMN IF NOT EXISTS school_category_id UUID REFERENCES public.school_categories(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_categories_institution_school_category_active
ON public.class_categories (institution_id, school_category_id)
WHERE deleted_at IS NULL AND school_category_id IS NOT NULL;

INSERT INTO public.class_categories (institution_id, school_category_id, name, description, sort_order)
SELECT
    ic.institution_id,
    sc.id,
    sc.name,
    'Auto-generated category mapped from institution categories',
    0
FROM public.institution_categories ic
JOIN public.school_categories sc ON sc.id = ic.category_id
ON CONFLICT DO NOTHING;

UPDATE public.class_categories cc
SET school_category_id = sc.id
FROM public.school_categories sc
WHERE cc.school_category_id IS NULL
  AND LOWER(TRIM(COALESCE(cc.name, ''))) = LOWER(TRIM(COALESCE(sc.name, '')))
  AND EXISTS (
      SELECT 1
      FROM public.institution_categories ic
      WHERE ic.institution_id = cc.institution_id
        AND ic.category_id = sc.id
  );

ALTER TABLE public.class_levels
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES public.category_types(id) ON DELETE RESTRICT;

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS class_type TEXT;

UPDATE public.class_levels cl
SET type_id = ct.id
FROM public.category_types ct
WHERE cl.type_id IS NULL
  AND (
      LOWER(COALESCE(cl.name, '')) LIKE LOWER(ct.name) || ' %'
      OR LOWER(COALESCE(cl.name, '')) = LOWER(ct.name)
  );

UPDATE public.class_levels cl
SET type_id = sct.type_id
FROM public.class_categories cc
JOIN public.school_category_types sct ON sct.category_id = cc.school_category_id
WHERE cl.type_id IS NULL
  AND cl.category_id = cc.id;

DROP INDEX IF EXISTS uq_class_levels_institution_category_level_active;
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_levels_institution_category_type_level_active
ON public.class_levels (
    institution_id,
    category_id,
    COALESCE(type_id, '00000000-0000-0000-0000-000000000000'::uuid),
    level_number
)
WHERE deleted_at IS NULL;

UPDATE public.classes c
SET class_type = COALESCE(ct.name, c.class_type, CASE WHEN c.form_level IS NOT NULL THEN 'Form' ELSE 'Grade' END)
FROM public.class_levels cl
LEFT JOIN public.category_types ct ON ct.id = cl.type_id
WHERE c.level_id = cl.id
  AND (c.class_type IS NULL OR TRIM(c.class_type) = '');

UPDATE public.classes
SET class_type = CASE WHEN form_level IS NOT NULL THEN 'Form' ELSE 'Grade' END
WHERE class_type IS NULL OR TRIM(class_type) = '';
