-- ============================================================================
-- Seed File: 08_help_content.sql
-- Environment: Core (All environments)
-- Purpose: Canonical plain-language help copy, tooltips, and explanations.
-- ============================================================================

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
    ('term.audit_log', 'en', 'Activity history', 'Who did what in the school system, and when.', 'Audit trail of access and record changes', NULL),
    -- UI Tooltips and Operational Guidance
    ('attendance.mark_modal', 'en', 'Mark Attendance', 'Record daily attendance per student with options for Present, Absent, Excused, or Late.', 'Select attendance status for each enrolled student', NULL),
    ('finance.payment_method_select', 'en', 'Payment Channel', 'Select how funds were received: M-Pesa, Bank Deposit/EFT, Cash, or Cheque.', 'Choose M-Pesa for Paybill and Till confirmations', NULL),
    ('finance.flag_payment_dialog', 'en', 'Flag Payment', 'Mark a transaction for bursary review when payment details or amounts cannot be reconciled.', 'Flag duplicate transaction references or unverified bank receipts', NULL),
    ('library.borrow_duration_policy', 'en', 'Loan Duration', 'Configured borrowing period before books are marked overdue.', 'Standard student book loan duration is 14 days', NULL),
    ('clearance.signoff_workflow', 'en', 'Student Clearance', 'Multi-department checklist verifying library returns, fee settlements, and inventory surrender before issuing departure certificates.', 'Requires signatures from Library, Bursary, and Academics', NULL),
    ('reports.export_csv_guidance', 'en', 'Exporting Data', 'Exports selected dataset directly to CSV or XLSX formatted according to tenant privacy and column permissions.', 'Sensitive identifiers are masked for non-admin viewers', NULL)
ON CONFLICT (key, language, institution_id) DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    example = EXCLUDED.example;
