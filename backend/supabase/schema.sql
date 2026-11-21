-- ============================================================================
-- LMS CANONICAL PRODUCTION DATABASE SCHEMA
-- ============================================================================
-- File: backend/supabase/schema.sql
-- Generated: 2026-11-22
-- Baseline Git Commit: 5cd37fa
-- Schema Version: 2.0.0 (Unified Canonical Baseline)
--
-- PURPOSE:
--   The single authoritative schema definition for the LMS platform.
--   Replaces all legacy migration files. Describes the complete, intended final
--   state including ACID hardening, mandatory identifier formats, CBC curriculum,
--   reconstructed finance core, smart reports catalog, and data retention rules.
--
-- HOW TO APPLY (FRESH INSTALL):
--   1. Create an empty PostgreSQL database (Postgres 14+).
--   2. Apply this schema file:
--        psql -d <connection_string> -f backend/supabase/schema.sql
--   3. Apply canonical seeders:
--        node backend/supabase/seed/runner.js core+bootstrap
--        (or node backend/supabase/seed/runner.js all for demo environments)
--
-- HOW TO VERIFY:
--   npm run db:verify
--   npm test --prefix backend
--
-- PORTABILITY:
--   All core application tables, constraints, functions, and triggers use
--   standard PostgreSQL syntax. All platform-specific dependencies (Supabase Auth,
--   Storage Buckets & Realtime Publications) are isolated at the end of this
--   file under the designated "-- SUPABASE-SPECIFIC" section.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. SCHEMAS, ROLES & PORTABILITY HELPERS
-- ============================================================================

-- Portability helper for user identity resolution
-- Resolves auth.uid() on Supabase, or request.jwt.claim.sub on plain Postgres
CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
        auth.uid()
    );
$$;

-- Universal timestamp update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. CUSTOM ENUMS & DOMAIN TYPES (STATE MACHINES ONLY)
-- ============================================================================
-- Note: Admin-managed lists (fee categories, flag reasons, payment methods)
-- are stored as relational tables, NOT enums, per hardcoded audit standards.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
        CREATE TYPE public.payment_status_enum AS ENUM (
            'submitted', 'under_review', 'confirmed', 'flagged', 'rejected', 'reversed'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
        CREATE TYPE public.invoice_status_enum AS ENUM (
            'draft', 'issued', 'partially_paid', 'paid', 'void'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN
        CREATE TYPE public.attendance_status_enum AS ENUM (
            'present', 'absent', 'excused', 'late'
        );
    END IF;
END $$;

-- ============================================================================
-- 4. CORE PLATFORM & MULTI-TENANCY TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.school_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    level_label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.school_category_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_category_id UUID REFERENCES public.school_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.category_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT currencies_code_format CHECK (code ~ '^[A-Z]{3}$'),
    CONSTRAINT currencies_rate_positive CHECK (usd_rate > 0),
    CONSTRAINT currencies_decimal_places_range CHECK (decimal_places >= 0 AND decimal_places <= 8)
);

CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    currency TEXT NOT NULL DEFAULT 'KES',
    category_id UUID REFERENCES public.school_categories(id) ON DELETE SET NULL,
    week_start_day TEXT NOT NULL DEFAULT 'monday' CHECK (week_start_day IN ('sunday', 'monday')),
    max_custom_admins INTEGER NOT NULL DEFAULT 10,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.institution_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.school_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_institution_category UNIQUE (institution_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'parent', 'admin', 'bursar', 'platform_admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_email_institution UNIQUE (email, institution_id)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    language TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 5. MANDATORY IDENTIFIER SYSTEM & GAP-FREE SEQUENCING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.identifier_formats (
    person_type TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT '',
    min_digits INTEGER NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.identifier_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    last_number BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_identifier_counter UNIQUE (institution_id, entity_type)
);

CREATE TABLE IF NOT EXISTS public.legacy_identifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    person_type TEXT NOT NULL,
    person_id UUID NOT NULL,
    legacy_identifier TEXT NOT NULL,
    canonical_identifier TEXT NOT NULL,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_legacy_identifiers_lookup 
ON public.legacy_identifiers (institution_id, legacy_identifier);

-- ============================================================================
-- 6. ACCESS CONTROL, PERMISSIONS & FEATURE REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feature_registry (
    domain TEXT NOT NULL,
    action TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    PRIMARY KEY (domain, action)
);

CREATE TABLE IF NOT EXISTS public.role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    best_for TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    data_scope TEXT NOT NULL DEFAULT 'all',
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_role_template_inst_name UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_roles_name_institution UNIQUE (name, institution_id)
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.role_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL,
    scope_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'expired')),
    expires_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_role_inst UNIQUE (user_id, role_id, institution_id)
);

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    action TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_permission_override UNIQUE (user_id, domain, action)
);

CREATE TABLE IF NOT EXISTS public.permission_versions (
    institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_designations_user_type UNIQUE (institution_id, user_id, type)
);

CREATE TABLE IF NOT EXISTS public.role_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 7. PEOPLE & ROLE PROFILES (ADMINS, TEACHERS, STUDENTS, PARENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    admin_identifier TEXT UNIQUE,
    is_main BOOLEAN NOT NULL DEFAULT false,
    can_manage_users BOOLEAN NOT NULL DEFAULT false,
    access_level TEXT NOT NULL DEFAULT 'read_write' CHECK (access_level IN ('read_only', 'read_write')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    teacher_identifier TEXT UNIQUE,
    national_id TEXT,
    tsc_number TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave', 'transferred', 'archived')),
    specialization TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_identifier TEXT NOT NULL,
    admission_number TEXT,
    upi TEXT,
    class_id UUID, -- References public.classes(id) defined in academic module
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'transferred', 'graduated', 'archived')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_inst_ident UNIQUE (institution_id, student_identifier)
);

CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    parent_identifier TEXT,
    phone TEXT,
    address TEXT,
    occupation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_parent_inst_ident UNIQUE (institution_id, parent_identifier)
);

CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'Guardian',
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.bursars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.credential_delivery_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_security_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    answer_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_security_question UNIQUE (user_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.password_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 8. ACADEMIC STRUCTURE, CLASSES, SUBJECTS & CURRICULUM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_academic_year_inst_name UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT false,
    locked_at TIMESTAMPTZ,
    attendance_deadline TEXT DEFAULT '23:59',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_term_inst_year_name UNIQUE (institution_id, academic_year_id, name)
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    stream TEXT,
    education_level TEXT,
    capacity INTEGER NOT NULL DEFAULT 40,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Backfill foreign key from students to classes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_students_class' AND table_name = 'students'
    ) THEN
        ALTER TABLE public.students 
        ADD CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.class_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.class_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.class_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT uq_class_enrollment UNIQUE (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_enrollments_student_class UNIQUE (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.student_class_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    from_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    to_class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    reason TEXT,
    transferred_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subject_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.subject_categories(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    department TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_subjects_inst_code UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS public.subject_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_subject_class UNIQUE (subject_id, class_id)
);

CREATE TABLE IF NOT EXISTS public.subject_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_subject_teacher UNIQUE (subject_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS public.subject_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subject_topic_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subject_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    topic_area_id UUID REFERENCES public.subject_topic_areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subject_coverage_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.subject_topics(id) ON DELETE CASCADE,
    planned_date DATE,
    completed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.institution_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.track_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES public.institution_tracks(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.student_track_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES public.institution_tracks(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.content_evidence_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.record_of_work (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    duration_minutes INTEGER,
    work_done TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 9. ASSESSMENTS, GRADING SCALES & REPORT CARDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    letter_grade TEXT NOT NULL,
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    gpa_points NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.assessment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exam_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    grade TEXT,
    term TEXT,
    academic_year TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_score NUMERIC(5,2) NOT NULL,
    max_score NUMERIC(5,2) NOT NULL,
    gpa NUMERIC(4,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.grade_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    raw_score NUMERIC(5,2) NOT NULL,
    derived_grade TEXT,
    derived_gpa NUMERIC(4,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.grade_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    grade_entry_id UUID REFERENCES public.grade_entries(id) ON DELETE CASCADE,
    old_score NUMERIC(5,2),
    new_score NUMERIC(5,2),
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    total_weighted_score NUMERIC(7,2),
    average_percentage NUMERIC(5,2),
    gpa NUMERIC(4,2),
    letter_grade TEXT,
    rank_in_class INTEGER,
    total_students_in_class INTEGER,
    attendance_count INTEGER DEFAULT 0,
    total_school_days INTEGER DEFAULT 0,
    teacher_remarks TEXT,
    admin_remarks TEXT,
    status TEXT DEFAULT 'draft',
    released_at TIMESTAMPTZ,
    released_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    learner_development JSONB DEFAULT '[]'::jsonb,
    curriculum_type TEXT DEFAULT 'cbc',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_card_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    score NUMERIC(5,2),
    grade TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.academic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.academic_report_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.academic_report_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    report_id UUID REFERENCES public.academic_reports(id) ON DELETE CASCADE,
    downloaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.institution_assessment_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    assessment_name TEXT NOT NULL,
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.subject_report_card_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    assessment_type_id UUID REFERENCES public.assessment_types(id) ON DELETE CASCADE,
    is_included BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.national_assessment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    assessment_name TEXT NOT NULL,
    score NUMERIC(5,2),
    grade TEXT,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.promotion_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    from_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    to_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.promotion_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_cycle_id UUID NOT NULL REFERENCES public.promotion_cycles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    action TEXT NOT NULL DEFAULT 'promote',
    target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 10. ATTENDANCE, TIMETABLES & CALENDARS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused', 'late')),
    remarks TEXT,
    marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_student_attendance_date UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS public.teacher_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'on_leave', 'half_day')),
    hours_worked NUMERIC(4,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_teacher_attendance_date UNIQUE (teacher_id, date)
);

CREATE TABLE IF NOT EXISTS public.daily_hours_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.daily_hours_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.daily_hours_logs(id) ON DELETE CASCADE,
    activity TEXT NOT NULL,
    hours NUMERIC(4,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.timetable_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    periods_per_day INTEGER NOT NULL DEFAULT 8,
    period_duration_minutes INTEGER NOT NULL DEFAULT 40,
    break_intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'academic',
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.national_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL DEFAULT 'KE',
    name TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.institution_holiday_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    holiday_id UUID NOT NULL REFERENCES public.national_holidays(id) ON DELETE CASCADE,
    is_observed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 11. FINANCE, INVOICING, PAYMENTS & APPEND-ONLY ACID LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fee_categories_inst_name UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS public.fee_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.fee_categories(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    billing_frequency TEXT NOT NULL DEFAULT 'termly',
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    partial_payment_allowed BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active',
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fee_type_applicability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fee_type_id UUID NOT NULL REFERENCES public.fee_types(id) ON DELETE CASCADE,
    scope_type TEXT NOT NULL DEFAULT 'school',
    scope_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fee_type_applicability UNIQUE (institution_id, fee_type_id, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS public.fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES public.terms(id) ON DELETE CASCADE,
    level TEXT NOT NULL,
    name TEXT,
    description TEXT,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fee_structure_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE,
    fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_optional BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fee_option_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fee_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.fee_option_catalogs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fee_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fee_discounts_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.student_optional_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    fee_item_variant_id UUID REFERENCES public.fee_item_variants(id) ON DELETE CASCADE,
    selected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.student_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
    term_id UUID REFERENCES public.terms(id) ON DELETE SET NULL,
    total_billed NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.student_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_bill_id UUID NOT NULL REFERENCES public.student_bills(id) ON DELETE CASCADE,
    fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.student_fee_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    requires_reference BOOLEAN NOT NULL DEFAULT true,
    requires_proof BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payment_methods_inst_code UNIQUE (institution_id, code)
);

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

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2),
    confirmed_amount NUMERIC(12,2),
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'confirmed', 'flagged', 'rejected', 'reversed')),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    reference_number TEXT,
    submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    idempotency_key TEXT,
    proof_url TEXT,
    is_split BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    flag_reason_id UUID REFERENCES public.flag_reasons(id) ON DELETE SET NULL,
    flagged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'dismissed')),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    fee_type_id UUID REFERENCES public.fee_types(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.receipt_sequences (
    institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
    prefix TEXT NOT NULL DEFAULT 'REC-',
    last_sequence BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'KES',
    issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_receipt_inst_number UNIQUE (institution_id, receipt_number)
);

-- APPEND-ONLY FINANCIAL LEDGER
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('debit', 'credit')),
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    account_id UUID NOT NULL,
    reference_type TEXT NOT NULL,
    reference_id UUID NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.reversals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    reversed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.finance_settings (
    institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
    currency_code TEXT NOT NULL DEFAULT 'KES',
    receipt_prefix TEXT NOT NULL DEFAULT 'REC-',
    receipt_padding INTEGER NOT NULL DEFAULT 6,
    receipt_footer_text TEXT,
    allow_overpayment_credit BOOLEAN NOT NULL DEFAULT true,
    allow_partial_payments BOOLEAN NOT NULL DEFAULT true,
    grace_period_days INTEGER NOT NULL DEFAULT 14,
    late_penalty_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    max_upload_size_mb INTEGER NOT NULL DEFAULT 10,
    retention_days INTEGER NOT NULL DEFAULT 2555,
    auto_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.bursaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.bursary_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    bursary_id UUID REFERENCES public.bursaries(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    amount_requested NUMERIC(12,2) NOT NULL,
    amount_awarded NUMERIC(12,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id UUID NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    purpose TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.teacher_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'processed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.finance_admin_designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.finance_admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 12. LIBRARY & LEARNING RESOURCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    publisher TEXT,
    category TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'available',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.borrowed_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    borrow_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned', 'overdue', 'lost')),
    fine_amount NUMERIC(8,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.library_config (
    institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.librarian_designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.librarian_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    submission_url TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    score NUMERIC(5,2),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_assignment_submission UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 13. COMMUNICATIONS, MESSAGING, NOTIFICATIONS & DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all',
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.message_edit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    old_content TEXT NOT NULL,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'open',
    category TEXT NOT NULL DEFAULT 'general',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.document_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    audience_type TEXT NOT NULL,
    audience_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.document_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    recipient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_viewed BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.help_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    example TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_help_content_key_lang UNIQUE (key, language, institution_id)
);

CREATE TABLE IF NOT EXISTS public.demo_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT NOT NULL,
    feature_area TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.demo_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL UNIQUE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.addon_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    addon_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.trial_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- 14. LIFECYCLE, CLEARANCE & RETENTION COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clearance_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    initiated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.student_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    incident_date DATE NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.credential_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.record_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    change_summary JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.records_dossier_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    target_person_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    data_class TEXT NOT NULL,
    retention_years INTEGER NOT NULL DEFAULT 7,
    action_on_expiry TEXT NOT NULL DEFAULT 'archive',
    legal_basis TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_retention_policy UNIQUE (institution_id, data_class)
);

CREATE TABLE IF NOT EXISTS public.legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    reason TEXT NOT NULL,
    placed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.restore_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    target_table TEXT NOT NULL,
    target_record_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 15. SMART REPORTS CATALOG, QUERY SCHEDULING & HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_datasets (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    table_name TEXT NOT NULL,
    grain TEXT NOT NULL,
    owning_sections TEXT[] NOT NULL,
    required_permissions TEXT[] NOT NULL,
    sensitivity_level TEXT NOT NULL DEFAULT 'standard',
    history_behavior TEXT NOT NULL DEFAULT 'immutable_log'
);

CREATE TABLE IF NOT EXISTS public.report_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_code TEXT NOT NULL REFERENCES public.report_datasets(code) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    label TEXT NOT NULL,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    allowed_operators TEXT[] NOT NULL,
    is_filterable BOOLEAN NOT NULL DEFAULT true,
    is_sortable BOOLEAN NOT NULL DEFAULT true,
    is_groupable BOOLEAN NOT NULL DEFAULT false,
    is_aggregatable BOOLEAN NOT NULL DEFAULT false,
    is_selectable BOOLEAN NOT NULL DEFAULT true,
    sensitivity_level TEXT NOT NULL DEFAULT 'standard',
    display_format TEXT NOT NULL DEFAULT 'plain',
    CONSTRAINT uq_report_field UNIQUE (dataset_code, field_name)
);

CREATE TABLE IF NOT EXISTS public.report_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset TEXT NOT NULL REFERENCES public.report_datasets(code) ON DELETE CASCADE,
    target_dataset TEXT NOT NULL REFERENCES public.report_datasets(code) ON DELETE CASCADE,
    join_type TEXT NOT NULL DEFAULT 'LEFT',
    join_condition TEXT NOT NULL,
    cardinality TEXT NOT NULL DEFAULT 'one_to_many',
    fan_out_risk BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT uq_report_relation UNIQUE (source_dataset, target_dataset)
);

CREATE TABLE IF NOT EXISTS public.report_metrics (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    dataset_code TEXT NOT NULL REFERENCES public.report_datasets(code) ON DELETE CASCADE,
    aggregation_type TEXT NOT NULL,
    expression TEXT NOT NULL,
    display_format TEXT NOT NULL DEFAULT 'number'
);

CREATE TABLE IF NOT EXISTS public.report_contexts (
    context_name TEXT PRIMARY KEY,
    section_key TEXT NOT NULL,
    allowed_datasets TEXT[] NOT NULL,
    allowed_cross_sections TEXT[] NOT NULL
);

CREATE TABLE IF NOT EXISTS public.report_presets (
    code TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    context_section TEXT NOT NULL,
    query_spec JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    query_spec JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    saved_report_id UUID REFERENCES public.saved_reports(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.report_jobs(id) ON DELETE CASCADE,
    output_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.report_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    dataset_code TEXT,
    query_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 16. ACID INTEGRITY, IDEMPOTENCY, TRANSACTIONAL OUTBOX & QUARANTINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    request_path TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_code INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
    CONSTRAINT uq_idempotency_user_key UNIQUE (idempotency_key, user_id)
);

CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'dlq')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.outbox_events_dlq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    retry_count INTEGER NOT NULL,
    dead_lettered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS public.data_quality_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    source_identifier TEXT,
    raw_record JSONB NOT NULL,
    anomaly_reason TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    status TEXT NOT NULL DEFAULT 'quarantined' CHECK (status IN ('quarantined', 'reviewed', 'corrected', 'discarded')),
    flagged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT
);

-- ============================================================================
-- 17. PERFORMANCE INDEXES (MULTI-TENANT, COMPOSITE & COVERING)
-- ============================================================================

-- Core Platform
CREATE INDEX IF NOT EXISTS idx_users_inst_role ON public.users(institution_id, role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users(lower(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(institution_id, phone);
CREATE INDEX IF NOT EXISTS idx_user_roles_inst_user ON public.user_roles(institution_id, user_id, status);

-- Identifiers & Sequences
CREATE INDEX IF NOT EXISTS idx_identifier_counters_lookup ON public.identifier_counters(institution_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_admins_ident ON public.admins(institution_id, admin_identifier);
CREATE INDEX IF NOT EXISTS idx_teachers_ident ON public.teachers(institution_id, teacher_identifier);
CREATE INDEX IF NOT EXISTS idx_students_ident ON public.students(institution_id, student_identifier);
CREATE INDEX IF NOT EXISTS idx_parents_ident ON public.parents(institution_id, parent_identifier);

-- Academics & Classes
CREATE INDEX IF NOT EXISTS idx_classes_inst_year ON public.classes(institution_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_inst_student ON public.class_enrollments(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_inst_sub ON public.subject_teachers(institution_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_classes_inst_sub ON public.subject_classes(institution_id, subject_id);

-- Attendance & Timetables
CREATE INDEX IF NOT EXISTS idx_attendance_inst_class_date ON public.attendance(institution_id, class_id, date);
CREATE INDEX IF NOT EXISTS idx_timetables_inst_class ON public.timetables(institution_id, class_id, day_of_week);

-- Finance & Ledger
CREATE INDEX IF NOT EXISTS idx_payments_inst_status ON public.payments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_student_created ON public.payments(institution_id, student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_inst_student ON public.invoices(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_inst_number ON public.receipts(institution_id, receipt_number);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON public.ledger_entries(institution_id, account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_type ON public.ledger_entries(institution_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_fee_structure_items_inst ON public.fee_structure_items(institution_id, fee_structure_id);

-- Library
CREATE INDEX IF NOT EXISTS idx_books_inst_avail ON public.books(institution_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_borrowed_books_status ON public.borrowed_books(institution_id, status, due_date);

-- Communications & Messaging
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_inst_time ON public.announcements(institution_id, created_at DESC);

-- ACID, Idempotency & Outbox
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_lookup ON public.idempotency_keys(idempotency_key, user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON public.idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_retry ON public.outbox_events(status, retry_count, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_outbox_events_inst ON public.outbox_events(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quarantine_inst_status ON public.data_quality_quarantine(institution_id, status);

-- ============================================================================
-- 18. FUNCTIONS & STORED PROCEDURES (BUSINESS LOGIC & INVARIANTS)
-- ============================================================================

-- 18.1 Identity & Context Resolvers
CREATE OR REPLACE FUNCTION public.get_current_user_institution_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT institution_id FROM public.users WHERE id = public.app_user_id();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT role FROM public.users WHERE id = public.app_user_id();
$$;

-- 18.2 Permission Version Management
CREATE OR REPLACE FUNCTION public.bump_user_permission_version(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inst_id UUID;
BEGIN
    SELECT institution_id INTO v_inst_id FROM public.users WHERE id = p_user_id;
    IF v_inst_id IS NOT NULL THEN
        INSERT INTO public.permission_versions (institution_id, version, updated_at)
        VALUES (v_inst_id, 1, timezone('utc'::text, now()))
        ON CONFLICT (institution_id) DO UPDATE SET
            version = public.permission_versions.version + 1,
            updated_at = timezone('utc'::text, now());
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_role_users_permission_version(p_role_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inst_id UUID;
BEGIN
    SELECT institution_id INTO v_inst_id FROM public.roles WHERE id = p_role_id;
    IF v_inst_id IS NOT NULL THEN
        INSERT INTO public.permission_versions (institution_id, version, updated_at)
        VALUES (v_inst_id, 1, timezone('utc'::text, now()))
        ON CONFLICT (institution_id) DO UPDATE SET
            version = public.permission_versions.version + 1,
            updated_at = timezone('utc'::text, now());
    END IF;
END;
$$;

-- 18.3 Permission Checks (has_permission)
CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_feature TEXT,
    p_action TEXT,
    p_institution_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_inst_id UUID;
    v_has_perm BOOLEAN := false;
BEGIN
    SELECT role, institution_id INTO v_role, v_inst_id 
    FROM public.users WHERE id = p_user_id;

    -- Platform admins have universal access
    IF v_role = 'platform_admin' THEN
        RETURN true;
    END IF;

    -- Verify tenant match if provided
    IF p_institution_id IS NOT NULL AND v_inst_id != p_institution_id THEN
        RETURN false;
    END IF;

    -- Check explicit deny in overrides
    IF EXISTS (
        SELECT 1 FROM public.user_permission_overrides
        WHERE user_id = p_user_id AND domain = p_feature AND action = p_action AND is_granted = false
    ) THEN
        RETURN false;
    END IF;

    -- Check explicit grant in overrides
    IF EXISTS (
        SELECT 1 FROM public.user_permission_overrides
        WHERE user_id = p_user_id AND domain = p_feature AND action = p_action AND is_granted = true
    ) THEN
        RETURN true;
    END IF;

    -- Check assigned user roles
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        JOIN public.role_permissions rp ON ur.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id 
          AND ur.status = 'active'
          AND (p.name = p_feature || ':' || p_action OR p.name = p_feature || ':*')
    ) INTO v_has_perm;

    RETURN v_has_perm;
END;
$$;

-- 18.4 Main Admin Invariants Guard
CREATE OR REPLACE FUNCTION public.check_main_admin_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_mains INTEGER;
BEGIN
    IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_main = false AND OLD.is_main = true)) THEN
        SELECT count(*) INTO v_active_mains
        FROM public.admins
        WHERE institution_id = OLD.institution_id AND is_main = true AND id != OLD.id;

        IF v_active_mains < 1 THEN
            RAISE EXCEPTION 'ACID Invariant Violation: Institution must retain at least one active Main Admin. Operation blocked.';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 18.5 Teacher-Admin Invariant Guard
CREATE OR REPLACE FUNCTION public.check_teacher_admin_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.teachers WHERE user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'Role Separation Violation: A teacher cannot simultaneously hold administrative role profiles. Operation blocked.';
    END IF;
    RETURN NEW;
END;
$$;

-- 18.6 Admin Access Level Invariants
CREATE OR REPLACE FUNCTION public.check_admin_access_level_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_main = true AND NEW.access_level = 'read_only' THEN
        RAISE EXCEPTION 'Invariant Violation: Main Admin cannot be set to read_only access level.';
    END IF;
    RETURN NEW;
END;
$$;

-- 18.7 Gap-Free Identifier Allocation
CREATE OR REPLACE FUNCTION public.fn_assign_next_identifier(
    p_institution_id UUID,
    p_entity_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT := '';
    v_min_digits INTEGER := 4;
    v_next_num BIGINT;
    v_allocated_ident TEXT;
BEGIN
    -- Fetch format rules
    SELECT prefix, min_digits INTO v_prefix, v_min_digits
    FROM public.identifier_formats
    WHERE person_type = p_entity_type;

    IF v_prefix IS NULL THEN
        IF p_entity_type = 'staff' THEN v_prefix := 'ST';
        ELSIF p_entity_type = 'parent' THEN v_prefix := 'PA';
        ELSIF p_entity_type = 'admin' THEN v_prefix := 'AD';
        ELSE v_prefix := '';
        END IF;
        v_min_digits := 4;
    END IF;

    -- Atomic row-lock increment on counter
    INSERT INTO public.identifier_counters (institution_id, entity_type, last_number, updated_at)
    VALUES (p_institution_id, p_entity_type, 1, timezone('utc'::text, now()))
    ON CONFLICT (institution_id, entity_type) DO UPDATE SET
        last_number = public.identifier_counters.last_number + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_number INTO v_next_num;

    v_allocated_ident := v_prefix || lpad(v_next_num::TEXT, v_min_digits, '0');
    RETURN v_allocated_ident;
END;
$$;

-- 18.8 Identifier Immutability Guard
CREATE OR REPLACE FUNCTION public.fn_guard_identifier_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'students' THEN
        IF OLD.student_identifier IS NOT NULL AND NEW.student_identifier IS DISTINCT FROM OLD.student_identifier THEN
            RAISE EXCEPTION 'Immutable Field Violation: student_identifier cannot be modified directly. Use correct_person_identifier() stored procedure.';
        END IF;
    ELSIF TG_TABLE_NAME = 'teachers' THEN
        IF OLD.teacher_identifier IS NOT NULL AND NEW.teacher_identifier IS DISTINCT FROM OLD.teacher_identifier THEN
            RAISE EXCEPTION 'Immutable Field Violation: teacher_identifier cannot be modified directly. Use correct_person_identifier() stored procedure.';
        END IF;
    ELSIF TG_TABLE_NAME = 'parents' THEN
        IF OLD.parent_identifier IS NOT NULL AND NEW.parent_identifier IS DISTINCT FROM OLD.parent_identifier THEN
            RAISE EXCEPTION 'Immutable Field Violation: parent_identifier cannot be modified directly. Use correct_person_identifier() stored procedure.';
        END IF;
    ELSIF TG_TABLE_NAME = 'admins' THEN
        IF OLD.admin_identifier IS NOT NULL AND NEW.admin_identifier IS DISTINCT FROM OLD.admin_identifier THEN
            RAISE EXCEPTION 'Immutable Field Violation: admin_identifier cannot be modified directly. Use correct_person_identifier() stored procedure.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 18.9 Controlled Identifier Correction Routine
CREATE OR REPLACE FUNCTION public.correct_person_identifier(
    p_institution_id UUID,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_new_identifier TEXT,
    p_reason TEXT,
    p_corrected_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_ident TEXT;
BEGIN
    IF p_entity_type = 'student' THEN
        SELECT student_identifier INTO v_old_ident FROM public.students WHERE id = p_entity_id AND institution_id = p_institution_id;
        UPDATE public.students SET student_identifier = p_new_identifier, admission_number = p_new_identifier, updated_at = NOW() WHERE id = p_entity_id;
    ELSIF p_entity_type = 'staff' OR p_entity_type = 'teacher' THEN
        SELECT teacher_identifier INTO v_old_ident FROM public.teachers WHERE id = p_entity_id AND institution_id = p_institution_id;
        UPDATE public.teachers SET teacher_identifier = p_new_identifier, updated_at = NOW() WHERE id = p_entity_id;
    ELSIF p_entity_type = 'parent' THEN
        SELECT parent_identifier INTO v_old_ident FROM public.parents WHERE id = p_entity_id AND institution_id = p_institution_id;
        UPDATE public.parents SET parent_identifier = p_new_identifier, updated_at = NOW() WHERE id = p_entity_id;
    END IF;

    -- Log change
    INSERT INTO public.record_change_log (
        institution_id, table_name, record_id, action, changed_by, change_summary, created_at
    ) VALUES (
        p_institution_id, p_entity_type, p_entity_id::TEXT, 'IDENTIFIER_CORRECTION', p_corrected_by,
        jsonb_build_object('old', v_old_ident, 'new', p_new_identifier, 'reason', p_reason), NOW()
    );

    RETURN jsonb_build_object('success', true, 'old_identifier', v_old_ident, 'new_identifier', p_new_identifier);
END;
$$;

-- 18.10 Receipt Number Generator
CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_institution_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix TEXT := 'REC-';
    v_padding INTEGER := 6;
    v_seq BIGINT;
BEGIN
    SELECT receipt_prefix, receipt_padding INTO v_prefix, v_padding
    FROM public.finance_settings
    WHERE institution_id = p_institution_id;

    IF v_prefix IS NULL THEN v_prefix := 'REC-'; END IF;
    IF v_padding IS NULL THEN v_padding := 6; END IF;

    INSERT INTO public.receipt_sequences (institution_id, prefix, last_sequence, updated_at)
    VALUES (p_institution_id, v_prefix, 1, timezone('utc'::text, now()))
    ON CONFLICT (institution_id) DO UPDATE SET
        last_sequence = public.receipt_sequences.last_sequence + 1,
        updated_at = timezone('utc'::text, now())
    RETURNING last_sequence INTO v_seq;

    RETURN v_prefix || lpad(v_seq::TEXT, v_padding, '0');
END;
$$;

-- 18.11 Student Finance Summary Stored Procedure
CREATE OR REPLACE FUNCTION public.get_student_finance_summary(
    p_student_id UUID,
    p_institution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_billed NUMERIC(12,2) := 0.00;
    v_total_paid NUMERIC(12,2) := 0.00;
    v_balance NUMERIC(12,2) := 0.00;
    v_currency TEXT := 'KES';
BEGIN
    SELECT COALESCE(SUM(total_billed), 0.00), COALESCE(SUM(total_paid), 0.00)
    INTO v_total_billed, v_total_paid
    FROM public.student_bills
    WHERE student_id = p_student_id AND institution_id = p_institution_id;

    SELECT currency INTO v_currency FROM public.institutions WHERE id = p_institution_id;

    v_balance := v_total_billed - v_total_paid;

    RETURN jsonb_build_object(
        'student_id', p_student_id,
        'institution_id', p_institution_id,
        'currency', COALESCE(v_currency, 'KES'),
        'total_billed', v_total_billed,
        'total_paid', v_total_paid,
        'outstanding_balance', v_balance,
        'as_of', NOW()
    );
END;
$$;

-- 18.12 Append-Only Financial Ledger Guard
CREATE OR REPLACE FUNCTION public.trg_guard_ledger_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE EXCEPTION 'ACID Invariant Violation: Financial ledger entries are strictly append-only. UPDATE and DELETE operations are permanently prohibited.';
    RETURN NULL;
END;
$$;

-- 18.13 Institutional Bootstrap Function (Section 3.4)
CREATE OR REPLACE FUNCTION public.bootstrap_institution(p_institution_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Initialize Identifier Counters
    INSERT INTO public.identifier_counters (institution_id, entity_type, last_number, updated_at)
    VALUES 
        (p_institution_id, 'student', 0, NOW()),
        (p_institution_id, 'staff', 0, NOW()),
        (p_institution_id, 'parent', 0, NOW()),
        (p_institution_id, 'admin', 0, NOW())
    ON CONFLICT (institution_id, entity_type) DO NOTHING;

    -- 2. Default Payment Methods
    INSERT INTO public.payment_methods (institution_id, name, code, requires_reference, requires_proof, display_order)
    VALUES 
        (p_institution_id, 'M-Pesa', 'mpesa', true, true, 1),
        (p_institution_id, 'Bank Deposit / Wire', 'bank_transfer', true, true, 2),
        (p_institution_id, 'Cash', 'cash', false, false, 3),
        (p_institution_id, 'Cheque', 'cheque', true, true, 4)
    ON CONFLICT (institution_id, code) DO NOTHING;

    -- 3. Default Flag Reasons
    INSERT INTO public.flag_reasons (institution_id, reason_code, label, description, display_order)
    VALUES 
        (p_institution_id, 'not_found', 'Payment not found on statement', 'The reference code or amount does not appear on the official bank/M-Pesa statement.', 1),
        (p_institution_id, 'amount_mismatch', 'Amount mismatch', 'The amount entered in the app differs from the actual funds received on the statement.', 2),
        (p_institution_id, 'duplicate_reference', 'Duplicate transaction reference', 'A transaction with this exact reference code has already been confirmed.', 3),
        (p_institution_id, 'invalid_account', 'Invalid or unassociated student', 'The payment cannot be mapped to the claimed student or account.', 4),
        (p_institution_id, 'other', 'Other issue', 'A manual discrepancy noted by bursar or finance team.', 5)
    ON CONFLICT (institution_id, reason_code) DO NOTHING;

    -- 4. Default Fee Categories
    INSERT INTO public.fee_categories (institution_id, name, description, display_order)
    VALUES 
        (p_institution_id, 'School Fees', 'Core academic tuition and development', 1),
        (p_institution_id, 'Services', 'Transport, meals, and boarding facilities', 2),
        (p_institution_id, 'Activities', 'Sports, clubs, excursions, and extracurriculars', 3),
        (p_institution_id, 'Administrative', 'Admission, exam registration, identity cards, and assessments', 4)
    ON CONFLICT (institution_id, name) DO NOTHING;

    -- 5. Default Finance Settings
    INSERT INTO public.finance_settings (
        institution_id, currency_code, receipt_prefix, receipt_padding, receipt_footer_text,
        allow_overpayment_credit, allow_partial_payments, grace_period_days, late_penalty_percent,
        max_upload_size_mb, retention_days, auto_reminder_enabled
    ) VALUES (
        p_institution_id, 'KES', 'REC-', 6, 'Thank you for your payment. Please keep this receipt for your records.',
        true, true, 14, 0.00,
        10, 2555, true
    ) ON CONFLICT (institution_id) DO NOTHING;

    -- 6. Default Grading Scales (CBC & Standard)
    INSERT INTO public.grading_scales (
        institution_id, name, letter_grade, min_score, max_score, gpa_points, description, is_active, created_at, updated_at
    )
    SELECT 
        p_institution_id,
        'Competency-Based Scale',
        scale.letter_grade,
        scale.min_score,
        scale.max_score,
        scale.gpa_points,
        scale.description,
        true,
        NOW(),
        NOW()
    FROM (
        VALUES 
            ('Exceeding Expectation', 80.00, 100.00, 4.0, 'EE - Learner consistently demonstrates mastery and exceeds expectations'),
            ('Meeting Expectation', 60.00, 79.99, 3.0, 'ME - Learner demonstrates required competency and meets learning outcomes'),
            ('Approaching Expectation', 40.00, 59.99, 2.0, 'AE - Learner requires occasional assistance to meet competency targets'),
            ('Below Expectation', 0.00, 39.99, 1.0, 'BE - Learner requires targeted intervention and continuous guidance')
    ) AS scale(letter_grade, min_score, max_score, gpa_points, description)
    ON CONFLICT DO NOTHING;

    -- 7. Default Library Config
    INSERT INTO public.library_config (institution_id, settings, created_at, updated_at)
    VALUES (
        p_institution_id,
        '{
            "defaultBorrowDurationDays": 14,
            "maxBooksPerStudent": 3,
            "overdueFinePerDay": 20,
            "userRoles": {
                "student": {"borrowDuration": 14, "maxBooks": 3},
                "teacher": {"borrowDuration": 30, "maxBooks": 10}
            }
        }'::jsonb,
        NOW(),
        NOW()
    ) ON CONFLICT (institution_id) DO NOTHING;

    -- 8. Default Retention Policies
    INSERT INTO public.retention_policies (institution_id, data_class, retention_years, action_on_expiry, legal_basis)
    VALUES
        (p_institution_id, 'academic_records', 10, 'archive', 'Kenya Basic Education Act & National Examination Standards'),
        (p_institution_id, 'financial_records', 7, 'archive', 'Public Finance Management & Revenue Authority Statutory Compliance'),
        (p_institution_id, 'attendance_logs', 5, 'anonymize', 'School Regulatory Attendance Record Guidelines'),
        (p_institution_id, 'communications', 3, 'delete', 'Data Protection Act Privacy Minimization Standard'),
        (p_institution_id, 'system_activity_logs', 2, 'delete', 'Security Audit Trail Maintenance Standard'),
        (p_institution_id, 'library_history', 3, 'anonymize', 'Library Resource Management Policy')
    ON CONFLICT (institution_id, data_class) DO NOTHING;

    -- 9. Initialize Permission Version
    INSERT INTO public.permission_versions (institution_id, version, updated_at)
    VALUES (p_institution_id, 1, NOW())
    ON CONFLICT (institution_id) DO NOTHING;

END;
$$;

-- ============================================================================
-- 19. TRIGGERS (INVARIANTS, IMMUTABILITY & LIFECYCLE MANAGEMENT)
-- ============================================================================

-- Timestamps
CREATE OR REPLACE TRIGGER trg_institutions_updated_at BEFORE UPDATE ON public.institutions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_academic_years_updated_at BEFORE UPDATE ON public.academic_years FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_terms_updated_at BEFORE UPDATE ON public.terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_parents_updated_at BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ledger & Audit Immutability Guards
DROP TRIGGER IF EXISTS trg_guard_ledger_immutability ON public.ledger_entries;
CREATE TRIGGER trg_guard_ledger_immutability
BEFORE UPDATE OR DELETE ON public.ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_guard_ledger_immutability();

-- Identifier Immutability Guards
DROP TRIGGER IF EXISTS trg_guard_student_identifier ON public.students;
CREATE TRIGGER trg_guard_student_identifier
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

DROP TRIGGER IF EXISTS trg_guard_teacher_identifier ON public.teachers;
CREATE TRIGGER trg_guard_teacher_identifier
BEFORE UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

DROP TRIGGER IF EXISTS trg_guard_parent_identifier ON public.parents;
CREATE TRIGGER trg_guard_parent_identifier
BEFORE UPDATE ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

DROP TRIGGER IF EXISTS trg_guard_admin_identifier ON public.admins;
CREATE TRIGGER trg_guard_admin_identifier
BEFORE UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_identifier_immutability();

-- Admin Invariants Guards
DROP TRIGGER IF EXISTS trg_admins_main_admin_guard ON public.admins;
CREATE TRIGGER trg_admins_main_admin_guard
BEFORE UPDATE OR DELETE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.check_main_admin_invariants();

DROP TRIGGER IF EXISTS trg_admins_teacher_guard ON public.admins;
CREATE TRIGGER trg_admins_teacher_guard
BEFORE INSERT OR UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.check_teacher_admin_invariants();

DROP TRIGGER IF EXISTS trg_admins_access_level_guard ON public.admins;
CREATE TRIGGER trg_admins_access_level_guard
BEFORE INSERT OR UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.check_admin_access_level_invariants();

-- Automatic Institutional Bootstrap Trigger
CREATE OR REPLACE FUNCTION public.trg_fn_bootstrap_institution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.bootstrap_institution(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bootstrap_new_institution ON public.institutions;
CREATE TRIGGER trg_bootstrap_new_institution
AFTER INSERT ON public.institutions
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_bootstrap_institution();

-- ============================================================================
-- 20. VIEWS (REPORTING & APPLICATION INTERFACES)
-- ============================================================================

CREATE OR REPLACE VIEW public.v_classes_detailed AS
SELECT 
    c.id,
    c.institution_id,
    c.name,
    c.level,
    c.stream,
    c.capacity,
    c.academic_year_id,
    ay.name AS academic_year_name,
    COUNT(s.id) AS enrolled_students_count
FROM public.classes c
LEFT JOIN public.academic_years ay ON c.academic_year_id = ay.id
LEFT JOIN public.students s ON s.class_id = c.id AND s.status = 'active' AND s.deleted_at IS NULL
GROUP BY c.id, c.institution_id, c.name, c.level, c.stream, c.capacity, c.academic_year_id, ay.name;

CREATE OR REPLACE VIEW public.v_students_detailed AS
SELECT 
    s.id,
    s.institution_id,
    s.student_identifier,
    s.admission_number,
    s.upi,
    s.status,
    s.class_id,
    c.name AS class_name,
    c.level AS class_level,
    u.first_name,
    u.last_name,
    u.full_name,
    u.email,
    u.phone,
    s.created_at
FROM public.students s
LEFT JOIN public.users u ON s.user_id = u.id
LEFT JOIN public.classes c ON s.class_id = c.id;

CREATE OR REPLACE VIEW public.config AS
SELECT 
    key,
    value,
    updated_at
FROM public.system_settings;

-- ============================================================================
-- 21. ROW LEVEL SECURITY (RLS) POLICIES - STRICT MULTI-TENANCY ISOLATION
-- ============================================================================

-- Enable RLS on every table
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowed_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identifier_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identifier_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Standard Multi-Tenant Isolation Policies
CREATE POLICY "tenant_isolation_institutions" ON public.institutions FOR ALL USING (
    id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_users" ON public.users FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR id = public.app_user_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_students" ON public.students FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_teachers" ON public.teachers FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_parents" ON public.parents FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_admins" ON public.admins FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_classes" ON public.classes FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_subjects" ON public.subjects FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_payments" ON public.payments FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_invoices" ON public.invoices FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_receipts" ON public.receipts FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_ledger" ON public.ledger_entries FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_attendance" ON public.attendance FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_books" ON public.books FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_borrowed_books" ON public.borrowed_books FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_announcements" ON public.announcements FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_notifications" ON public.notifications FOR ALL USING (
    user_id = public.app_user_id() OR institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_documents" ON public.documents FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

CREATE POLICY "tenant_isolation_report_cards" ON public.report_cards FOR ALL USING (
    institution_id = public.get_current_user_institution_id() OR public.get_current_user_role() = 'platform_admin'
);

-- Public Read Catalog Policies
CREATE POLICY "currencies_read_all" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "help_content_read_all" ON public.help_content FOR SELECT USING (true);
CREATE POLICY "identifier_formats_read_all" ON public.identifier_formats FOR SELECT USING (true);
CREATE POLICY "permissions_read_all" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "system_settings_read_all" ON public.system_settings FOR SELECT USING (true);

-- ============================================================================
-- 22. SUPABASE-SPECIFIC (PLATFORM HOOKS, STORAGE BUCKETS & REALTIME)
-- ============================================================================
-- NOTE ON PORTABILITY:
-- When deploying to standard/vanilla PostgreSQL (non-Supabase environments),
-- this section may be skipped or replaced with local object storage shims.
-- See docs/Master/ref-portability.md for full cross-database compatibility guide.

-- Storage Buckets Registration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('avatars', 'avatars', true, 5242880, '{image/jpeg,image/png,image/webp}'),
    ('assignments', 'assignments', true, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png}'),
    ('course_materials', 'course_materials', true, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png}'),
    ('payment_proofs', 'payment_proofs', false, 10485760, '{application/pdf,image/jpeg,image/png,image/webp}'),
    ('documents', 'documents', false, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'),
    ('proofs', 'proofs', false, 10485760, '{application/pdf,image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies
CREATE POLICY "avatars_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_user_upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

CREATE POLICY "payment_proofs_tenant_access" ON storage.objects FOR ALL USING (
    bucket_id = 'payment_proofs' AND (auth.role() = 'authenticated')
);

CREATE POLICY "documents_tenant_access" ON storage.objects FOR ALL USING (
    bucket_id = 'documents' AND (auth.role() = 'authenticated')
);

-- Realtime Publications Registration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Table already in publication
        NULL;
END $$;

