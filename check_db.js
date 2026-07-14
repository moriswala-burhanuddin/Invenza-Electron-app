const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData/Roaming/Invenza ERP/storeflow.db');
console.log("DB Path:", dbPath);
try {
    const db = new Database(dbPath);
    const schema = db.prepare("PRAGMA table_info(products)").all();
    console.log("Products Schema:", schema.map(c => c.name));
    
    const products = db.prepare("SELECT id, name, description FROM products LIMIT 5").all();
    console.log("Products Data:", products);
} catch(e) {
    console.error(e);
}
