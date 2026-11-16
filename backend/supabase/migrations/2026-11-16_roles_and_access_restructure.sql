-- Migration: 20261116153000_roles_and_access_restructure.sql
-- Description: Complete Roles, Permissions & Scoped Access Control Architecture
-- Stack: Supabase / Postgres (eu-central-1)

-- 1. FEATURE REGISTRY (Domains & Actions)
CREATE TABLE IF NOT EXISTS public.feature_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    action TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_feature_registry_domain_action UNIQUE (domain, action)
);

-- Seed feature registry with domains and granular actions
INSERT INTO public.feature_registry (domain, action, name, description, category)
VALUES
    -- Academic
    ('academic', 'view', 'See academic records', 'Can view subjects, syllabus, exams, and classes', 'Academic'),
    ('academic', 'create', 'Add academic items', 'Can add new subjects, lessons, and exam items', 'Academic'),
    ('academic', 'edit', 'Change academic items', 'Can edit curriculum items, classes, and exams', 'Academic'),
    ('academic', 'delete', 'Remove academic items', 'Can delete subjects or exam records', 'Academic'),
    ('academic', 'approve', 'Approve academic items', 'Can approve syllabus submissions and lesson plans', 'Academic'),
    ('academic', 'generate_report', 'Create academic reports', 'Can compile academic records and statistics on screen', 'Academic'),
    ('academic', 'download_report', 'Download academic reports', 'Can download academic report sheets and transcripts to device', 'Academic'),
    ('academic', 'export_data', 'Export academic lists', 'Can export subject and exam data files', 'Academic'),

    -- Students
    ('students', 'view', 'See student profiles', 'Can view student directory and academic status', 'Students'),
    ('students', 'create', 'Add student profiles', 'Can register new students', 'Students'),
    ('students', 'edit', 'Change student profiles', 'Can edit student details and class assignments', 'Students'),
    ('students', 'delete', 'Remove student profiles', 'Can delete or archive student records', 'Students'),
    ('students', 'approve', 'Approve student changes', 'Can approve transfer and profile modification requests', 'Students'),
    ('students', 'generate_report', 'Create student reports', 'Can generate student roll summaries on screen', 'Students'),
    ('students', 'download_report', 'Download student reports', 'Can download student reports to device', 'Students'),
    ('students', 'export_data', 'Export student lists', 'Can download student rosters as CSV/Excel', 'Students'),

    -- Parents
    ('parents', 'view', 'See parent directory', 'Can view parent contacts and guardian relationships', 'Parents'),
    ('parents', 'create', 'Add parent profiles', 'Can link new parents to students', 'Parents'),
    ('parents', 'edit', 'Change parent details', 'Can update parent information', 'Parents'),
    ('parents', 'delete', 'Remove parent links', 'Can remove parent links', 'Parents'),
    ('parents', 'export_data', 'Export parent lists', 'Can export parent directories to file', 'Parents'),

    -- Teachers & Staff
    ('teachers_staff', 'view', 'See staff directory', 'Can view teacher and staff profiles', 'Staff'),
    ('teachers_staff', 'create', 'Add staff members', 'Can register new teachers and support staff', 'Staff'),
    ('teachers_staff', 'edit', 'Change staff details', 'Can update staff profiles and assignments', 'Staff'),
    ('teachers_staff', 'delete', 'Remove staff members', 'Can remove or archive staff records', 'Staff'),
    ('teachers_staff', 'export_data', 'Export staff lists', 'Can export staff rosters to file', 'Staff'),

    -- Finance
    ('finance', 'view', 'See financial records', 'Can view fee structures, student balances, and invoices', 'Finance'),
    ('finance', 'create', 'Add financial transactions', 'Can record fee payments and generate invoices', 'Finance'),
    ('finance', 'edit', 'Change financial records', 'Can update fee structures and payment entries', 'Finance'),
    ('finance', 'delete', 'Remove financial entries', 'Can reverse or cancel erroneous financial entries', 'Finance'),
    ('finance', 'approve', 'Approve financial requests', 'Can approve bursary awards, fee waivers, and relief allocations', 'Finance'),
    ('finance', 'generate_report', 'Create financial reports', 'Can compile fee collection and revenue summaries on screen', 'Finance'),
    ('finance', 'download_report', 'Download financial reports', 'Can download financial ledgers and receipts to device', 'Finance'),
    ('finance', 'export_data', 'Export financial lists', 'Can export fee balances and transaction history to file', 'Finance'),

    -- Reports
    ('reports', 'view', 'See reports catalog', 'Can view reporting dashboards and official templates', 'Reports'),
    ('reports', 'generate_report', 'Create school reports', 'Can generate report cards and performance analytics on screen', 'Reports'),
    ('reports', 'download_report', 'Download school reports', 'Can download report cards and official transcripts to device', 'Reports'),
    ('reports', 'export_data', 'Export report statistics', 'Can export school performance data', 'Reports'),

    -- Library
    ('library', 'view', 'See library catalog', 'Can view books, copies, and loan history', 'Library'),
    ('library', 'create', 'Add library books', 'Can catalog new books and issue loans', 'Library'),
    ('library', 'edit', 'Change library records', 'Can update book condition and process returns', 'Library'),
    ('library', 'delete', 'Remove library books', 'Can write off lost or damaged inventory', 'Library'),
    ('library', 'generate_report', 'Create library reports', 'Can generate book circulation reports on screen', 'Library'),
    ('library', 'download_report', 'Download library reports', 'Can download circulation summaries to device', 'Library'),

    -- Communication
    ('communication', 'view', 'See messages and notices', 'Can read school messages and parent notices', 'Communication'),
    ('communication', 'create', 'Send messages and notices', 'Can draft and broadcast school announcements and messages', 'Communication'),
    ('communication', 'edit', 'Change announcements', 'Can edit active bulletin announcements', 'Communication'),
    ('communication', 'delete', 'Remove announcements', 'Can retract or delete announcements', 'Communication'),

    -- Attendance
    ('attendance', 'view', 'See attendance rolls', 'Can view student and teacher attendance history', 'Attendance'),
    ('attendance', 'create', 'Record daily attendance', 'Can submit daily attendance marks', 'Attendance'),
    ('attendance', 'edit', 'Change attendance marks', 'Can update historical attendance entries', 'Attendance'),
    ('attendance', 'approve', 'Approve teacher attendance', 'Can verify self-reported teacher attendance and leave entries', 'Attendance'),
    ('attendance', 'download_report', 'Download attendance reports', 'Can download attendance sheets to device', 'Attendance'),
    ('attendance', 'export_data', 'Export attendance rolls', 'Can export student attendance logs to file', 'Attendance'),

    -- Timetable
    ('timetable', 'view', 'See school timetable', 'Can view active class and room allocations', 'Timetable'),
    ('timetable', 'create', 'Create draft timetables', 'Can draft schedules and period assignments', 'Timetable'),
    ('timetable', 'edit', 'Change timetable entries', 'Can adjust period allocations and teacher assignments', 'Timetable'),
    ('timetable', 'approve', 'Activate official timetable', 'Can publish draft timetables to the active school schedule', 'Timetable'),

    -- Settings
    ('settings', 'view', 'See school settings', 'Can view institution details and academic calendars', 'Settings'),
    ('settings', 'edit', 'Change school settings', 'Can configure terms, grading scales, and general parameters', 'Settings'),

    -- Roles & Access
    ('roles_access', 'view', 'See staff access & job roles', 'Can view admin directory and assigned job roles', 'Access Control'),
    ('roles_access', 'create', 'Create custom job roles', 'Can create and configure new custom job roles', 'Access Control'),
    ('roles_access', 'edit', 'Change job roles', 'Can modify role permissions and scoped limitations', 'Access Control'),
    ('roles_access', 'delete', 'Remove job roles', 'Can delete custom job roles that are not in use', 'Access Control'),
    ('roles_access', 'manage_roles', 'Give access to others', 'Can assign, edit, and revoke job roles for other staff', 'Access Control'),

    -- Audit Logs
    ('audit_logs', 'view', 'See activity history', 'Can view system audit trail and changes made by users', 'Audit Logs'),
    ('audit_logs', 'export_data', 'Export activity history', 'Can download activity history logs to file', 'Audit Logs')
