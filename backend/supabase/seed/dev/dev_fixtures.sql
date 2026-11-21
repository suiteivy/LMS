-- ============================================================================
-- Seed File: dev_fixtures.sql
-- Environment: Local Dev & Staging Only
-- Purpose: Quick development test fixtures and mock testing tokens.
-- ============================================================================

DO $$
DECLARE
    v_dev_inst UUID := 'b5bd788c-8297-4a96-b8b3-157814504fba';
BEGIN
    -- Local test user preference defaults
    INSERT INTO public.user_preferences (user_id, theme, notifications_enabled, language, updated_at)
    SELECT id, 'system', true, 'en', NOW()
    FROM public.users
    WHERE institution_id = v_dev_inst
    ON CONFLICT (user_id) DO NOTHING;

    -- Ensure developer support tickets exist
    INSERT INTO public.support_tickets (
        institution_id, subject, description, priority, status, category, created_by, created_at, updated_at
    )
    SELECT
        v_dev_inst,
        'Local Dev Setup Verification',
        'Verification of seed pipeline, database connection, and local auth tokens.',
        'normal',
        'resolved',
        'general',
        id,
        NOW(),
        NOW()
    FROM public.users
    WHERE institution_id = v_dev_inst AND role = 'admin'
    LIMIT 1
    ON CONFLICT DO NOTHING;
END $$;
