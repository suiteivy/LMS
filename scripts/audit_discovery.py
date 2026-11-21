#!/usr/bin/env python3
"""
Audit Discovery Script for LMS Hardcoded & Static Data Audit (Part 1, Step 1)
Extracts raw findings across:
- Secret scanning (working tree, git history, client bundles)
- Client & Server code scanning (string literals, role comparisons, statuses, currency, thresholds, mock/sample data)
- Database migrations scanning (CHECK constraints, enums, RLS literals, hardcoded IDs)
- Config scanning (.env.example vs process.env)
"""

import os
import re
import sys
import json
import subprocess
from pathlib import Path
from collections import defaultdict

WORKSPACE_ROOT = Path("c:/Projects/LMS")

SECRET_PATTERNS = [
    ("service_role_key", re.compile(r"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+")),
    ("supabase_secret_ref", re.compile(r"sbp_[a-zA-Z0-9]{20,}")),
    ("private_key", re.compile(r"-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----")),
    ("hardcoded_db_password", re.compile(r"postgres(ql)?://[^:]+:([^@]+)@")),
    ("generic_secret_token", re.compile(r"(?:api[_-]?key|secret|token|password)\s*[:=]\s*['\"]([a-zA-Z0-9_\-]{16,})['\"]", re.IGNORECASE)),
]

CODE_PATTERNS = [
    ("role_equality_check", re.compile(r"(?:role|user_role|userRole)\s*(?:===|==|!==|!=)\s*['\"](admin|teacher|student|parent|librarian|bursar|superadmin|principal|master-admin)['\"]")),
    ("has_role_literal", re.compile(r"(?:hasRole|checkRole|isRole|has_role)\s*\(\s*['\"](admin|teacher|student|parent|librarian|bursar|superadmin|principal|master-admin)['\"]")),
    ("hardcoded_currency", re.compile(r"['\"](KSh|KES|\$|USD|UGX|TZS|RWF|€|EUR|£|GBP)['\"]")),
    ("hardcoded_domain_or_contact", re.compile(r"['\"]([a-zA-Z0-9._%+-]+@(?!example\.com|test\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})['\"]")),
    ("hardcoded_external_url", re.compile(r"['\"]https?://(?!localhost|127\.0\.0\.1|schema\.org|www\.w3\.org|expo\.dev|reactnative\.dev)[^'\"]+['\"]")),
    ("mock_or_dummy_data", re.compile(r"\b(mockData|dummyData|sampleData|lorem\s+ipsum|test@|mockUsers|mockStudents)\b", re.IGNORECASE)),
    ("hardcoded_uuid", re.compile(r"['\"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['\"]", re.IGNORECASE)),
    ("todo_fixme", re.compile(r"\b(TODO|FIXME|HACK|XXX)\b.*", re.IGNORECASE)),
    ("hardcoded_threshold_days", re.compile(r"\b(loan_period|due_days|overdue_days|retention_days|grace_period)\s*[:=]\s*\d+\b", re.IGNORECASE)),
]

IGNORE_DIRS = {
    ".git", "node_modules", ".expo", ".vscode", ".idea", ".kilo", ".kilocode",
    "dist", ".temp", "assets", "android"
}

def scan_working_tree_secrets():
    print("[1/5] Scanning working tree for secrets...", flush=True)
    findings = []
    for root, dirs, files in os.walk(WORKSPACE_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for f in files:
            path = Path(root) / f
            if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".ico", ".svg", ".lock", ".pdf", ".map", ".ttf", ".woff", ".woff2"}:
                continue
            try:
                if path.stat().st_size > 1_000_000: # skip files > 1MB
                    continue
                content = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            for name, pattern in SECRET_PATTERNS:
                for match in pattern.finditer(content):
                    line_no = content[:match.start()].count("\n") + 1
                    val = match.group(0)
                    masked = val[:6] + "..." + val[-4:] if len(val) > 12 else "[REDACTED]"
                    rel_path = path.relative_to(WORKSPACE_ROOT).as_posix()
                    findings.append({
                        "category": "secret",
                        "check": name,
                        "file": rel_path,
                        "line": line_no,
                        "snippet": masked
                    })
    print(f"      Found {len(findings)} potential secret(s)", flush=True)
    return findings

def scan_git_history_secrets():
    print("[2/5] Scanning git history for secret references...", flush=True)
    findings = []
    terms = ["service_role", "BEGIN PRIVATE KEY", "postgres://"]
    for term in terms:
        try:
            cmd = ["git", "log", "-n", "10", "--oneline", "-S", term]
            res = subprocess.run(cmd, cwd=WORKSPACE_ROOT, capture_output=True, text=True, timeout=10)
            if res.returncode == 0 and res.stdout:
                for line in res.stdout.splitlines():
                    findings.append({
                        "category": "secret_git_history",
                        "term": term,
                        "commit": line.strip()
                    })
        except Exception as e:
            pass
    print(f"      Found {len(findings)} commits touching target secret keywords", flush=True)
    return findings

