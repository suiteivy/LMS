-- Migration: Full School Fees Module (Precedence Engine, Components, Waivers, Invoices)
-- Date: 2026-09-15

-- 1. Extend fee_structures with scope and hierarchy columns
ALTER TABLE public.fee_structures
    ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'institution',
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS level_type TEXT,
    ADD COLUMN IF NOT EXISTS is_override BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
    ALTER TABLE public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_scope_type_check;
    ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_scope_type_check
        CHECK (scope_type IN ('institution', 'level', 'class', 'student'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_structures_scope_type
    ON public.fee_structures(institution_id, scope_type);

CREATE INDEX IF NOT EXISTS idx_fee_structures_class_id
    ON public.fee_structures(class_id)
    WHERE class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fee_structures_student_id
    ON public.fee_structures(student_id)
    WHERE student_id IS NOT NULL;

-- 2. Discrete Named Fee Components Table
CREATE TABLE IF NOT EXISTS public.fee_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    category TEXT NOT NULL DEFAULT 'core',
    frequency TEXT NOT NULL DEFAULT 'term',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    ALTER TABLE public.fee_components DROP CONSTRAINT IF EXISTS fee_components_category_check;
    ALTER TABLE public.fee_components ADD CONSTRAINT fee_components_category_check
        CHECK (category IN ('core', 'optional', 'levy', 'activity', 'boarding', 'other'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.fee_components DROP CONSTRAINT IF EXISTS fee_components_frequency_check;
    ALTER TABLE public.fee_components ADD CONSTRAINT fee_components_frequency_check
        CHECK (frequency IN ('term', 'annual', 'one_time'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_components_structure
    ON public.fee_components(fee_structure_id);

CREATE INDEX IF NOT EXISTS idx_fee_components_institution
    ON public.fee_components(institution_id, is_active);

-- Enable RLS for fee_components
ALTER TABLE public.fee_components ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Tenant isolation for fee_components" ON public.fee_components;
    CREATE POLICY "Tenant isolation for fee_components"
        ON public.fee_components
        USING (institution_id = (current_setting('app.current_institution_id', true))::uuid);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Fee Discounts, Scholarships, and Hardship Waivers Table
CREATE TABLE IF NOT EXISTS public.fee_discounts_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    fee_component_id UUID REFERENCES public.fee_components(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'discount',
    discount_type TEXT NOT NULL DEFAULT 'fixed',
    value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    ALTER TABLE public.fee_discounts_waivers DROP CONSTRAINT IF EXISTS fee_discounts_waivers_type_check;
    ALTER TABLE public.fee_discounts_waivers ADD CONSTRAINT fee_discounts_waivers_type_check
        CHECK (type IN ('discount', 'waiver', 'scholarship', 'sibling_discount', 'hardship', 'staff_benefit', 'other'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.fee_discounts_waivers DROP CONSTRAINT IF EXISTS fee_discounts_waivers_discount_type_check;
    ALTER TABLE public.fee_discounts_waivers ADD CONSTRAINT fee_discounts_waivers_discount_type_check
        CHECK (discount_type IN ('fixed', 'percentage'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.fee_discounts_waivers DROP CONSTRAINT IF EXISTS fee_discounts_waivers_status_check;
    ALTER TABLE public.fee_discounts_waivers ADD CONSTRAINT fee_discounts_waivers_status_check
        CHECK (status IN ('active', 'revoked', 'expired'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_fee_discounts_waivers_student
    ON public.fee_discounts_waivers(student_id, status);

CREATE INDEX IF NOT EXISTS idx_fee_discounts_waivers_institution
    ON public.fee_discounts_waivers(institution_id, status);

-- Enable RLS for fee_discounts_waivers
ALTER TABLE public.fee_discounts_waivers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Tenant isolation for fee_discounts_waivers" ON public.fee_discounts_waivers;
    CREATE POLICY "Tenant isolation for fee_discounts_waivers"
        ON public.fee_discounts_waivers
        USING (institution_id = (current_setting('app.current_institution_id', true))::uuid);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Student Fee Invoices & Billing Statements Table
CREATE TABLE IF NOT EXISTS public.student_fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'unpaid',
    itemized_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DO $$
BEGIN
    ALTER TABLE public.student_fee_invoices DROP CONSTRAINT IF EXISTS student_fee_invoices_status_check;
    ALTER TABLE public.student_fee_invoices ADD CONSTRAINT student_fee_invoices_status_check
        CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue', 'cancelled'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_fee_invoices_student
    ON public.student_fee_invoices(student_id, status);

CREATE INDEX IF NOT EXISTS idx_student_fee_invoices_institution_period
    ON public.student_fee_invoices(institution_id, academic_year_id, term_id);

CREATE INDEX IF NOT EXISTS idx_student_fee_invoices_due_date
    ON public.student_fee_invoices(institution_id, due_date, status);

-- Enable RLS for student_fee_invoices
ALTER TABLE public.student_fee_invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Tenant isolation for student_fee_invoices" ON public.student_fee_invoices;
    CREATE POLICY "Tenant isolation for student_fee_invoices"
        ON public.student_fee_invoices
        USING (institution_id = (current_setting('app.current_institution_id', true))::uuid);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
