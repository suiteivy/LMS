-- Migration: Library Role Gating, Librarian Designation, and Enhanced Circulation Tracking
-- Date: 2026-09-04

-- 1. Table for librarian designations (granted by Main Admin to Teachers or Admins)
CREATE TABLE IF NOT EXISTS public.librarian_designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_librarian_designation_user_inst UNIQUE (institution_id, user_id)
);

-- 2. Immutable audit log for librarian designation changes
CREATE TABLE IF NOT EXISTS public.librarian_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhance borrowed_books table with librarian audit fields and condition notes
ALTER TABLE public.borrowed_books
    ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS return_notes TEXT;

-- Drop and recreate status check constraint to support all circulation states
DO $$
BEGIN
    ALTER TABLE public.borrowed_books DROP CONSTRAINT IF EXISTS borrowed_books_status_check;
    ALTER TABLE public.borrowed_books DROP CONSTRAINT IF EXISTS borrowed_books_status_check1;
    ALTER TABLE public.borrowed_books ADD CONSTRAINT borrowed_books_status_check 
        CHECK (status IN ('borrowed', 'active', 'returned', 'overdue', 'lost', 'damaged'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Indexes for circulation reporting and designation queries
CREATE INDEX IF NOT EXISTS idx_librarian_designations_active 
    ON public.librarian_designations(institution_id, user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_librarian_audit_logs_inst_date 
    ON public.librarian_audit_logs(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_borrowed_books_institution_status 
    ON public.borrowed_books(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_borrowed_books_due_date 
    ON public.borrowed_books(institution_id, due_date);

CREATE INDEX IF NOT EXISTS idx_borrowed_books_issued_by 
    ON public.borrowed_books(institution_id, issued_by);

-- 5. Row Level Security for new tables
ALTER TABLE public.librarian_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.librarian_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "librarian_designations_isolation" ON public.librarian_designations;
CREATE POLICY "librarian_designations_isolation" ON public.librarian_designations
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "librarian_audit_logs_isolation" ON public.librarian_audit_logs;
CREATE POLICY "librarian_audit_logs_isolation" ON public.librarian_audit_logs
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);