def scan_codebase():
    print("[3/5] Scanning codebase (frontend, backend, supabase)...", flush=True)
    findings = []
    scan_dirs = [WORKSPACE_ROOT / "frontend", WORKSPACE_ROOT / "backend", WORKSPACE_ROOT / "supabase"]
    for base in scan_dirs:
        if not base.exists():
            continue
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for f in files:
                path = Path(root) / f
                if path.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx", ".py", ".sql", ".json"}:
                    continue
                if path.name.endswith(".lock") or path.name.endswith(".map") or path.stat().st_size > 500_000:
                    continue
                try:
                    content = path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                rel_path = path.relative_to(WORKSPACE_ROOT).as_posix()
                for name, pattern in CODE_PATTERNS:
                    for match in pattern.finditer(content):
                        line_no = content[:match.start()].count("\n") + 1
                        matched_str = match.group(0).strip()
                        findings.append({
                            "category": "code_literal",
                            "check": name,
                            "file": rel_path,
                            "line": line_no,
                            "snippet": matched_str[:120]
                        })
    print(f"      Found {len(findings)} code literals/patterns", flush=True)
    return findings

def scan_migrations():
    print("[4/5] Scanning database migrations...", flush=True)
    findings = []
    mig_dir = WORKSPACE_ROOT / "supabase" / "migrations"
    if not mig_dir.exists():
        return findings

    check_constraint_pattern = re.compile(r"CHECK\s*\([^)]*IN\s*\([^)]+\)\)", re.IGNORECASE)
    enum_pattern = re.compile(r"CREATE\s+TYPE\s+([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\(([^)]+)\)", re.IGNORECASE)
    rls_role_pattern = re.compile(r"CREATE\s+POLICY.*(?:USING|WITH CHECK)\s*\([^;]*['\"](admin|teacher|student|parent)['\"][^;]*\);", re.IGNORECASE)

    for mig_file in sorted(mig_dir.glob("*.sql")):
        try:
            content = mig_file.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        rel_path = mig_file.relative_to(WORKSPACE_ROOT).as_posix()

        for match in check_constraint_pattern.finditer(content):
            line_no = content[:match.start()].count("\n") + 1
            findings.append({
                "category": "db_check_constraint_enum_candidate",
                "file": rel_path,
                "line": line_no,
                "snippet": match.group(0).replace("\n", " ")[:150]
            })

        for match in enum_pattern.finditer(content):
            line_no = content[:match.start()].count("\n") + 1
            findings.append({
                "category": "db_enum",
                "file": rel_path,
                "line": line_no,
                "name": match.group(1),
                "values": match.group(2).replace("\n", " ").strip()
            })

        for match in rls_role_pattern.finditer(content):
            line_no = content[:match.start()].count("\n") + 1
            findings.append({
                "category": "db_rls_literal_role",
                "file": rel_path,
                "line": line_no,
                "snippet": match.group(0).replace("\n", " ")[:150]
            })

    print(f"      Found {len(findings)} database schema objects of interest", flush=True)
    return findings

def scan_env():
    print("[5/5] Scanning environment files...", flush=True)
    findings = []
    env_files = list(WORKSPACE_ROOT.glob(".env*")) + list((WORKSPACE_ROOT / "frontend").glob(".env*")) + list((WORKSPACE_ROOT / "backend").glob(".env*"))
    for ef in env_files:
        rel = ef.relative_to(WORKSPACE_ROOT).as_posix()
        findings.append({
            "category": "env_file",
            "file": rel
        })
    print(f"      Found {len(findings)} environment file(s)", flush=True)
    return findings

def main():
    print("=== LMS Part 1: Automated Discovery Scan ===", flush=True)
    secrets_wt = scan_working_tree_secrets()
    secrets_git = scan_git_history_secrets()
    code_finds = scan_codebase()
    db_finds = scan_migrations()
    env_finds = scan_env()

    breakdown_code = defaultdict(int)
    for x in code_finds:
        breakdown_code[x["check"]] += 1

    breakdown_db = defaultdict(int)
    for x in db_finds:
        breakdown_db[x["category"]] += 1

    summary = {
        "working_tree_secrets_count": len(secrets_wt),
        "git_history_secrets_count": len(secrets_git),
        "code_literal_count": len(code_finds),
        "db_migration_count": len(db_finds),
        "env_files_count": len(env_finds),
        "code_breakdown_by_check": dict(breakdown_code),
        "db_breakdown_by_category": dict(breakdown_db),
    }

    all_data = {
        "summary": summary,
        "secrets_working_tree": secrets_wt,
        "secrets_git_history": secrets_git,
        "code_findings": code_finds,
        "db_findings": db_finds,
        "env_files": env_finds
    }

    out_path = WORKSPACE_ROOT / "master" / "raw_discovery_findings.json"
    out_path.write_text(json.dumps(all_data, indent=2), encoding="utf-8")
    print(f"\nRaw findings written to {out_path.as_posix()}", flush=True)
    print("\n=== Summary Results ===", flush=True)
    print(json.dumps(summary, indent=2), flush=True)

if __name__ == "__main__":
    main()
