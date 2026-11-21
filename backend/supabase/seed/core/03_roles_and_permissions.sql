-- ============================================================================
-- Seed File: 03_roles_and_permissions.sql
-- Environment: Core (All environments)
-- Purpose: Default system role templates and permissions matrices.
-- ============================================================================

INSERT INTO public.role_templates (institution_id, name, description, best_for, permissions, data_scope, is_system)
VALUES
    (
        NULL,
        'Supervisor / Governance',
        'Board oversight role with read-only visibility across all areas, ability to assign roles, and no file downloads.',
        'Best for: School board members, governors, and church representatives who oversee the school without editing day-to-day data',
        '[
            {"domain": "academic", "action": "view"},
            {"domain": "students", "action": "view"},
            {"domain": "parents", "action": "view"},
            {"domain": "teachers_staff", "action": "view"},
            {"domain": "finance", "action": "view"},
            {"domain": "reports", "action": "view"},
            {"domain": "library", "action": "view"},
            {"domain": "communication", "action": "view"},
            {"domain": "attendance", "action": "view"},
            {"domain": "timetable", "action": "view"},
            {"domain": "settings", "action": "view"},
            {"domain": "audit_logs", "action": "view"},
            {"domain": "roles_access", "action": "view"},
            {"domain": "roles_access", "action": "manage_roles"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Finance Manager',
        'Full financial control including student billing, fee structures, bursary approvals, and financial report generation.',
        'Best for: The person who looks after school fees, student accounts, and bursary disbursements',
        '[
            {"domain": "finance", "action": "view"},
            {"domain": "finance", "action": "create"},
            {"domain": "finance", "action": "edit"},
            {"domain": "finance", "action": "delete"},
            {"domain": "finance", "action": "approve"},
            {"domain": "finance", "action": "generate_report"},
            {"domain": "finance", "action": "download_report"},
            {"domain": "finance", "action": "export_data"},
            {"domain": "students", "action": "view"},
            {"domain": "parents", "action": "view"},
            {"domain": "reports", "action": "view"},
            {"domain": "reports", "action": "generate_report"},
            {"domain": "reports", "action": "download_report"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Head Teacher / Academic Head',
        'Comprehensive academic leadership over curriculum, teacher assignments, student progress, and official report cards.',
        'Best for: Principal or head of academics managing teaching staff, classes, and academic performance',
        '[
            {"domain": "academic", "action": "view"},
            {"domain": "academic", "action": "create"},
            {"domain": "academic", "action": "edit"},
            {"domain": "academic", "action": "delete"},
            {"domain": "academic", "action": "approve"},
            {"domain": "academic", "action": "generate_report"},
            {"domain": "academic", "action": "download_report"},
            {"domain": "students", "action": "view"},
            {"domain": "students", "action": "create"},
            {"domain": "students", "action": "edit"},
            {"domain": "parents", "action": "view"},
            {"domain": "parents", "action": "create"},
            {"domain": "parents", "action": "edit"},
            {"domain": "teachers_staff", "action": "view"},
            {"domain": "teachers_staff", "action": "create"},
            {"domain": "teachers_staff", "action": "edit"},
            {"domain": "attendance", "action": "view"},
            {"domain": "attendance", "action": "create"},
            {"domain": "attendance", "action": "edit"},
            {"domain": "attendance", "action": "approve"},
            {"domain": "attendance", "action": "download_report"},
            {"domain": "timetable", "action": "view"},
            {"domain": "timetable", "action": "create"},
            {"domain": "timetable", "action": "edit"},
            {"domain": "timetable", "action": "approve"},
            {"domain": "reports", "action": "view"},
            {"domain": "reports", "action": "generate_report"},
            {"domain": "reports", "action": "download_report"},
            {"domain": "communication", "action": "view"},
            {"domain": "communication", "action": "create"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Deputy Head',
        'Operational assistance for day-to-day discipline, student records, timetable adjustments, and attendance oversight.',
        'Best for: Deputy principals assisting with student discipline, daily operations, and class scheduling',
        '[
            {"domain": "academic", "action": "view"},
            {"domain": "academic", "action": "edit"},
            {"domain": "students", "action": "view"},
            {"domain": "students", "action": "edit"},
            {"domain": "parents", "action": "view"},
            {"domain": "attendance", "action": "view"},
            {"domain": "attendance", "action": "create"},
            {"domain": "attendance", "action": "edit"},
            {"domain": "attendance", "action": "approve"},
            {"domain": "timetable", "action": "view"},
            {"domain": "timetable", "action": "edit"},
            {"domain": "communication", "action": "view"},
            {"domain": "communication", "action": "create"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Registrar / Admissions',
        'Student enrollment, parent records management, class rosters, and student exports.',
        'Best for: Admissions officers and secretaries managing enrollment files and class lists',
        '[
            {"domain": "students", "action": "view"},
            {"domain": "students", "action": "create"},
            {"domain": "students", "action": "edit"},
            {"domain": "students", "action": "export_data"},
            {"domain": "parents", "action": "view"},
            {"domain": "parents", "action": "create"},
            {"domain": "parents", "action": "edit"},
            {"domain": "reports", "action": "view"},
            {"domain": "reports", "action": "generate_report"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Librarian',
        'Designation template for cataloging books, issuing loans, processing returns, and inventory tracking.',
        'Best for: Teachers or staff with extra duties overseeing the library book collection',
        '[
            {"domain": "library", "action": "view"},
            {"domain": "library", "action": "create"},
            {"domain": "library", "action": "edit"},
            {"domain": "library", "action": "delete"},
            {"domain": "library", "action": "generate_report"},
            {"domain": "library", "action": "download_report"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Records & Reports Officer',
        'Dedicated access for compiling report cards, academic statistics, and exporting school records.',
        'Best for: Administrative staff who print report cards and manage official student transcripts',
        '[
            {"domain": "academic", "action": "view"},
            {"domain": "students", "action": "view"},
            {"domain": "reports", "action": "view"},
            {"domain": "reports", "action": "generate_report"},
            {"domain": "reports", "action": "download_report"},
            {"domain": "reports", "action": "export_data"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Communications Officer',
        'Manages school announcements, parent communications, and notices broadcast to cohorts.',
        'Best for: Public relations or communication staff sending parent announcements and SMS alerts',
        '[
            {"domain": "communication", "action": "view"},
            {"domain": "communication", "action": "create"},
            {"domain": "communication", "action": "edit"},
            {"domain": "communication", "action": "delete"},
            {"domain": "students", "action": "view"},
            {"domain": "parents", "action": "view"},
            {"domain": "teachers_staff", "action": "view"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Boarding / Welfare Officer',
        'Pastoral care and boarding house management with student attendance, contacts, and welfare notes.',
        'Best for: Boarding masters, matrons, and welfare staff looking after residential student care',
        '[
            {"domain": "students", "action": "view"},
            {"domain": "students", "action": "edit"},
            {"domain": "parents", "action": "view"},
            {"domain": "attendance", "action": "view"},
            {"domain": "attendance", "action": "create"},
            {"domain": "attendance", "action": "edit"}
        ]'::jsonb,
        'all',
        true
    ),
    (
        NULL,
        'Auditor',
        'Independent oversight access to inspect financial records and system activity history without editing.',
        'Best for: Internal or external auditors inspecting fee collection records and audit logs',
        '[
            {"domain": "finance", "action": "view"},
            {"domain": "audit_logs", "action": "view"},
            {"domain": "reports", "action": "view"},
            {"domain": "reports", "action": "generate_report"}
        ]'::jsonb,
        'all',
        true
    )
ON CONFLICT (institution_id, name) DO UPDATE SET
    description = EXCLUDED.description,
    best_for = EXCLUDED.best_for,
    permissions = EXCLUDED.permissions,
    data_scope = EXCLUDED.data_scope,
    is_system = EXCLUDED.is_system;
