-- ============================================================================
-- LMS Smart Reports, Universal Data Catalog, Records History & Retention
-- Migration: 20261122000000_smart_reports_catalog_and_history.sql
-- ============================================================================

-- 1. UNIVERSAL DATA CATALOG (SEMANTIC LAYER)
CREATE TABLE IF NOT EXISTS report_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    table_name TEXT NOT NULL,
    grain TEXT NOT NULL, -- e.g., 'one row per student', 'one row per invoice item'
    owning_sections TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'students', 'finance'}
    required_permissions TEXT[] NOT NULL DEFAULT '{}',
    sensitivity_level TEXT NOT NULL DEFAULT 'standard' CHECK (sensitivity_level IN ('standard', 'sensitive', 'restricted')),
    history_behavior TEXT NOT NULL DEFAULT 'current_only' CHECK (history_behavior IN ('current_only', 'effective_dated', 'immutable_log')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS report_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_code TEXT NOT NULL REFERENCES report_datasets(code) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    label TEXT NOT NULL,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'money', 'date', 'boolean', 'enum')),
    allowed_operators TEXT[] NOT NULL DEFAULT '{"eq", "neq"}',
    is_filterable BOOLEAN NOT NULL DEFAULT true,
    is_sortable BOOLEAN NOT NULL DEFAULT true,
    is_groupable BOOLEAN NOT NULL DEFAULT false,
    is_aggregatable BOOLEAN NOT NULL DEFAULT false,
    is_selectable BOOLEAN NOT NULL DEFAULT true,
    sensitivity_level TEXT NOT NULL DEFAULT 'standard' CHECK (sensitivity_level IN ('standard', 'sensitive', 'restricted')),
    display_format TEXT, -- e.g., 'currency_kes', 'date_short', 'percentage'
    metric_definition TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_dataset_field UNIQUE (dataset_code, field_name)
);

CREATE TABLE IF NOT EXISTS report_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_dataset TEXT NOT NULL REFERENCES report_datasets(code) ON DELETE CASCADE,
    target_dataset TEXT NOT NULL REFERENCES report_datasets(code) ON DELETE CASCADE,
    join_type TEXT NOT NULL DEFAULT 'LEFT' CHECK (join_type IN ('INNER', 'LEFT', 'EXISTS')),
    join_condition TEXT NOT NULL, -- e.g. 'students.id = attendance.student_id'
    cardinality TEXT NOT NULL DEFAULT 'one_to_many' CHECK (cardinality IN ('one_to_one', 'one_to_many', 'many_to_many')),
    fan_out_risk BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_source_target_relation UNIQUE (source_dataset, target_dataset)
);

CREATE TABLE IF NOT EXISTS report_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    description TEXT,
    formula_plain TEXT NOT NULL,
    formula_sql TEXT NOT NULL,
    return_type TEXT NOT NULL DEFAULT 'number',
    owning_sections TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS report_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_name TEXT NOT NULL UNIQUE,
    section_key TEXT NOT NULL,
    allowed_datasets TEXT[] NOT NULL DEFAULT '{}',
    allowed_cross_sections TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS report_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    context_section TEXT NOT NULL,
    query_spec JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. USER ARTIFACTS: SAVED REPORTS, SCHEDULES, JOBS, AND OUTPUTS
CREATE TABLE IF NOT EXISTS saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    context_section TEXT NOT NULL,
    query_spec JSONB NOT NULL,
    is_shared BOOLEAN NOT NULL DEFAULT false,
    shared_with_roles TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    saved_report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
    cron_expression TEXT,
    recipient_roles TEXT[] NOT NULL DEFAULT '{"admin"}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_section TEXT NOT NULL,
    job_type TEXT NOT NULL DEFAULT 'custom_report' CHECK (job_type IN ('custom_report', 'records_dossier', 'scheduled_export')),
    query_spec JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    row_count INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    output_file_path TEXT,
    output_file_size INTEGER DEFAULT 0,
    error_message TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES report_jobs(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'xlsx', 'csv')),
    file_size INTEGER NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. GOVERNANCE, QUERY LOGS, AND RECORDS RETENTION
