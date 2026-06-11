const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// TARGET DATABASE PATH (from terminal logs)
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'invenza-saas-dev', 'storeflow.db');

console.log('--- SURGICAL DB FIX START ---');
console.log('Target Path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.error('ERROR: Database file not found at expected path!');
    process.exit(1);
}

const db = new Database(dbPath);

try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'").get();
    
    if (!tableInfo) {
        console.error('ERROR: "accounts" table does not exist?!');
        process.exit(1);
    }

    console.log('Current Schema Found:\n', tableInfo.sql);

    // Check for the restrictive string directly
    const hasLegacyConstraint = tableInfo.sql.includes("'cash'") && tableInfo.sql.includes("'card'") && tableInfo.sql.includes("'wallet'");

    if (hasLegacyConstraint || tableInfo.sql.includes('CHECK')) {
        console.log('\n[DETECTED] Legacy constraint found. Starting surgical rebuild...');

        db.transaction(() => {
            // 1. Rename existing table
            console.log('Step 1: Renaming accounts -> accounts_old');
            db.exec("ALTER TABLE accounts RENAME TO accounts_old");

            // 2. Create new table with RELAXED constraint and ALL 12 columns
            console.log('Step 2: Creating new accounts table (12 columns)...');
            db.exec(`
                CREATE TABLE accounts (
                    id TEXT PRIMARY KEY,
                    company_id TEXT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL, -- Relaxed!
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

            // 3. Migrate data safely
            // We use specific column names to avoid count mismatch errors
            console.log('Step 3: Migrating data from accounts_old to accounts...');
            const columns = [
                'id', 'company_id', 'name', 'type', 'balance', 'store_id', 
                'device_id', 'updated_at', 'sync_status'
            ];
            
            // Check if accounts_old has deleted_at/is_deleted (it should if migrations ran)
            const oldInfo = db.prepare("PRAGMA table_info(accounts_old)").all();
            if (oldInfo.some(c => c.name === 'is_deleted')) columns.push('is_deleted');
            if (oldInfo.some(c => c.name === 'deleted_at')) columns.push('deleted_at');

            const colStr = columns.join(', ');
            db.exec(`INSERT INTO accounts (${colStr}) SELECT ${colStr} FROM accounts_old`);

            // 4. Cleanup
            console.log('Step 4: Dropping accounts_old');
            db.exec("DROP TABLE accounts_old");
        })();

        console.log('\n--- SURGICAL FIX SUCCESSFUL ---');
        console.log('The account type constraint has been removed.');
    } else {
        console.log('\n[SKIP] No legacy constraint detected in the SQL schema.');
    }

} catch (err) {
    console.error('\n--- FATAL ERROR ---');
    console.error(err.message);
    process.exit(1);
} finally {
    db.close();
}
