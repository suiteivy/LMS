import re
from pathlib import Path

catalog_path = Path("docs/Master/ref-database-catalog.md")
content = catalog_path.read_text(encoding="utf-8")

# Look for '### `table_name`' or lines starting with '### `'
tables = re.findall(r'### `([a-zA-Z0-9_]+)`', content)
print(f"Found {len(tables)} tables in {catalog_path}:")
for i, t in enumerate(tables, 1):
    print(f"{i:3d}. {t}")
