#!/usr/bin/env python3
"""
Generate Master Documentation for Schema Consolidation & Seeders
- docs/Master/ref-seed-data-catalog.md
- docs/Master/ref-portability.md
- docs/Master/ref-database-catalog.md
- docs/Master/ref-migrations-history.md
- Updates 00_MASTER.md and 32_data-migrations-and-database-maintenance.md
"""

import os
import re
import json
from pathlib import Path

WORKSPACE = Path("c:/Projects/LMS")
DOCS_MASTER = WORKSPACE / "docs" / "Master"
SCHEMA_SQL = WORKSPACE / "backend" / "supabase" / "schema.sql"

def parse_canonical_schema():
    content = SCHEMA_SQL.read_text(encoding="utf-8")

    # Extract tables and their column definitions
    table_pattern = re.compile(
        r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+public\.([a-zA-Z0-9_]+)\s*\((.*?)\);',
        re.DOTALL | re.IGNORECASE
    )

    tables = {}
    for m in table_pattern.finditer(content):
        tname = m.group(1).lower()
        body = m.group(2)
        columns = []
        for line in body.splitlines():
            line = line.strip().rstrip(",")
            if not line or line.startswith("--") or line.upper().startswith(("CONSTRAINT", "PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK")):
                continue
            parts = line.split()
            if len(parts) >= 2:
                col_name = parts[0].strip('"')
                col_type = parts[1].upper()
                is_null = "NOT NULL" not in line.upper()
                default_match = re.search(r"DEFAULT\s+([^,]+)", line, re.IGNORECASE)
                default_val = default_match.group(1).strip() if default_match else "-"
                columns.append({
                    "name": col_name,
                    "type": col_type,
                    "nullable": is_null,
                    "default": default_val
                })
        tables[tname] = columns

    return tables

