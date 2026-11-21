-- Migration: 20261121180000_reconcile_fee_structure_parent_portal_and_docs.sql
-- Description: Unify fee structure model with level-specific structures, fee items,
--              variant catalog (transport routes, meal plans, etc.), student optional selections,
--              multi-guardian parent permissions, and complete documents publishing/delivery pipeline.

BEGIN;

-- 1. Extend fee_structures table (Container for a level and period)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'period_type') THEN
        ALTER TABLE public.fee_structures ADD COLUMN period_type TEXT NOT NULL DEFAULT 'term' CHECK (period_type IN ('term', 'selected_terms', 'annual'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'status') THEN
        ALTER TABLE public.fee_structures ADD COLUMN status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'preview', 'published', 'archived'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'version_number') THEN
        ALTER TABLE public.fee_structures ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'change_reason') THEN
        ALTER TABLE public.fee_structures ADD COLUMN change_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'parent_preview_notes') THEN
        ALTER TABLE public.fee_structures ADD COLUMN parent_preview_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'published_at') THEN
        ALTER TABLE public.fee_structures ADD COLUMN published_at TIMESTAMPTZ;
        UPDATE public.fee_structures SET published_at = COALESCE(released_at, created_at) WHERE published_at IS NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'published_by') THEN
        ALTER TABLE public.fee_structures ADD COLUMN published_by UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'copied_from_id') THEN
        ALTER TABLE public.fee_structures ADD COLUMN copied_from_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'is_linked_sync') THEN
        ALTER TABLE public.fee_structures ADD COLUMN is_linked_sync BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'linked_source_id') THEN
        ALTER TABLE public.fee_structures ADD COLUMN linked_source_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'payment_instructions') THEN
        ALTER TABLE public.fee_structures ADD COLUMN payment_instructions TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_status ON public.fee_structures(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_structures_period ON public.fee_structures(academic_year_id, term_id);

-- 2. Extend fee_types table (Individual Fee Items within a Fee Structure)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'fee_structure_id') THEN
        ALTER TABLE public.fee_types ADD COLUMN fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'kind') THEN
        ALTER TABLE public.fee_types ADD COLUMN kind TEXT NOT NULL DEFAULT 'fee' CHECK (kind IN ('fee', 'held_funds', 'pass_through'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'is_optional') THEN
        ALTER TABLE public.fee_types ADD COLUMN is_optional BOOLEAN NOT NULL DEFAULT false;
        UPDATE public.fee_types SET is_optional = NOT is_mandatory WHERE is_optional IS FALSE AND is_mandatory IS FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'optional_default') THEN
        ALTER TABLE public.fee_types ADD COLUMN optional_default TEXT NOT NULL DEFAULT 'opt_in' CHECK (optional_default IN ('opt_in', 'opt_out'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'selection_deadline') THEN
        ALTER TABLE public.fee_types ADD COLUMN selection_deadline TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'allows_quantity') THEN
        ALTER TABLE public.fee_types ADD COLUMN allows_quantity BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'min_quantity') THEN
        ALTER TABLE public.fee_types ADD COLUMN min_quantity INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'max_quantity') THEN
        ALTER TABLE public.fee_types ADD COLUMN max_quantity INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'unit_price') THEN
        ALTER TABLE public.fee_types ADD COLUMN unit_price NUMERIC(12, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'unit_label') THEN
        ALTER TABLE public.fee_types ADD COLUMN unit_label TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'term_split') THEN
        ALTER TABLE public.fee_types ADD COLUMN term_split JSONB DEFAULT '{"split_type": "equal", "splits": []}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'eligibility_rules') THEN
        ALTER TABLE public.fee_types ADD COLUMN eligibility_rules JSONB DEFAULT '{"target": "all"}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'proration_policy') THEN
        ALTER TABLE public.fee_types ADD COLUMN proration_policy TEXT NOT NULL DEFAULT 'prorate' CHECK (proration_policy IN ('prorate', 'full', 'none'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_types' AND column_name = 'has_variants') THEN
        ALTER TABLE public.fee_types ADD COLUMN has_variants BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_types_structure ON public.fee_types(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_types_kind ON public.fee_types(kind);

-- Link existing fee_types to corresponding fee_structures where id matches
UPDATE public.fee_types ft
SET fee_structure_id = fs.id
FROM public.fee_structures fs
WHERE ft.id = fs.id AND ft.fee_structure_id IS NULL;

-- 3. Variant Catalogs Table (Reusable catalog of options: Transport, Meals, Activities, etc.)
CREATE TABLE IF NOT EXISTS public.fee_option_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    catalog_type TEXT NOT NULL, -- 'transport', 'meals', 'trips', 'activities', 'boarding', 'uniform', 'custom'
    name TEXT NOT NULL,
    code TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "route": "Route 4", "pickup": "Stage 2", "zone": "Zone A" }
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fee_option_catalogs_name UNIQUE (institution_id, catalog_type, name)
);

CREATE INDEX IF NOT EXISTS idx_fee_catalogs_inst ON public.fee_option_catalogs(institution_id, catalog_type);

-- 4. Fee Item Variants Table (Pricing Matrix per Item & Option Combination)
CREATE TABLE IF NOT EXISTS public.fee_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE,
    catalog_id UUID REFERENCES public.fee_option_catalogs(id) ON DELETE SET NULL,
    option_group TEXT NOT NULL, -- e.g. 'Location', 'Trip Type', 'Plan'
    option_name TEXT NOT NULL, -- e.g. 'Zone A - Westlands', 'Two Way', 'Lunch Only'
    combination_key TEXT, -- e.g. 'Zone A|Two Way'
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fee_item_variants_item ON public.fee_item_variants(fee_type_id);
CREATE INDEX IF NOT EXISTS idx_fee_item_variants_catalog ON public.fee_item_variants(catalog_id);

-- 5. Student Optional Selections Table (Records Choices, Variants, and Confirmation Queue)
CREATE TABLE IF NOT EXISTS public.student_optional_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
    fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.fee_item_variants(id) ON DELETE SET NULL,
    catalog_id UUID REFERENCES public.fee_option_catalogs(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    status TEXT NOT NULL DEFAULT 'chosen_not_paid' 
        CHECK (status IN ('not_chosen', 'chosen_not_paid', 'chosen_pending_confirmation', 'paid', 'opt_out_confirmed', 'needs_attention')),
    opt_out_reason TEXT,
    admin_notes TEXT,
    selected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    selected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_fee_selection UNIQUE (student_id, fee_type_id)
);

CREATE INDEX IF NOT EXISTS idx_student_opt_selections_student ON public.student_optional_selections(student_id);
CREATE INDEX IF NOT EXISTS idx_student_opt_selections_fee ON public.student_optional_selections(fee_type_id);
CREATE INDEX IF NOT EXISTS idx_student_opt_selections_status ON public.student_optional_selections(institution_id, status);

-- 6. Extend parent_students Table (Multiple Guardians, Roles & Permissions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'is_primary') THEN
        ALTER TABLE public.parent_students ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'can_pay') THEN
        ALTER TABLE public.parent_students ADD COLUMN can_pay BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'can_view') THEN
        ALTER TABLE public.parent_students ADD COLUMN can_view BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'receive_notifications') THEN
        ALTER TABLE public.parent_students ADD COLUMN receive_notifications BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'is_emergency_contact') THEN
        ALTER TABLE public.parent_students ADD COLUMN is_emergency_contact BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'verification_status') THEN
        ALTER TABLE public.parent_students ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'verification_code') THEN
        ALTER TABLE public.parent_students ADD COLUMN verification_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parent_students' AND column_name = 'verified_at') THEN
        ALTER TABLE public.parent_students ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON public.parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON public.parent_students(student_id);

