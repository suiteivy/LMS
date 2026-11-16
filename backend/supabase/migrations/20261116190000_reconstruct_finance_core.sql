-- Migration: 20261116190000_reconstruct_finance_core.sql
-- Description: Core finance reconstruction: admin-configurable fee types, bills, multi-child payment allocations,
--              proof uploads, immutable ledger, gap-free sequential receipts, settings, flag reasons, and strict RLS.

BEGIN;

-- 1. Helper extension check
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Fee Categories Table (Admin-Configurable)
CREATE TABLE IF NOT EXISTS public.fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fee_categories_inst_name UNIQUE (institution_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fee_categories_inst ON public.fee_categories(institution_id);

-- 3. Fee Types Table (Admin-Configurable Fee Items)
CREATE TABLE IF NOT EXISTS public.fee_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.fee_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
    billing_frequency TEXT NOT NULL DEFAULT 'term',
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
    due_date DATE,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    partial_payment_allowed BOOLEAN NOT NULL DEFAULT true,
    min_installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (min_installment_amount >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    parent_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fee_types_inst ON public.fee_types(institution_id);
CREATE INDEX IF NOT EXISTS idx_fee_types_category ON public.fee_types(category_id);
CREATE INDEX IF NOT EXISTS idx_fee_types_status ON public.fee_types(status);

-- 4. Fee Type Applicability Table (School, Level, Class, or Student scope)
CREATE TABLE IF NOT EXISTS public.fee_type_applicability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('school', 'level', 'class', 'student')),
    scope_id TEXT,
    amount_override NUMERIC(12, 2) CHECK (amount_override >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fee_applicability_fee_type ON public.fee_type_applicability(fee_type_id);
CREATE INDEX IF NOT EXISTS idx_fee_applicability_scope ON public.fee_type_applicability(scope_type, scope_id);

-- 5. Payment Methods Table (Admin-Configurable)
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    requires_reference BOOLEAN NOT NULL DEFAULT true,
    requires_proof BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payment_methods_inst_code UNIQUE (institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_inst ON public.payment_methods(institution_id);

-- 6. Flag Reasons Table (Admin-Configurable Payment Flag Reasons)
CREATE TABLE IF NOT EXISTS public.flag_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_flag_reasons_inst_code UNIQUE (institution_id, reason_code)
);

CREATE INDEX IF NOT EXISTS idx_flag_reasons_inst ON public.flag_reasons(institution_id);

-- 7. Finance Settings Table (Per-Institution Financial Policy & Branding)
CREATE TABLE IF NOT EXISTS public.finance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
    currency_code TEXT NOT NULL DEFAULT 'KES',
    receipt_prefix TEXT NOT NULL DEFAULT 'REC-',
    receipt_padding INTEGER NOT NULL DEFAULT 5 CHECK (receipt_padding BETWEEN 3 AND 10),
    receipt_footer_text TEXT,
    allow_overpayment_credit BOOLEAN NOT NULL DEFAULT true,
    allow_partial_payments BOOLEAN NOT NULL DEFAULT true,
    grace_period_days INTEGER NOT NULL DEFAULT 14,
    late_penalty_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    max_upload_size_mb INTEGER NOT NULL DEFAULT 10,
    retention_days INTEGER NOT NULL DEFAULT 2555,
    auto_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Receipt Sequences Table (Gap-free atomic sequential numbers per institution)
CREATE TABLE IF NOT EXISTS public.receipt_sequences (
    institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
    last_number BIGINT NOT NULL DEFAULT 0,
    prefix TEXT NOT NULL DEFAULT 'REC-',
    padding INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Student Bills & Bill Items Tables
CREATE TABLE IF NOT EXISTS public.student_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
    bill_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (gross_amount >= 0),
    adjustment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (adjustment_amount >= 0),
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (net_amount >= 0),
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_bills_inst_student_num UNIQUE (institution_id, student_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_student_bills_student ON public.student_bills(student_id);
CREATE INDEX IF NOT EXISTS idx_student_bills_inst ON public.student_bills(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_bills_term ON public.student_bills(term_id);

CREATE TABLE IF NOT EXISTS public.student_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    bill_id UUID NOT NULL REFERENCES public.student_bills(id) ON DELETE CASCADE,
    fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    due_date DATE,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON public.student_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_fee_type ON public.student_bill_items(fee_type_id);

-- 10. Update & Augment Existing Payments Table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'submitted_by') THEN
        ALTER TABLE public.payments ADD COLUMN submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_method_id') THEN
        ALTER TABLE public.payments ADD COLUMN payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'total_amount') THEN
        ALTER TABLE public.payments ADD COLUMN total_amount NUMERIC(12, 2);
        UPDATE public.payments SET total_amount = amount WHERE total_amount IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'confirmed_amount') THEN
        ALTER TABLE public.payments ADD COLUMN confirmed_amount NUMERIC(12, 2);
        UPDATE public.payments SET confirmed_amount = amount WHERE status IN ('completed', 'confirmed') AND confirmed_amount IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'idempotency_key') THEN
        ALTER TABLE public.payments ADD COLUMN idempotency_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'flag_reason_id') THEN
        ALTER TABLE public.payments ADD COLUMN flag_reason_id UUID REFERENCES public.flag_reasons(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payer_name') THEN
        ALTER TABLE public.payments ADD COLUMN payer_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payer_phone') THEN
        ALTER TABLE public.payments ADD COLUMN payer_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'is_split') THEN
        ALTER TABLE public.payments ADD COLUMN is_split BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_inst_status ON public.payments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_submitted_by ON public.payments(submitted_by);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(institution_id, reference_number);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON public.payments(idempotency_key);