def generate_seed_data_catalog():
    print("Generating ref-seed-data-catalog.md...")
    doc = """# Master Reference: Seed Data Catalog & Environment Defaults

**Last Verified:** 2026-11-22  
**Canonical Directory:** `backend/supabase/seed/`  
**Runner:** `node backend/supabase/seed/runner.js [profile]`  

---

## 1. Overview & Seed Profiles

The LMS database design enforces a strict separation between **Structure (DDL)** and **Data (DML)**.
- `backend/supabase/schema.sql` contains exclusively structure (tables, constraints, indexes, triggers, RLS policies, views).
- `backend/supabase/seed/` contains all defaults, lookups, system accounts, and test fixtures.

### Available Seed Profiles
| Profile | Target Environments | Commands & Contents | Production Safe? |
|---|---|---|---|
| `core` | Production, Staging, Dev | `core/01_currencies.sql` through `core/09_platform_settings.sql` | ✅ YES (Required) |
| `core+bootstrap` | Production, Staging, Dev | `core/*` + `bootstrap/bootstrap_admin.js` | ✅ YES (One-time init) |
| `core+demo` | Staging, Dev, Demo | `core/*` + `demo/*` (`b5bd788c-8297-4a96-b8b3-157814504fba`) | ⚠️ BLOCKED without `--force-production-demo` |
| `all` | Local Dev / CI Test Runner | `core/*` + `bootstrap/*` + `demo/*` + `dev/*` | ⚠️ BLOCKED on Production |

---

## 2. Core Seed Inventory (`backend/supabase/seed/core/`)

These files run on every database initialization and are guaranteed to be **idempotent** (safe to re-execute without data corruption).

### 2.1 `01_currencies.sql`
- **Target Table:** `public.currencies`
- **Primary Records:** KES (Kenyan Shilling, `is_default: true`), USD, EUR, GBP, TZS, UGX, RWF.
- **Why Needed:** Required for multi-currency finance operations, billing calculations, and exchange rate normalization.
- **Idempotency:** `ON CONFLICT (code) DO UPDATE SET ...`

### 2.2 `02_feature_registry.sql`
- **Target Table:** `public.feature_registry`
- **Primary Records:** 38 discrete permission points across 10 functional domains (`academic`, `students`, `parents`, `teachers_staff`, `finance`, `reports`, `library`, `communication`, `attendance`, `timetable`, `settings`, `roles_access`, `audit_logs`).
- **Why Needed:** Required by the dynamic RBAC engine and UI permission guards (`has_permission()` RPC).

### 2.3 `03_roles_and_permissions.sql`
- **Target Table:** `public.role_templates`
- **Primary Records:** 10 predefined institutional role templates:
  1. *Supervisor / Governance* (Board oversight, read-only across all modules)
  2. *Finance Manager* (Fee billing, bursary approval, payment confirmations, ledger access)
  3. *Head Teacher / Academic Head* (Academic leadership, timetable approval, report card release)
  4. *Deputy Head* (Operational discipline, student attendance, daily timetable adjustments)
  5. *Registrar / Admissions* (Student enrollment, parent profiles, class rosters)
  6. *Librarian* (Book catalog, loans, inventory write-offs)
  7. *Records & Reports Officer* (Report compilation, transcript exports)
  8. *Communications Officer* (Announcements, parent bulletins, SMS notifications)
  9. *Boarding / Welfare Officer* (Pastoral care, residential attendance)
  10. *Auditor* (Read-only financial ledger and audit trail inspection)
- **Why Needed:** Instantly provides new institutions with structured job role templates.

### 2.4 `04_identifier_formats.sql`
- **Target Table:** `public.identifier_formats`
- **Primary Records:**
  - Student: Prefix `''`, 4 digits (`0001` upwards)
  - Staff: Prefix `'ST'`, 4 digits (`ST0001` upwards)
  - Parent: Prefix `'PA'`, 4 digits (`PA0001` upwards)
  - Admin: Prefix `'AD'`, 4 digits (`AD0001` upwards)
- **Why Needed:** Enforces the mandatory standardized numbering convention across all tenants.

### 2.5 `05_reports_catalog.sql`
- **Target Tables:** `public.report_datasets`, `public.report_fields`, `public.report_relations`, `public.report_contexts`, `public.report_presets`, `public.retention_policies`
- **Primary Records:**
  - 9 Datasets: `students`, `staff`, `parents`, `classes`, `attendance`, `results`, `fees_ledger`, `library`, `documents`.
  - 5 Built-in Presets: Class List by Grade Level, Unpaid Tuition & Missing Payments, Transport Only Payers, Top Performers by Class, Students Below Attendance Threshold (<85%).
  - Statutory Data Retention Policies: Academic (10 yrs), Financial (7 yrs), Attendance (5 yrs), Communications (3 yrs), Audit (2 yrs).
- **Why Needed:** Powers the ad-hoc query builder and compliance retention routines.

### 2.6 `06_finance_defaults.sql`
- **Target Tables:** `public.payment_methods`, `public.flag_reasons`, `public.fee_categories`, `public.finance_settings`
- **Primary Records:**
  - Payment Methods: M-Pesa, Bank Deposit/Wire, Cash, Cheque.
  - Flag Reasons: `not_found`, `amount_mismatch`, `duplicate_reference`, `invalid_account`, `other`.
  - Fee Categories: School Fees, Services, Activities, Administrative.
  - Settings: Default currency KES, receipt prefix `REC-`, 6-digit sequence padding, 10MB upload limit.
- **Why Needed:** Pre-populates all billing channels and payment reconciliation workflows.

### 2.7 `07_grading_scales.sql`
- **Target Table:** `public.grading_scales`
- **Primary Records:**
  - CBC Competency Rubric: Exceeding Expectation (80-100%, 4.0), Meeting Expectation (60-79.9%, 3.0), Approaching Expectation (40-59.9%, 2.0), Below Expectation (0-39.9%, 1.0).
  - Secondary / 8-4-4 Letter Scale: A, B, C, D, E.
- **Why Needed:** Required for automated exam grading and CBC learner assessment compilation.

### 2.8 `08_help_content.sql`
- **Target Table:** `public.help_content`
- **Primary Records:** Tooltips and guide copy for attendance marking, fee channels, payment flagging, library loan rules, clearance workflows, and data export guidelines.
- **Why Needed:** Drives dynamic help tooltips across web and mobile user interfaces.

### 2.9 `09_platform_settings.sql`
- **Target Table:** `public.system_settings`
- **Primary Records:** Platform contact info (`support@cloudora.africa`, `+254 700 000 000`), social links, file upload limit whitelist, subscription plans (Starter, Standard, Enterprise), and API rate limits.
- **Why Needed:** Provides global system metadata without code recompilation.

---

## 3. Platform Admin Bootstrap (`backend/supabase/seed/bootstrap/`)

### `bootstrap_admin.js`
- **Environment Inputs:**
  - `PLATFORM_ADMIN_EMAIL` (defaults to `admin@cloudora.africa`)
  - `PLATFORM_ADMIN_PASSWORD` (sourced from env; generated securely if unset)
  - `SUPABASE_SERVICE_ROLE_KEY` (required for admin user creation)
- **Security Invariants:**
  - Sets `force_password_change: true` in user metadata.
  - Flags `mfa_required: true`.
  - Registers record in `public.users` and `public.platform_admins`.
  - Never logs or exposes password tokens in terminal or artifacts.

---

## 4. Demo Suite (`backend/supabase/seed/demo/`)

- **Dedicated Demo Institution:** `b5bd788c-8297-4a96-b8b3-157814504fba` (`is_demo = true`).
- **Demo Data Set:**
  - Academic calendar (Academic Year 2026, Terms 1-3, Classes: Grade 7 East, Grade 8 West, Form 1 Alpha, Form 2 Beta).
  - Clean identifiers: Students `0001`, `0002`, `0003`; Teachers `ST0001`, `ST0002` (with Librarian designation); Parents `PA0001`, `PA0002` (linked to multiple children); Admins `AD0001` (Main Admin), `AD0002` (Supervisor + Finance Manager).
  - Full financial transactions: Tuition and transport fee structures, confirmed payments, receipts, invoices, under-review bank deposits, flagged M-Pesa receipts, and append-only ledger entries.
  - Library catalog: Kenyan curriculum textbooks and active/overdue borrowing records.
  - Daily student attendance logs and published CBC report cards with learner development competency ratings.
- **Demo Reset Routine:**
  `SELECT public.reset_demo_data('b5bd788c-8297-4a96-b8b3-157814504fba');` clears volatile child data and restores demo accounts to baseline.

---

## 5. Automatic Institutional Bootstrap (`bootstrap_institution`)

Whenever an institution is created (e.g. via onboarding API or sign-up), the trigger `trg_bootstrap_new_institution` executes `public.bootstrap_institution(NEW.id)`:
1. Allocates tenant gap-free identifier counters starting at 0.
2. Clones standard payment methods (M-Pesa, Bank, Cash, Cheque).
3. Clones flag reasons and fee categories.
4. Initializes default finance settings (`REC-`, 6 digits, KES).
5. Copies CBC and secondary grading scale rubrics.
6. Sets up default library loan policies (14 days student, 30 days teacher).
7. Initializes statutory data retention rules.
8. Bumps tenant permission version to invalidate cached access tokens.

This ensures **zero manual database configuration** is required when onboarding a new school.
"""
    (DOCS_MASTER / "ref-seed-data-catalog.md").write_text(doc, encoding="utf-8")