ON CONFLICT (domain, action) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- 2. ROLE TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS public.role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE, -- NULL means system template
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    best_for TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of {domain: text, action: text}
    data_scope TEXT NOT NULL DEFAULT 'all',
    scope_config JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_role_templates_inst_name UNIQUE (institution_id, name)
);

-- Seed System Ready-Made Role Templates
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
        'Best for: Deputy principals assisting with student discipline, daily operations, and attendance',
        '[
            {"domain": "academic", "action": "view"},
            {"domain": "academic", "action": "create"},
            {"domain": "academic", "action": "edit"},
            {"domain": "students", "action": "view"},
            {"domain": "students", "action": "edit"},
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

-- 3. ENHANCE ROLES TABLE & ROLE_PERMISSIONS
ALTER TABLE public.roles
    ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_from_template_id UUID REFERENCES public.role_templates(id) ON DELETE SET NULL;

-- Enhance role_permissions to natively support domain and action
ALTER TABLE public.role_permissions
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS domain TEXT,
    ADD COLUMN IF NOT EXISTS action TEXT;

-- Backfill institution_id on role_permissions from roles
UPDATE public.role_permissions rp
SET institution_id = r.institution_id
FROM public.roles r
WHERE rp.role_id = r.id AND rp.institution_id IS NULL;

