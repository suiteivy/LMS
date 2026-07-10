-- Currency governance model (master-admin managed)

CREATE TABLE IF NOT EXISTS currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    usd_rate NUMERIC(18, 6) NOT NULL DEFAULT 1,
    decimal_places INTEGER NOT NULL DEFAULT 2,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT currencies_code_format CHECK (code ~ '^[A-Z]{3}$'),
    CONSTRAINT currencies_rate_positive CHECK (usd_rate > 0),
    CONSTRAINT currencies_decimal_places_range CHECK (decimal_places BETWEEN 0 AND 6)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_currencies_single_default
ON currencies (is_default)
WHERE is_default = true;

INSERT INTO currencies (code, name, symbol, usd_rate, decimal_places, is_default, is_active)
VALUES
    ('USD', 'US Dollar', '$', 1, 2, true, true),
    ('KES', 'Kenyan Shilling', 'KSh', 130, 2, false, true)
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    usd_rate = EXCLUDED.usd_rate,
    decimal_places = EXCLUDED.decimal_places,
    is_active = true,
    updated_at = NOW();

ALTER TABLE institutions
ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES currencies(id);

UPDATE institutions i
SET currency_id = c.id
FROM currencies c
WHERE c.code = 'USD'
  AND i.currency_id IS NULL;

ALTER TABLE institutions
ALTER COLUMN currency_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_institutions_currency_id
ON institutions(currency_id);

DROP TRIGGER IF EXISTS tr_update_currencies_updated_at ON currencies;
CREATE TRIGGER tr_update_currencies_updated_at
BEFORE UPDATE ON currencies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
