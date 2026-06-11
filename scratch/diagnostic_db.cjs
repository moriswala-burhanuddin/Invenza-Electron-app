const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Try to find the DB path
const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + "/.config");
const dbPaths = [
    path.join(appData, 'invenza-erp', 'storeflow.db'),
    path.join(appData, 'StoreFlow ERP', 'storeflow.db'),
    path.join(__dirname, 'electron', 'storeflow.db'),
    path.join(__dirname, 'database.sqlite')
];

let dbPath = null;
for (const p of dbPaths) {
    if (fs.existsSync(p)) {
        console.log(`Found DB at: ${p}`);
        dbPath = p;
        break;
    }
}

if (!dbPath) {
    console.error("Could not find database!");
    process.exit(1);
}

const db = new Database(dbPath);

console.log("\n--- STORES ---");
const stores = db.prepare("SELECT id, name, company_id FROM stores").all();
console.table(stores);

console.log("\n--- USERS ---");
const users = db.prepare("SELECT id, name, company_id FROM users").all();
console.table(users);

console.log("\n--- SALES COUNT ---");
const salesCount = db.prepare("SELECT COUNT(*) as count FROM sales").get();
console.log(`Total Sales: ${salesCount.count}`);

if (salesCount.count > 0) {
    console.log("\n--- RECENT SALES (is_deleted check) ---");
    const recentSales = db.prepare("SELECT id, store_id, company_id, total_amount, is_deleted, date FROM sales LIMIT 5").all();
    console.table(recentSales);

    console.log("\n--- SALES GROUPED BY COMPANY/STORE ---");
    const grouped = db.prepare("SELECT company_id, store_id, is_deleted, COUNT(*) as count FROM sales GROUP BY company_id, store_id, is_deleted").all();
    console.table(grouped);
}

console.log("\n--- PRODUCTS COUNT ---");
const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
console.log(`Total Products: ${productCount.count}`);

if (productCount.count > 0) {
    console.log("\n--- PRODUCTS GROUPED BY COMPANY/STORE ---");
    const groupedProducts = db.prepare("SELECT company_id, store_id, is_deleted, COUNT(*) as count FROM products GROUP BY company_id, store_id, is_deleted").all();
    console.table(groupedProducts);
}
