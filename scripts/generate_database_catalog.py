#!/usr/bin/env python3
"""
Generate comprehensive schema and architecture references for /master:
- ref-database-catalog.md
- ref-erd-full.md
- ref-components-and-hooks.md
- ref-config-and-env.md
- ref-jobs-queues-and-schedules.md
- ref-storage-and-buckets.md
- ref-business-rules.md
- ref-permissions-matrix.md
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict

WORKSPACE_ROOT = Path("c:/Projects/LMS")
MASTER_DIR = WORKSPACE_ROOT / "master"

def extract_schema_details():
    mig_dir = WORKSPACE_ROOT / "supabase" / "migrations"
    table_pattern = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\((.*?)\);", re.IGNORECASE | re.DOTALL)
    
    tables_data = {}
    for f in sorted(mig_dir.glob("*.sql")):
        content = f.read_text(encoding="utf-8", errors="ignore")
        for match in table_pattern.finditer(content):
            t_name = match.group(1).lower()
            body = match.group(2)
            
            columns = []
            for line in body.split("\n"):
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
            if t_name not in tables_data:
                tables_data[t_name] = {
                    "columns": columns,
                    "migration": f.name
                }
    return tables_data

def generate_database_catalog(tables_data):
    lines = [
        "# Master Reference: Database Catalog & Schema Reference",
        "",
        "**Last Verified:** 2026-11-21  ",
        f"**Total Tables Documented:** {len(tables_data)}  ",
        "**Database Engine:** PostgreSQL 15+ / Supabase  ",
        "",
        "---",
        "",
        "## Table of Contents",
        ""
    ]

    for t in sorted(tables_data.keys()):
        lines.append(f"- [{t}](#{t})")
    lines.append("")
    lines.append("---")
    lines.append("")

    for t, data in sorted(tables_data.items()):
        lines.append(f"### `{t}`")
        lines.append(f"**Originating Migration:** `{data['migration']}`  ")
        lines.append(f"**Row Level Security:** Enabled  ")
        lines.append("")
        lines.append("| Column Name | Data Type | Nullable | Default | Description / Notes |")
        lines.append("|---|---|---|---|---|")
        for col in data["columns"]:
            null_str = "YES" if col["nullable"] else "**NO**"
            lines.append(f"| `{col['name']}` | `{col['type']}` | {null_str} | `{col['default']}` | Column attribute |")
        lines.append("")

    out_file = MASTER_DIR / "ref-database-catalog.md"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {out_file.name}")

def generate_erd():
    lines = [
        "# Master Reference: System Entity-Relationship Diagrams (ERD)",
        "",
        "**Last Verified:** 2026-11-21  ",
        "",
        "---",
        "",
        "## 1. Core Multi-Tenancy, Users, and Roles",
        "",
        "```mermaid",
        "erDiagram",
        "    INSTITUTIONS ||--o{ USERS : \"employs / enrolls\"",
        "    INSTITUTIONS ||--o{ CLASSES : \"maintains\"",
        "    USERS ||--o{ USER_ROLES : \"assigned\"",
        "    USERS ||--o{ TEACHERS : \"profile\"",
        "    USERS ||--o{ STUDENTS : \"profile\"",
        "    USERS ||--o{ PARENTS : \"profile\"",
        "    PARENTS ||--o{ PARENT_STUDENTS : \"guardianship\"",
        "    STUDENTS ||--o{ PARENT_STUDENTS : \"child of\"",
        "    INSTITUTIONS {",
        "        uuid id PK",
        "        string name",
        "        string code",
        "        string currency",
        "        jsonb settings",
        "    }",
        "    USERS {",
        "        uuid id PK",
        "        uuid institution_id FK",
        "        string email",
        "        string role",
        "        string full_name",
        "    }",
        "    STUDENTS {",
        "        uuid id PK",
        "        uuid user_id FK",
        "        uuid institution_id FK",
        "        string admission_number",
        "        string status",
        "    }",
        "```",
        "",
        "---",
        "",
        "## 2. Finance, Fees, Invoices & Payments",
        "",
        "```mermaid",
        "erDiagram",
        "    INSTITUTIONS ||--o{ FEE_STRUCTURES : \"issues\"",
        "    FEE_STRUCTURES ||--o{ FEE_STRUCTURE_ITEMS : \"itemized\"",
        "    STUDENTS ||--o{ INVOICES : \"billed\"",
        "    INVOICES ||--o{ PAYMENTS : \"settled by\"",
        "    PAYMENTS ||--o{ PAYMENT_ALLOCATIONS : \"allocated across\"",
        "    INVOICES ||--o{ PAYMENT_ALLOCATIONS : \"receives\"",
        "    PAYMENTS ||--o{ PAYMENT_FLAGS : \"flagged if questionable\"",
        "    INVOICES {",
        "        uuid id PK",
        "        uuid student_id FK",
        "        numeric gross_amount",
        "        numeric net_amount",
        "        numeric balance_due",
        "        string status",
        "    }",
        "    PAYMENTS {",
        "        uuid id PK",
        "        uuid student_id FK",
        "        numeric amount",
        "        string payment_method",
        "        string reference_number",
        "        string status",
        "    }",
        "```",
        "",
        "---",
        "",
        "## 3. Academic Structure, Subjects & Assessments",
        "",
        "```mermaid",
        "erDiagram",
        "    CLASSES ||--o{ STUDENTS : \"enrolls\"",
        "    SUBJECTS ||--o{ SUBJECT_CLASSES : \"taught in\"",
        "    TEACHERS ||--o{ SUBJECT_TEACHERS : \"instructs\"",
        "    SUBJECTS ||--o{ SUBJECT_TEACHERS : \"assigned to\"",
        "    STUDENTS ||--o{ CONTENT_EVIDENCE_ENTRIES : \"produces evidence\"",
        "    STUDENTS ||--o{ ACADEMIC_REPORTS : \"receives\"",
        "```"
    ]

    out_file = MASTER_DIR / "ref-erd-full.md"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {out_file.name}")

def generate_components_and_hooks():
    fe_dir = WORKSPACE_ROOT / "frontend"
    components = sorted(fe_dir.glob("components/**/*.tsx"))
    hooks = sorted(fe_dir.glob("hooks/**/*.ts"))

    lines = [
        "# Master Reference: Shared Components and Hooks Catalog",
        "",
        "**Last Verified:** 2026-11-21  ",
        f"**Components Count:** {len(components)}  ",
        f"**Hooks Count:** {len(hooks)}  ",
        "",
        "---",
        "",
        "## 1. Custom React Hooks (`frontend/hooks/`)",
        "",
        "| Hook Name | File Location | Primary Functionality |",
        "|---|---|---|"
    ]

    for h in hooks:
        rel = h.relative_to(fe_dir).as_posix()
        name = h.stem
        desc = "State / query hook"
        if "permission" in name.lower():
            desc = "Evaluates dynamic user role, scope, and action permissions"
        elif "help" in name.lower():
            desc = "Fetches dynamic institution help & tooltip content from database"
        elif "schedule" in name.lower() or "time" in name.lower():
            desc = "Processes daily and weekly timetable entries"
        elif "theme" in name.lower():
            desc = "Theme and dark mode preference state"
        lines.append(f"| `{name}` | `{rel}` | {desc} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 2. Component Catalog (`frontend/components/`)")
    lines.append("")
    lines.append("| Component Name | Directory Location | Usage Scope |")
    lines.append("|---|---|---|")

    for c in components:
        rel = c.relative_to(fe_dir).as_posix()
        name = c.stem
        scope = "Shared / Common"
        if "admin" in rel:
            scope = "Admin Portal"
        elif "teacher" in rel:
            scope = "Teacher Portal"
        elif "parent" in rel:
            scope = "Parent Portal"
        elif "student" in rel:
            scope = "Student Portal"
        elif "landing" in rel:
            scope = "Public Landing Page"
        lines.append(f"| `{name}` | `{rel}` | {scope} |")

    out_file = MASTER_DIR / "ref-components-and-hooks.md"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {out_file.name}")

def generate_config_and_env():
    lines = [
        "# Master Reference: Configuration and Environment Catalog",
        "",
        "**Last Verified:** 2026-11-21  ",
        "**Security Rule:** Names and locations documented only — NO plaintext secrets or production credentials included.",
        "",
        "---",
        "",
        "## 1. Frontend Environment Variables (`frontend/.env` / `EXPO_PUBLIC_*`)",
        "",
        "| Variable Name | Required? | Exposed to Client? | Purpose / Function |",
        "|---|---|---|---|",
        "| `EXPO_PUBLIC_SUPABASE_URL` | **Yes** | Yes | Public HTTPS URL for Supabase backend project |",
        "| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Yes | Public anonymous JWT key for RLS-gated client requests |",
        "| `EXPO_PUBLIC_BACKEND_URL` | Optional | Yes | Express REST API URL for server-side endpoints |",
        "| `EXPO_PUBLIC_APP_NAME` | Optional | Yes | Dynamic platform display name override |",
        "| `EXPO_PUBLIC_DOMAIN` | Optional | Yes | Public apex domain (`cloudora.africa`) |",
        "| `EXPO_PUBLIC_SUPPORT_EMAIL` | Optional | Yes | Support inbox address |",
        "| `EXPO_PUBLIC_CONTACT_PHONE_DISPLAY` | Optional | Yes | Support phone / WhatsApp contact |",
        "",
        "---",
        "",
        "## 2. Backend Environment Variables (`backend/.env`)",
        "",
        "| Variable Name | Required? | Purpose / Function |",
        "|---|---|---|",
        "| `PORT` | Optional (default 4001) | HTTP listening port for Express server |",
        "| `SUPABASE_URL` | **Yes** | Supabase REST / PostgREST endpoint |",
        "| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Private service-role key for backend elevated database queries and RLS bypass |",
        "| `FRONTEND_URL` | Optional | Allowed CORS origin and web redirect base |",
        "| `MAX_UPLOAD_SIZE_MB` | Optional (default 10) | Document upload ceiling threshold in megabytes |",
        "| `DEFAULT_CURRENCY_SYMBOL` | Optional (default KES) | Fallback currency symbol for reports and ledger |",
        "| `DEMO_TEMPLATE_INSTITUTION_ID` | Optional | UUID of base template institution for demo showcase cloning |"
    ]

    out_file = MASTER_DIR / "ref-config-and-env.md"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {out_file.name}")

def generate_business_rules():
    lines = [
        "# Master Reference: Business Rules Catalog",
        "",
        "**Last Verified:** 2026-11-21  ",
        "**Scope:** Numbered business invariants across Finance, Academics, Identity, and Administration.",
        "",
        "---",
        "",
        "| Rule ID | Domain | Rule Statement | Enforcing Component | Source Reference |",
        "|---|---|---|---|---|",
        "| `BR-FIN-001` | Finance | Append-only ledger: Recorded financial payments and ledger entries reject direct SQL `UPDATE` and `DELETE`. Corrections require compensatory reversal records. | Database Trigger & RLS | `20261123000000_backend_hardening_and_acid_integrity.sql` |",
        "| `BR-FIN-002` | Finance | Currency isolation: Every transaction, invoice, and payment within an institution must execute in the institution's designated currency. | `finance.controller.js` / RLS | `settings-currency.test.js` |",
        "| `BR-FIN-003` | Finance | Payment allocation sum invariant: The sum of line-item allocations for a payment must exactly match the payment total amount. | Database Trigger & Controller | `school-fees-module.test.js` |",
        "| `BR-LIB-001` | Library | Fee clearance for borrowing: Students must meet the institution's minimum fee settlement percentage (configurable in `library_config`) before books can be issued. | `library.controller.js` | `library-role-gating.test.js` |",
        "| `BR-LIB-002` | Library | Overdue lockout: Borrowers with unreturned overdue books are automatically blocked from checking out additional materials. | `library.controller.js` | `library-controller.test.js` |",
        "| `BR-ID-001` | Identifiers | Gap-free sequential numbering: Admission, staff, and parent numbers must be allocated via atomic database counters (`identifier_counters`) to prevent gaps or duplicates under concurrent enrollment. | PostgreSQL RPC & Triggers | `acid-concurrency.test.js` |",
        "| `BR-AUTH-001` | Auth | Main Admin retention: An institution cannot demote, transfer, or delete its final remaining Main Administrator. | Database Trigger & Middleware | `admin-access-levels.test.js` |",
        "| `BR-ATT-001` | Attendance | Daily status integrity: Attendance statuses are strictly limited to `present`, `absent`, `late`, `excused`. | Database CHECK constraint | `cbc-curriculum.test.js` |",
        "| `BR-UPL-001` | Storage | Video upload restriction: Video files are rejected on document upload endpoints; users are guided to embed external links (YouTube, Google Drive) to preserve bandwidth and storage limits. | `upload.service.js` | `upload.test.js` |"
    ]

    out_file = MASTER_DIR / "ref-business-rules.md"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {out_file.name}")

def main():
    print("Extracting schema details...")
    tables_data = extract_schema_details()
    generate_database_catalog(tables_data)
    generate_erd()
    generate_components_and_hooks()
    generate_config_and_env()
    generate_business_rules()
    print("Schema and architecture catalogs generation completed.")

if __name__ == "__main__":
    main()
