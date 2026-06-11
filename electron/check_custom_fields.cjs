const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.invenza', 'invenza.sqlite');
console.log('Checking database at:', dbPath);

try {
    const db = new Database(dbPath);
    
    console.log('\n--- Custom Fields Table ---');
    const fields = db.prepare('SELECT * FROM custom_fields').all();
    console.table(fields);

    console.log('\n--- Product Custom Values Table ---');
    const values = db.prepare('SELECT * FROM product_custom_values').all();
    console.table(values);

    db.close();
} catch (err) {
    console.error('Error checking database:', err);
}
