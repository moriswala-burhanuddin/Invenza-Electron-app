const db = require('better-sqlite3')('C:/Users/ADMIN/AppData/Roaming/invenza-saas-dev/storeflow.db');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payroll'").get();
console.log(row.sql);
