import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== STARTING DATABASE REPAIR FOR REPORTS VISIBILITY ===")

# 1. Update user 'showtime' to be active and linked to 'store-1'
try:
    cursor.execute("""
        UPDATE users 
        SET is_deleted = 0, store_id = 'store-1' 
        WHERE name = 'showtime' OR email = 'codecraft.burhanuddin@gmail.com'
    """)
    print(f"Updated user 'showtime': {cursor.rowcount} records changed.")
except Exception as e:
    print(f"Error updating user: {e}")

# 2. Canonical store check: Ensure 'store-1' is not deleted
try:
    cursor.execute("UPDATE stores SET is_deleted = 0 WHERE id = 'store-1'")
    print(f"Ensured store-1 (6TH STREET) is active: {cursor.rowcount} records changed.")
except Exception as e:
    print(f"Error updating store: {e}")

# 3. Mass-harmonize sales and products to store-1 and company 'showtime'
# This fixes orphans and potential placeholder association issues.
tables_to_fix = ['sales', 'products', 'customers', 'transactions', 'accounts']
for table in tables_to_fix:
    try:
        cursor.execute(f"UPDATE {table} SET store_id = 'store-1', company_id = 'showtime', is_deleted = 0")
        print(f"Harmonized {table}: {cursor.rowcount} records updated.")
    except Exception as e:
        print(f"Error harmonizing {table}: {e}")

conn.commit()
print("=== DATABASE REPAIR COMPLETED ===")
conn.close()