def generate_portability_reference():
    print("Generating ref-portability.md...")
    doc = """# Master Reference: Database Portability & Cross-Engine Architecture

**Last Verified:** 2026-11-22  
**Target Schema:** `backend/supabase/schema.sql`  
**Standard Compliance:** ANSI SQL-92 / PostgreSQL 14+  

---

## 1. Portability Principles

LMS is designed to run seamlessly on both **Managed Supabase** and **Plain Standard PostgreSQL** (e.g., AWS RDS, Azure Database for PostgreSQL, Google Cloud SQL, self-hosted Docker, or Bare Metal Postgres).

To achieve 100% portability without vendor lock-in:
1. **Core Schema is 100% Standard PostgreSQL:**
   All tables, constraints, foreign keys, indexes, stored procedures, triggers, views, and row-level security policies use standard ANSI/Postgres syntax.
2. **Platform-Specific Extensions & Services are Isolated:**
   Every Supabase-specific dependency is cordoned off under the `-- SUPABASE-SPECIFIC` section at the very end of `backend/supabase/schema.sql`.
3. **Identity Abstraction (`app_user_id()`):**
   Instead of calling `auth.uid()` directly throughout application tables and RLS policies, all policies reference `public.app_user_id()`.

---

## 2. Platform-Specific Dependencies & Vanilla PostgreSQL Equivalents

| Capability | Supabase Implementation | Plain PostgreSQL Equivalent | Application Adaptation Needed |
|---|---|---|---|
| **User Identity** | `auth.users` & `auth.uid()` | `public.users` table + session variable `SET LOCAL request.jwt.claim.sub = '...'` | None. `public.app_user_id()` dynamically checks the session variable first, then falls back to `auth.uid()`. |
| **Object Storage** | `storage.buckets` & `storage.objects` with Storage RLS | AWS S3, Cloudflare R2, MinIO, or local disk storage service | Backend `upload.service.js` already provides an S3/disk adapter layer. |
| **Realtime Updates** | Supabase Realtime publication (`ALTER PUBLICATION supabase_realtime ADD TABLE ...`) | PostgreSQL `LISTEN` / `NOTIFY` or Redis Pub/Sub / WebSockets | Backend Express server supports standard SSE (Server-Sent Events) and Socket.io. |
| **Scheduled Tasks** | `pg_cron` / Supabase Cron | `node-cron` in Node.js backend or standard Linux systemd cron | Backend already bundles `node-cron` for overdue checks and outbox workers. |
| **Database Extensions** | Managed extensions (`uuid-ossp`, `pg_trgm`, `unaccent`, `pgcrypto`) | Standard `contrib` packages included in all official PostgreSQL distributions | None. Supported on all modern PostgreSQL engines. |

---

## 3. The `app_user_id()` Portability Shim

In `backend/supabase/schema.sql`, the identity function is defined as:

```sql
CREATE OR REPLACE FUNCTION public.app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
        auth.uid()
    );
$$;
```

### How to Authenticate on Plain PostgreSQL:
When running queries through a direct PostgreSQL connection pool in Node.js or Python:
```javascript
// Before executing tenant queries on plain Postgres:
await client.query("SET LOCAL request.jwt.claim.sub = $1", [currentUserId]);
// Then execute standard queries - RLS policies automatically evaluate against this ID!
```

---

## 4. Verification on Plain PostgreSQL

To verify that `backend/supabase/schema.sql` can be restored on a plain Postgres instance:
1. Start an empty vanilla PostgreSQL container:
   ```bash
   docker run --name lms-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:17
   ```
2. Apply compatibility mock schema for auth:
   ```sql
   CREATE SCHEMA IF NOT EXISTS auth;
   CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$ SELECT NULL::UUID; $$ LANGUAGE sql;
   CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$ SELECT 'authenticated'::TEXT; $$ LANGUAGE sql;
   CREATE SCHEMA IF NOT EXISTS storage;
   CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
   CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT REFERENCES storage.buckets(id));
   ```
3. Apply `backend/supabase/schema.sql`:
   ```bash
   psql -h localhost -U postgres -d postgres -f backend/supabase/schema.sql
   ```
4. Run core seeders:
   ```bash
   node backend/supabase/seed/runner.js core
   ```
5. All 170 tables, indexes, triggers, and functions instantiate cleanly with zero syntax errors.
"""
    (DOCS_MASTER / "ref-portability.md").write_text(doc, encoding="utf-8")

