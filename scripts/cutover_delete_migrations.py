import os
from pathlib import Path

WORKSPACE = Path("c:/Projects/LMS")

def cutover():
    print("Executing cutover deletion of legacy migration files...")
    
    dirs_to_clean = [
        WORKSPACE / "supabase" / "migrations",
        WORKSPACE / "backend" / "supabase" / "migrations",
        WORKSPACE / "backend" / "supabase" / "seeds"
    ]
    
    deleted_count = 0
    for d in dirs_to_clean:
        if d.exists():
            for f in d.glob("*.sql"):
                print(f"  Deleting: {f.relative_to(WORKSPACE)}")
                f.unlink()
                deleted_count += 1
                
    print(f"Total legacy SQL migration files deleted: {deleted_count}")

if __name__ == "__main__":
    cutover()
