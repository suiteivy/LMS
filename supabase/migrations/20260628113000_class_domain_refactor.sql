ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.class_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_categories_institution_name_active
ON public.class_categories (institution_id, name)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.class_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.class_categories(id) ON DELETE RESTRICT,
    level_number INTEGER NOT NULL,
    name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_class_levels_level_number_positive CHECK (level_number > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_levels_institution_category_level_active
ON public.class_levels (institution_id, category_id, level_number)
WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.class_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES public.class_levels(id) ON DELETE RESTRICT,
    code TEXT NOT NULL,
    name TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_class_streams_institution_level_code_active
ON public.class_streams (institution_id, level_id, code)
WHERE deleted_at IS NULL;

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS category_id UUID,
ADD COLUMN IF NOT EXISTS level_id UUID,
ADD COLUMN IF NOT EXISTS stream_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'classes'
          AND constraint_name = 'classes_category_id_fkey'
    ) THEN
        ALTER TABLE public.classes
        ADD CONSTRAINT classes_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES public.class_categories(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'classes'
          AND constraint_name = 'classes_level_id_fkey'
    ) THEN
        ALTER TABLE public.classes
        ADD CONSTRAINT classes_level_id_fkey
        FOREIGN KEY (level_id) REFERENCES public.class_levels(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'classes'
          AND constraint_name = 'classes_stream_id_fkey'
    ) THEN
        ALTER TABLE public.classes
        ADD CONSTRAINT classes_stream_id_fkey
        FOREIGN KEY (stream_id) REFERENCES public.class_streams(id) ON DELETE RESTRICT;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_classes_category_id ON public.classes (category_id);
CREATE INDEX IF NOT EXISTS idx_classes_level_id ON public.classes (level_id);
CREATE INDEX IF NOT EXISTS idx_classes_stream_id ON public.classes (stream_id);
CREATE INDEX IF NOT EXISTS idx_classes_institution_deleted_at ON public.classes (institution_id, deleted_at);

WITH default_categories AS (
    INSERT INTO public.class_categories (institution_id, name, description)
    SELECT i.id,
           COALESCE(sc.name, 'Default Category') AS name,
           'Auto-generated category during class-domain migration' AS description
    FROM public.institutions i
    LEFT JOIN public.school_categories sc ON sc.id = i.category_id
    ON CONFLICT DO NOTHING
    RETURNING id
),
levels_seed AS (
    SELECT
        c.id AS class_id,
        c.institution_id,
        cc.id AS category_id,
        CASE
            WHEN sc.level_label = 'Form' THEN c.form_level
            ELSE c.grade_level
        END AS level_number,
        COALESCE(sc.level_label, 'Grade') AS level_label,
        COALESCE(NULLIF(TRIM(c.stream), ''), 'General') AS stream_code,
        c.capacity
    FROM public.classes c
    JOIN public.institutions i ON i.id = c.institution_id
    LEFT JOIN public.school_categories sc ON sc.id = i.category_id
    JOIN public.class_categories cc ON cc.institution_id = c.institution_id AND cc.deleted_at IS NULL
    WHERE (c.grade_level IS NOT NULL OR c.form_level IS NOT NULL)
),
insert_levels AS (
    INSERT INTO public.class_levels (institution_id, category_id, level_number, name, sort_order)
    SELECT DISTINCT
        ls.institution_id,
        ls.category_id,
        ls.level_number,
        ls.level_label || ' ' || ls.level_number::text,
        ls.level_number
    FROM levels_seed ls
    WHERE ls.level_number IS NOT NULL
    ON CONFLICT DO NOTHING
    RETURNING id
),
insert_streams AS (
    INSERT INTO public.class_streams (institution_id, level_id, code, name, sort_order)
    SELECT DISTINCT
        ls.institution_id,
        cl.id,
        ls.stream_code,
        ls.stream_code,
        0
    FROM levels_seed ls
    JOIN public.class_levels cl
      ON cl.institution_id = ls.institution_id
     AND cl.category_id = ls.category_id
     AND cl.level_number = ls.level_number
     AND cl.deleted_at IS NULL
    ON CONFLICT DO NOTHING
    RETURNING id
),
class_resolution AS (
    SELECT
        c.id AS class_id,
        cl.category_id,
        cl.id AS level_id,
        cs.id AS stream_id
    FROM public.classes c
    JOIN public.institutions i ON i.id = c.institution_id
    LEFT JOIN public.school_categories sc ON sc.id = i.category_id
    JOIN public.class_levels cl
      ON cl.institution_id = c.institution_id
     AND cl.deleted_at IS NULL
     AND cl.level_number = CASE
         WHEN sc.level_label = 'Form' THEN c.form_level
         ELSE c.grade_level
     END
    JOIN public.class_streams cs
      ON cs.level_id = cl.id
     AND cs.institution_id = cl.institution_id
     AND cs.deleted_at IS NULL
     AND cs.code = COALESCE(NULLIF(TRIM(c.stream), ''), 'General')
    WHERE c.category_id IS NULL OR c.level_id IS NULL OR c.stream_id IS NULL
)
UPDATE public.classes c
SET
    category_id = r.category_id,
    level_id = r.level_id,
    stream_id = r.stream_id
FROM class_resolution r
WHERE c.id = r.class_id;
