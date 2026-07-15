const db = require('better-sqlite3')('storeflow.db');
const rows = db.prepare('SELECT * FROM user_permissions').all();
console.log(rows);
rows.forEach(r => {
  try {
    const p = JSON.parse(r.permissions);
    console.log("Parsed:", p);
  } catch(e) {
    console.log("Error parsing:", r.user_id, r.permissions);
  }
});
