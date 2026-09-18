-- Migration: 2026-09-18_settings_lockout_and_sessions.sql
-- Description: Adds account lockout columns, user preference controls, and session concurrency index.

-- 1. Users table: failed login tracking & distinct disable reason
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
    ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMPTZ;

-- 2. User preferences table: accessibility, privacy, and academic alert preferences
ALTER TABLE public.user_preferences
    ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS share_staff_presence BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS grade_release_alerts BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS attendance_digest BOOLEAN DEFAULT true;

-- 3. Session concurrency & lookup index
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_revoked_expiry
    ON public.user_sessions(user_id, is_revoked, expires_at);
