import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

params = {
    'storeId': 'store-1',
    'companyId': 'showtime'
}

print(f"Testing report query with params: {params}")

query = """
SELECT date, COUNT(*) as count, SUM(total_amount) as total, SUM(profit) as profit
FROM sales 
WHERE store_id = :storeId AND company_id = :companyId AND is_deleted = 0
GROUP BY date ORDER BY date DESC
"""

rows = cursor.execute(query, params).fetchall()
print(f"Results: {len(rows)} rows found")
for r in rows:
    print(dict(r))

# Check without is_deleted
print("\nTesting without is_deleted = 0 filter:")
query2 = """
SELECT date, COUNT(*) as count, SUM(total_amount) as total, SUM(profit) as profit
FROM sales 
WHERE store_id = :storeId AND company_id = :companyId
GROUP BY date ORDER BY date DESC
"""
rows2 = cursor.execute(query2, params).fetchall()
print(f"Results: {len(rows2)} rows found")

# Check without store_id
print("\nTesting without store_id filter:")
query3 = """
SELECT date, COUNT(*) as count, SUM(total_amount) as total, SUM(profit) as profit
FROM sales 
WHERE company_id = :companyId AND is_deleted = 0
GROUP BY date ORDER BY date DESC
"""
rows3 = cursor.execute(query3, params).fetchall()
print(f"Results: {len(rows3)} rows found")
