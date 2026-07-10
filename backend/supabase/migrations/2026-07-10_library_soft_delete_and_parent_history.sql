-- Library hardening: soft-delete books + parent-safe history support

ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_books_institution_archived_at
    ON public.books(institution_id, archived_at);
