-- Migration: Student/User Lifecycle, Clearance & Leaving System, Violations, Credentials, and Final Level Setting
-- Date: 2026-09-18

-- 1. Credential Change Requests (Name Change & Email Reset)
CREATE TABLE IF NOT EXISTS public.credential_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('name_change', 'email_reset')),
    current_value TEXT NOT NULL,
    requested_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    document_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    temp_credential TEXT,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cred_req_inst_status 
    ON public.credential_change_requests(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_cred_req_user 
    ON public.credential_change_requests(user_id);

-- 2. Institution Clearance & Leaving System
CREATE TABLE IF NOT EXISTS public.clearance_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('student', 'teacher', 'admin')),
    initiated_by TEXT NOT NULL CHECK (initiated_by IN ('admin', 'self', 'parent')),
    initiator_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    reason_category TEXT NOT NULL CHECK (reason_category IN (
        'graduation', 'withdrawal', 'transferred', 'expulsion',
        'resignation', 'contract_ended', 'terminated', 'other'
    )),
    reason_details JSONB DEFAULT '{}'::jsonb,
    current_step INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    
    -- Category-by-category independent clearance checks
    library_cleared BOOLEAN NOT NULL DEFAULT false,
    library_checked_at TIMESTAMPTZ,
    library_notes TEXT,
    
    finance_cleared BOOLEAN NOT NULL DEFAULT false,
    finance_checked_at TIMESTAMPTZ,
    finance_notes TEXT,
    
    property_cleared BOOLEAN NOT NULL DEFAULT false,
    property_checked_at TIMESTAMPTZ,
    property_notes TEXT,
    
    allow_user_continuation BOOLEAN NOT NULL DEFAULT false,
    admin_override BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concurrency Rule: Only ONE active clearance process per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_user_clearance 
    ON public.clearance_processes(institution_id, user_id) 
    WHERE status = 'in_progress';

CREATE INDEX IF NOT EXISTS idx_clearance_inst_status 
    ON public.clearance_processes(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_clearance_user 
    ON public.clearance_processes(user_id);

-- 3. Student Violations Tracking
CREATE TABLE IF NOT EXISTS public.student_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    violation_type TEXT NOT NULL CHECK (violation_type IN ('warning', 'incomplete_assignment', 'suspension', 'expulsion', 'behavioral', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    action_taken TEXT,
    recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'appealed')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_student ON public.student_violations(student_id);
CREATE INDEX IF NOT EXISTS idx_violations_inst ON public.student_violations(institution_id);

-- 4. Mark Final Level Configuration on Classes / Levels
ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS is_final_level BOOLEAN NOT NULL DEFAULT false;

-- 5. Expand Student Enrollment Status check for 'expelled'
DO $$
BEGIN
    ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_enrollment_status_check;
    ALTER TABLE public.students ADD CONSTRAINT students_enrollment_status_check
        CHECK (enrollment_status IN ('active', 'graduated', 'withdrawn', 'transferred', 'expelled'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
