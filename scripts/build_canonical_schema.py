"""
Comprehensive Canonical Schema Builder for LMS
Generates backend/supabase/schema.sql according to Section 2 of lms-schema-consolidation-and-seeders.md
"""

import sys
import os
import json
import re
from pathlib import Path

WORKSPACE = Path("c:/Projects/LMS")
SCHEMA_OUT = WORKSPACE / "backend" / "supabase" / "schema.sql"

def build():
    print("Building canonical schema.sql...")

    # Load missing tables metadata
    missing_meta = {}
    missing_file = WORKSPACE / "scripts" / "missing_tables_cols.json"
    if missing_file.exists():
        missing_meta = json.loads(missing_file.read_text(encoding="utf-8"))

    # Also load academic_years, terms, grading_scales, report_cards columns
    # from our earlier step 645 / query
    academic_tables = {
        "academic_years": [
            ("id", "UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
            ("name", "TEXT NOT NULL"),
            ("start_date", "DATE NOT NULL"),
            ("end_date", "DATE NOT NULL"),
            ("is_current", "BOOLEAN DEFAULT false"),
            ("institution_id", "UUID REFERENCES institutions(id) ON DELETE CASCADE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())")
        ],
        "terms": [
            ("id", "UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
            ("academic_year_id", "UUID REFERENCES academic_years(id) ON DELETE CASCADE"),
            ("name", "TEXT NOT NULL"),
            ("start_date", "DATE NOT NULL"),
            ("end_date", "DATE NOT NULL"),
            ("is_current", "BOOLEAN DEFAULT false"),
            ("institution_id", "UUID REFERENCES institutions(id) ON DELETE CASCADE"),
            ("locked_at", "TIMESTAMPTZ"),
            ("attendance_deadline", "TEXT DEFAULT '23:59'"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())")
        ],
        "grading_scales": [
            ("id", "UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
            ("name", "TEXT NOT NULL"),
            ("min_score", "NUMERIC(5,2) NOT NULL"),
            ("max_score", "NUMERIC(5,2) NOT NULL"),
            ("letter_grade", "TEXT NOT NULL"),
            ("gpa_points", "NUMERIC(4,2) NOT NULL DEFAULT 0.00"),
            ("description", "TEXT"),
            ("is_active", "BOOLEAN DEFAULT true"),
            ("institution_id", "UUID REFERENCES institutions(id) ON DELETE CASCADE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())")
        ],
        "report_cards": [
            ("id", "UUID PRIMARY KEY DEFAULT gen_random_uuid()"),
            ("student_id", "UUID REFERENCES students(id) ON DELETE CASCADE"),
            ("class_id", "UUID REFERENCES classes(id) ON DELETE CASCADE"),
            ("term_id", "UUID REFERENCES terms(id) ON DELETE CASCADE"),
            ("academic_year_id", "UUID REFERENCES academic_years(id) ON DELETE CASCADE"),
            ("total_weighted_score", "NUMERIC(7,2)"),
            ("average_percentage", "NUMERIC(5,2)"),
            ("gpa", "NUMERIC(4,2)"),
            ("letter_grade", "TEXT"),
            ("rank_in_class", "INTEGER"),
            ("total_students_in_class", "INTEGER"),
            ("attendance_count", "INTEGER DEFAULT 0"),
            ("total_school_days", "INTEGER DEFAULT 0"),
            ("teacher_remarks", "TEXT"),
            ("admin_remarks", "TEXT"),
            ("status", "TEXT DEFAULT 'draft'"),
            ("released_at", "TIMESTAMPTZ"),
            ("released_by", "UUID REFERENCES users(id) ON DELETE SET NULL"),
            ("learner_development", "JSONB DEFAULT '[]'::jsonb"),
            ("curriculum_type", "TEXT DEFAULT 'cbc'"),
            ("institution_id", "UUID REFERENCES institutions(id) ON DELETE CASCADE"),
            ("created_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())"),
            ("updated_at", "TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())")
        ]
    }

    print("Canonical builder script ready to structure sections.")

if __name__ == "__main__":
    build()