-- 11. Payment Allocations Table (Split Payment Across Children and Fee Items)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES public.student_bills(id) ON DELETE SET NULL,
    bill_item_id UUID REFERENCES public.student_bill_items(id) ON DELETE SET NULL,
    fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_student ON public.payment_allocations(student_id);

-- 12. Payment Proofs Table (Multi-File Attachments, Hashes, Content Verification)
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    file_hash TEXT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment ON public.payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_hash ON public.payment_proofs(file_hash);

-- 13. Payment Flags Table (Flag / Unconfirmed Review Trail)
CREATE TABLE IF NOT EXISTS public.payment_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    reason_id UUID REFERENCES public.flag_reasons(id) ON DELETE SET NULL,
    reason_code TEXT,
    admin_notes TEXT,
    flagged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    flagged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_flags_payment ON public.payment_flags(payment_id);

-- 14. Official Receipts Table (Sequential, Gap-Free School Receipts)
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'voided')),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    voided_at TIMESTAMPTZ,
    voided_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    void_reason TEXT,
    pdf_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_receipts_inst_number UNIQUE (institution_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_receipts_payment ON public.receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON public.receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_inst ON public.receipts(institution_id);

-- 15. Immutable Ledger Entries Table (Single Source of Truth for Money)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('charge', 'payment', 'adjustment', 'reversal', 'credit', 'refund')),
    amount NUMERIC(12, 2) NOT NULL,
    running_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    allocation_id UUID REFERENCES public.payment_allocations(id) ON DELETE SET NULL,
    bill_id UUID REFERENCES public.student_bills(id) ON DELETE SET NULL,
    bill_item_id UUID REFERENCES public.student_bill_items(id) ON DELETE SET NULL,
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
    reference_number TEXT,
    description TEXT NOT NULL,
    recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ledger_student_created ON public.ledger_entries(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_inst ON public.ledger_entries(institution_id);
CREATE INDEX IF NOT EXISTS idx_ledger_payment ON public.ledger_entries(payment_id);

-- 16. Overpayment Credits & Refunds Tables
CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    source_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'applied', 'refunded')),
    applied_to_bill_id UUID REFERENCES public.student_bills(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_credits_student ON public.credits(student_id, status);

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    credit_id UUID REFERENCES public.credits(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    method TEXT NOT NULL,
    reference_number TEXT,
    authorized_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    authorized_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. Reversals Table
CREATE TABLE IF NOT EXISTS public.reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    authorized_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 18. Fix phantom created_at on bursary_applications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bursary_applications' AND column_name = 'created_at') THEN
        ALTER TABLE public.bursary_applications ADD COLUMN created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
        UPDATE public.bursary_applications SET created_at = COALESCE(applied_at, timezone('utc'::text, now())) WHERE created_at IS NULL;
    END IF;
END $$;

-- 19. Atomic Receipt Number Generator Function
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_institution_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT;
    v_padding INTEGER;
    v_next_val BIGINT;
    v_formatted_num TEXT;
BEGIN
    -- Ensure sequence row exists for institution
    INSERT INTO public.receipt_sequences (institution_id, last_number, prefix, padding, updated_at)
    VALUES (p_institution_id, 0, 'REC-', 5, timezone('utc'::text, now()))
    ON CONFLICT (institution_id) DO NOTHING;

    -- Lock and increment
    UPDATE public.receipt_sequences
    SET last_number = last_number + 1,
        updated_at = timezone('utc'::text, now())
    WHERE institution_id = p_institution_id
    RETURNING last_number, prefix, padding INTO v_next_val, v_prefix, v_padding;

    v_formatted_num := v_prefix || LPAD(v_next_val::TEXT, v_padding, '0');
    RETURN v_formatted_num;
END;
$$;

-- 20. Student Finance Summary Calculator Function
CREATE OR REPLACE FUNCTION public.get_student_finance_summary(p_student_id TEXT, p_institution_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_billed NUMERIC(12, 2) := 0.00;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_pending_amount NUMERIC(12, 2) := 0.00;
    v_flagged_amount NUMERIC(12, 2) := 0.00;
    v_credit_amount NUMERIC(12, 2) := 0.00;
    v_balance_due NUMERIC(12, 2) := 0.00;
BEGIN
    -- Total Billed from ledger charges minus adjustments
    SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'charge' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'payment' THEN -amount ELSE 0 END), 0.00)
    INTO v_total_billed, v_total_paid
    FROM public.ledger_entries
    WHERE student_id = p_student_id AND institution_id = p_institution_id;

    -- Pending payments from submitted allocations
    SELECT COALESCE(SUM(pa.amount), 0.00)
    INTO v_pending_amount
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    WHERE pa.student_id = p_student_id 
      AND pa.institution_id = p_institution_id
      AND p.status IN ('submitted', 'under_review', 'pending');

    -- Flagged payments
    SELECT COALESCE(SUM(pa.amount), 0.00)
    INTO v_flagged_amount
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    WHERE pa.student_id = p_student_id 
      AND pa.institution_id = p_institution_id
      AND p.status IN ('flagged', 'failed');

    -- Available Credits
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_credit_amount
    FROM public.credits
    WHERE student_id = p_student_id 
      AND institution_id = p_institution_id
      AND status = 'available';

    v_balance_due := GREATEST(0.00, v_total_billed - v_total_paid);

    RETURN jsonb_build_object(
        'student_id', p_student_id,
        'total_billed', v_total_billed,
        'total_paid', v_total_paid,
        'pending_amount', v_pending_amount,
        'flagged_amount', v_flagged_amount,
        'credit_amount', v_credit_amount,
        'balance_due', v_balance_due
    );
END;
$$;

-- 21. Backfill Defaults & Seed Configuration for Institutions
DO $$
DECLARE
    r RECORD;
    v_curr_code TEXT;
    v_cat_id UUID;
BEGIN
    FOR r IN SELECT id, name, currency_id FROM public.institutions LOOP
        -- Resolve currency
        SELECT code INTO v_curr_code FROM public.currencies WHERE id = r.currency_id;
        IF v_curr_code IS NULL THEN
            v_curr_code := 'KES';
        END IF;

        -- 1. Finance Settings
        INSERT INTO public.finance_settings (
            institution_id, currency_code, receipt_prefix, receipt_padding, receipt_footer_text,
            allow_overpayment_credit, allow_partial_payments, grace_period_days, late_penalty_percent,
            max_upload_size_mb, retention_days, auto_reminder_enabled
        ) VALUES (
            r.id, v_curr_code, 'REC-', 5, 'Thank you for your payment. For inquiries, contact the accounts office.',
            true, true, 14, 0.00, 10, 2555, true
        ) ON CONFLICT (institution_id) DO NOTHING;

        -- 2. Receipt Sequence
        INSERT INTO public.receipt_sequences (institution_id, last_number, prefix, padding)
        VALUES (r.id, 0, 'REC-', 5)
        ON CONFLICT (institution_id) DO NOTHING;

        -- 3. Default Payment Methods
        INSERT INTO public.payment_methods (institution_id, name, code, requires_reference, requires_proof, display_order)
        VALUES 
            (r.id, 'M-Pesa', 'mpesa', true, true, 1),
            (r.id, 'Bank Deposit / Wire', 'bank_transfer', true, true, 2),
            (r.id, 'Cash', 'cash', false, false, 3),
            (r.id, 'Cheque', 'cheque', true, true, 4)
        ON CONFLICT (institution_id, code) DO NOTHING;

        -- 4. Default Flag Reasons
        INSERT INTO public.flag_reasons (institution_id, reason_code, label, description, display_order)
        VALUES 
            (r.id, 'not_found', 'Payment not found on statement', 'The reference code or amount does not appear on the official bank/M-Pesa statement.', 1),
            (r.id, 'amount_mismatch', 'Amount does not match slip/proof', 'The amount entered in the portal differs from the figure visible on the attached proof.', 2),
            (r.id, 'unclear_receipt', 'Receipt unclear or unreadable', 'The uploaded photo or document is blurry, cut off, or dark.', 3),
            (r.id, 'reference_invalid', 'Reference code invalid or already used', 'The transaction code provided has already been applied or does not match format.', 4),
            (r.id, 'wrong_student', 'Wrong student selected', 'The receipt specifies another student or an unknown admission number.', 5)
        ON CONFLICT (institution_id, reason_code) DO NOTHING;

        -- 5. Default Fee Categories
        INSERT INTO public.fee_categories (institution_id, name, description, display_order)
        VALUES 
            (r.id, 'School Fees', 'Core academic tuition and development', 1),
            (r.id, 'Services', 'Transport, meals, and boarding facilities', 2),
            (r.id, 'Activities', 'Sports, clubs, trips, and extra-curriculars', 3)
        ON CONFLICT (institution_id, name) DO NOTHING;

    END LOOP;
END $$;

-- 22. Backfill existing fee_structures into fee_types & applicability
DO $$
DECLARE
    r RECORD;
    v_cat_id UUID;
    v_new_fee_type_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.fee_structures LOOP
        -- find or assign category
        SELECT id INTO v_cat_id FROM public.fee_categories 
        WHERE institution_id = r.institution_id AND name = 'School Fees' LIMIT 1;

        -- insert into fee_types if not already migrated
        INSERT INTO public.fee_types (
            id, institution_id, category_id, name, description, amount,
            billing_frequency, academic_year_id, term_id, due_date,
            is_mandatory, partial_payment_allowed, status
        ) VALUES (
            r.id, r.institution_id, v_cat_id, r.title, r.description, r.amount,
            'term', r.academic_year_id, r.term_id, r.due_date,
            true, true, CASE WHEN r.is_active THEN 'active' ELSE 'archived' END
        ) ON CONFLICT (id) DO NOTHING;

        -- insert applicability
        INSERT INTO public.fee_type_applicability (
            institution_id, fee_type_id, scope_type, scope_id
        ) VALUES (
            r.institution_id, r.id, 
            COALESCE(r.scope_type, 'school'), 
            COALESCE(r.class_id::TEXT, r.student_id, NULL)
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- 23. Backfill existing payments into payment_allocations, receipts, and ledger_entries
DO $$
DECLARE
    r RECORD;
    v_rec_num TEXT;
    v_rec_id UUID;
    v_alloc_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.payments WHERE student_id IS NOT NULL LOOP
        -- 1. Create allocation if not present
        SELECT id INTO v_alloc_id FROM public.payment_allocations WHERE payment_id = r.id LIMIT 1;
        IF v_alloc_id IS NULL THEN
            INSERT INTO public.payment_allocations (
                institution_id, payment_id, student_id, fee_type_id, amount, notes, created_at
            ) VALUES (
                r.institution_id, r.id, r.student_id, r.fee_structure_id, r.amount, r.admin_notes, COALESCE(r.payment_date, r.created_at)
            ) RETURNING id INTO v_alloc_id;
        END IF;

        -- 2. Create receipt if completed/confirmed and not already created
        IF r.status IN ('completed', 'confirmed') THEN
            SELECT id INTO v_rec_id FROM public.receipts WHERE payment_id = r.id LIMIT 1;
            IF v_rec_id IS NULL THEN
                v_rec_num := public.generate_receipt_number(r.institution_id);
                INSERT INTO public.receipts (
                    institution_id, receipt_number, payment_id, student_id, amount,
                    status, issued_at, created_at
                ) VALUES (
                    r.institution_id, v_rec_num, r.id, r.student_id, r.amount,
                    'valid', COALESCE(r.confirmed_at, r.created_at), COALESCE(r.confirmed_at, r.created_at)
                ) RETURNING id INTO v_rec_id;
            END IF;

            -- 3. Create ledger entry if not present
            IF NOT EXISTS (SELECT 1 FROM public.ledger_entries WHERE payment_id = r.id) THEN
                INSERT INTO public.ledger_entries (
                    institution_id, student_id, entry_type, amount, running_balance,
                    payment_id, allocation_id, receipt_id, reference_number, description, created_at
                ) VALUES (
                    r.institution_id, r.student_id, 'payment', -r.amount, 0.00,
                    r.id, v_alloc_id, v_rec_id, r.reference_number,
                    'Payment received (' || COALESCE(r.payment_method, 'standard') || ') - Ref: ' || COALESCE(r.reference_number, 'N/A'),
                    COALESCE(r.payment_date, r.created_at)
                );
            END IF;
        END IF;

        -- 4. Move legacy proof_url into payment_proofs if present
        IF r.proof_url IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.payment_proofs WHERE payment_id = r.id) THEN
            INSERT INTO public.payment_proofs (
                institution_id, payment_id, storage_path, file_name, created_at
            ) VALUES (
                r.institution_id, r.id, r.proof_url, 'receipt_proof', COALESCE(r.created_at, timezone('utc'::text, now()))
            );
        END IF;
    END LOOP;
END $$;

-- 24. Backfill fee structure charges into ledger_entries
DO $$
DECLARE
    s RECORD;
    f RECORD;
BEGIN
    FOR s IN SELECT id, institution_id, class_id FROM public.students LOOP
        -- Find applicable fee structures for student's institution
        FOR f IN 
            SELECT ft.id, ft.name, ft.amount, ft.created_at
            FROM public.fee_types ft
            WHERE ft.institution_id = s.institution_id
        LOOP
            IF NOT EXISTS (
                SELECT 1 FROM public.ledger_entries 
                WHERE student_id = s.id AND bill_item_id = f.id AND entry_type = 'charge'
            ) THEN
                INSERT INTO public.ledger_entries (
                    institution_id, student_id, entry_type, amount, running_balance,
                    bill_item_id, description, created_at
                ) VALUES (
                    s.institution_id, s.id, 'charge', f.amount, 0.00,
                    f.id, 'Billed: ' || f.name, f.created_at
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 25. Row Level Security Policies (Strict Multi-Tenant and Role Separation)
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_type_applicability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flag_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reversals ENABLE ROW LEVEL SECURITY;

-- Drop old overly permissive policies if any
DROP POLICY IF EXISTS "payments_all" ON public.payments;
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "fee_structures_delete" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures_insert" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures_update" ON public.fee_structures;
DROP POLICY IF EXISTS "strict_institution_isolation" ON public.fee_structures;

-- 25.1. Fee Categories & Types Policies (All users in institution can SELECT active types; Only finance admins can mutate)
CREATE POLICY "fee_categories_select" ON public.fee_categories
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "fee_categories_manage" ON public.fee_categories
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "fee_types_select" ON public.fee_types
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "fee_types_manage" ON public.fee_types
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "fee_type_applicability_select" ON public.fee_type_applicability
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "fee_type_applicability_manage" ON public.fee_type_applicability
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "payment_methods_select" ON public.payment_methods
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "payment_methods_manage" ON public.payment_methods
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "flag_reasons_select" ON public.flag_reasons
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "flag_reasons_manage" ON public.flag_reasons
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "finance_settings_select" ON public.finance_settings
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "finance_settings_manage" ON public.finance_settings
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

-- 25.2. Student Bills & Items Policies
CREATE POLICY "student_bills_select" ON public.student_bills
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
                UNION
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "student_bills_manage" ON public.student_bills
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'create', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "student_bill_items_select" ON public.student_bill_items
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR bill_id IN (SELECT id FROM public.student_bills)
        )
    );

