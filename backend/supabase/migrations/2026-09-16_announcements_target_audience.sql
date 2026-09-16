-- Migration: 2026-09-16_announcements_target_audience.sql
-- Description: Add target_audience column to announcements table for role-based audience filtering

ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all'
CHECK (target_audience IN ('all', 'teachers', 'students', 'parents'));

CREATE INDEX IF NOT EXISTS idx_announcements_target_audience
ON public.announcements(target_audience);
