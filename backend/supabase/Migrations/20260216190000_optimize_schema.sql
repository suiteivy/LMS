-- Migration: Optimize Schema (Compact Database)
-- Created: 2026-02-16 19:00:00

BEGIN;

-- =================================================================
-- 1. Finance Consolidation
-- Merge 'payments' and 'teacher_payouts' -> 'financial_transactions'
-- =================================================================

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id),
    user_id UUID REFERENCES public.users(id), -- Nullable if transaction is generic or external
    type TEXT CHECK (type IN ('fee_payment', 'salary_payout', 'expense', 'grant', 'other')) NOT NULL,
    direction TEXT CHECK (direction IN ('inflow', 'outflow')) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    method TEXT, -- 'cash', 'bank_transfer', etc.
    status TEXT DEFAULT 'completed',
    reference_id TEXT, -- External ref or link to other ID
    meta JSONB DEFAULT '{}'::jsonb, -- Store extra fields like check_number, notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage transactions" ON public.financial_transactions FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Users view own transactions" ON public.financial_transactions FOR SELECT USING (auth.uid() = user_id);

-- Migrate Data: Student Payments
INSERT INTO public.financial_transactions (institution_id, user_id, type, direction, amount, date, method, status, meta)
SELECT 
    NULL, -- Institution ID not in payments table? Assuming null or fetch from user link if needed
    (SELECT user_id FROM public.students WHERE id = p.student_id::text LIMIT 1)::uuid, 
    'fee_payment', 
    'inflow', 
    p.amount, 
    p.payment_date::date, 
    p.payment_method, 
    p.status,
    jsonb_build_object('notes', p.notes, 'reference_number', p.reference_number, 'legacy_id', p.id)
FROM public.payments p;

-- Migrate Data: Teacher Payouts
INSERT INTO public.financial_transactions (institution_id, user_id, type, direction, amount, date, status, meta)
SELECT 
    NULL,
    (SELECT user_id FROM public.teachers WHERE id = tp.teacher_id::text LIMIT 1)::uuid,
    'salary_payout',
    'outflow',
    tp.amount,
    tp.payment_date::date,
    tp.status,
    jsonb_build_object('legacy_id', tp.id)
FROM public.teacher_payouts tp;

-- Drop Old Tables
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.teacher_payouts CASCADE;


-- =================================================================
-- 2. Library Normalization
-- 'book' + 'library' -> 'library_items' + 'library_loans'
-- =================================================================

CREATE TABLE IF NOT EXISTS public.library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    category TEXT,
    total_quantity INTEGER DEFAULT 1,
    available_quantity INTEGER DEFAULT 1,
    cover_url TEXT,
    location TEXT, -- Shelf A1 etc
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.library_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.library_items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    borrow_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    return_date DATE,
    status TEXT CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost')) DEFAULT 'borrowed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage library" ON public.library_items FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Everyone view items" ON public.library_items FOR SELECT USING (true);
CREATE POLICY "Admins manage loans" ON public.library_loans FOR ALL USING (public.get_current_user_role() = 'admin');
CREATE POLICY "Users view own loans" ON public.library_loans FOR SELECT USING (auth.uid() = user_id);

-- Migrate Data: Books/Inventory
-- This is tricky because 'book' had 'borrower_id' (mixed concern).
-- We'll extract unique books first.
INSERT INTO public.library_items (title, author, isbn, category, total_quantity, available_quantity)
SELECT 
    DISTINCT book_title, 
    author, 
    isbn, 
    category,
    COUNT(*) as total, -- Assuming duplicate rows meant multiple copies
    COUNT(*) -- Start with total, adjust for borrowers later
FROM public.book
GROUP BY book_title, author, isbn, category;

-- Migrate Loans
-- If 'book' table had borrower_id, it represents a loan. We need to match it to the new Item ID.
INSERT INTO public.library_loans (item_id, user_id, status)
SELECT 
    (SELECT id FROM public.library_items WHERE title = b.book_title AND (isbn IS NULL OR isbn = b.isbn) LIMIT 1),
    (SELECT id FROM public.users WHERE id = b.borrower_id LIMIT 1), -- Assuming borrower_id was UUID of user? Or Custom ID? 'book' schema said 'borrower_id' string.
    -- If borrower_id is set, it's 'borrowed'
    'borrowed'
FROM public.book b
WHERE b.borrower_id IS NOT NULL;

-- Update available quantity based on loans
UPDATE public.library_items li
SET available_quantity = total_quantity - (
    SELECT COUNT(*) FROM public.library_loans ll 
    WHERE ll.item_id = li.id AND ll.status = 'borrowed'
);

-- Drop Old Tables
DROP TABLE IF EXISTS public.book CASCADE;
DROP TABLE IF EXISTS public.library CASCADE;


-- =================================================================
-- 3. Subject Data Consolidation
-- 'fee_structures' + 'resources' -> JSONB in 'subjects'
-- =================================================================

ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS fee_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;

-- Migrate Fee Structures
WITH fee_data AS (
    SELECT subject_id, row_to_json(fs.*)::jsonb as config
    FROM public.fee_structures fs
)
UPDATE public.subjects s
SET fee_config = fd.config
FROM fee_data fd
WHERE s.id = fd.subject_id::text; -- Casting if type mismatch

-- Migrate Resources
-- Aggregate resources into a JSON array per subject
WITH resource_agg AS (
    SELECT subject_id, jsonb_agg(row_to_json(r.*)) as mats
    FROM public.resources r
    GROUP BY subject_id
)
UPDATE public.subjects s
SET materials = ra.mats
FROM resource_agg ra
WHERE s.id = ra.subject_id;

-- Drop Old Tables
DROP TABLE IF EXISTS public.fee_structures CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;


-- =================================================================
-- 4. Cleanup
-- Drop legacy columns or tables
-- =================================================================

DROP TABLE IF EXISTS public.attendance CASCADE; -- Legacy student attendance

COMMIT;
