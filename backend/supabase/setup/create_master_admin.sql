-- ============================================================
-- LMS DATABASE SETUP - STEP 3: CREATE MASTER ADMIN USER
-- ============================================================
-- Run this LAST in Supabase SQL Editor (after 02_rls_policies.sql)
-- Creates the initial MASTER admin user for the entire platform.
-- Master admins have a NULL institution_id, granting them global
-- access across all organizations.
-- 
-- CHANGE the email and password below before running in production!
-- ============================================================

WITH new_auth_user AS (
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'masteradmin@suiteivy.com',                  -- ← CHANGE THIS FOR PRODUCTION
    crypt('Master@123456', gen_salt('bf')),      -- ← CHANGE THIS FOR PRODUCTION
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"SuiteIvy Platform Admin"}',
    FALSE,
    'authenticated',
    'authenticated'
  )
  RETURNING id, email
)
INSERT INTO public.users (id, email, full_name, role, institution_id)
SELECT 
  u.id,
  u.email,
  'SuiteIvy Platform Admin',
  'admin',
  NULL -- 🚨 EXPLICIT NULL ENFORCES GLOBAL PLATFORM MASTER STATUS
FROM new_auth_user u;

-- NOTE: The tr_create_role_entry trigger handles mapping this to 
--       the `admins` table automatically.

-- ============================================================
-- SETUP COMPLETE! 
-- Login with: masteradmin@suiteivy.com / Master@123456
-- ============================================================
