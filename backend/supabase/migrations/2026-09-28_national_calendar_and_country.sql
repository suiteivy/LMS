-- Migration: 2026-09-28_national_calendar_and_country.sql
-- Description: Country selection on institutions, shared national_holidays reference table, and institution-scoped holiday decisions

-- 1. Country setting on institutions
ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'KE';

-- 2. Shared reference table for national holidays
CREATE TABLE IF NOT EXISTS public.national_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'public',
    is_provisional BOOLEAN DEFAULT false,
    external_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_holidays_country_date
    ON public.national_holidays(country_code, holiday_date);

-- 3. Institution decision overlay
CREATE TABLE IF NOT EXISTS public.institution_holiday_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    national_holiday_id UUID REFERENCES public.national_holidays(id) ON DELETE CASCADE NOT NULL,
    decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'cancel_classes', 'run_classes')),
    is_hidden BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_inst_holiday_decision UNIQUE (institution_id, national_holiday_id)
);

CREATE INDEX IF NOT EXISTS idx_inst_holiday_decisions_inst
    ON public.institution_holiday_decisions(institution_id, decision);

-- 4. Enable RLS
ALTER TABLE public.national_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_holiday_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "national_holidays_read_all" ON public.national_holidays;
CREATE POLICY "national_holidays_read_all" ON public.national_holidays
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "national_holidays_admin_all" ON public.national_holidays;
CREATE POLICY "national_holidays_admin_all" ON public.national_holidays
    FOR ALL USING (get_current_user_role() = 'master_admin');

DROP POLICY IF EXISTS "holiday_decisions_select" ON public.institution_holiday_decisions;
CREATE POLICY "holiday_decisions_select" ON public.institution_holiday_decisions
    FOR SELECT
    USING (
        institution_id = get_current_user_institution_id()
        OR get_current_user_role() = 'master_admin'
    );

DROP POLICY IF EXISTS "holiday_decisions_admin_all" ON public.institution_holiday_decisions;
CREATE POLICY "holiday_decisions_admin_all" ON public.institution_holiday_decisions
    FOR ALL
    USING (
        (institution_id = get_current_user_institution_id() AND get_current_user_role() = 'admin')
        OR get_current_user_role() = 'master_admin'
    );
