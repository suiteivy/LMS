-- Ensure deleting an institution cascades to all institution-scoped data.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      c.conname,
      conrelid::regclass AS table_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.confrelid = 'public.institutions'::regclass
      AND a.attname = 'institution_id'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', rec.table_name, rec.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE', rec.table_name, rec.conname);
  END LOOP;
END $$;
