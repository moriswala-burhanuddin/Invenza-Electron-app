const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Try common database paths
const possiblePaths = [
    path.join(__dirname, 'electron', 'storeflow.db'),
    path.join(process.env.APPDATA || '', 'invenza-erp', 'storeflow.db'),
    path.join(process.env.LOCALAPPDATA || '', 'invenza-erp', 'storeflow.db')
];

let dbPath = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.error('Database not found');
    process.exit(1);
}

console.log('Using DB:', dbPath);
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const report = {};

for (const t of tables) {
    const info = db.prepare(`PRAGMA table_info(${t.name})`).all();
    report[t.name] = info.map(c => c.name);
}

console.log(JSON.stringify(report, null, 2));
