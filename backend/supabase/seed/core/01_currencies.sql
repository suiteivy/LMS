-- ============================================================================
-- Seed File: 01_currencies.sql
-- Environment: Core (All environments: Production, Staging, Dev, Demo)
-- Purpose: Global active currencies with KES as default primary currency.
-- ============================================================================

INSERT INTO public.currencies (code, name, symbol, usd_rate, decimal_places, is_default, is_active, created_at, updated_at)
VALUES 
    ('KES', 'Kenyan Shilling', 'KSh', 130.000000, 2, true, true, NOW(), NOW()),
    ('USD', 'US Dollar', '$', 1.000000, 2, false, true, NOW(), NOW()),
    ('EUR', 'Euro', '€', 0.920000, 2, false, true, NOW(), NOW()),
    ('GBP', 'British Pound', '£', 0.790000, 2, false, true, NOW(), NOW()),
    ('TZS', 'Tanzanian Shilling', 'TSh', 2600.000000, 2, false, true, NOW(), NOW()),
    ('UGX', 'Ugandan Shilling', 'USh', 3700.000000, 2, false, true, NOW(), NOW()),
    ('RWF', 'Rwandan Franc', 'FRw', 1300.000000, 2, false, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    usd_rate = EXCLUDED.usd_rate,
    decimal_places = EXCLUDED.decimal_places,
    is_default = EXCLUDED.is_default,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
