-- Switch platform default currency to KES and backfill institution defaults

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM currencies
        WHERE code = 'KES'
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Active KES currency record is required before setting KES as default';
    END IF;
END $$;

UPDATE currencies
SET is_default = false
WHERE is_default = true;

UPDATE currencies
SET is_default = true
WHERE code = 'KES'
  AND is_active = true;

UPDATE institutions i
SET currency_id = c.id
FROM currencies c
WHERE c.code = 'KES'
  AND i.currency_id IS NULL;

COMMIT;
