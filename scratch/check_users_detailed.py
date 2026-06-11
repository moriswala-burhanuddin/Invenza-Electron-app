import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== USERS TABLE DETAILED ===")
rows = cursor.execute("SELECT * FROM users").fetchall()
for r in rows:
    print(dict(r))