-- 7. Documents Publishing & Delivery System
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'circular' 
        CHECK (category IN ('circular', 'timetable', 'form', 'policy', 'fee_structure', 'report', 'newsletter', 'other')),
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_hash TEXT,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ,
    auto_deliver_new_students BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'processing', 'published', 'withdrawn', 'archived')),
    version_label TEXT NOT NULL DEFAULT '1.0',
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_documents_inst_status ON public.documents(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(category);

-- Document Audiences
CREATE TABLE IF NOT EXISTS public.document_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    audience_type TEXT NOT NULL CHECK (audience_type IN ('institution', 'level', 'class', 'student', 'staff', 'parent')),
    audience_id TEXT, -- level_id, class_id, student_id, user_id, or null for institution-wide
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_doc_audiences_doc ON public.document_audiences(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_audiences_target ON public.document_audiences(audience_type, audience_id);

-- Document Deliveries & Access Tracking
CREATE TABLE IF NOT EXISTS public.document_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    viewed_at TIMESTAMPTZ,
    downloaded_at TIMESTAMPTZ,
    notification_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_document_delivery_recipient UNIQUE (document_id, user_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_doc_deliveries_user ON public.document_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_deliveries_student ON public.document_deliveries(student_id);
CREATE INDEX IF NOT EXISTS idx_doc_deliveries_doc ON public.document_deliveries(document_id);

-- 8. Enhanced Student Finance Summary RPC (includes held funds balance & optional item status)
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
    v_held_funds_balance NUMERIC(12, 2) := 0.00;
    v_balance_due NUMERIC(12, 2) := 0.00;
    v_optional_unpaid_amount NUMERIC(12, 2) := 0.00;
BEGIN
    -- 1. Standard School Fees Billed and Paid from Ledger
    -- Exclude held_funds (e.g. pocket money) from tuition/school income billed
    SELECT 
        COALESCE(SUM(CASE WHEN le.entry_type = 'charge' THEN le.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN le.entry_type = 'payment' THEN -le.amount ELSE 0 END), 0.00)
    INTO v_total_billed, v_total_paid
    FROM public.ledger_entries le
    LEFT JOIN public.fee_types ft ON ft.id = le.fee_type_id
    WHERE le.student_id = p_student_id 
      AND le.institution_id = p_institution_id
      AND (ft.kind IS NULL OR ft.kind != 'held_funds');

    -- 2. Held Funds Balance (Pocket Money / Deposits held on behalf of student)
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN le.entry_type = 'payment' THEN -le.amount
                WHEN le.entry_type = 'charge' THEN -le.amount
                ELSE 0 
            END
        ), 0.00)
    INTO v_held_funds_balance
    FROM public.ledger_entries le
    JOIN public.fee_types ft ON ft.id = le.fee_type_id
    WHERE le.student_id = p_student_id 
      AND le.institution_id = p_institution_id
      AND ft.kind = 'held_funds';

    -- Ensure non-negative held balance display
    v_held_funds_balance := GREATEST(0.00, v_held_funds_balance);

    -- 3. Pending Payments (submitted/under review)
    SELECT COALESCE(SUM(pa.amount), 0.00)
    INTO v_pending_amount
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    WHERE pa.student_id = p_student_id 
      AND pa.institution_id = p_institution_id
      AND p.status IN ('submitted', 'under_review', 'pending');

    -- 4. Flagged Payments
    SELECT COALESCE(SUM(pa.amount), 0.00)
    INTO v_flagged_amount
    FROM public.payment_allocations pa
    JOIN public.payments p ON p.id = pa.payment_id
    WHERE pa.student_id = p_student_id 
      AND pa.institution_id = p_institution_id
      AND p.status IN ('flagged', 'failed');

    -- 5. Available Overpayment Credits
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_credit_amount
    FROM public.credits
    WHERE student_id = p_student_id 
      AND institution_id = p_institution_id
      AND status = 'available';

    -- 6. Optional Items Chosen But Not Yet Paid
    SELECT COALESCE(SUM(total_price), 0.00)
    INTO v_optional_unpaid_amount
    FROM public.student_optional_selections
    WHERE student_id = p_student_id 
      AND institution_id = p_institution_id
      AND status = 'chosen_not_paid';

    v_balance_due := GREATEST(0.00, v_total_billed - v_total_paid);

    RETURN jsonb_build_object(
        'student_id', p_student_id,
        'total_billed', v_total_billed,
        'total_paid', v_total_paid,
        'pending_amount', v_pending_amount,
        'flagged_amount', v_flagged_amount,
        'credit_amount', v_credit_amount,
        'held_funds_balance', v_held_funds_balance,
        'optional_unpaid_amount', v_optional_unpaid_amount,
        'balance_due', v_balance_due
    );
END;
$$;

-- 9. Row Level Security Policies
ALTER TABLE public.fee_option_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_optional_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deliveries ENABLE ROW LEVEL SECURITY;

-- 9.1 Catalogs & Variants
CREATE POLICY "fee_option_catalogs_select" ON public.fee_option_catalogs
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "fee_option_catalogs_manage" ON public.fee_option_catalogs
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "fee_item_variants_select" ON public.fee_item_variants
    FOR SELECT USING (institution_id = get_current_user_institution_id() OR is_platform_admin());

CREATE POLICY "fee_item_variants_manage" ON public.fee_item_variants
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'finance', 'edit', institution_id))
        OR is_platform_admin()
    );

