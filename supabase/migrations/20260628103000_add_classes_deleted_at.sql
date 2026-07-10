ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_classes_institution_deleted_at
ON public.classes (institution_id, deleted_at);