CREATE TABLE IF NOT EXISTS report_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_section TEXT NOT NULL,
    query_spec_hash TEXT NOT NULL,
    query_spec JSONB NOT NULL,
    row_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS records_dossier_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_person_type TEXT NOT NULL CHECK (target_person_type IN ('student', 'staff', 'parent')),
    target_person_id UUID NOT NULL,
    period_spec JSONB NOT NULL,
    included_sections TEXT[] NOT NULL DEFAULT '{}',
    justification_reason TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    job_id UUID REFERENCES report_jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE, -- NULL means global platform default
    data_class TEXT NOT NULL CHECK (data_class IN ('academic_records', 'financial_records', 'attendance_logs', 'communications', 'system_activity_logs', 'library_history')),
    retention_years INTEGER NOT NULL DEFAULT 7,
    action_on_expiry TEXT NOT NULL DEFAULT 'archive' CHECK (action_on_expiry IN ('archive', 'anonymize', 'delete')),
    legal_basis TEXT DEFAULT 'Statutory regulatory requirement',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_institution_data_class UNIQUE (institution_id, data_class)
);

CREATE TABLE IF NOT EXISTS legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_entity_type TEXT NOT NULL CHECK (target_entity_type IN ('institution', 'person', 'data_class', 'all')),
    target_entity_id UUID,
    reason TEXT NOT NULL,
    placed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    released_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS restore_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_class TEXT NOT NULL,
    target_period TEXT NOT NULL,
    justification TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    restored_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. INDEXES FOR PERFORMANCE AND TENANT ISOLATION
CREATE INDEX IF NOT EXISTS idx_saved_reports_inst_sec ON saved_reports(institution_id, context_section);
CREATE INDEX IF NOT EXISTS idx_report_jobs_inst_status ON report_jobs(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_user ON report_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_query_log_inst_time ON report_query_log(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dossier_requests_target ON records_dossier_requests(institution_id, target_person_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_inst ON retention_policies(institution_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_inst_active ON legal_holds(institution_id, is_active);

-- 5. SEED DATA CATALOG
-- Datasets
INSERT INTO report_datasets (code, label, description, table_name, grain, owning_sections, required_permissions, sensitivity_level, history_behavior)
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
INSERT INTO report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
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
INSERT INTO report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('results', 'score', 'Score / Marks', 'score', 'number', '{"eq", "neq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'number'),
('results', 'grade', 'Grade / Level', 'grade', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'badge'),
('results', 'subject_id', 'Subject ID', 'subject_id', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'uuid'),
('results', 'term', 'Academic Term', 'term', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain'),
('results', 'academic_year', 'Academic Year', 'academic_year', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Fields: Finance / Ledger
INSERT INTO report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('fees_ledger', 'item_name', 'Fee Item', 'item_name', 'text', '{"eq", "neq", "contains", "in"}', true, true, true, false, true, 'standard', 'plain'),
('fees_ledger', 'amount_due', 'Amount Billed', 'amount_due', 'money', '{"eq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'currency_kes'),
('fees_ledger', 'amount_paid', 'Amount Paid', 'amount_paid', 'money', '{"eq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'currency_kes'),
('fees_ledger', 'balance', 'Outstanding Balance', 'balance', 'money', '{"eq", "gt", "gte", "lt", "lte", "between"}', true, true, false, true, true, 'standard', 'currency_kes'),
('fees_ledger', 'term', 'Term', 'term', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain'),
('fees_ledger', 'year', 'Year', 'year', 'text', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'plain')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Fields: Attendance
INSERT INTO report_fields (dataset_code, field_name, label, column_name, data_type, allowed_operators, is_filterable, is_sortable, is_groupable, is_aggregatable, is_selectable, sensitivity_level, display_format)
VALUES
('attendance', 'status', 'Attendance Status', 'status', 'enum', '{"eq", "neq", "in"}', true, true, true, false, true, 'standard', 'badge'),
('attendance', 'date', 'Attendance Date', 'date', 'date', '{"eq", "gt", "lt", "between"}', true, true, true, false, true, 'standard', 'date_short'),
('attendance', 'remarks', 'Remarks / Note', 'remarks', 'text', '{"contains"}', true, false, false, false, true, 'standard', 'plain')
ON CONFLICT (dataset_code, field_name) DO UPDATE SET label = EXCLUDED.label;

-- Relations
INSERT INTO report_relations (source_dataset, target_dataset, join_type, join_condition, cardinality, fan_out_risk)
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
INSERT INTO report_contexts (context_name, section_key, allowed_datasets, allowed_cross_sections)
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
INSERT INTO report_presets (code, title, description, context_section, query_spec)
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
INSERT INTO retention_policies (institution_id, data_class, retention_years, action_on_expiry, legal_basis)
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
