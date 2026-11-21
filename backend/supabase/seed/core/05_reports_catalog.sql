-- ============================================================================
-- Seed File: 05_reports_catalog.sql
-- Environment: Core (All environments)
-- Purpose: Canonical report engine catalog, datasets, fields, relations, presets and retention policies.
-- ============================================================================

-- Datasets
INSERT INTO public.report_datasets (code, label, description, table_name, grain, owning_sections, required_permissions, sensitivity_level, history_behavior)
VALUES
('students', 'Students', 'Enrolled student profiles and identifiers', 'students', 'one row per student', '{"students", "academics", "results", "management"}', '{"students:view"}', 'standard', 'effective_dated'),
('staff', 'Staff & Teachers', 'Teaching and administrative personnel', 'teachers', 'one row per staff member', '{"users", "management", "academics"}', '{"teachers:view"}', 'sensitive', 'effective_dated'),
('parents', 'Parents & Guardians', 'Linked family contacts and guardian profiles', 'parents', 'one row per parent/guardian', '{"students", "communication", "management"}', '{"parents:view"}', 'standard', 'current_only'),
('classes', 'Classes & Streams', 'Academic grade levels and classroom divisions', 'classes', 'one row per class stream', '{"academics", "classes", "timetable"}', '{"classes:view"}', 'standard', 'effective_dated'),
('attendance', 'Attendance Records', 'Daily student presence and absence logs', 'attendance', 'one row per student attendance record', '{"attendance", "academics", "students"}', '{"attendance:view"}', 'standard', 'immutable_log'),
('results', 'Exam & Assessment Results', 'Recorded student subject marks and grades', 'exam_results', 'one row per student assessment item', '{"results", "academics"}', '{"results:view"}', 'standard', 'immutable_log'),
('fees_ledger', 'Fee Invoices & Payments', 'Student billing ledger, payments and balances', 'student_bills', 'one row per fee invoice item', '{"finance", "management"}', '{"finance:view"}', 'sensitive', 'immutable_log'),
('library', 'Library Loans', 'Book borrowing and return tracking', 'library_loans', 'one row per loan transaction', '{"library", "students"}', '{"library:view"}', 'standard', 'immutable_log'),
('documents', 'Published Documents', 'Official issued letters and administrative records', 'published_documents', 'one row per issued document', '{"documents", "management"}', '{"documents:view"}', 'standard', 'immutable_log')
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    owning_sections = EXCLUDED.owning_sections,
    required_permissions = EXCLUDED.required_permissions;