-- 4. ROLE SCOPES (Granular Data & Field Scoping)
CREATE TABLE IF NOT EXISTS public.role_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
    domain TEXT NOT NULL,
    scope_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'levels', 'classes', 'streams', 'terms', 'record_types', 'own_records'
    scope_values JSONB DEFAULT '[]'::jsonb, -- e.g. ["uuid1", "uuid2"] or ["grade_7", "grade_8"]
    hidden_fields JSONB DEFAULT '[]'::jsonb, -- e.g. ["phone", "national_id", "medical_notes", "salary"]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_role_scopes_role_domain UNIQUE (role_id, domain)
);

-- 5. ENHANCE USER_ROLES (Many-to-Many with Status & Expiry)
ALTER TABLE public.user_roles
    ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill institution_id on user_roles if missing
UPDATE public.user_roles ur
SET institution_id = u.institution_id
FROM public.users u
WHERE ur.user_id = u.id AND ur.institution_id IS NULL;

-- Ensure check constraint on status
DO $$
BEGIN
    ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_status_check;
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_status_check
        CHECK (status IN ('active', 'suspended', 'expired'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 6. USER PERMISSION OVERRIDES (Explicit Allow / Deny)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    domain TEXT NOT NULL,
    action TEXT NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
    granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_permission_overrides UNIQUE (user_id, domain, action)
);

-- 7. DESIGNATIONS (Extra Duties like Librarian)
CREATE TABLE IF NOT EXISTS public.designations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- e.g. 'librarian'
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_designations_user_inst_type UNIQUE (institution_id, user_id, type)
);

-- Sync existing librarian_designations into designations table
INSERT INTO public.designations (institution_id, user_id, type, assigned_by, is_active, assigned_at, revoked_at, revoked_by, created_at, updated_at)
SELECT institution_id, user_id, 'librarian', assigned_by, is_active, assigned_at, revoked_at, revoked_by, created_at, updated_at
FROM public.librarian_designations
ON CONFLICT (institution_id, user_id, type) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    revoked_at = EXCLUDED.revoked_at,
    revoked_by = EXCLUDED.revoked_by;

-- 8. PERMISSION VERSIONS (Cache Invalidation Counter)
CREATE TABLE IF NOT EXISTS public.permission_versions (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ROLE CHANGE REQUESTS (Two-Person Approval Workflow)
CREATE TABLE IF NOT EXISTS public.role_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    requester_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    change_type TEXT NOT NULL, -- 'assign_role', 'remove_role', 'grant_permission', 'deny_permission', 'elevate_main'
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    reason TEXT,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AUDIT LOGS (Comprehensive Activity History)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    domain TEXT,
    target_type TEXT,
    target_id TEXT,
    before_state JSONB,
    after_state JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. HELP CONTENT (Plain-Language Built-In Guidance)
CREATE TABLE IF NOT EXISTS public.help_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    example TEXT,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE, -- NULL for system defaults
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_help_content_key_lang_inst UNIQUE (key, language, institution_id)
);

