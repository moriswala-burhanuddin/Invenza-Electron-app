import sqlite3
import os
import json

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
if not os.path.exists(db_path):
    print(f"Could not find DB at: {db_path}")
    exit(1)

print(f"Using DB at: {db_path}")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def print_table(title, rows):
    print(f"\n=== {title} ===")
    if not rows:
        print("No data.")
        return
    keys = rows[0].keys()
    header = " | ".join(keys)
    print(header)
    print("-" * len(header))
    for row in rows:
        print(" | ".join(str(row[k]) for k in keys))

print_table("STORES", cursor.execute("SELECT id, name, company_id FROM stores").fetchall())

# Check current user to know company id
users = cursor.execute("SELECT id, name, company_id FROM users").fetchall()
print_table("USERS", users)

sales_summary = cursor.execute("SELECT is_deleted, COUNT(*) as count FROM sales GROUP BY is_deleted").fetchall()
print_table("SALES SUMMARY (IS_DELETED)", sales_summary)

sales_sample = cursor.execute("SELECT id, store_id, company_id, date, total_amount, is_deleted FROM sales LIMIT 5").fetchall()
print_table("SALES SAMPLE", sales_sample)

products_summary = cursor.execute("SELECT is_deleted, COUNT(*) as count FROM products GROUP BY is_deleted").fetchall()
print_table("PRODUCTS SUMMARY (IS_DELETED)", products_summary)

products_sample = cursor.execute("SELECT id, name, store_id, company_id, is_deleted FROM products LIMIT 5").fetchall()
print_table("PRODUCTS SAMPLE", products_sample)

# Check for any records where company_id is NULL
null_company = cursor.execute("SELECT 'sales' as tbl, COUNT(*) as count FROM sales WHERE company_id IS NULL UNION ALL SELECT 'products', COUNT(*) FROM products WHERE company_id IS NULL").fetchall()
print_table("NULL COMPANY_ID CHECK", null_company)
