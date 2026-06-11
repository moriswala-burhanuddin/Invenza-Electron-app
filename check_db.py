import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
if not os.path.exists(db_path):
    print(f"Could not find DB at: {db_path}")
    exit(1)

print(f"Using DB at: {db_path}")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== STORES ===")
try:
    stores = cursor.execute("SELECT id, name, company_id FROM stores").fetchall()
    for s in stores:
        print(dict(s))
except Exception as e:
    print(f"Error querying stores: {e}")

print("\n=== PRODUCTS SUMMARY ===")
try:
    count = cursor.execute("SELECT COUNT(*) as c FROM products").fetchone()
    print(f"Total Products: {count['c']}")
    if count['c'] > 0:
        products = cursor.execute("SELECT id, name, company_id, store_id, is_deleted FROM products").fetchall()
        print("First 10 Products:")
        for p in products[:10]:
            print(dict(p))
except Exception as e:
    print(f"Error querying products: {e}")
