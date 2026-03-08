-- Add master_admin to the role check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['admin'::text, 'student'::text, 'teacher'::text, 'parent'::text, 'bursary'::text, 'master_admin'::text]));

-- Update existing platform admins to the new role
UPDATE public.users
SET role = 'master_admin'
WHERE id IN (SELECT id FROM public.platform_admins);

-- Ensure future platform admins are correctly identified
-- (The role change itself is the primary identifier now)
