import sqlite3
import os

db_path = os.path.join(os.environ.get('APPDATA', ''), 'invenza-erp', 'storeflow.db')
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

user = conn.execute("SELECT * FROM users WHERE name = ?", ('showtime',)).fetchone()
if user:
    print(dict(user))
else:
    print("User 'showtime' not found")
    # Try case insensitive or partial
    user = conn.execute("SELECT * FROM users WHERE name LIKE 'showtime%'").fetchone()
    if user:
        print("Found partial match:")
        print(dict(user))
    else:
        print("No match for showtime in users table")
