const db = require('better-sqlite3')('electron/storeflow.db');
const rows = db.prepare('SELECT * FROM user_permissions').all();
rows.forEach(r => {
  try {
    const p = JSON.parse(r.permissions);
    console.log(`User ${r.user_id} permissions:`, p);
  } catch(e) {
    console.log(`Error parsing User ${r.user_id} permissions:`, r.permissions);
  }
});