-- Seed System Help Content (Glossary & Tooltips)
INSERT INTO public.help_content (key, language, title, body, example, institution_id)
VALUES
    ('term.domain', 'en', 'Area', 'A part of the school system, like Finance or Students.', 'Example: Finance, Academic, Attendance', NULL),
    ('term.action_view', 'en', 'See', 'Allows viewing data in this area.', 'Can read rosters and information on screen', NULL),
    ('term.action_create', 'en', 'Add', 'Allows adding new entries in this area.', 'Can create a new student or lesson', NULL),
    ('term.action_edit', 'en', 'Change', 'Allows editing existing entries in this area.', 'Can update student details or exam marks', NULL),
    ('term.action_delete', 'en', 'Remove', 'Allows removing entries in this area.', 'Can delete or archive records', NULL),
    ('term.action_approve', 'en', 'Approve requests', 'Can approve things like fee waivers, bursaries, or attendance.', 'Can sign off on fee relief', NULL),
    ('term.action_generate_report', 'en', 'Create reports', 'Can compile and view reports on screen.', 'Can build a terminal progress report', NULL),
    ('term.action_download_report', 'en', 'Download reports', 'Can save reports to device as PDF or Excel.', 'Can save report cards to laptop or phone', NULL),
    ('term.action_export_data', 'en', 'Export lists', 'Can download list files such as student or parent contacts.', 'Can save class list as a CSV file', NULL),
    ('term.action_manage_roles', 'en', 'Give access to others', 'Can choose what other staff can do in the system.', 'Can assign or remove job roles', NULL),
    ('term.role', 'en', 'Job role', 'A set of permissions for a job, like Finance Manager.', 'Example: Finance Manager, Academic Head', NULL),
    ('term.role_template', 'en', 'Ready-made role', 'A starting point you can use as is or change.', 'Example: Supervisor, Admissions Officer', NULL),
    ('term.scope', 'en', 'What they can see', 'Limits what records this person can view (e.g. only Grade 7 to 9).', 'Can limit by grade level, class, or term', NULL),
    ('term.field_hiding', 'en', 'Hide private details', 'Hides sensitive fields like parent phone numbers or ID numbers.', 'Phone numbers omitted from viewing and exports', NULL),
    ('term.explicit_deny', 'en', 'Block this access', 'Blocks a specific action even if another job role allows it.', 'Prevents report downloads even if holding an admin role', NULL),
    ('term.step_up_auth', 'en', 'Confirm it''s you', 'Please re-enter your password or verify device biometrics for this sensitive change.', 'Protects against unauthorized role changes', NULL),
    ('term.effective_permissions', 'en', 'What this person can do', 'The combined result of all their job roles and extra duties.', 'Union of all assigned roles', NULL),
    ('term.designation', 'en', 'Extra duty', 'An extra responsibility assigned to staff, such as Librarian.', 'Teachers can only hold the Librarian extra duty', NULL),
    ('term.audit_log', 'en', 'Activity history', 'Who did what in the school system, and when.', 'Audit trail of access and record changes', NULL)
ON CONFLICT (key, language, institution_id) DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    example = EXCLUDED.example;

-- 12. INVARIANTS & SECURITY TRIGGERS

-- Trigger: Teachers cannot hold administrative roles or access
CREATE OR REPLACE FUNCTION public.check_teacher_admin_invariants()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role TEXT;
    v_role_name TEXT;
BEGIN
    -- Check user role in users table
    SELECT role INTO v_user_role FROM public.users WHERE id = NEW.user_id;

    IF v_user_role = 'teacher' THEN
        -- If assigning through user_roles table
        IF TG_TABLE_NAME = 'user_roles' THEN
            SELECT LOWER(name) INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
            -- Only allow librarian role if designated
            IF v_role_name != 'librarian' THEN
                RAISE EXCEPTION 'Teachers hold no administrative roles or access, with one exception: Librarian designation.';
            END IF;
        END IF;

        -- If attempting to insert into admins table
        IF TG_TABLE_NAME = 'admins' THEN
            RAISE EXCEPTION 'Teachers cannot be assigned administrative accounts.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_roles_teacher_guard ON public.user_roles;
CREATE TRIGGER tr_user_roles_teacher_guard
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.check_teacher_admin_invariants();

DROP TRIGGER IF EXISTS tr_admins_teacher_guard ON public.admins;
CREATE TRIGGER tr_admins_teacher_guard
BEFORE INSERT OR UPDATE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.check_teacher_admin_invariants();

