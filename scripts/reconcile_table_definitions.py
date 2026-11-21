import os
import re
from pathlib import Path
from collections import defaultdict

WORKSPACE_ROOT = Path("c:/Projects/LMS")

def get_all_tables_info():
    # 1. Load live tables list from scripts/live_tables.json
    live_tables = set()
    live_path = WORKSPACE_ROOT / "scripts" / "live_tables.json"
    if live_path.exists():
        import json
        live_tables = set(json.loads(live_path.read_text(encoding="utf-8")))

    # 2. Add tables from all migrations
    mig_dirs = [
        WORKSPACE_ROOT / "backend" / "supabase" / "migrations",
        WORKSPACE_ROOT / "supabase" / "migrations"
    ]

    create_table_regex = re.compile(
        r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\((.*?)\);',
        re.IGNORECASE | re.DOTALL
    )

    alter_table_add_regex = re.compile(
        r'ALTER\s+TABLE(?:\s+ONLY)?\s+(?:public\.)?([a-zA-Z0-9_]+)\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+([^;,\n]+)',
        re.IGNORECASE
    )

    # Collect CREATE TABLE statements
    table_creates = {} # table_name -> (filename, sql)
    table_alters = defaultdict(list) # table_name -> list of (filename, col_name, col_def)

    all_files = [WORKSPACE_ROOT / "backend" / "supabase" / "schema.sql"]
    for md in mig_dirs:
        for f in sorted(md.glob("*.sql")):
            all_files.append(f)

    for f in all_files:
        if not f.exists():
            continue
        content = f.read_text(encoding="utf-8", errors="ignore")
        for m in create_table_regex.finditer(content):
            tname = m.group(1).lower()
            table_creates[tname] = (f.name, m.group(0))

        for m in alter_table_add_regex.finditer(content):
            tname = m.group(1).lower()
            colname = m.group(2).lower()
            coldef = m.group(3).strip()
            table_alters[tname].append((f.name, colname, coldef))

    all_target_tables = set(table_creates.keys()) | live_tables
    print(f"Total tables identified: {len(all_target_tables)}")
    print(f"Live tables count: {len(live_tables)}")
    print(f"Tables in CREATE TABLE: {len(table_creates)}")
    missing_create = live_tables - set(table_creates.keys())
    print(f"Live tables missing CREATE TABLE in SQL: {missing_create}")

    return all_target_tables, table_creates, table_alters

if __name__ == "__main__":
    get_all_tables_info()
