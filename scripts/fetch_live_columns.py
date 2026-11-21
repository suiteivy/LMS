import json
from pathlib import Path

# We can query information_schema.columns for all tables in public schema
# Let's write an introspection script that generates the SQL to run or saves results
query = """
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
"""

Path("scripts/query_columns.sql").write_text(query, encoding="utf-8")
print("Saved scripts/query_columns.sql")
