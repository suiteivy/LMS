-- ============================================================================
-- Seed File: 02_feature_registry.sql
-- Environment: Core (All environments)
-- Purpose: Canonical permissions feature registry covering all LMS modules.
-- ============================================================================

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
