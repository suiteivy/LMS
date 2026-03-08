-- Migration: Create Platform Admins Table for Isolation
-- Created: 2026-03-04

-- 1. Create the platform_admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DROP POLICY IF EXISTS "Platform admins can see all platform admins" ON public.platform_admins;
CREATE POLICY "Platform admins can see all platform admins" 
ON public.platform_admins FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin' 
        AND institution_id IS NULL
    )
);

DROP POLICY IF EXISTS "Service role full access" ON public.platform_admins;
CREATE POLICY "Service role full access" 
ON public.platform_admins FOR ALL 
USING (true)
WITH CHECK (true);

-- 4. Initial Migration: Move existing global admins (no institution_id) to the new table
INSERT INTO public.platform_admins (id, user_id, full_name, email)
SELECT id, id, full_name, email
FROM public.users
WHERE role = 'admin' AND institution_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. Add a comment for clarification
COMMENT ON TABLE public.platform_admins IS 'Dedicated table for Master Platform Admins to prevent institution session conflicts.';
