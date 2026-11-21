-- ============================================================================
-- LMS Backend Hardening, ACID Integrity, Idempotency, Outbox & Quarantine
-- Migration: 20261123000000_backend_hardening_and_acid_integrity.sql
-- ============================================================================

-- 0. REPAIR SCHEMA DRIFT: USER_ROLES BOOTSTRAP
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
    expires_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_role_inst UNIQUE (user_id, role_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_inst_user ON public.user_roles(institution_id, user_id, status);

-- 0b. REPAIR SCHEMA DRIFT: FEE_STRUCTURE_ITEMS COMPATIBILITY
CREATE TABLE IF NOT EXISTS public.fee_structure_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    fee_type_id UUID REFERENCES fee_types(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_optional BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_items_inst ON public.fee_structure_items(institution_id, fee_structure_id);

-- 0c. REPAIR SCHEMA DRIFT: PAYMENTS BOOTSTRAP
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2),
    confirmed_amount NUMERIC(12,2),
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'confirmed', 'flagged', 'rejected', 'reversed')),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    reference_number TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    idempotency_key TEXT,
    proof_url TEXT,
    is_split BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_inst_status ON public.payments(institution_id, status);

-- 0d. REPAIR SCHEMA DRIFT: INVOICES COMPATIBILITY TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'void')),
    term TEXT,
    academic_year TEXT,
    due_date DATE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_invoices_inst_student ON public.invoices(institution_id, student_id);

