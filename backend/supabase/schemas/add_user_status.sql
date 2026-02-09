-- Add status column to users table
ALTER TABLE public.users 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing users to 'approved' so they don't get locked out
UPDATE public.users SET status = 'approved';
