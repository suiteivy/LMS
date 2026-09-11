-- Bootstrap core schema for clean migration runs.
-- This migration creates the minimum baseline required by subsequent
-- migrations in this directory to apply on an empty Supabase database.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Core utility function expected by later migrations
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ---------------------------------------------------------------------------
-- Core reference tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    level_label TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    usd_rate NUMERIC(18, 6) NOT NULL DEFAULT 1,
    decimal_places INTEGER NOT NULL DEFAULT 2,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_currencies_single_default
    ON public.currencies (is_default)
    WHERE is_default = true;

-- Seed defaults expected by later currency migrations.
-- Safe for non-empty environments: do not overwrite existing rows or defaults.
INSERT INTO public.currencies (code, name, symbol, usd_rate, decimal_places, is_default, is_active)
VALUES
    ('USD', 'US Dollar', '$', 1, 2, false, true),
    ('KES', 'Kenyan Shilling', 'KSh', 130, 2, false, true)
ON CONFLICT (code) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.currencies
        WHERE is_default = true
    ) THEN
        UPDATE public.currencies
        SET is_default = true
        WHERE code = 'KES'
          AND is_active = true;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    email TEXT,
    type TEXT,
    principal_name TEXT,
    subscription_status TEXT DEFAULT 'active',
    subscription_plan TEXT DEFAULT 'basic',
    has_used_trial BOOLEAN DEFAULT TRUE,
    subscription_tracking_start_date TIMESTAMPTZ,
    addon_bursary BOOLEAN NOT NULL DEFAULT false,
    addon_library BOOLEAN NOT NULL DEFAULT false,
    addon_messaging BOOLEAN NOT NULL DEFAULT false,
    addon_diary BOOLEAN NOT NULL DEFAULT false,
    email_domain TEXT,
    custom_student_limit INTEGER,
    currency_id UUID REFERENCES public.currencies(id),
    category_id UUID REFERENCES public.school_categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name TEXT,
    last_name TEXT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    phone TEXT UNIQUE,
    gender TEXT,
    date_of_birth DATE,
    address TEXT,
    avatar_url TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    is_main BOOLEAN DEFAULT false,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    requires_security_questions_setup BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admins (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    institution_id UUID REFERENCES public.institutions(id),
    is_main BOOLEAN NOT NULL DEFAULT false,
    can_manage_users BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    department TEXT,
    qualification TEXT,
    position TEXT DEFAULT 'teacher',
    hire_date DATE DEFAULT CURRENT_DATE,
    specialization TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    grade_level_legacy TEXT,
    grade_level INTEGER,
    form_level INTEGER,
    academic_year TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    fee_balance NUMERIC DEFAULT 0,
    parent_contact TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parents (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    occupation TEXT,
    address TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level INTEGER,
    form_level INTEGER,
    stream TEXT,
    display_name TEXT,
    capacity INTEGER DEFAULT 40,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_id TEXT REFERENCES public.teachers(id),
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'enrolled',
    grade TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    UNIQUE(student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id TEXT NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'guardian',
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.academic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    report_type TEXT CHECK (report_type IN ('end-of-term', 'individual', 'statistical', 'ranking')) NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::jsonb,
    institution_id UUID REFERENCES public.institutions(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- ---------------------------------------------------------------------------
-- Auth/tenant helper functions used by downstream RLS policies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_institution_id UUID;
BEGIN
    SELECT institution_id
    INTO v_institution_id
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN v_institution_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role
    INTO v_role
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
    v_student_id TEXT;
BEGIN
    SELECT s.id
    INTO v_student_id
    FROM public.students s
    WHERE s.user_id = auth.uid()
    LIMIT 1;

    RETURN v_student_id;
END;
$$;