-- 9.2 Student Optional Selections
CREATE POLICY "student_optional_selections_select" ON public.student_optional_selections
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

CREATE POLICY "student_optional_selections_insert_parent" ON public.student_optional_selections
    FOR INSERT WITH CHECK (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'create', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid() AND ps.can_pay = true
            )
        )
    );

CREATE POLICY "student_optional_selections_update" ON public.student_optional_selections
    FOR UPDATE USING (
        institution_id = get_current_user_institution_id()
        AND (
            has_permission(auth.uid(), 'finance', 'edit', institution_id)
            OR is_platform_admin()
            OR student_id IN (
                SELECT ps.student_id FROM public.parent_students ps
                JOIN public.parents p ON p.id = ps.parent_id
                WHERE p.user_id = auth.uid() AND ps.can_pay = true
            )
        )
    );

-- 9.3 Documents & Deliveries
CREATE POLICY "documents_select" ON public.documents
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (status = 'published' OR has_permission(auth.uid(), 'management', 'view', institution_id) OR is_platform_admin())
    );

CREATE POLICY "documents_manage" ON public.documents
    FOR ALL USING (
        (institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'management', 'create', institution_id))
        OR is_platform_admin()
    );

CREATE POLICY "document_audiences_select" ON public.document_audiences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = document_audiences.document_id 
              AND (d.institution_id = get_current_user_institution_id() OR is_platform_admin())
        )
    );

CREATE POLICY "document_audiences_manage" ON public.document_audiences
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.documents d 
            WHERE d.id = document_audiences.document_id 
              AND ((d.institution_id = get_current_user_institution_id() AND has_permission(auth.uid(), 'management', 'create', d.institution_id)) OR is_platform_admin())
        )
    );

CREATE POLICY "document_deliveries_select" ON public.document_deliveries
    FOR SELECT USING (
        institution_id = get_current_user_institution_id()
        AND (
            user_id = auth.uid()
            OR has_permission(auth.uid(), 'management', 'view', institution_id)
            OR is_platform_admin()
        )
    );

CREATE POLICY "document_deliveries_update" ON public.document_deliveries
    FOR UPDATE USING (
        institution_id = get_current_user_institution_id()
        AND (user_id = auth.uid() OR is_platform_admin())
    );

COMMIT;
