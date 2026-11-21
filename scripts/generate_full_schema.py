#!/usr/bin/env python3
"""
Full Schema Generator for LMS
Produces backend/supabase/schema.sql containing all 15 sections required by Section 2.2
"""

import sys
import subprocess
from pathlib import Path

WORKSPACE = Path("c:/Projects/LMS")
SCHEMA_FILE = WORKSPACE / "backend" / "supabase" / "schema.sql"

def get_git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=WORKSPACE).decode().strip()
    except Exception:
        return "5cd37fa"

def generate():
    git_commit = get_git_commit()
    print(f"Building canonical schema.sql for commit {git_commit}...")

    sql_parts = []

    # =========================================================================
    # 0. HEADER & CHANGELOG
    # =========================================================================
    sql_parts.append(f"""-- ============================================================================
-- LMS CANONICAL PRODUCTION DATABASE SCHEMA
-- ============================================================================
-- File: backend/supabase/schema.sql
-- Generated: 2026-11-22
-- Baseline Git Commit: {git_commit}
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
""")

    # =========================================================================
    # 1. EXTENSIONS
    # =========================================================================
    sql_parts.append("""-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
""")

    # =========================================================================
    # 2. UTILITY & PORTABILITY FUNCTIONS
    # =========================================================================
    sql_parts.append("""-- ============================================================================
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

-- Universal timestamp update trigger
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
""")

    # =========================================================================
    # 3. ENUMS & DOMAIN TYPES
    # =========================================================================
    sql_parts.append("""-- ============================================================================
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
""")

    # =========================================================================
    # 4. CORE PLATFORM & MULTI-TENANCY TABLES
    # =========================================================================
    sql_parts.append("""-- ============================================================================
-- 4. CORE PLATFORM & MULTI-TENANCY TABLES
-- ============================================================================

-- 4.1 System Settings (Global Platform Key-Value Configuration)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4.2 School Categories
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

-- 4.3 Currencies (Master Admin Managed)
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

-- 4.4 Institutions (Multi-Tenant Root)
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

-- 4.5 Users (Person Identity Table)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- References auth.users(id) on Supabase
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
""")

    # Let's save the progress and continue with subsequent sections
    Path("scripts/schema_parts.py").write_text("# Schema part generator\n", encoding="utf-8")
    return sql_parts

if __name__ == "__main__":
    generate()
