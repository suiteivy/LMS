import re
from pathlib import Path

SCHEMA_FILE = Path("backend/supabase/schema.sql")

def validate():
    content = SCHEMA_FILE.read_text(encoding="utf-8")
    print(f"Validating {SCHEMA_FILE} ({len(content)} chars)...")

    # Count objects
    tables = re.findall(r'CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+public\.([a-zA-Z0-9_]+)', content, re.I)
    indexes = re.findall(r'CREATE\s+INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-zA-Z0-9_]+)', content, re.I)
    functions = re.findall(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.([a-zA-Z0-9_]+)', content, re.I)
    triggers = re.findall(r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+([a-zA-Z0-9_]+)', content, re.I)
    views = re.findall(r'CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.([a-zA-Z0-9_]+)', content, re.I)
    policies = re.findall(r'CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+([a-zA-Z0-9_.]+)', content, re.I)

    print(f"Summary of canonical objects in schema.sql:")
    print(f"  - Tables:     {len(tables)}")
    print(f"  - Indexes:    {len(indexes)}")
    print(f"  - Functions:  {len(functions)}")
    print(f"  - Triggers:   {len(triggers)}")
    print(f"  - Views:      {len(views)}")
    print(f"  - Policies:   {len(policies)}")

    # Check for disallowed data inserts in schema.sql
    inserts = re.findall(r'INSERT\s+INTO\s+public\.([a-zA-Z0-9_]+)', content, re.I)
    print(f"  - Direct Inserts: {len(inserts)} {inserts}")

if __name__ == "__main__":
    validate()
