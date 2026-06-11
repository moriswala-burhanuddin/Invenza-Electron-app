const path = require('path');
const Database = require('better-sqlite3');
const dbPath = path.join(process.env.APPDATA, 'invenza-saas-dev', 'storeflow.db');
const db = new Database(dbPath, { readonly: true });

// 1. Find anything referencing stores_old
const stale = db.prepare("SELECT name, type, sql FROM sqlite_master WHERE sql LIKE '%stores_old%'").all();
console.log('\n=== References to stores_old ===');
console.log(stale.length ? JSON.stringify(stale, null, 2) : 'None found');

// 2. Check if stores_old table actually exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='stores_old'").all();
console.log('\n=== stores_old table exists? ===');
console.log(tables.length ? 'YES — stores_old still exists!' : 'No (correctly dropped)');

// 3. Check all foreign keys referencing stores
const fks = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%FOREIGN KEY%stores%'").all();
console.log('\n=== Tables with FKs referencing stores ===');
fks.forEach(t => console.log(`  ${t.name}: ${t.sql.match(/FOREIGN KEY.*stores.*/gi)}`));

// 4. Check stores table schema
const storesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='stores'").get();
console.log('\n=== Current stores schema ===');
console.log(storesSchema?.sql || 'NOT FOUND');

// 5. Count stores
const count = db.prepare("SELECT COUNT(*) as cnt FROM stores").get();
console.log('\n=== Store count ===', count.cnt);

// 6. Show company_ids in stores
const companyIds = db.prepare("SELECT DISTINCT company_id FROM stores").all();
console.log('\n=== Distinct company_ids in stores ===');
console.log(companyIds);

db.close();