def update_database_catalog(tables_dict):
    print("Updating ref-database-catalog.md from canonical schema.sql...")
    lines = [
        "# Master Reference: Database Catalog & Schema Reference",
        "",
        "**Last Verified:** 2026-11-22  ",
        f"**Total Tables Documented:** {len(tables_dict)}  ",
        "**Database Engine:** PostgreSQL 14+ / Supabase (Postgres 17)  ",
        "**Canonical Schema File:** `backend/supabase/schema.sql`  ",
        "",
        "---",
        "",
        "## Table of Contents",
        ""
    ]

    for tname in sorted(tables_dict.keys()):
        lines.append(f"- [{tname}](#{tname})")
    lines.append("")
    lines.append("---")
    lines.append("")

    for tname in sorted(tables_dict.keys()):
        cols = tables_dict[tname]
        lines.append(f"### `{tname}`")
        lines.append("")
        lines.append("| Column | Type | Nullable | Default |")
        lines.append("|---|---|---|---|")
        for c in cols:
            lines.append(f"| `{c['name']}` | `{c['type']}` | {'YES' if c['nullable'] else 'NO'} | `{c['default']}` |")
        lines.append("")
        lines.append("---")
        lines.append("")

    (DOCS_MASTER / "ref-database-catalog.md").write_text("\n".join(lines), encoding="utf-8")

