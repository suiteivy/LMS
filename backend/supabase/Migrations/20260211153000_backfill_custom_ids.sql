-- Migration: Backfill Missing Role-Specific Entries and Custom IDs
-- Description: Ensures all existing users have an entry in their respective role table (admins, teachers, students, parents) with a generated custom ID.
-- Created: 2026-02-11 15:30:00

BEGIN;

-- 1. Backfill Admins
INSERT INTO public.admins (user_id)
SELECT id FROM public.users 
WHERE role = 'admin' 
AND id NOT IN (SELECT user_id FROM public.admins)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Backfill Teachers
INSERT INTO public.teachers (user_id)
SELECT id FROM public.users 
WHERE role = 'teacher' 
AND id NOT IN (SELECT user_id FROM public.teachers)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Backfill Students
INSERT INTO public.students (user_id)
SELECT id FROM public.users 
WHERE role = 'student' 
AND id NOT IN (SELECT user_id FROM public.students)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Backfill Parents
INSERT INTO public.parents (user_id)
SELECT id FROM public.users 
WHERE role = 'parent' 
AND id NOT IN (SELECT user_id FROM public.parents)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;
