-- Migration: Leaver Lifecycle, Data Retention, and Finance Administrator Designation
-- Date: 2026-09-14

-- 1. Students lifecycle & unenrollment status
ALTER TABLE public.students
    ADD COLUMN IF NOT EXISTS enrollment_status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS exit_date DATE,
    ADD COLUMN IF NOT EXISTS exit_reason TEXT;

DO $$
BEGIN
    ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_enrollment_status_check;
    ALTER TABLE public.students ADD CONSTRAINT students_enrollment_status_check
        CHECK (enrollment_status IN ('active', 'graduated', 'withdrawn', 'transferred'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_institution_status
    ON public.students(institution_id, enrollment_status);

-- 2. Teachers employment lifecycle status
ALTER TABLE public.teachers
    ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS exit_date DATE,
    ADD COLUMN IF NOT EXISTS exit_reason TEXT;

DO $$
BEGIN
    ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_employment_status_check;
    ALTER TABLE public.teachers ADD CONSTRAINT teachers_employment_status_check
        CHECK (employment_status IN ('active', 'resigned', 'contract_ended', 'terminated'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_teachers_institution_status
    ON public.teachers(institution_id, employment_status);

-- 3. Users lifecycle & retention tracking
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_institution_is_active
    ON public.users(institution_id, is_active);

-- 4. Finance Administrator Designations (Granted by Main Admin to Teachers or Admins)
CREATE TABLE IF NOT EXISTS public.finance_admin_designations (
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
    CONSTRAINT uq_finance_admin_designation_user_inst UNIQUE (institution_id, user_id)
);

-- 5. Finance Administrator Audit Logs
CREATE TABLE IF NOT EXISTS public.finance_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Generic Record Change Audit Log (for financial balance adjustments, grade updates, etc.)
CREATE TABLE IF NOT EXISTS public.record_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    change_type TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for Designations and Audit Logs
CREATE INDEX IF NOT EXISTS idx_finance_admin_designations_active
    ON public.finance_admin_designations(institution_id, user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_finance_admin_audit_logs_inst_date
    ON public.finance_admin_audit_logs(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_record_change_log_inst_table_rec
    ON public.record_change_log(institution_id, table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_record_change_log_created
    ON public.record_change_log(institution_id, created_at DESC);

-- 8. Row Level Security Policies
ALTER TABLE public.finance_admin_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_admin_designations_isolation" ON public.finance_admin_designations;
CREATE POLICY "finance_admin_designations_isolation" ON public.finance_admin_designations
FOR ALL USING (
    institution_id = get_current_user_institution_id()
);

DROP POLICY IF EXISTS "finance_admin_audit_logs_isolation" ON public.finance_admin_audit_logs;
CREATE POLICY "finance_admin_audit_logs_isolation" ON public.finance_admin_audit_logs
FOR ALL USING (
    institution_id = get_current_user_institution_id()
);

DROP POLICY IF EXISTS "record_change_log_isolation" ON public.record_change_log;
CREATE POLICY "record_change_log_isolation" ON public.record_change_log
FOR ALL USING (
    institution_id = get_current_user_institution_id()
);
