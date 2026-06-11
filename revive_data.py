import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

tables_to_revive = [
    'accounts', 'transactions', 'suppliers', 'receivings', 'purchases', 
    'gift_cards', 'work_orders', 'deliveries', 'cheques', 'categories', 'item_kits'
]

print("Reviving secondary records that were incorrectly wiped locally but exist on server...")
for table in tables_to_revive:
    try:
        cursor.execute(f"UPDATE {table} SET is_deleted = 0 WHERE is_deleted = 1")
        changes = cursor.rowcount
        conn.commit()
        print(f"Revived {changes} records in {table}")
    except Exception as e:
        pass # Skip safely if no is_deleted column or no table

print("Secondary data revived successfully.")
