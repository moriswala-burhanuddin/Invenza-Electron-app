const { db } = require('./db.cjs');

try {
  console.log("--- PENDING SYNC CHANGES ---");
  
  const queries = [
    { table: 'products', sql: "SELECT id, name FROM products WHERE sync_status = 0" },
    { table: 'stock_transfers', sql: "SELECT id, status FROM stock_transfers WHERE sync_status = 0" },
    { table: 'stock_logs', sql: "SELECT id, reason FROM stock_logs WHERE sync_status = 0" },
    { table: 'sales', sql: "SELECT id, type FROM sales WHERE sync_status = 0" },
    { table: 'customers', sql: "SELECT id, name FROM customers WHERE sync_status = 0" }
  ];

  let totalNum = 0;
  
  queries.forEach(q => {
    try {
        const results = db.prepare(q.sql).all();
        if (results.length > 0) {
            console.log(`\nTable: ${q.table} (${results.length} pending)`);
            results.forEach(r => console.log(`  - ${JSON.stringify(r)}`));
            totalNum += results.length;
        }
    } catch (e) {
        // Table might not exist or err
    }
  });

  console.log(`\nTotal Found in these tables: ${totalNum}`);

} catch(e) {
  console.error("Error querying sync status:", e);
}
