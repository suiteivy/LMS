-- ============================================================
-- LMS DATABASE SETUP - STEP 3: CREATE ADMIN USER
-- ============================================================
-- Run this LAST in Supabase SQL Editor (after 02_rls_policies.sql)
-- Creates the initial admin user
-- 
-- CHANGE the email and password below before running!
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
    'admin@lms.com',                           -- ← CHANGE THIS
    crypt('Admin@123456', gen_salt('bf')),     -- ← CHANGE THIS
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"System Administrator"}',
    FALSE,
    'authenticated',
    'authenticated'
  )
  RETURNING id, email
),
new_institution AS (
  INSERT INTO institutions (name, location)
  VALUES ('Default Institution', 'Main Campus')
  ON CONFLICT DO NOTHING
  RETURNING id
)
INSERT INTO users (id, email, full_name, role, institution_id)
SELECT 
  u.id,
  u.email,
  'System Administrator',
  'admin',
  COALESCE(i.id, (SELECT id FROM institutions LIMIT 1))
FROM new_auth_user u
LEFT JOIN new_institution i ON true;

-- ============================================================
-- SETUP COMPLETE! 
-- Login with: admin@lms.com / Admin@123456
-- ============================================================
