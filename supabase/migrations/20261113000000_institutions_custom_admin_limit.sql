-- Add custom_admin_limit to institutions table for beta plan customization
ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS custom_admin_limit INTEGER;

