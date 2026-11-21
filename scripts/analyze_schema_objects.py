import os
import re
from pathlib import Path
from collections import defaultdict

WORKSPACE_ROOT = Path("c:/Projects/LMS")

def analyze_all():
    table_defs = {} # table_name -> set of columns or definitions
    functions = {}  # func_name -> definition
    triggers = {}   # trigger_name -> def
    types = {}      # type_name -> def
    policies = {}   # policy_name -> def
    views = {}      # view_name -> def
    
    # 1. First inspect backend/supabase/schema.sql
    schema_file = WORKSPACE_ROOT / "backend" / "supabase" / "schema.sql"
    print(f"Reading schema.sql...")
    
    # Helper to scan a directory of migrations in order
    dirs_to_scan = [
        WORKSPACE_ROOT / "backend" / "supabase" / "migrations",
        WORKSPACE_ROOT / "supabase" / "migrations",
    ]
    
    mig_files = []
    for d in dirs_to_scan:
        if d.exists():
            for f in sorted(d.glob("*.sql")):
                mig_files.append(f)
                
    print(f"Found {len(mig_files)} migration files across directories.")
    
    # Also collect all table names mentioned in CREATE TABLE
    all_create_tables = defaultdict(list)
    for f in mig_files + [schema_file]:
        content = f.read_text(encoding="utf-8", errors="ignore")
        # Find CREATE TABLE
        matches = re.finditer(r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\((.*?)\);', content, re.IGNORECASE | re.DOTALL)
        for m in matches:
            tname = m.group(1).lower()
            all_create_tables[tname].append((f.name, m.group(0)))
            
        # Find CREATE OR REPLACE FUNCTION / CREATE FUNCTION
        fmatches = re.finditer(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(.*?\)\s+RETURNS\s+.*?(?:\$\$.*?\$\$;|\'\'\'.*?\'\'\';|LANGUAGE\s+[a-zA-Z0-9_]+;)', content, re.IGNORECASE | re.DOTALL)
        for m in fmatches:
            fname = m.group(1).lower()
            functions[fname] = (f.name, m.group(0))
            
        # Find CREATE TYPE
        tmatches = re.finditer(r'CREATE\s+TYPE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+AS\s+ENUM\s*\(.*?\);', content, re.IGNORECASE | re.DOTALL)
        for m in tmatches:
            typename = m.group(1).lower()
            types[typename] = (f.name, m.group(0))
            
        # Find CREATE TRIGGER
        trmatches = re.finditer(r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-zA-Z0-9_]+)\s+.*?;', content, re.IGNORECASE | re.DOTALL)
        for m in trmatches:
            trname = m.group(1).lower()
            triggers[trname] = (f.name, m.group(0))

    print(f"Total unique tables created across all SQL: {len(all_create_tables)}")
    print(f"Total unique functions: {len(functions)}")
    print(f"Total unique types: {len(types)}")
    print(f"Total unique triggers: {len(triggers)}")

    with open(WORKSPACE_ROOT / "scripts" / "tables_summary.txt", "w", encoding="utf-8") as out:
        for tname in sorted(all_create_tables.keys()):
            sources = [s[0] for s in all_create_tables[tname]]
            out.write(f"{tname}: defined in {len(sources)} places ({', '.join(sources[:3])})\n")

if __name__ == "__main__":
    analyze_all()
