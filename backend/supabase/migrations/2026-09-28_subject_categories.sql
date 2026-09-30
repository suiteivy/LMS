-- Migration: 2026-09-28_subject_categories.sql
-- Description: Add optional subject_categories table and category_id reference on subjects

CREATE TABLE IF NOT EXISTS public.subject_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_subject_categories_inst_name UNIQUE (institution_id, name)
);

ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.subject_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subject_categories_inst_sort
    ON public.subject_categories(institution_id, sort_order ASC, name ASC);

CREATE INDEX IF NOT EXISTS idx_subjects_category_id
    ON public.subjects(institution_id, category_id);

-- Enable RLS
ALTER TABLE public.subject_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_categories_select" ON public.subject_categories;
CREATE POLICY "subject_categories_select" ON public.subject_categories
    FOR SELECT
    USING (
        institution_id = get_current_user_institution_id()
        OR get_current_user_role() = 'master_admin'
    );

DROP POLICY IF EXISTS "subject_categories_admin_all" ON public.subject_categories;
CREATE POLICY "subject_categories_admin_all" ON public.subject_categories
    FOR ALL
    USING (
        (institution_id = get_current_user_institution_id() AND get_current_user_role() = 'admin')
        OR get_current_user_role() = 'master_admin'
    );
