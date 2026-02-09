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
  -- Get the current user's role using the helper function (bypasses RLS)
  SELECT public.get_current_user_role() INTO user_role;
  
  -- If the user is not authenticated (during sign-up) or not an admin
  IF (auth.role() = 'anon' OR user_role IS NULL OR user_role != 'admin') THEN
    -- Force the role to be 'student' for new sign-ups
    NEW.role := 'student';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to enforce the role restriction
DROP TRIGGER IF EXISTS enforce_user_role_on_signup ON users;
CREATE TRIGGER enforce_user_role_on_signup
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION public.check_user_role_on_signup();