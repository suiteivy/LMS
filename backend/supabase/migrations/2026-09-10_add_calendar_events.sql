-- Migration: Add calendar_events table
-- Task #9: School Calendar (Events, Class Cancellation, Auto-Announcements)

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    event_type TEXT DEFAULT 'event',
    cancel_classes BOOLEAN DEFAULT FALSE,
    announcement_id UUID REFERENCES public.announcements(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_inst_date
    ON public.calendar_events(institution_id, event_date);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date
    ON public.calendar_events(event_date);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow users to view calendar events for their institution
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events
    FOR SELECT
    USING (
        institution_id = get_current_user_institution_id()
        OR get_current_user_role() = 'master_admin'
    );

-- Allow admins to insert/update/delete calendar events
DROP POLICY IF EXISTS "calendar_events_admin_all" ON public.calendar_events;
CREATE POLICY "calendar_events_admin_all" ON public.calendar_events
    FOR ALL
    USING (
        (institution_id = get_current_user_institution_id() AND get_current_user_role() = 'admin')
        OR get_current_user_role() = 'master_admin'
    );
