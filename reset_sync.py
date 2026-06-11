import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("DELETE FROM settings WHERE key = 'last_pull_timestamp'")
    conn.commit()
    print("Sync cursor reset successfully. The next sync will be a full pull.")
except Exception as e:
    print("Error:", e)
    
# Let's also check if accounts table has any accounts actually!
cursor.execute("SELECT COUNT(*) FROM accounts")
print("Total local accounts right now:", cursor.fetchone()[0])
