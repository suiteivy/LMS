-- ==========================================
-- CREATE ADMIN USER - SETUP INSTRUCTIONS
-- ==========================================
-- IMPORTANT: Do NOT use direct SQL inserts into auth.users!
-- Supabase's auth system uses a specific password hashing format.
-- Direct inserts will create users that cannot sign in.
-- ==========================================

-- STEP 1: Create the admin user via Supabase Dashboard
-- -------------------------------------------------------
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to: Authentication → Users
-- 3. Click "Add user" → "Create new user"
-- 4. Enter the following:
--    - Email: admin@lms.com (or your preferred admin email)
--    - Password: Admin@123456 (or your preferred password)
--    - Check "Auto Confirm User" checkbox
-- 5. Click "Create user"

-- STEP 2: Add the admin user to the public.users table
-- -------------------------------------------------------
-- After creating the user in the Auth UI, run this SQL to add them
-- to your application's users table with the admin role:

INSERT INTO public.users (id, email, full_name, role, institution_id)
SELECT 
  id,
  email,
  'System Administrator',  -- Change this to the admin's actual name
  'admin',
  NULL  -- Set to an institution ID if needed
FROM auth.users 
WHERE email = 'admin@lms.com'  -- Use the same email you used above
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- VERIFY THE SETUP
-- ==========================================
-- Run this query to confirm the admin user exists in both tables:

-- SELECT 
--   au.email as auth_email,
--   pu.email as public_email,
--   pu.role,
--   pu.full_name
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id
-- WHERE au.email = 'admin@lms.com';

-- ==========================================
-- ALTERNATIVE: Create additional admin users
-- ==========================================
-- To create more admin users, repeat the process:
-- 1. Add user via Dashboard → Authentication → Users
-- 2. Run the INSERT query above with their email

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================
-- If you get "Database error querying schema" when signing in:
-- 1. Check that the user exists in BOTH auth.users AND public.users
-- 2. Verify RLS is disabled or has proper policies on public.users
-- 3. Ensure GRANT permissions are set:
--    GRANT SELECT ON public.users TO anon, authenticated;
