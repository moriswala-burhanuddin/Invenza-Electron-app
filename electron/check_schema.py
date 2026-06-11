import sqlite3, os

db_path = os.path.join(os.environ['APPDATA'], 'invenza-saas-dev', 'storeflow.db')
conn = sqlite3.connect(db_path)

# Find ALL tables with broken references
rows = conn.execute("""
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND (
        sql LIKE '%stores_old%' 
        OR sql LIKE '%employees_old%' 
        OR sql LIKE '%fk_repair_backup%'
        OR sql LIKE '%_tmp_repair_%'
        OR sql LIKE '%_fk_fix_%'
    )
""").fetchall()

print(f"=== Broken tables: {len(rows)} ===")
for name, sql in rows:
    print(f"\n--- {name} ---")
    # Show just the FK lines
    for line in sql.split('\n'):
        if 'FOREIGN' in line or 'CREATE' in line:
            print(f"  {line.strip()}")

# Also check if sales table exists and its schema
sales = conn.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales'").fetchone()
print(f"\n=== sales table schema ===")
if sales:
    for line in sales[0].split('\n'):
        if 'FOREIGN' in line or 'CREATE' in line:
            print(f"  {line.strip()}")
else:
    print("  NOT FOUND!")

# Check for leftover temp/backup tables  
leftovers = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%_old%' OR name LIKE '%backup%' OR name LIKE '%_tmp_%' OR name LIKE '%_fk_fix_%')").fetchall()
print(f"\n=== Leftover temp tables: {[r[0] for r in leftovers]} ===")

conn.close()
