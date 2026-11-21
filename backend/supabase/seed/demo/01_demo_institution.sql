-- ============================================================================
-- Seed File: 01_demo_institution.sql
-- Environment: Demo Only
-- Purpose: Dedicated isolated demo institution with is_demo flag.
-- ============================================================================

INSERT INTO public.institutions (
    id, name, code, address, phone, email, currency, is_demo, is_active, max_custom_admins, created_at, updated_at
)
VALUES (
    'b5bd788c-8297-4a96-b8b3-157814504fba',
    'Cloudora Demo Academy',
    'CDA-DEMO',
    'Nairobi Westlands, Kenya',
    '+254 700 000 001',
    'demo@cloudora.africa',
    'KES',
    true,
    true,
    15,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    currency = EXCLUDED.currency,
    is_demo = true,
    is_active = true,
    updated_at = NOW();

-- Initialize identifier counters for demo institution
INSERT INTO public.identifier_counters (institution_id, entity_type, last_number, updated_at)
VALUES 
    ('b5bd788c-8297-4a96-b8b3-157814504fba', 'student', 0, NOW()),
    ('b5bd788c-8297-4a96-b8b3-157814504fba', 'staff', 0, NOW()),
    ('b5bd788c-8297-4a96-b8b3-157814504fba', 'parent', 0, NOW()),
    ('b5bd788c-8297-4a96-b8b3-157814504fba', 'admin', 0, NOW())
ON CONFLICT (institution_id, entity_type) DO NOTHING;
