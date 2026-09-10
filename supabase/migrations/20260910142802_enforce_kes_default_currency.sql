-- Ensure KES is the single default currency and backfill institution defaults

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.currencies
        WHERE code = 'KES'
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Active KES currency record is required before setting KES as default';
    END IF;
END $$;

UPDATE public.currencies
SET is_default = false
WHERE is_default = true;

UPDATE public.currencies
SET is_default = true
WHERE code = 'KES'
  AND is_active = true;

UPDATE public.institutions AS i
SET currency_id = c.id
FROM public.currencies AS c
WHERE c.code = 'KES'
  AND i.currency_id IS NULL;

COMMIT;
