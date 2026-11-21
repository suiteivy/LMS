#!/usr/bin/env python3
"""
Archive all migration and SQL files prior to consolidation (Safety Step 1.1)
- Finds all .sql files in supabase/migrations, backend/supabase/migrations, backend/supabase/seeds
- Calculates SHA256 checksums
- Creates archive zip and writes master/ref-migrations-archive-checksums.json
"""

import os
import hashlib
import zipfile
import json
from pathlib import Path

WORKSPACE_ROOT = Path("c:/Projects/LMS")
MASTER_DIR = WORKSPACE_ROOT / "docs" / "Master"
ARCHIVE_DIR = WORKSPACE_ROOT / "archive"
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
ZIP_PATH = ARCHIVE_DIR / "migrations_pre_consolidation_archive.zip"

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("Collecting migration and SQL script files...")
    search_dirs = [
        WORKSPACE_ROOT / "supabase" / "migrations",
        WORKSPACE_ROOT / "backend" / "supabase" / "migrations",
        WORKSPACE_ROOT / "backend" / "supabase" / "seeds",
        WORKSPACE_ROOT / "backend" / "migrations",
    ]

    files_to_archive = []
    for d in search_dirs:
        if d.exists():
            for f in sorted(d.glob("*.sql")):
                files_to_archive.append(f)

    # Also check schema.sql
    schema_sql = WORKSPACE_ROOT / "backend" / "supabase" / "schema.sql"
    if schema_sql.exists():
        files_to_archive.append(schema_sql)

    records = []
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in files_to_archive:
            rel = f.relative_to(WORKSPACE_ROOT).as_posix()
            ck = sha256_file(f)
            size = f.stat().st_size
            zf.write(f, arcname=rel)
            records.append({
                "path": rel,
                "size_bytes": size,
                "sha256": ck
            })

    manifest = {
        "tag": "pre-schema-consolidation",
        "archive_zip": ZIP_PATH.as_posix(),
        "total_files": len(records),
        "files": records
    }

    manifest_json = MASTER_DIR / "ref-migrations-archive-checksums.json"
    manifest_json.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Generate Markdown summary
    lines = [
        "# Master Reference: Pre-Consolidation Migrations Archive Manifest",
        "",
        "**Git Tag:** `pre-schema-consolidation`  ",
        f"**Archive File:** `{ZIP_PATH.as_posix()}`  ",
        f"**Total Archived Files:** {len(records)}  ",
        "**Date:** 2026-11-21  ",
        "",
        "---",
        "",
        "| # | Relative Path | Size (Bytes) | SHA-256 Checksum |",
        "|---|---|---|---|"
    ]

    for idx, r in enumerate(records, 1):
        lines.append(f"| {idx} | `{r['path']}` | {r['size_bytes']} | `{r['sha256']}` |")

    manifest_md = MASTER_DIR / "ref-migrations-archive-manifest.md"
    manifest_md.write_text("\n".join(lines), encoding="utf-8")

    print(f"Archived {len(records)} SQL files to {ZIP_PATH.as_posix()}")
    print(f"Manifest written to {manifest_md.as_posix()}")

if __name__ == "__main__":
    main()
