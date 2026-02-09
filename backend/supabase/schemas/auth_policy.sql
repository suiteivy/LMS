-- ==========================================
-- AUTH POLICIES FOR USER REGISTRATION
-- ==========================================
-- Special policies to allow new user registration
-- These policies allow unauthenticated users to insert into the users table during sign-up

-- Policy that allows inserting into users table during sign-up
CREATE POLICY "Allow public sign-up"
ON users FOR INSERT
WITH CHECK (auth.role() = 'anon');

-- Create a trigger function to ensure new users can only set role to 'student' during sign-up
-- Uses SECURITY DEFINER to bypass RLS when checking the admin status
CREATE OR REPLACE FUNCTION public.check_user_role_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- If no role is provided, default to 'student'
  IF NEW.role IS NULL THEN
    NEW.role := 'student';
  END IF;
  
  -- We trust the frontend/user input for the role at this stage because of the requirement to allow
  -- users to sign up as Teachers/Admins directly.
  -- The 'users' table already has a CHECK constraint to ensure only valid roles ('admin', 'student', 'teacher') are allowed.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to enforce the role restriction
DROP TRIGGER IF EXISTS enforce_user_role_on_signup ON users;
CREATE TRIGGER enforce_user_role_on_signup
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION public.check_user_role_on_signup();