CREATE POLICY "student_bill_items_manage" ON public.student_bill_items
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'create', institution_id))
        OR is_platform_admin()
    );

-- 25.3. Payments & Allocations Policies (Strict Ownership + Role Checks)
CREATE POLICY "payments_select" ON public.payments
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR submitted_by = auth.uid()
            OR student_id IN (
                SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
                UNION
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "payments_insert" ON public.payments
    FOR INSERT WITH CHECK (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'create', institution_id)
            OR is_platform_admin()
            OR submitted_by = auth.uid()
        )
    );

CREATE POLICY "payments_update" ON public.payments
    FOR UPDATE USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'approve', institution_id)
            OR is_platform_admin()
            OR (submitted_by = auth.uid() AND status = 'submitted')
        )
    );

CREATE POLICY "payment_allocations_select" ON public.payment_allocations
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
                UNION
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "payment_allocations_insert" ON public.payment_allocations
    FOR INSERT WITH CHECK (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'create', institution_id)
            OR is_platform_admin()
            OR payment_id IN (SELECT id FROM public.payments WHERE submitted_by = auth.uid())
        )
    );

CREATE POLICY "payment_allocations_update" ON public.payment_allocations
    FOR UPDATE USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'approve', institution_id)
            OR is_platform_admin()
        )
    );

-- 25.4. Payment Proofs Policies
CREATE POLICY "payment_proofs_select" ON public.payment_proofs
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR uploaded_by = auth.uid()
            OR payment_id IN (SELECT id FROM public.payments WHERE submitted_by = auth.uid())
        )
    );

CREATE POLICY "payment_proofs_insert" ON public.payment_proofs
    FOR INSERT WITH CHECK (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'create', institution_id)
            OR is_platform_admin()
            OR uploaded_by = auth.uid()
        )
    );

-- 25.5. Receipts & Ledger Entries Policies (Strict Read-Only to Parents/Students, Immutable to Users)
CREATE POLICY "receipts_select" ON public.receipts
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
                UNION
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "receipts_manage" ON public.receipts
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'approve', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "ledger_entries_select" ON public.ledger_entries
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
                UNION
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "ledger_entries_insert" ON public.ledger_entries
    FOR INSERT WITH CHECK (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'create', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "credits_select" ON public.credits
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'view', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
                UNION
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "credits_manage" ON public.credits
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'approve', institution_id))
        OR is_platform_admin()
    );

COMMIT;
