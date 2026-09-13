-- Migration: 20260913162500_record_of_work_duration.sql
-- Description: Add duration_minutes column to record_of_work table

ALTER TABLE public.record_of_work ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 40;