-- Fields: Students
INSERT INTO public.report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('students', 'full_name', 'Student Name', 'full_name', 'text', '{"eq", "neq", "contains", "starts_with", "ends_with", "in"}', true, true, false, false, true, 'standard', 'plain'),
('students', 'admission_number', 'Admission Number', 'admission_number', 'text', '{"eq", "neq", "contains", "in"}', true, true, false, false, true, 'standard', 'code'),
('students', 'up_id', 'UPI / National Identifier', 'upi', 'text', '{"eq", "neq", "contains"}', true, true, false, false, true, 'standard', 'code'),
('students', 'class_id', 'Class ID', 'class_id', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'uuid'),
('students', 'status', 'Status', 'status', 'enum', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'badge'),
('students', 'gender', 'Gender', 'gender', 'enum', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'badge'),
('students', 'date_of_birth', 'Date of Birth', 'date_of_birth', 'date', '{"eq", "neq", "gt", "lt", "between"}', true, true, false, false, true, 'sensitive', 'date_short'),
('students', 'created_at', 'Enrollment Date', 'created_at', 'date', '{"eq", "gt", "lt", "between"}', true, true, true, false, true, 'standard', 'date_short')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Fields: Results
INSERT INTO public.report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('results', 'score', 'Score / Marks', 'score', 'number', '{"eq", "neq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'number'),
('results', 'grade', 'Grade / Level', 'grade', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'badge'),
('results', 'subject_id', 'Subject ID', 'subject_id', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'uuid'),
('results', 'term', 'Academic Term', 'term', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain'),
('results', 'academic_year', 'Academic Year', 'academic_year', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Fields: Finance / Ledger
INSERT INTO public.report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('fees_ledger', 'item_name', 'Fee Item', 'item_name', 'text', '{"eq", "neq", "contains", "in"}', true, true, true, false, true, 'standard', 'plain'),
('fees_ledger', 'amount_due', 'Amount Billed', 'amount_due', 'money', '{"eq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'currency_kes'),
('fees_ledger', 'amount_paid', 'Amount Paid', 'amount_paid', 'money', '{"eq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'currency_kes'),
('fees_ledger', 'balance', 'Outstanding Balance', 'balance', 'money', '{"eq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'currency_kes'),
('fees_ledger', 'term', 'Term', 'term', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain'),
('fees_ledger', 'year', 'Year', 'year', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Fields: Attendance
INSERT INTO public.report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('attendance', 'status', 'Attendance Status', 'status', 'enum', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'badge'),
('attendance', 'date', 'Attendance Date', 'date', 'date', '{"eq", "gt", "lt", "between"}', true, true, true, false, true, 'standard', 'date_short'),
('attendance', 'remarks', 'Remarks / Note', 'remarks', 'text', '{"contains"}', true, false, false, false, true, 'standard', 'plain')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Relations
INSERT INTO public.report_relations (source_dataset, target_dataset, join_type, join_condition, cardinality, fan_out_risk)
VALUES
('students', 'classes', 'LEFT', 'students.class_id = classes.id', 'one_to_one', false),
('students', 'attendance', 'LEFT', 'students.id = attendance.student_id', 'one_to_many', true),
('students', 'results', 'LEFT', 'students.id = exam_results.student_id', 'one_to_many', true),
('students', 'fees_ledger', 'LEFT', 'students.id = student_bills.student_id', 'one_to_many', true),
('students', 'parents', 'LEFT', 'students.parent_id = parents.id', 'one_to_one', false)
ON CONFLICT (source_dataset, target_dataset) DO UPDATE SET
    join_condition = EXCLUDED.join_condition,
    fan_out_risk = EXCLUDED.fan_out_risk;

-- Section Contexts
INSERT INTO public.report_contexts (context_name, section_key, allowed_datasets, allowed_cross_sections)
VALUES
('students_context', 'students', '{"students", "classes", "attendance", "parents", "documents"}', '{"results", "fees_ledger"}'),
('finance_context', 'finance', '{"fees_ledger", "students", "classes"}', '{"attendance"}'),
('results_context', 'results', '{"results", "students", "classes"}', '{"attendance"}'),
('academics_context', 'academics', '{"classes", "students", "results", "attendance", "staff"}', '{"finance"}'),
('attendance_context', 'attendance', '{"attendance", "students", "classes"}', '{"results"}'),
('library_context', 'library', '{"library", "students", "staff"}', '{}'),
('management_context', 'management', '{"students", "staff", "classes", "attendance", "results", "fees_ledger", "documents", "library"}', '{"students", "finance", "results", "academics"}')
ON CONFLICT (context_name) DO UPDATE SET
    allowed_datasets = EXCLUDED.allowed_datasets,
    allowed_cross_sections = EXCLUDED.allowed_cross_sections;

-- Presets
INSERT INTO public.report_presets (code, title, description, context_section, query_spec)
VALUES
('class_list_by_grade', 'Class List by Grade Level', 'Full alphabetical roster of all enrolled students grouped by grade level and stream.', 'students', '{
    "dataset": "students",
    "columns": ["full_name", "admission_number", "gender", "status"],
    "filters": [{"field": "status", "operator": "eq", "value": "active"}],
    "orderBy": [{"field": "full_name", "direction": "ASC"}]
}'::jsonb),
('missing_fee_payments', 'Unpaid Tuition & Missing Payments', 'Students with unpaid tuition balances for the active academic term.', 'finance', '{
    "dataset": "fees_ledger",
    "columns": ["student_name", "item_name", "amount_due", "amount_paid", "balance"],
    "filters": [{"field": "balance", "operator": "gt", "value": 0}],
    "orderBy": [{"field": "balance", "direction": "DESC"}]
}'::jsonb),
('transport_only_payers', 'Transport Only Payers', 'Students who have paid for transport with no payments for other optional items in the selected period.', 'finance', '{
    "dataset": "fees_ledger",
    "columns": ["student_name", "item_name", "amount_paid"],
    "filters": [
        {"field": "item_name", "operator": "contains", "value": "transport"},
        {"field": "amount_paid", "operator": "gt", "value": 0}
    ],
    "logicModifier": "only_transport"
}'::jsonb),
('top_performers_per_class', 'Top Performers by Class (Top 3)', 'Highest achieving students per class rank based on assessment scores with tie handling.', 'results', '{
    "dataset": "results",
    "columns": ["student_name", "class_name", "score", "grade"],
    "ranking": {"topN": 3, "groupBy": "class_id", "tieHandling": "shared_rank"}
}'::jsonb),
('attendance_below_threshold', 'Students Below Attendance Threshold (<85%)', 'Students with recorded attendance below 85% in the selected period.', 'attendance', '{
    "dataset": "attendance",
    "columns": ["student_name", "class_name", "attendance_rate", "absence_days"],
    "filters": [{"field": "attendance_rate", "operator": "lt", "value": 85}]
}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    query_spec = EXCLUDED.query_spec;

-- Default Retention Policies
INSERT INTO public.retention_policies (institution_id, data_class, retention_years, action_on_expiry, legal_basis)
VALUES
(NULL, 'academic_records', 10, 'archive', 'Kenya Basic Education Act & National Examination Standards'),
(NULL, 'financial_records', 7, 'archive', 'Public Finance Management & Revenue Authority Statutory Compliance'),
(NULL, 'attendance_logs', 5, 'anonymize', 'School Regulatory Attendance Record Guidelines'),
(NULL, 'communications', 3, 'delete', 'Data Protection Act Privacy Minimization Standard'),
(NULL, 'system_activity_logs', 2, 'delete', 'Security Audit Trail Maintenance Standard'),
(NULL, 'library_history', 3, 'anonymize', 'Library Resource Management Policy')
ON CONFLICT (institution_id, data_class) DO UPDATE SET
    retention_years = EXCLUDED.retention_years,
    legal_basis = EXCLUDED.legal_basis;
