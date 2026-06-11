/**
 * electron/currency-db.cjs
 * ========================
 * Local currency settings and exchange rates.
 */

function initCurrencyDb(db) {
  console.log('[DB] Initializing Currency Module...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      currency_code TEXT UNIQUE NOT NULL, -- USD, UGX, GBP, INR
      rate REAL DEFAULT 1.0,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status INTEGER DEFAULT 0
    );

    -- Ensure base_currency is in the settings if not exists
    INSERT OR IGNORE INTO settings (key, value) VALUES ('base_currency', 'UGX');
  `);

  console.log('[DB] Currency Module Initialized.');
}

module.exports = initCurrencyDb;
