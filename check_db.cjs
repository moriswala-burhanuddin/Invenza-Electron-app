const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// In db.cjs, userDataPath is app.getPath('userData'). 
// For typical electron apps on Windows, this is %APPDATA%\<App Name>
// The app name seems to be 'invenza-erp' or similar based on earlier paths.
const possiblePaths = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'invenza-erp', 'storeflow.db'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'StoreFlow ERP', 'storeflow.db'),
    path.join(__dirname, 'storeflow.db')
];

let dbPath;
for (const p of possiblePaths) {
    if (require('fs').existsSync(p)) {
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

console.log("=== STORES ===");
console.log(db.prepare("SELECT id, company_id, name FROM stores").all());

console.log("\n=== USERS SUMMARY ===");
console.log(db.prepare("SELECT id, company_id, store_id, email, role FROM users LIMIT 5").all());

console.log("\n=== PRODUCTS SUMMARY ===");
const count = db.prepare("SELECT COUNT(*) as c FROM products").get().c;
console.log(`Total Products: ${count}`);
if (count > 0) {
    console.log("First 10 Products:");
    console.log(db.prepare("SELECT id, name, company_id, store_id, is_deleted FROM products LIMIT 10").all());
}
