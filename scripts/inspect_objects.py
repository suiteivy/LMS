import os
import re
from pathlib import Path

WORKSPACE = Path("c:/Projects/LMS")

def inspect_objects():
    # Collect all table names and their latest CREATE TABLE statement
    tables = {}
    functions = {}
    triggers = {}
    views = {}
    rls_policies = {}

    all_files = []
    # 1. Base schema
    base_schema = WORKSPACE / "backend" / "supabase" / "schema.sql"
    if base_schema.exists():
        all_files.append(base_schema)

    # 2. backend migrations
    for f in sorted((WORKSPACE / "backend" / "supabase" / "migrations").glob("*.sql")):
        all_files.append(f)

    # 3. supabase migrations
    for f in sorted((WORKSPACE / "supabase" / "migrations").glob("*.sql")):
        all_files.append(f)

    print(f"Total SQL files to scan: {len(all_files)}")

if __name__ == "__main__":
    inspect_objects()
