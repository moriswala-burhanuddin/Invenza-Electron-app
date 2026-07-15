const db = require('better-sqlite3')(':memory:');
db.exec('CREATE TABLE test (id TEXT PRIMARY KEY, val TEXT, sync_status INTEGER, is_deleted INTEGER)');
db.exec("INSERT INTO test VALUES ('1', 'local', 0, 1)");

const stmt = db.prepare(`
    INSERT INTO test (id, val, sync_status, is_deleted)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(id) DO UPDATE SET
        val = excluded.val,
        sync_status = 1,
        is_deleted = excluded.is_deleted
    WHERE test.sync_status = 1
`);
stmt.run('1', 'server', 0);
console.log(db.prepare('SELECT * FROM test').all());
