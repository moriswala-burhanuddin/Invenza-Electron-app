import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== SALES BY STORE_ID ===")
rows = cursor.execute("SELECT store_id, COUNT(*) as count FROM sales GROUP BY store_id").fetchall()
for r in rows:
    print(dict(r))

print("\n=== STORES TABLE ===")
rows = cursor.execute("SELECT id, name FROM stores").fetchall()
for r in rows:
    print(dict(r))
