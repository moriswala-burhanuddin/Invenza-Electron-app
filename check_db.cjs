const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const possiblePaths = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'invenza-erp', 'storeflow.db'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'StoreFlow ERP', 'storeflow.db'),
    path.join(__dirname, 'storeflow.db')
];

let dbPath;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.log("Could not find storeflow.db locally.");
    process.exit(1);
}

console.log("Using DB at:", dbPath);
const db = new Database(dbPath);

console.log("\n=== PRODUCTS SCHEMA ===");
const schema = db.prepare("PRAGMA table_info(products)").all();
console.log(schema.map(c => c.name));

console.log("\n=== RECENT PRODUCTS ===");
console.log(db.prepare("SELECT id, name, description FROM products ORDER BY updated_at DESC LIMIT 5").all());
