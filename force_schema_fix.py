import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

tables_to_fix = [
    'stores', 'users', 'categories', 'products', 'customers', 'sales', 
    'accounts', 'transactions', 'stock_logs', 'attendance', 'employees',
    'suppliers', 'receivings', 'purchases', 'quotations', 'payroll',
    'work_orders', 'deliveries', 'sale_payments', 'shifts', 'leaves',
    'expense_categories', 'tax_slabs', 'item_kits', 'custom_fields', 'cheques', 
    'gift_cards', 'delivery_zones', 'loyalty_points', 'stock_transfers',
    'invoices', 'invoice_items', 'purchase_orders', 'kit_items', 'commissions'
]

print("Starting schema force fix...")
for table in tables_to_fix:
    try:
        # Check if table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
        if not cursor.fetchone():
            continue
            
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [c['name'] for c in cursor.fetchall()]
        
        if 'company_id' not in columns:
            print(f"Adding company_id to {table}...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN company_id TEXT")
            conn.commit()
            
            print(f"Backfilling {table} with 'showtime'...")
            cursor.execute(f"UPDATE {table} SET company_id = 'showtime'")
            conn.commit()
    except Exception as e:
        print(f"Failed on {table}: {e}")

print("Done schema fix.")
