-- Migration: Create demo_feedback table for anonymous and engaged demo feedback
-- Complies with Section 2 of LMS Landing Page Changes

CREATE TABLE IF NOT EXISTS public.demo_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    module_ratings JSONB DEFAULT '{}'::jsonb,
    liked TEXT,
    improve TEXT,
    role TEXT,
    contact_requested BOOLEAN DEFAULT FALSE,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    consent BOOLEAN DEFAULT FALSE,
    engaged_modules TEXT[] DEFAULT '{}'::TEXT[],
    session_ref TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'handled', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for admin querying
CREATE INDEX IF NOT EXISTS idx_demo_feedback_created_at ON public.demo_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_status ON public.demo_feedback (status);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_rating ON public.demo_feedback (rating);
CREATE INDEX IF NOT EXISTS idx_demo_feedback_contact_req ON public.demo_feedback (contact_requested);

-- Enable RLS
ALTER TABLE public.demo_feedback ENABLE ROW LEVEL SECURITY;

-- 1. Anonymous Insert-only policy: anyone can insert feedback (no authentication required)
DROP POLICY IF EXISTS "Allow anonymous insert to demo_feedback" ON public.demo_feedback;
CREATE POLICY "Allow anonymous insert to demo_feedback"
    ON public.demo_feedback
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        (rating IS NULL OR (rating >= 1 AND rating <= 5))
        AND (length(liked) IS NULL OR length(liked) <= 2000)
        AND (length(improve) IS NULL OR length(improve) <= 2000)
    );

-- 2. Platform/Master Admin SELECT policy: only authenticated users with master_admin role can read
DROP POLICY IF EXISTS "Allow platform admin to read demo_feedback" ON public.demo_feedback;
CREATE POLICY "Allow platform admin to read demo_feedback"
    ON public.demo_feedback
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.role = 'master_admin' OR users.role = 'platform_admin' OR users.access_level = 'super_admin')
        )
    );

-- 3. Platform/Master Admin UPDATE policy: only platform admins can update status
DROP POLICY IF EXISTS "Allow platform admin to update demo_feedback" ON public.demo_feedback;
CREATE POLICY "Allow platform admin to update demo_feedback"
    ON public.demo_feedback
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.role = 'master_admin' OR users.role = 'platform_admin' OR users.access_level = 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND (users.role = 'master_admin' OR users.role = 'platform_admin' OR users.access_level = 'super_admin')
        )
    );
