const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the database
const dbPath = path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"), 'invenza-erp', 'database.sqlite');

// Local workspace path fallback (check common locations)
const possiblePaths = [
  dbPath,
  path.join(__dirname, 'database.sqlite'),
  path.join(process.cwd(), 'database.sqlite'),
  'D:/paid-erp/invenza-erp/database.sqlite'
];

let dbFile = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbFile = p;
    break;
  }
}

if (!dbFile) {
  console.error("Could not find database.sqlite in common paths.");
  process.exit(1);
}

console.log("Found database at:", dbFile);
const db = new Database(dbFile);

try {
  const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'").get();
  if (!tableInfo) {
    console.log("Accounts table does not exist.");
    process.exit(0);
  }

  console.log("Current accounts schema:", tableInfo.sql);

  if (tableInfo.sql.includes("'cash', 'card', 'wallet'")) {
    console.log("Detected legacy constraint. Fixing...");
    
    db.transaction(() => {
      // 1. Rename existing table
      db.exec("ALTER TABLE accounts RENAME TO accounts_old");
      
      // 2. Create new table without constraint
      db.exec(`
        CREATE TABLE accounts (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          balance REAL DEFAULT 0,
          store_id TEXT NOT NULL,
          device_id TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          sync_status INTEGER DEFAULT 0,
          is_deleted INTEGER DEFAULT 0,
          deleted_at TEXT,
          FOREIGN KEY (store_id) REFERENCES stores(id)
        )
      `);
      
      // 3. Migrate data
      db.exec("INSERT INTO accounts SELECT * FROM accounts_old");
      
      // 4. Drop old table
      db.exec("DROP TABLE accounts_old");
    })();
    
    console.log("Migration successful!");
  } else {
    console.log("No legacy constraint detected or already fixed.");
  }
} catch (err) {
  console.error("Migration failed:", err.message);
} finally {
  db.close();
}
