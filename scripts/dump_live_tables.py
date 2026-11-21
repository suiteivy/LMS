import json
from pathlib import Path

# The tables returned by information_schema in live database:
live_tables_raw = [
    "academic_report_configurations", "academic_report_downloads", "academic_reports", "academic_years",
    "addon_requests", "admins", "announcements", "assessment_types", "assignments", "attendance",
    "audit_logs", "books", "borrowed_books", "bursaries", "bursars", "bursary_applications",
    "calendar_events", "category_types", "class_categories", "class_enrollments", "class_levels",
    "class_streams", "classes", "clearance_processes", "content_evidence_entries", "conversation_participants",
    "conversations", "credential_change_requests", "credential_delivery_tokens", "credits", "currencies",
    "daily_hours_contributions", "daily_hours_logs", "demo_feature_flags", "demo_feedback", "designations",
    "diary_entries", "document_audiences", "document_deliveries", "documents", "enrollments", "exam_periods",
    "exam_results", "exams", "feature_registry", "fee_categories", "fee_components", "fee_discounts_waivers",
    "fee_item_variants", "fee_option_catalogs", "fee_structures", "fee_type_applicability", "fee_types",
    "finance_admin_audit_logs", "finance_admin_designations", "finance_settings", "financial_transactions",
    "flag_reasons", "fund_allocations", "funds", "grade_audit_log", "grade_entries", "grades",
    "grading_scales", "help_content", "identifier_counters", "identifier_formats", "institution_assessment_weights",
    "institution_categories", "institution_holiday_decisions", "institution_tracks", "institutions",
    "ledger_entries", "legacy_identifiers", "lessons", "librarian_audit_logs", "librarian_designations",
    "library_config", "message_edit_history", "messages", "national_assessment_records", "national_holidays",
    "notification_delivery_attempts", "notifications", "parent_students", "parents", "password_audit_logs",
    "password_reset_requests", "payment_allocations", "payment_flags", "payment_methods", "payment_proofs",
    "payments", "permission_versions", "permissions", "platform_admins", "promotion_cycles", "promotion_decisions",
    "receipt_sequences", "receipts", "record_change_log", "record_of_work", "refunds", "report_card_items",
    "report_cards", "resources", "reversals", "role_change_requests", "role_permissions", "role_scopes",
    "role_templates", "roles", "school_categories", "school_category_types", "student_bill_items",
    "student_bills", "student_class_transfers", "student_fee_invoices", "student_optional_selections",
    "student_track_enrollments", "student_violations", "students", "subject_categories", "subject_classes",
    "subject_coverage_plans", "subject_report_card_assessments", "subject_teachers", "subject_topic_areas",
    "subject_topics", "subject_weights", "subjects", "submissions", "support_tickets", "system_settings",
    "teacher_attendance", "teacher_payouts", "teachers", "terms", "ticket_messages", "timetable_configs",
    "timetables", "track_subjects", "trial_sessions", "user_permission_overrides", "user_preferences",
    "user_roles", "user_security_answers", "user_sessions", "users"
]

print(f"Total live tables: {len(live_tables_raw)}")
Path("scripts/live_tables.json").write_text(json.dumps(live_tables_raw, indent=2), encoding="utf-8")