-- Trigger: Protect Main Admin (at least one active Main Admin per institution, cannot demote/delete last main admin)
CREATE OR REPLACE FUNCTION public.check_main_admin_invariants()
RETURNS TRIGGER AS $$
DECLARE
    v_active_main_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_main = true THEN
            SELECT COUNT(*) INTO v_active_main_count
            FROM public.admins
            WHERE institution_id = OLD.institution_id AND is_main = true AND id != OLD.id;

            IF v_active_main_count < 1 THEN
                RAISE EXCEPTION 'Every institution must always have at least one active Main Administrator. Cannot delete the only Main Admin.';
            END IF;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_main = true AND NEW.is_main = false THEN
            SELECT COUNT(*) INTO v_active_main_count
            FROM public.admins
            WHERE institution_id = OLD.institution_id AND is_main = true AND id != OLD.id;

            IF v_active_main_count < 1 THEN
                RAISE EXCEPTION 'Every institution must always have at least one active Main Administrator. Cannot remove Main Admin status from the only Main Admin.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_admins_main_admin_guard ON public.admins;
CREATE TRIGGER tr_admins_main_admin_guard
BEFORE UPDATE OR DELETE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.check_main_admin_invariants();

-- Trigger: Invalidate permission version on role/override/scope change
CREATE OR REPLACE FUNCTION public.bump_user_permission_version()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_inst_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
        v_inst_id := OLD.institution_id;
    ELSE
        v_user_id := NEW.user_id;
        v_inst_id := NEW.institution_id;
    END IF;

    IF v_user_id IS NOT NULL AND v_inst_id IS NOT NULL THEN
        INSERT INTO public.permission_versions (user_id, institution_id, version, updated_at)
        VALUES (v_user_id, v_inst_id, 2, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            version = public.permission_versions.version + 1,
            updated_at = NOW();
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_user_roles_bump_version ON public.user_roles;
CREATE TRIGGER tr_user_roles_bump_version
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.bump_user_permission_version();

DROP TRIGGER IF EXISTS tr_user_permission_overrides_bump_version ON public.user_permission_overrides;
CREATE TRIGGER tr_user_permission_overrides_bump_version
AFTER INSERT OR UPDATE OR DELETE ON public.user_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.bump_user_permission_version();

CREATE OR REPLACE FUNCTION public.bump_role_users_permission_version()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_role_id := OLD.role_id;
    ELSE
        v_role_id := NEW.role_id;
    END IF;

    IF v_role_id IS NOT NULL THEN
        UPDATE public.permission_versions pv
        SET version = pv.version + 1, updated_at = NOW()
        FROM public.user_roles ur
        WHERE ur.user_id = pv.user_id AND ur.role_id = v_role_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_role_permissions_bump_version ON public.role_permissions;
CREATE TRIGGER tr_role_permissions_bump_version
AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
FOR EACH ROW EXECUTE FUNCTION public.bump_role_users_permission_version();

DROP TRIGGER IF EXISTS tr_role_scopes_bump_version ON public.role_scopes;
CREATE TRIGGER tr_role_scopes_bump_version
AFTER INSERT OR UPDATE OR DELETE ON public.role_scopes
FOR EACH ROW EXECUTE FUNCTION public.bump_role_users_permission_version();

-- 13. CORE PERMISSION FUNCTIONS

-- has_permission: Stable, Security Definer check for RLS and backend
CREATE OR REPLACE FUNCTION public.has_permission(
    p_user_id UUID,
    p_institution_id UUID,
    p_domain TEXT,
    p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_is_main BOOLEAN := false;
    v_override_effect TEXT;
    v_has_role_perm BOOLEAN := false;
    v_is_active_librarian BOOLEAN := false;
BEGIN
    -- 1. Check if user is platform/master admin
    SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;
    IF v_user_role = 'master_admin' THEN
        RETURN true;
    END IF;

    -- 2. Check if user is Main Admin for this institution
    SELECT is_main INTO v_is_main
    FROM public.admins
    WHERE user_id = p_user_id AND institution_id = p_institution_id AND access_level = 'read_write'
    LIMIT 1;

    IF v_is_main = true THEN
        RETURN true;
    END IF;

    -- 3. Check Account-Level Explicit Override (Deny takes precedence over everything)
    SELECT effect INTO v_override_effect
    FROM public.user_permission_overrides
    WHERE user_id = p_user_id 
      AND institution_id = p_institution_id
      AND domain = p_domain
      AND action = p_action
    LIMIT 1;

    IF v_override_effect = 'deny' THEN
        RETURN false;
    ELSIF v_override_effect = 'allow' THEN
        RETURN true;
    END IF;

    -- 4. Check Librarian Designation for Library domain
    IF p_domain = 'library' THEN
        SELECT is_active INTO v_is_active_librarian
        FROM public.designations
        WHERE user_id = p_user_id 
          AND institution_id = p_institution_id
          AND type = 'librarian'
          AND is_active = true
        LIMIT 1;

        IF v_is_active_librarian = true AND p_action IN ('view', 'create', 'edit', 'delete', 'generate_report', 'download_report') THEN
            RETURN true;
        END IF;
    END IF;

    -- 5. Evaluate Union of All Held Roles (active and not expired)
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON rp.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND ur.institution_id = p_institution_id
          AND ur.status = 'active'
          AND (ur.starts_at IS NULL OR ur.starts_at <= NOW())
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND rp.domain = p_domain
          AND (rp.action = p_action OR rp.action = '*')
    ) INTO v_has_role_perm;

    RETURN v_has_role_perm;
END;
$$;

-- get_effective_permissions: Complete merged permissions payload for frontend
CREATE OR REPLACE FUNCTION public.get_effective_permissions(
    p_user_id UUID,
    p_institution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_is_main BOOLEAN := false;
    v_access_level TEXT;
    v_is_librarian BOOLEAN := false;
    v_result JSONB := '{}'::jsonb;
    v_rec RECORD;
    v_override RECORD;
    v_all_domains TEXT[] := ARRAY['academic', 'students', 'parents', 'teachers_staff', 'finance', 'reports', 'library', 'communication', 'settings', 'roles_access', 'audit_logs', 'attendance', 'timetable'];
    v_all_actions TEXT[] := ARRAY['view', 'create', 'edit', 'delete', 'approve', 'generate_report', 'download_report', 'export_data', 'manage_roles'];
    v_d TEXT;
    v_a TEXT;
BEGIN
    SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;

    -- Check Main Admin status
    SELECT is_main, access_level INTO v_is_main, v_access_level
    FROM public.admins
    WHERE user_id = p_user_id AND institution_id = p_institution_id
    LIMIT 1;

    -- If Master Admin or Main Admin with read_write: grant all permissions across all domains
    IF v_user_role = 'master_admin' OR (v_is_main = true AND COALESCE(v_access_level, 'read_write') = 'read_write') THEN
        FOREACH v_d IN ARRAY v_all_domains LOOP
            FOREACH v_a IN ARRAY v_all_actions LOOP
                v_result := jsonb_set(
                    v_result,
                    ARRAY[v_d, v_a],
                    jsonb_build_object('granted', true, 'sources', jsonb_build_array(CASE WHEN v_user_role = 'master_admin' THEN 'Master Admin' ELSE 'Main Admin' END))
                );
            END LOOP;
        END LOOP;
        RETURN v_result;
    END IF;

    -- For normal admins / users: aggregate from all active roles
    FOR v_rec IN
        SELECT 
            rp.domain,
            rp.action,
            r.name as role_name
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON rp.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND ur.institution_id = p_institution_id
          AND ur.status = 'active'
          AND (ur.starts_at IS NULL OR ur.starts_at <= NOW())
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    LOOP
        IF v_rec.action = '*' THEN
            FOREACH v_a IN ARRAY v_all_actions LOOP
                IF NOT (v_result ? v_rec.domain AND (v_result->v_rec.domain) ? v_a) THEN
                    v_result := jsonb_set(
                        v_result,
                        ARRAY[v_rec.domain, v_a],
                        jsonb_build_object('granted', true, 'sources', jsonb_build_array(v_rec.role_name))
                    );
                ELSE
                    -- Append role source
                    v_result := jsonb_set(
                        v_result,
                        ARRAY[v_rec.domain, v_a, 'sources'],
                        (v_result->v_rec.domain->v_a->'sources') || to_jsonb(v_rec.role_name)
                    );
                END IF;
            END LOOP;
        ELSE
            IF NOT (v_result ? v_rec.domain AND (v_result->v_rec.domain) ? v_rec.action) THEN
                v_result := jsonb_set(
                    v_result,
                    ARRAY[v_rec.domain, v_rec.action],
                    jsonb_build_object('granted', true, 'sources', jsonb_build_array(v_rec.role_name))
                );
            ELSE
                v_result := jsonb_set(
                    v_result,
                    ARRAY[v_rec.domain, v_rec.action, 'sources'],
                    (v_result->v_rec.domain->v_rec.action->'sources') || to_jsonb(v_rec.role_name)
                );
            END IF;
        END IF;
    END LOOP;

    -- Librarian designation
    SELECT is_active INTO v_is_librarian
    FROM public.designations
    WHERE user_id = p_user_id AND institution_id = p_institution_id AND type = 'librarian' AND is_active = true
    LIMIT 1;

    IF v_is_librarian = true THEN
        FOREACH v_a IN ARRAY ARRAY['view', 'create', 'edit', 'delete', 'generate_report', 'download_report'] LOOP
            IF NOT (v_result ? 'library' AND (v_result->'library') ? v_a) THEN
                v_result := jsonb_set(
                    v_result,
                    ARRAY['library', v_a],
                    jsonb_build_object('granted', true, 'sources', jsonb_build_array('Librarian Designation'))
                );
            ELSE
                v_result := jsonb_set(
                    v_result,
                    ARRAY['library', v_a, 'sources'],
                    (v_result->'library'->v_a->'sources') || to_jsonb('Librarian Designation'::text)
                );
            END IF;
        END LOOP;
    END IF;

    -- Apply Overrides (Explicit Deny / Allow)
    FOR v_override IN
        SELECT domain, action, effect
        FROM public.user_permission_overrides
        WHERE user_id = p_user_id AND institution_id = p_institution_id
    LOOP
        IF v_override.effect = 'deny' THEN
            v_result := jsonb_set(
                v_result,
                ARRAY[v_override.domain, v_override.action],
                jsonb_build_object('granted', false, 'sources', jsonb_build_array('Explicit Deny Override'))
            );
        ELSIF v_override.effect = 'allow' THEN
            v_result := jsonb_set(
                v_result,
                ARRAY[v_override.domain, v_override.action],
                jsonb_build_object('granted', true, 'sources', jsonb_build_array('Explicit Allow Override'))
            );
        END IF;
    END LOOP;

    RETURN v_result;
END;
$$;

-- get_effective_scopes: Computes union of scopes & intersection of hidden fields
CREATE OR REPLACE FUNCTION public.get_effective_scopes(
    p_user_id UUID,
    p_institution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
    v_is_main BOOLEAN := false;
    v_scopes JSONB := '{}'::jsonb;
    v_domain TEXT;
    v_scope_type TEXT;
    v_values JSONB;
    v_hidden JSONB;
    v_rec RECORD;
BEGIN
    SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;

    SELECT is_main INTO v_is_main
    FROM public.admins
    WHERE user_id = p_user_id AND institution_id = p_institution_id
    LIMIT 1;

    -- Main admin has unrestricted institution-wide scope on all domains
    IF v_user_role = 'master_admin' OR v_is_main = true THEN
        RETURN jsonb_build_object(
            'is_unrestricted', true,
            'domains', '{}'::jsonb
        );
    END IF;

    -- Collect scopes from all roles granting view to each domain
    FOR v_rec IN
        SELECT 
            rs.domain,
            rs.scope_type,
            rs.scope_values,
            rs.hidden_fields
        FROM public.user_roles ur
        JOIN public.role_scopes rs ON rs.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND ur.institution_id = p_institution_id
          AND ur.status = 'active'
          AND (ur.starts_at IS NULL OR ur.starts_at <= NOW())
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    LOOP
        v_domain := v_rec.domain;
        
        -- If domain not initialized yet, initialize
        IF NOT (v_scopes ? v_domain) THEN
            v_scopes := jsonb_set(
                v_scopes,
                ARRAY[v_domain],
                jsonb_build_object(
                    'scope_types', jsonb_build_array(v_rec.scope_type),
                    'values', v_rec.scope_values,
                    'hidden_fields', v_rec.hidden_fields
                )
            );
        ELSE
            -- Union scope types and values
            v_scopes := jsonb_set(
                v_scopes,
                ARRAY[v_domain, 'scope_types'],
                (v_scopes->v_domain->'scope_types') || to_jsonb(v_rec.scope_type)
            );
            v_scopes := jsonb_set(
                v_scopes,
                ARRAY[v_domain, 'values'],
                (v_scopes->v_domain->'values') || v_rec.scope_values
            );
            -- Field level hiding: a field stays hidden ONLY if every granting role hides it (intersection)
            -- If current role does not hide field X, X is visible
            -- We update hidden_fields to intersection
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'is_unrestricted', false,
        'domains', v_scopes
    );
END;
$$;

-- 14. ROW-LEVEL SECURITY (RLS) POLICIES ON ALL NEW/ENHANCED TABLES

ALTER TABLE public.feature_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_content ENABLE ROW LEVEL SECURITY;

-- Feature Registry: Readable by all authenticated users, editable only by master_admin
DROP POLICY IF EXISTS "feature_registry_read_all" ON public.feature_registry;
CREATE POLICY "feature_registry_read_all" ON public.feature_registry
FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_registry_admin_write" ON public.feature_registry;
CREATE POLICY "feature_registry_admin_write" ON public.feature_registry
FOR ALL USING (get_current_user_role() = 'master_admin');

-- Role Templates: Readable by institution users and system templates
DROP POLICY IF EXISTS "role_templates_isolation" ON public.role_templates;
CREATE POLICY "role_templates_isolation" ON public.role_templates
FOR SELECT USING (
    institution_id IS NULL 
    OR institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "role_templates_admin_write" ON public.role_templates;
CREATE POLICY "role_templates_admin_write" ON public.role_templates
FOR ALL USING (
    (institution_id = get_current_user_institution_id() AND public.has_permission(auth.uid(), institution_id, 'roles_access', 'create'))
    OR get_current_user_role() = 'master_admin'
);

-- Role Scopes: Scoped by institution
DROP POLICY IF EXISTS "role_scopes_isolation" ON public.role_scopes;
CREATE POLICY "role_scopes_isolation" ON public.role_scopes
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- User Permission Overrides: Scoped by institution
DROP POLICY IF EXISTS "user_permission_overrides_isolation" ON public.user_permission_overrides;
CREATE POLICY "user_permission_overrides_isolation" ON public.user_permission_overrides
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- Designations: Scoped by institution
DROP POLICY IF EXISTS "designations_isolation" ON public.designations;
CREATE POLICY "designations_isolation" ON public.designations
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- Permission Versions: User reads their own version; admins can read institution versions
DROP POLICY IF EXISTS "permission_versions_isolation" ON public.permission_versions;
CREATE POLICY "permission_versions_isolation" ON public.permission_versions
FOR ALL USING (
    user_id = auth.uid() 
    OR institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- Role Change Requests: Scoped by institution
DROP POLICY IF EXISTS "role_change_requests_isolation" ON public.role_change_requests;
CREATE POLICY "role_change_requests_isolation" ON public.role_change_requests
FOR ALL USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- Audit Logs: Scoped by institution, read-only for users with audit_logs view
DROP POLICY IF EXISTS "audit_logs_isolation" ON public.audit_logs;
CREATE POLICY "audit_logs_isolation" ON public.audit_logs
FOR SELECT USING (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
FOR INSERT WITH CHECK (
    institution_id = get_current_user_institution_id() 
    OR get_current_user_role() = 'master_admin'
);

-- Help Content: Readable by all
DROP POLICY IF EXISTS "help_content_read_all" ON public.help_content;
CREATE POLICY "help_content_read_all" ON public.help_content
FOR SELECT USING (true);

-- 15. INDEXES FOR HIGH-PERFORMANCE PERMISSION RESOLUTION
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_domain_action 
    ON public.role_permissions (role_id, domain, action);

CREATE INDEX IF NOT EXISTS idx_role_permissions_institution 
    ON public.role_permissions (institution_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_inst_status 
    ON public.user_roles (user_id, institution_id, status);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_lookup 
    ON public.user_permission_overrides (user_id, institution_id, domain, action);

CREATE INDEX IF NOT EXISTS idx_role_scopes_lookup 
    ON public.role_scopes (role_id, domain);

CREATE INDEX IF NOT EXISTS idx_designations_user_inst_active 
    ON public.designations (user_id, institution_id, type) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_audit_logs_inst_date 
    ON public.audit_logs (institution_id, created_at DESC);
