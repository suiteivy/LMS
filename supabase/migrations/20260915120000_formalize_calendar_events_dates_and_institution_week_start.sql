-- Migration: Formalize calendar_events start_date/end_date and add institution week_start_day
-- Description:
-- 1. Adds explicit start_date and end_date columns to public.calendar_events
-- 2. Backfills existing rows where start_date is event_date and end_date is event_date
-- 3. Enforces NOT NULL and CHECK (end_date >= start_date) constraints
-- 4. Adds week_start_day setting to public.institutions (0 = Sunday, 1 = Monday; default 1)

-- 1) Formalize calendar_events start_date and end_date
ALTER TABLE public.calendar_events
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE;

-- Backfill existing rows: start_date defaults to event_date, end_date defaults to start_date or event_date
UPDATE public.calendar_events
SET start_date = COALESCE(start_date, event_date),
    end_date = COALESCE(end_date, start_date, event_date)
WHERE start_date IS NULL OR end_date IS NULL;

-- Enforce NOT NULL constraints
ALTER TABLE public.calendar_events
    ALTER COLUMN start_date SET NOT NULL,
    ALTER COLUMN end_date SET NOT NULL;

-- Ensure end_date >= start_date constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_calendar_events_date_range'
    ) THEN
        ALTER TABLE public.calendar_events
            ADD CONSTRAINT check_calendar_events_date_range CHECK (end_date >= start_date);
    END IF;
END $$;

-- Index for fast range intersection queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_date_range
    ON public.calendar_events(institution_id, start_date, end_date);

-- 2) Institution week start day configuration (0 = Sunday, 1 = Monday; default 1)
ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS week_start_day SMALLINT DEFAULT 1;

-- Check constraint for valid day of week (0 to 6)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_institutions_week_start_day'
    ) THEN
        ALTER TABLE public.institutions
            ADD CONSTRAINT check_institutions_week_start_day CHECK (week_start_day >= 0 AND week_start_day <= 6);
    END IF;
END $$;
