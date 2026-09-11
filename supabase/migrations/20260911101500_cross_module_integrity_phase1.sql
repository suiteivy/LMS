-- Cross-module integrity phase 1
-- Item 1 (diagnose-first) high-risk schema alignment for primary migrations.

-- ---------------------------------------------------------------------------
-- 1) Session history table used by auth middleware/controllers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    device_type TEXT,
    os_name TEXT,
    ip_address TEXT,
    location TEXT,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
    ON public.user_sessions(user_id, is_revoked, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active
    ON public.user_sessions(last_active_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access user sessions" ON public.user_sessions;
CREATE POLICY "Service role full access user sessions"
ON public.user_sessions FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "No client access user sessions" ON public.user_sessions;
CREATE POLICY "No client access user sessions"
ON public.user_sessions FOR ALL
USING (false)
WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 2) Delivery-attempt audit table used by notification services/controllers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'in_app',
    recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'retry_scheduled',
    attempt_number INTEGER NOT NULL DEFAULT 1,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_queue
    ON public.notification_delivery_attempts(channel, status, next_retry_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_recipient
    ON public.notification_delivery_attempts(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_attempts_institution
    ON public.notification_delivery_attempts(institution_id, created_at DESC);

ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access notification delivery attempts" ON public.notification_delivery_attempts;
CREATE POLICY "Service role full access notification delivery attempts"
ON public.notification_delivery_attempts FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "No client access notification delivery attempts" ON public.notification_delivery_attempts;
CREATE POLICY "No client access notification delivery attempts"
ON public.notification_delivery_attempts FOR ALL
USING (false)
WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 3) Canonical support tables (missing from primary migration history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'in_progress', 'awaiting_customer', 'escalated', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    assigned_to_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    escalation_level INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (user_id = auth.uid() OR assigned_to_id = auth.uid());

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Master admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Master admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin'));

DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.ticket_messages;
CREATE POLICY "Users can view messages for their tickets"
ON public.ticket_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.support_tickets
        WHERE id = public.ticket_messages.ticket_id
          AND (user_id = auth.uid() OR assigned_to_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
);

DROP POLICY IF EXISTS "Users can add messages to their tickets" ON public.ticket_messages;
CREATE POLICY "Users can add messages to their tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.support_tickets
        WHERE id = public.ticket_messages.ticket_id
          AND (user_id = auth.uid() OR assigned_to_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master_admin')
);

-- ---------------------------------------------------------------------------
-- 4) Calendar table parity from legacy migration tree
-- ---------------------------------------------------------------------------
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

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events
    FOR SELECT
    USING (
        institution_id = get_current_user_institution_id()
        OR get_current_user_role() = 'master_admin'
    );

DROP POLICY IF EXISTS "calendar_events_admin_all" ON public.calendar_events;
CREATE POLICY "calendar_events_admin_all" ON public.calendar_events
    FOR ALL
    USING (
        (institution_id = get_current_user_institution_id() AND get_current_user_role() = 'admin')
        OR get_current_user_role() = 'master_admin'
    );

-- ---------------------------------------------------------------------------
-- 5) Messaging parity: conversations.expires_at required by runtime
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.conversations') IS NOT NULL THEN
        ALTER TABLE public.conversations
            ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

        CREATE INDEX IF NOT EXISTS idx_conversations_expires_at
            ON public.conversations(expires_at);
    END IF;
END
$$;
