-- Migration: Add Beta Free subscription plan

-- To safely update an enum-like constraint in Postgres, we generally have to
-- drop the existing constraint and recreate it.
-- Depending on schema rules, we check if the constraint exists first.

DO $$ 
BEGIN
  -- We assume the constraint might be named `institutions_subscription_plan_check`
  -- If you rely on generated names, it's safer to just alter the table generally if possible.
  -- 
  -- Find the constraint name for subscription_plan
  DECLARE
    constraint_name_found text;
  BEGIN
    SELECT conname INTO constraint_name_found
    FROM pg_constraint
    WHERE conrelid = 'institutions'::regclass
      AND pg_get_constraintdef(oid) LIKE '%subscription_plan%';
      
    IF constraint_name_found IS NOT NULL THEN
       EXECUTE 'ALTER TABLE institutions DROP CONSTRAINT "' || constraint_name_found || '"';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if constraint missing or other error during lookup
  END;

  -- Add the new constraint explicitly
  ALTER TABLE institutions
    ADD CONSTRAINT institutions_subscription_plan_check
    CHECK (subscription_plan IN ('trial', 'beta_free', 'basic', 'pro', 'premium'));

END $$;
