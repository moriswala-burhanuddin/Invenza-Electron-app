import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def dump_schema(table_name):
    print(f"\n=== Schema for {table_name} ===")
    cols = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
    for c in cols:
        print(f"{c['name']} - {c['type']}")

dump_schema("stores")
dump_schema("products")
dump_schema("sales")
