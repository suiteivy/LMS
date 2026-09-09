-- Migration: Add logo_url to institutions table if not present
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;
