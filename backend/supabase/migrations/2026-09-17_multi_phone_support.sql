-- Migration: Add multi-phone support to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_numbers JSONB DEFAULT '[]'::jsonb;

-- Populate existing users' phone into phone_numbers as primary
UPDATE public.users 
SET phone_numbers = jsonb_build_array(jsonb_build_object('number', phone, 'label', 'primary', 'is_primary', true))
WHERE phone IS NOT NULL AND (phone_numbers IS NULL OR phone_numbers = '[]'::jsonb);