-- 1. IDEMPOTENCY KEYS INFRASTRUCTURE
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    request_path TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    CONSTRAINT uq_idempotency_user_key UNIQUE (idempotency_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON idempotency_keys(idempotency_key, user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- 2. TRANSACTIONAL OUTBOX & DEAD-LETTER QUEUE (DLQ)
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created ON outbox_events(status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_outbox_events_inst ON outbox_events(institution_id);

CREATE TABLE IF NOT EXISTS outbox_events_dlq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_event_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    retry_count INTEGER NOT NULL,
    failure_reason TEXT NOT NULL,
    quarantined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_dlq_inst ON outbox_events_dlq(institution_id);

-- 3. DATA QUALITY QUARANTINE TABLE (Zero Silent Data Loss)
CREATE TABLE IF NOT EXISTS data_quality_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    entity_id TEXT,
    original_record JSONB NOT NULL,
    quarantine_reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'repaired', 'dismissed', 'purged')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_quarantine_inst_status ON data_quality_quarantine(institution_id, status);

-- 4. ACID INVARIANT TRIGGER: STRICT APPEND-ONLY LEDGER ENTRIES
CREATE OR REPLACE FUNCTION public.enforce_ledger_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'ACID Violation: ledger_entries are immutable and cannot be updated. Create a compensating reversal entry instead.'
            USING ERRCODE = '23505';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'ACID Violation: ledger_entries are immutable and cannot be deleted. Corrections must be recorded as adjustments.'
            USING ERRCODE = '23505';
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_entries_append_only ON public.ledger_entries;
CREATE TRIGGER trg_ledger_entries_append_only
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ledger_append_only();

-- 5. ACID INVARIANT TRIGGER: AT LEAST ONE ACTIVE MAIN ADMIN PER INSTITUTION
CREATE OR REPLACE FUNCTION public.enforce_minimum_one_main_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inst_id UUID;
    v_admin_count INTEGER;
BEGIN
    v_inst_id := OLD.institution_id;

    -- Only check if an admin is being deleted or deactivated
    IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND (OLD.is_active = true AND NEW.is_active = false)) THEN
        SELECT COUNT(*) INTO v_admin_count
        FROM public.admins
        WHERE institution_id = v_inst_id
          AND is_active = true
          AND id <> OLD.id;

        IF v_admin_count < 1 THEN
            RAISE EXCEPTION 'Invariant Violation: Institution % must have at least one active Main Admin. Designate a new Main Admin before removing this account.', v_inst_id
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_minimum_main_admin ON public.admins;
CREATE TRIGGER trg_minimum_main_admin
BEFORE UPDATE OR DELETE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.enforce_minimum_one_main_admin();

-- 6. ATOMIC CONFIRMED PAYMENT RPC (Single Database Transaction)
CREATE OR REPLACE FUNCTION public.confirm_payment_atomic(
    p_institution_id UUID,
    p_payment_id UUID,
    p_confirmed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_alloc RECORD;
    v_receipt_num TEXT;
    v_receipt_id UUID;
    v_current_bal NUMERIC(12,2) := 0;
    v_new_bal NUMERIC(12,2) := 0;
BEGIN
    -- 1. Lock payment row exclusively (prevents race conditions / double confirmations)
    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
      AND institution_id = p_institution_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment % not found in institution %', p_payment_id, p_institution_id;
    END IF;

    IF v_payment.status = 'Confirmed' THEN
        RAISE EXCEPTION 'Payment % is already confirmed', p_payment_id;
    END IF;

    -- 2. Generate sequential gap-free receipt number
    v_receipt_num := public.generate_receipt_number(p_institution_id);

    -- 3. Update payment status to Confirmed
    UPDATE public.payments
    SET status = 'Confirmed',
        confirmed_at = timezone('utc'::text, now()),
        confirmed_by = p_confirmed_by,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_payment_id;

    -- 4. Create official receipt record
    INSERT INTO public.receipts (
        institution_id,
        receipt_number,
        payment_id,
        student_id,
        amount,
        currency,
        status,
        issued_at,
        issued_by
    )
    VALUES (
        p_institution_id,
        v_receipt_num,
        p_payment_id,
        v_payment.student_id,
        v_payment.amount,
        COALESCE(v_payment.currency, 'KES'),
        'valid',
        timezone('utc'::text, now()),
        p_confirmed_by
    )
    RETURNING id INTO v_receipt_id;

    -- 5. Record ledger entries for allocations
    FOR v_alloc IN
        SELECT * FROM public.payment_allocations
        WHERE payment_id = p_payment_id
          AND institution_id = p_institution_id
    LOOP
        -- Calculate student running balance
        SELECT COALESCE(running_balance, 0) INTO v_current_bal
        FROM public.ledger_entries
        WHERE institution_id = p_institution_id
          AND student_id = v_payment.student_id
        ORDER BY created_at DESC
        LIMIT 1;

        v_new_bal := v_current_bal - v_alloc.amount;

        INSERT INTO public.ledger_entries (
            institution_id,
            student_id,
            entry_type,
            amount,
            running_balance,
            payment_id,
            description,
            recorded_by
        )
        VALUES (
            p_institution_id,
            v_payment.student_id,
            'payment',
            v_alloc.amount,
            v_new_bal,
            p_payment_id,
            'Payment allocation - Receipt #' || v_receipt_num,
            p_confirmed_by
        );
    END LOOP;

    -- 6. Stage outbox event for notifications
    INSERT INTO public.outbox_events (
        event_type,
        aggregate_type,
        aggregate_id,
        institution_id,
        payload
    )
    VALUES (
        'payment.confirmed',
        'payment',
        p_payment_id::TEXT,
        p_institution_id,
        jsonb_build_object(
            'payment_id', p_payment_id,
            'receipt_number', v_receipt_num,
            'receipt_id', v_receipt_id,
            'amount', v_payment.amount,
            'student_id', v_payment.student_id,
            'confirmed_by', p_confirmed_by
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'receipt_number', v_receipt_num,
        'receipt_id', v_receipt_id,
        'confirmed_at', timezone('utc'::text, now())
    );
END;
$$;

-- 7. CLEANUP IDEMPOTENCY PURGE FUNCTION
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM public.idempotency_keys
    WHERE expires_at < timezone('utc'::text, now());
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;
