const db = require('better-sqlite3')('storeflow.db');
const users = db.prepare('SELECT id, email, role FROM users').all();
const perms = db.prepare('SELECT * FROM user_permissions').all();
console.log("Users:", users);
console.log("Perms:", perms);
