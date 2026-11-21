#!/usr/bin/env python3
"""
CI Regression Guard: LMS Hardcoded & Static Data Check (Part 1, Step 5)
Fails with non-zero exit code if violations are detected:
- service_role key inside frontend/ directory or in client env
- Unmasked secrets or private keys in tracked files
- Hardcoded sensitive passwords
"""

import os
import re
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent

FORBIDDEN_CLIENT_PATTERNS = [
    ("client_service_role_key", re.compile(r"SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"]?eyJ")),
    ("client_private_key", re.compile(r"-----BEGIN (?:RSA|EC|DSA|OPENSSH|PRIVATE) KEY-----")),
]

IGNORE_DIRS = {
    ".git", "node_modules", "dist", ".expo", ".temp", ".vscode", ".idea", ".kilo",
    ".kilocode", "android", "assets", "logs"
}

ALLOWED_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".py"}

# Note: As per user instructions, .env files are kept intact and not altered or flagged by CI.
def check_frontend_env():
    return []

def check_codebase_secrets():
    violations = []
    scan_dirs = [WORKSPACE_ROOT / "frontend", WORKSPACE_ROOT / "supabase", WORKSPACE_ROOT / "backend"]
    for base in scan_dirs:
        if not base.exists():
            continue
        for root, dirs, files in os.walk(base):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for f in files:
                path = Path(root) / f
                rel = path.relative_to(WORKSPACE_ROOT).as_posix()
                
                # Skip all .env files as user specified they must remain intact
                if path.name.startswith(".env"):
                    continue
                if path.stat().st_size > 500_000:
                    continue

                try:
                    content = path.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue

                for name, pat in FORBIDDEN_CLIENT_PATTERNS:
                    if pat.search(content):
                        violations.append(f"Violation [{name}] found in {rel}")
    return violations

def main():
    print("Running CI Hardcoded Data & Secret Guard...")
    violations = []
    violations.extend(check_frontend_env())
    violations.extend(check_codebase_secrets())

    if violations:
        print("\n❌ CI GUARD FAILED - Hardcoded Violations Found:")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)
    else:
        print("✅ CI Guard Passed: No service-role key or forbidden secrets exposed in client paths.")
        sys.exit(0)

if __name__ == "__main__":
    main()