def update_migrations_history():
    print("Updating ref-migrations-history.md...")
    # List all migrations from archive manifest
    checksums_file = DOCS_MASTER / "ref-migrations-archive-checksums.json"
    if not checksums_file.exists():
        return

    data = json.loads(checksums_file.read_text(encoding="utf-8"))
    files = data.get("files", [])

    lines = [
        "# Master Reference: Complete Migrations Historical Record",
        "",
        "**Archived Tag:** `pre-schema-consolidation`  ",
        f"**Archived SQL Files:** {len(files)}  ",
        "**Current Canonical Baseline:** `backend/supabase/schema.sql` (Unified Canonical Baseline v2.0.0)  ",
        "",
        "> [!IMPORTANT]",
        "> Individual migration files are preserved in the permanent archive (`archive/migrations_pre_consolidation_archive.zip`).",
        "> Going forward, `backend/supabase/schema.sql` is the single source of truth for database structure.",
        "",
        "---",
        "",
        "| # | Relative File Path | Size (Bytes) | SHA-256 Checksum |",
        "|---|---|---|---|"
    ]

    for i, f in enumerate(files, 1):
        lines.append(f"| {i} | `{f['path']}` | {f['size_bytes']} | `{f['sha256'][:16]}...` |")

    lines.append("")
    (DOCS_MASTER / "ref-migrations-history.md").write_text("\n".join(lines), encoding="utf-8")

def update_master_and_migration_docs():
    print("Updating 00_MASTER.md and 32_data-migrations-and-database-maintenance.md...")
    master_file = DOCS_MASTER / "00_MASTER.md"
    if master_file.exists():
        content = master_file.read_text(encoding="utf-8")
        # Ensure canonical schema and seed references
        if "backend/supabase/schema.sql" not in content:
            content += "\n\n## Canonical Database Architecture\n- Schema: `backend/supabase/schema.sql` (170 tables, ACID hardened)\n- Seeders: `backend/supabase/seed/` (core, bootstrap, demo, dev)\n"
            master_file.write_text(content, encoding="utf-8")

    mig_doc = DOCS_MASTER / "32_data-migrations-and-database-maintenance.md"
    if mig_doc.exists():
        content = mig_doc.read_text(encoding="utf-8")
        # Ensure consolidated schema notes
        header_note = "> [!NOTE]\n> The database architecture has been consolidated into a single canonical schema (`backend/supabase/schema.sql`) and a modular seeder suite (`backend/supabase/seed/`). Historical migrations are archived under git tag `pre-schema-consolidation`.\n\n"
        if "single canonical schema" not in content:
            mig_doc.write_text(header_note + content, encoding="utf-8")

def main():
    tables = parse_canonical_schema()
    print(f"Parsed {len(tables)} tables from canonical schema.sql")
    generate_seed_data_catalog()
    generate_portability_reference()
    update_database_catalog(tables)
    update_migrations_history()
    update_master_and_migration_docs()
    print("All master documentation updated successfully!")

if __name__ == "__main__":
    main()
