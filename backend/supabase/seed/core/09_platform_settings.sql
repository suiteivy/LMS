-- ============================================================================
-- Seed File: 09_platform_settings.sql
-- Environment: Core (All environments)
-- Purpose: System-level platform configuration, contact info (.africa), social channels, plans and limits.
-- ============================================================================

INSERT INTO public.system_settings (key, value, created_at, updated_at)
VALUES
    ('platform_info', '{
        "name": "Cloudora LMS",
        "domain": "cloudora.africa",
        "tagline": "Modern African School Management Platform",
        "support_email": "support@cloudora.africa",
        "support_phone": "+254 700 000 000",
        "address": "Nairobi, Kenya"
    }'::jsonb, NOW(), NOW()),

    ('social_links', '{
        "instagram": "https://instagram.com/cloudora_africa",
        "tiktok": "https://tiktok.com/@cloudora_africa",
        "linkedin": "https://linkedin.com/company/cloudora-africa"
    }'::jsonb, NOW(), NOW()),

    ('upload_limits', '{
        "max_upload_size_mb": 10,
        "allowed_mime_types": [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/jpeg",
            "image/png",
            "image/webp"
        ],
        "blocked_types": ["video/*", "audio/*", "application/x-msdownload"]
    }'::jsonb, NOW(), NOW()),

    ('subscription_plans', '[
        {
            "plan_code": "free_tier",
            "name": "Starter / Community",
            "max_students": 150,
            "max_staff": 15,
            "storage_gb": 5,
            "has_sms": false,
            "has_smart_reports": false
        },
        {
            "plan_code": "standard",
            "name": "Professional School",
            "max_students": 1000,
            "max_staff": 80,
            "storage_gb": 50,
            "has_sms": true,
            "has_smart_reports": true
        },
        {
            "plan_code": "enterprise",
            "name": "Institution Multi-Campus",
            "max_students": 5000,
            "max_staff": 300,
            "storage_gb": 250,
            "has_sms": true,
            "has_smart_reports": true
        }
    ]'::jsonb, NOW(), NOW()),

    ('rate_limits', '{
        "api_requests_per_minute": 120,
        "auth_attempts_per_hour": 10,
        "report_exports_per_hour": 30
    }'::jsonb, NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
