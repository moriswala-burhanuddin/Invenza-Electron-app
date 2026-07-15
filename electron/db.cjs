const Database = require("better-sqlite3")
const path = require("path")
const crypto = require("crypto")
const bcrypt = require("bcryptjs")
const fs = require("fs")
const { app } = require('electron')
const initHRDb = require('./hr-db.cjs')
const initCurrencyDb = require('./currency-db.cjs')

// Centralized database path in its own data directory
const userDataPath = app ? app.getPath('userData') : __dirname;
const dbPath = path.join(userDataPath, 'storeflow.db');

let shouldMigrate = false;
if (app) {
  const appData = app.getPath('appData');
  const possibleOldPaths = []; // DISABLED MIGRATION FOR SAAS DEV SANDBOX
  /*  
  path.join(appData, 'vite_react_shadcn_ts', 'storeflow.db'),
  path.join(appData, 'invenza-erp', 'storeflow.db'),
  path.join(appData, 'StoreFlow ERP', 'storeflow.db'),
  path.join(appData, 'Electron', 'storeflow.db')
  */

  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 50000) {
    for (const oldPath of possibleOldPaths) {
      if (fs.existsSync(oldPath) && oldPath !== dbPath) {
        console.log(`[DB] Found potential data source: ${oldPath} (${fs.statSync(oldPath).size} bytes)`);
        // If the new one exists but is small, and the old one is significantly larger, migrate
        if (!fs.existsSync(dbPath) || fs.statSync(oldPath).size > fs.statSync(dbPath).size) {
          console.log('[DB] Decided to migrate from:', oldPath);
          try {
            if (!fs.existsSync(userDataPath)) {
              fs.mkdirSync(userDataPath, { recursive: true });
            }
            if (fs.existsSync(dbPath)) {
              fs.renameSync(dbPath, dbPath + '.backup-' + Date.now());
            }
            fs.copyFileSync(oldPath, dbPath);
            console.log('[DB] Migration successful!');
            shouldMigrate = true;
            break; // Found and migrated
          } catch (err) {
            console.error('[DB] Migration failed:', err.message);
          }
        }
      }
    }
  }
}

console.log('[DB] Connecting to: ', dbPath)
const db = new Database(dbPath)
// Enable Foreign Keys for Data Integrity
db.pragma('foreign_keys = ON');

// ─── DATA REPAIR MIGRATION ──────────────────────────────────────────
// Fix any records where totals were double-converted due to old UGX-pivot bug.
try {
  const config = db.prepare("SELECT value FROM settings WHERE key = 'base_currency'").get();
  const sysBase = config ? config.value : 'UGX';

  // Repair sales where total_amount was incorrectly scaled but original_amount is correct
  const inflatedSales = db.prepare(`
    SELECT id, total_amount, original_amount 
    FROM sales 
    WHERE original_amount IS NOT NULL 
    AND original_currency = ?
    AND total_amount != original_amount
    AND (total_amount / original_amount) BETWEEN 38.0 AND 41.0
  `).all(sysBase);

  if (inflatedSales.length > 0) {
    console.log(`[DB] Repair: Detected ${inflatedSales.length} inflated sales for ${sysBase}. Deflating...`);
    const repairSaleStmt = db.prepare("UPDATE sales SET total_amount = original_amount, subtotal = original_amount WHERE id = ?");
    db.transaction(() => {
      inflatedSales.forEach(s => repairSaleStmt.run(s.id));
    })();
  }

  // Repair invoices where total_amount was incorrectly scaled
  const inflatedInvoices = db.prepare(`
    SELECT id, total_amount, original_amount 
    FROM invoices 
    WHERE original_amount IS NOT NULL 
    AND original_currency = ?
    AND total_amount != original_amount
    AND (total_amount / original_amount) BETWEEN 38.0 AND 41.0
  `).all(sysBase);

  if (inflatedInvoices.length > 0) {
    console.log(`[DB] Repair: Detected ${inflatedInvoices.length} inflated invoices for ${sysBase}. Deflating...`);
    const repairInvStmt = db.prepare("UPDATE invoices SET total_amount = original_amount, subtotal = original_amount WHERE id = ?");
    db.transaction(() => {
      inflatedInvoices.forEach(i => repairInvStmt.run(i.id));
    })();
  }
} catch (err) {
  console.warn('[DB] Automatic data repair skipped:', err.message);
}

// ─── EMERGENCY DATA REPAIR: MULTI-TENANT BACKFILL ───────────────────
// Restore visibility of legacy data by backfilling company_id
try {
  // 1. Identify the active company from stores or settings if only one exists
  let defaultCompany = 'showtime'; // Fallback seen in logs
  const existingStore = db.prepare("SELECT company_id FROM stores WHERE company_id IS NOT NULL LIMIT 1").get();
  if (existingStore && existingStore.company_id) defaultCompany = existingStore.company_id;

  console.log(`[DB] Multi-Tenant Repair: Using default company_id [${defaultCompany}] for orphaned records.`);

  const tablesToFix = [
    'stores', 'users', 'categories', 'products', 'customers', 'sales', 
    'accounts', 'transactions', 'stock_logs', 'attendance', 'employees',
    'suppliers', 'receivings', 'purchases', 'quotations', 'payroll',
    'work_orders', 'deliveries', 'sale_payments', 'shifts', 'leaves',
    'expense_categories', 'tax_slabs', 'item_kits', 'custom_fields', 'cheques', 
    'gift_cards', 'delivery_zones', 'loyalty_points', 'stock_transfers',
    'invoices', 'invoice_items', 'purchase_orders', 'kit_items', 'commissions'
  ];

  db.transaction(() => {
    for (const table of tablesToFix) {
      try {
        // Check if table exists
        const tableInfo = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        if (!tableInfo) continue;

        // Check if column exists first
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        const hasCompanyId = info.some(c => c.name === 'company_id');

        if (!hasCompanyId) {
          console.log(`[DB] Schema Migration: Adding company_id column to ${table}`);
          db.prepare(`ALTER TABLE ${table} ADD COLUMN company_id TEXT`).run();
        }

        // Backfill NULLs
        const result = db.prepare(`UPDATE ${table} SET company_id = ? WHERE company_id IS NULL OR company_id = ''`).run(defaultCompany);
        if (result.changes > 0) {
          console.log(`[DB] Multi-Tenant Repair: Backfilled ${result.changes} records in ${table}`);
        }
      } catch (e) {
        console.error(`[DB] Multi-Tenant schema repair skipped for ${table}:`, e.message);
      }
    }
  })();
} catch (err) {
  console.error('[DB] Multi-Tenant Repair FAILED:', err.message);
}

// ─── DIAGNOSTIC STORE AUDIT ──────────────────────────────────────────
try {
  const allLocalStores = db.prepare("SELECT id, name, company_id FROM stores").all();
  console.log('[DB] Store Audit (Local Table):', JSON.stringify(allLocalStores, null, 2));
} catch (e) {
  console.error('[DB] Store Audit failed:', e.message);
}

// ─── STORE REDIRECTION MAP ──────────────────────────────────────────
// Used to handle cases where frontend holds an old ID but data was moved.
const storeRedirects = new Map();

// ─── STORE ID HARMONIZATION ──────────────────────────────────────────
// If we have a local placeholder ID (like store-kac30tpr1) and a cloud ID
// for the same name/branch, merge them to restore visibility.
try {
  const stores = db.prepare("SELECT * FROM stores").all();
  const canonicalMap = new Map(); // name+branch -> canonicalId

  // First pass: find IDs that look like cloud IDs (e.g. UUIDs or from sync)
  stores.forEach(s => {
    const key = `${s.name}|${s.branch || ''}`.toLowerCase();
    if (!canonicalMap.has(key) || s.id.length > 20) { // Assume longer/UUID IDs are canonical
      canonicalMap.set(key, s.id);
    }
  });

  db.transaction(() => {
    stores.forEach(s => {
      const key = `${s.name}|${s.branch || ''}`.toLowerCase();
      const canonicalId = canonicalMap.get(key);
      if (canonicalId && s.id !== canonicalId) {
        console.log(`[DB] Harmonization: Re-homing records from ${s.id} to canonical ${canonicalId} (${s.name})`);
        storeRedirects.set(s.id, canonicalId);
        
        const tablesToUpdate = [
          'products', 'customers', 'sales', 'quotations', 'purchases', 
          'transactions', 'item_kits', 'suppliers', 'receivings', 'invoices',
          'cheques', 'attendance', 'leaves', 'payroll', 'user_stores',
          'work_orders', 'deliveries', 'delivery_zones', 'payment_terms',
          'stock_logs', 'stock_transfers', 'purchase_orders'
        ];

        tablesToUpdate.forEach(table => {
          try {
            const info = db.prepare(`PRAGMA table_info(${table})`).all();
            const cols = info.map(c => c.name);
            if (cols.includes('store_id')) {
              db.prepare(`UPDATE ${table} SET store_id = ? WHERE store_id = ?`).run(canonicalId, s.id);
            }
            if (table === 'stock_transfers') {
                if (cols.includes('from_store_id')) db.prepare(`UPDATE ${table} SET from_store_id = ? WHERE from_store_id = ?`).run(canonicalId, s.id);
                if (cols.includes('to_store_id')) db.prepare(`UPDATE ${table} SET to_store_id = ? WHERE to_store_id = ?`).run(canonicalId, s.id);
            }
          } catch (e) { /* skip */ }
        });
      }
    });
  })();
} catch (err) {
  console.error('[DB] Store Harmonization failed:', err.message);
}

// ─── SCHEMA INTEGRITY FIX: GLOBAL DATABASE SANITIZATION ─────────────
// 1. Drop ALL triggers (Legacy triggers cause "no such table" errors during migrations)
try {
  const triggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
  if (triggers.length > 0) {
    console.log(`[DB] Sanitization: Dropping ${triggers.length} legacy triggers...`);
    db.transaction(() => {
      triggers.forEach(t => db.exec(`DROP TRIGGER IF EXISTS ${t.name}`));
    })();
  }
} catch (e) {
  console.warn('[DB] Sanitization: Trigger purge failed:', e.message);
}

// 2. Universal Foreign Key Repair (Recursive-Safe)
try {
  const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
  
  // --- DISABLE FKs Globally for the repair batch ---
  db.pragma('foreign_keys = OFF');
  
  for (const table of allTables) {
    if (table.includes('_old') || table.includes('_fix') || table.includes('_repair_')) continue;

    const fks = db.prepare(`PRAGMA foreign_key_list(${table})`).all();
    
    // Detect broken references to _old or _fix tables or missing targets
    const brokenFK = fks.find(fk => 
      (fk.table === 'users' && fk.from === 'employee_id') || 
      fk.table.endsWith('_old') || 
      fk.table.includes('_fix') ||
      fk.table.includes('_repair_') ||
      (fk.table === 'accounts' && !fk.to)
    );

    if (brokenFK) {
      console.log(`[DB] Sanitization: Repairing table [${table}] (references ${brokenFK.table})...`);

      const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (!tableInfo) continue;
      
      let correctedSql = tableInfo.sql
        // 1. Fix specific known misalignments
        .replace(/REFERENCES users\(id\)/g, "REFERENCES employees(id)")
        .replace(/REFERENCES "users"\(id\)/g, "REFERENCES employees(id)")
        // 2. Universal Suffix Stripper: Removes ALL possible migration suffixes from REFERENCES
        // This catches _old, _fix, _fix_old, _repair_123456, etc.
        .replace(/REFERENCES ["']?([a-z_]+)(?:_old|_fix|_fix_old|_repair_\d+|_repair_old|_fix_fix_old)["']?/gi, 'REFERENCES $1');

      db.transaction(() => {
        // Use a unique name for the repair to avoid collisions
        const tempName = `${table}_repair_${Date.now()}`;
        db.exec(`ALTER TABLE ${table} RENAME TO ${tempName}`);
        db.exec(correctedSql);
        
        try {
           db.exec(`INSERT INTO ${table} SELECT * FROM ${tempName}`);
           db.exec(`DROP TABLE ${tempName}`);
        } catch (copyErr) {
           console.error(`[DB] Repair failed for ${table}:`, copyErr.message);
           throw copyErr; 
        }
      })();
      console.log(`[DB] Sanitization: Table [${table}] repaired successfully.`);
    }
  }
  
  // --- CLEANUP: Drop any leftover temporary tables ---
  const leftoverTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%_old' OR name LIKE '%_fix' OR name LIKE '%_repair_%')").all();
  if (leftoverTables.length > 0) {
    console.log(`[DB] Sanitization: Cleaning up ${leftoverTables.length} temporary migration tables...`);
    db.transaction(() => {
      leftoverTables.forEach(t => db.exec(`DROP TABLE IF EXISTS ${t.name}`));
    })();
  }

  db.pragma('foreign_keys = ON');
} catch (err) {
  db.pragma('foreign_keys = ON');
  console.error('[DB] Universal Sanitization FAILED:', err.message);
}


// Phase 12+: Schema Migrations for Multi-Tenancy & HR Alignment
try {
  // 1. Payroll: Add 'year' and 'month' columns if they don't exist
  const payrollCols = db.prepare("PRAGMA table_info(payroll)").all().map(c => c.name);
  if (!payrollCols.includes('year')) {
    console.log("[DB] Migration: Adding 'year' column to payroll table...");
    db.prepare("ALTER TABLE payroll ADD COLUMN year INTEGER DEFAULT 2024").run();
  }
  if (!payrollCols.includes('month')) {
    console.log("[DB] Migration: Adding 'month' column to payroll table...");
    db.prepare("ALTER TABLE payroll ADD COLUMN month INTEGER DEFAULT 1").run();
  }

  // 2. Performance Reviews: Align schema with Django backend
  const prCols = db.prepare("PRAGMA table_info(performance_reviews)").all().map(c => c.name);
  if (!prCols.includes('review_date')) {
    console.log("[DB] Migration: Aligning performance_reviews table schema...");
    if (prCols.includes('date')) {
      db.prepare("ALTER TABLE performance_reviews RENAME COLUMN date TO review_date").run();
    } else {
      db.prepare("ALTER TABLE performance_reviews ADD COLUMN review_date TEXT").run();
    }
  }
} catch (err) {
  console.error('[DB] Multi-Tenant Migration FAILED:', err.message);
}

// Phase 13: Detailed Schema Alignment & Constraint Relaxation

// 1. Relax Payroll Status Constraint
try {
  const payrollTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='payroll'").get();
  if (payrollTable && payrollTable.sql.includes("CHECK(status IN ('draft', 'paid'))")) {
      console.log("[DB] Migration: Relaxing payroll status constraint...");
      db.transaction(() => {
          db.exec("DROP TABLE IF EXISTS payroll_old");
          db.exec("ALTER TABLE payroll RENAME TO payroll_old");
          db.exec(`
              CREATE TABLE payroll (
                  id TEXT PRIMARY KEY,
                  company_id TEXT,
                  employee_id TEXT NOT NULL,
                  month INTEGER NOT NULL,
                  year INTEGER NOT NULL,
                  basic_salary REAL NOT NULL,
                  deductions REAL DEFAULT 0,
                  allowances REAL DEFAULT 0,
                  net_salary REAL NOT NULL,
                  status TEXT DEFAULT 'draft',
                  store_id TEXT NOT NULL,
                  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                  sync_status INTEGER DEFAULT 0,
                  FOREIGN KEY (employee_id) REFERENCES employees(id),
                  FOREIGN KEY (store_id) REFERENCES stores(id)
              )
          `);
          db.exec("INSERT INTO payroll (id, company_id, employee_id, month, year, basic_salary, deductions, allowances, net_salary, status, store_id, updated_at, sync_status) SELECT id, company_id, employee_id, month, year, basic_salary, deductions, allowances, net_salary, status, store_id, updated_at, sync_status FROM payroll_old");
          db.exec("DROP TABLE payroll_old");
      })();
  }
} catch (err) {
  console.error('[DB] Payroll Alignment Migration FAILED:', err.message);
}

// 2. Add name/email to Employees table for sync mirroring
try {
  // First, if employees table doesn't even exist yet, we don't need to add columns.
  const empTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get();
  if (empTableExists) {
      const empCols = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
      if (!empCols.includes('name')) {
        console.log("[DB] Migration: Adding 'name' column to employees table...");
        db.prepare("ALTER TABLE employees ADD COLUMN name TEXT").run();
      }
      if (!empCols.includes('email')) {
        console.log("[DB] Migration: Adding 'email' column to employees table...");
        db.prepare("ALTER TABLE employees ADD COLUMN email TEXT").run();
      }
  }
} catch (err) {
  console.error('[DB] Employee Alignment Migration FAILED:', err.message);
}

console.log('[DB] Initialization Diagnostics:');
console.log('[DB] UserDataPath:', userDataPath);
console.log('[DB] DB Path:', dbPath);
if (fs.existsSync(dbPath)) {
  console.log('[DB] File exists, size:', fs.statSync(dbPath).size);
} else {
  console.log('[DB] File DOES NOT exist at this path.');
}

// Startup Health Check and Migrations
try {
  // --- GLOBAL FIX: Disable Foreign Keys during migration to prevent constraint crashes ---
  db.pragma('foreign_keys = OFF');
  
  // 1. Basic Health Check
  const stores = db.prepare("SELECT id FROM stores").all();
  console.log('[DB] Health Check - Stores in DB:', stores.map(s => s.id).join(', '));
  
  // 2. Multi-Tenant Professional Upgrade (Migration)
  const tablesToUpgrade = [
    'stores', 'users', 'categories', 'products', 'customers', 'sales', 
    'accounts', 'transactions', 'stock_logs', 'attendance', 'employees',
    'suppliers', 'receivings', 'purchases', 'quotations', 'payroll',
    'work_orders', 'deliveries', 'sale_payments', 'shifts', 'leaves',
    'expense_categories', 'tax_slabs', 'item_kits', 'custom_fields', 'cheques', 
    'gift_cards', 'delivery_zones', 'loyalty_points', 'stock_transfers',
    'invoices', 'invoice_items', 'purchase_orders', 'kit_items', 'commissions',
    'user_permissions', 'product_custom_values', 'sale_custom_values', 'performance_reviews'
  ];
  
  tablesToUpgrade.forEach(table => {
    try {
      const info = db.prepare(`PRAGMA table_info(${table})`).all();
      
      // 1. company_id Migration
      const hasCompanyId = info.some(col => col.name === 'company_id');
      if (!hasCompanyId) {
        console.log(`[DB] Migrating ${table}: Adding company_id column...`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN company_id TEXT`).run();
      }

      // 2. is_deleted Migration (Boolean flag for soft-delete)
      const hasIsDeleted = info.some(col => col.name === 'is_deleted');
      if (!hasIsDeleted) {
        console.log(`[DB] Migrating ${table}: Adding is_deleted column...`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN is_deleted INTEGER DEFAULT 0`).run();
      }
      // Guarantee existing records are visible (not NULL)
      db.prepare(`UPDATE ${table} SET is_deleted = 0 WHERE is_deleted IS NULL`).run();

      // 3. deleted_at Migration (Timestamp)
      const hasDeletedAt = info.some(col => col.name === 'deleted_at');
      if (!hasDeletedAt) {
        console.log(`[DB] Migrating ${table}: Adding deleted_at column...`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN deleted_at TEXT`).run();
      }

      // 4. store_id Migration (for payments and transactions)
      const hasStoreId = info.some(col => col.name === 'store_id');
      if (!hasStoreId && ['sale_payments', 'transactions', 'stock_logs', 'items', 'ledger', 'custom_fields', 'product_custom_values', 'sale_custom_values'].includes(table)) {
        console.log(`[DB] Migrating ${table}: Adding store_id column...`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN store_id TEXT`).run();
      }

      // 5. device_id Migration
      const hasDeviceId = info.some(col => col.name === 'device_id');
      if (!hasDeviceId) {
        console.log(`[DB] Migrating ${table}: Adding device_id column...`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN device_id TEXT`).run();
      }

      // 6. expense_category_id Migration
      if (table === 'transactions') {
        const hasExpCatId = info.some(col => col.name === 'expense_category_id');
        if (!hasExpCatId) {
          console.log(`[DB] Migrating transactions: Adding expense_category_id column...`);
          db.prepare(`ALTER TABLE transactions ADD COLUMN expense_category_id TEXT`).run();
        }
      }

      // 4. Product Category Link Migration
      if (table === 'products') {
        const hasCategoryId = info.some(col => col.name === 'categoryId');
        if (!hasCategoryId) {
          console.log(`[DB] Migrating products: Adding categoryId column...`);
          db.prepare(`ALTER TABLE products ADD COLUMN categoryId TEXT`).run();
        }
        const hasCategoryName = info.some(col => col.name === 'categoryName');
        if (!hasCategoryName) {
          console.log(`[DB] Migrating products: Adding categoryName column...`);
          db.prepare(`ALTER TABLE products ADD COLUMN categoryName TEXT`).run();
        }
      }

      // 5. Purchase & PO Migration: Add supplier_id, device_id, sync_status
      if (['purchases', 'purchase_orders'].includes(table)) {
        const columns = ['supplier_id', 'device_id', 'sync_status', 'updated_at'];
        for (const col of columns) {
          if (!info.some(c => c.name === col)) {
            console.log(`[DB] Migrating ${table}: Adding ${col} column...`);
            const type = (col === 'sync_status') ? 'INTEGER DEFAULT 0' : 'TEXT';
            db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`).run();
          }
        }
      }
      // 6. Account Type Migration: Relax constraint for new types
      if (table === 'accounts') {
        const sqlStatement = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'").get();
        const sql = sqlStatement ? sqlStatement.sql : "";
        
        // --- DIAGNOSTIC LOG: Let's see exactly what SQLite is reporting ---
        console.log("[DB] DIAGNOSTIC: Current Accounts Schema:");
        console.log(sql);
        
        // Detection: even more aggressive check for the constraint
        const hasCheck = sql.toLowerCase().includes("check");
        const hasLegacyTypes = sql.includes("'cash'") || sql.includes("'card'") || sql.includes("'wallet'");
        const needsUpgrade = (hasCheck && hasLegacyTypes) || /CHECK\s*\(\s*type\s+IN/i.test(sql);
        
        if (needsUpgrade) {
          console.log("[DB] DETECTED: Legacy account type constraint. Migrating accounts table...");
          try {
            // --- FIX: Disable foreign keys during table reconstruction ---
            db.pragma('foreign_keys = OFF');
            
            db.transaction(() => {
              db.exec("ALTER TABLE accounts RENAME TO accounts_old");
              db.exec(`
                CREATE TABLE accounts (
                  id TEXT PRIMARY KEY,
                  company_id TEXT,
                  name TEXT NOT NULL,
                  type TEXT NOT NULL,
                  balance REAL DEFAULT 0,
                  store_id TEXT NOT NULL,
                  device_id TEXT,
                  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                  sync_status INTEGER DEFAULT 0,
                  is_deleted INTEGER DEFAULT 0,
                  deleted_at TEXT,
                  FOREIGN KEY (store_id) REFERENCES stores(id)
                )
              `);
              
              // Use explicit column list to avoid count mismatch
              const cols = "id, company_id, name, type, balance, store_id, device_id, updated_at, sync_status";
              
              // Check if accounts_old has the newer columns
              const oldInfo = db.prepare("PRAGMA table_info(accounts_old)").all();
              let insertCols = cols;
              let selectCols = cols;
              
              if (oldInfo.some(c => c.name === 'is_deleted')) {
                insertCols += ", is_deleted";
                selectCols += ", is_deleted";
              }
              if (oldInfo.some(c => c.name === 'deleted_at')) {
                insertCols += ", deleted_at";
                selectCols += ", deleted_at";
              }
              
              db.exec(`INSERT INTO accounts (${insertCols}) SELECT ${selectCols} FROM accounts_old`);
              db.exec("DROP TABLE accounts_old");
            })();
            
            // --- FIX: Re-enable foreign keys after update ---
            db.pragma('foreign_keys = ON');
            
            console.log("[DB] Account migration SUCCESSFUL.");
          } catch (mErr) {
            console.error("[DB] Critical Error during account migration:", mErr.message);
            // Fallback: if it failed, try to rename it back
            try { db.exec("ALTER TABLE accounts_old RENAME TO accounts"); } catch(e) {}
            db.pragma('foreign_keys = ON');
          }
        } else {
          console.log("[DB] Account migration SKIPPED: Constraint not detected.");
        }
      }
    } catch (err) {
      console.error(`[DB] Migration error for ${table}:`, err.message);
    }
  });


  const empCount = db.prepare("SELECT COUNT(*) as count FROM employees").get().count;
  console.log('[DB] Health Check - Employees in DB:', empCount);
  // Relax employees.user_id and purchases.supplier NOT NULL constraints for sync parity
  try { 
      db.prepare("DROP TABLE IF EXISTS employees_old").run();
      db.prepare("ALTER TABLE employees RENAME TO employees_old").run(); 
  } catch(e) {}
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        user_id TEXT, -- Relaxed NOT NULL
        name TEXT,
        email TEXT,
        department TEXT,
        designation TEXT,
        salary REAL,
        joining_date TEXT,
        documents TEXT,
        store_id TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_status INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (store_id) REFERENCES stores(id)
      )
    `).run();
    
    // Dynamically insert since we aren't guaranteed name and email exist in employees_old if the db is super old
    const hasNameCol = db.prepare("SELECT name FROM pragma_table_info('employees_old') WHERE name='name'").get();
    const hasEmailCol = db.prepare("SELECT name FROM pragma_table_info('employees_old') WHERE name='email'").get();
    
    db.prepare(`
      INSERT OR IGNORE INTO employees
      (id, company_id, user_id, name, email, department, designation, salary, joining_date, documents, store_id, updated_at, sync_status)
      SELECT id, company_id, user_id, ${hasNameCol ? 'name' : 'NULL'}, ${hasEmailCol ? 'email' : 'NULL'}, department, designation, salary, joining_date, documents, store_id, updated_at, sync_status
      FROM employees_old
    `).run();
    db.prepare("DROP TABLE employees_old").run();
  } catch(e) { console.log("[DB] Migration: employees rewrite failed, likely already handled.", e.message); }

  // 7. Store Constraint Migration: UNIQUE(company_id, name) + Soft Delete Columns
  try {
    const indexes = db.prepare("PRAGMA index_list('stores')").all();
    const hasUniqueConstraint = indexes.some(idx => idx.unique === 1 && idx.origin === 'u');
    const info = db.prepare("PRAGMA table_info('stores')").all();
    const hasIsDeleted = info.some(c => c.name === 'is_deleted');

    if (!hasUniqueConstraint || !hasIsDeleted) {
      console.log('[DB] Migrating stores: Adding UNIQUE(company_id, name) and soft-delete columns...');
      db.pragma('foreign_keys = OFF');
      db.pragma('legacy_alter_table = ON');
      db.transaction(() => {
        // Backup
        db.exec("DROP TABLE IF EXISTS stores_old");
        db.exec("ALTER TABLE stores RENAME TO stores_old");
        // Recreate with constraint and new columns
        db.exec(`
          CREATE TABLE stores (
            id TEXT PRIMARY KEY,
            company_id TEXT,
            name TEXT NOT NULL,
            branch TEXT,
            address TEXT,
            phone TEXT,
            device_id TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            sync_status INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            deleted_at TEXT,
            UNIQUE(company_id, name)
          )
        `);
        // Map columns — use COALESCE to avoid dropping rows with NULL company_id
        const colsInOld = info.map(c => c.name);
        const hasCompanyId = colsInOld.includes('company_id');
        const selectCols = [
          'id', hasCompanyId ? 'company_id' : "'unknown'" , 'name', 'branch', 'address', 'phone', 'device_id', 'updated_at', 'sync_status'
        ].join(', ');
        
        const targetCols = [
          'id', 'company_id', 'name', 'branch', 'address', 'phone', 'device_id', 'updated_at', 'sync_status'
        ].join(', ');

        db.exec(`INSERT OR IGNORE INTO stores (${targetCols}) SELECT ${selectCols} FROM stores_old`);
        db.exec("DROP TABLE stores_old");
      })();
      db.pragma('legacy_alter_table = OFF');
      db.pragma('foreign_keys = ON');
    }
  } catch (err) {
    console.warn('[DB] Store unique constraint migration skipped or failed:', err.message);
  }

  // 8. CRITICAL REPAIR: Fix stale FK references from any previous table renames.
  try {
    const allTables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
    const brokenTables = allTables.filter(t => {
      if (!t.sql) return false;
      // Match any FK reference that points to a renamed/backup/temp table
      return /"[^"]*(?:_old|_old_temp|__fk_repair_backup|_tmp_repair_|_fk_fix_)[^"]*"/.test(t.sql);
    });
    
    if (brokenTables.length > 0) {
      console.log(`[DB] REPAIR: Found ${brokenTables.length} tables with stale FK references. Rebuilding...`);
      db.pragma('foreign_keys = OFF');
      db.pragma('legacy_alter_table = ON');
      
      for (const table of brokenTables) {
        try {
          // Fix ALL broken REFERENCES in FK constraints
          // Pattern: REFERENCES "broken_name"(id) → REFERENCES correct_name(id)
          const fixedSql = table.sql.replace(
            /REFERENCES\s+"([^"]+)"/g,
            function(fullMatch, refTable) {
              // Strip all known suffixes to get the real table name
              let clean = refTable;
              clean = clean.replace(/__fk_repair_backup$/, '');
              clean = clean.replace(/_old_temp$/, '');
              clean = clean.replace(/_old$/, '');
              clean = clean.replace(/^_tmp_repair_/, '');
              clean = clean.replace(/^_fk_fix_\d+_/, '');
              if (clean !== refTable) {
                console.log(`[DB] REPAIR:   ${table.name}: "${refTable}" → ${clean}`);
                return `REFERENCES ${clean}`;
              }
              return fullMatch;
            }
          );
          
          // Replace the CREATE TABLE name with a temp name for the swap
          const tmpName = `_fkr_${table.name}`;
          const cols = db.prepare(`PRAGMA table_info('${table.name}')`).all();
          const colNames = cols.map(c => c.name).join(', ');
          
          // Simple string replacement for the CREATE TABLE declaration
          let tmpSql = fixedSql;
          // Handle both quoted and unquoted table names in CREATE TABLE
          tmpSql = tmpSql.replace(
            /^(CREATE\s+TABLE\s+)(?:"[^"]+"|[^\s(]+)/i,
            `$1"${tmpName}"`
          );
          
          db.transaction(() => {
            db.exec(`DROP TABLE IF EXISTS "${tmpName}"`);
            db.exec(tmpSql);
            db.exec(`INSERT OR IGNORE INTO "${tmpName}" (${colNames}) SELECT ${colNames} FROM "${table.name}"`);
            db.exec(`DROP TABLE "${table.name}"`);
            db.exec(`ALTER TABLE "${tmpName}" RENAME TO "${table.name}"`);
          })();
          
          console.log(`[DB] REPAIR: Fixed FKs in table '${table.name}'`);
        } catch (tableErr) {
          console.error(`[DB] REPAIR: Failed to fix table '${table.name}':`, tableErr.message);
        }
      }
      
      db.pragma('legacy_alter_table = OFF');
      db.pragma('foreign_keys = ON');
      console.log('[DB] REPAIR: FK reference repair complete.');
    }
  } catch (repairErr) {
    console.error('[DB] REPAIR: FK repair failed:', repairErr.message);
  }

  try { 
      db.prepare("DROP TABLE IF EXISTS purchases_old").run();
      db.prepare("ALTER TABLE purchases RENAME TO purchases_old").run(); 
  } catch(e) {}
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        invoice_number TEXT UNIQUE NOT NULL,
        supplier TEXT, -- Relaxed NOT NULL for AI flow/Sync
        supplier_id TEXT,
        type TEXT NOT NULL,
        items TEXT NOT NULL, -- JSON items
        total_amount REAL NOT NULL,
        store_id TEXT NOT NULL,
        account_id TEXT,
        date TEXT NOT NULL,
        device_id TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        sync_status INTEGER DEFAULT 0,
        FOREIGN KEY (store_id) REFERENCES stores(id)
      )
    `).run();
    db.prepare("INSERT OR IGNORE INTO purchases SELECT * FROM purchases_old").run();
    db.prepare("DROP TABLE purchases_old").run();
  } catch(e) { console.log("[DB] Migration: purchases rewrite failed, likely already handled."); }

  try { 
      db.prepare("DROP TABLE IF EXISTS quotations_old").run();
      db.prepare("ALTER TABLE quotations RENAME TO quotations_old").run(); 
      db.prepare(`
        CREATE TABLE IF NOT EXISTS quotations (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          quotation_number TEXT UNIQUE NOT NULL,
          items TEXT NOT NULL,
          total_amount REAL NOT NULL,
          customer_id TEXT,
          customer_name TEXT,
          customer_phone TEXT,
          store_id TEXT NOT NULL,
          date TEXT NOT NULL,
          expiry_date TEXT, -- Relaxed NOT NULL
          status TEXT CHECK(status IN ('pending', 'active', 'converted', 'expired', 'cancelled')) DEFAULT 'pending',
          notes TEXT,
          device_id TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          sync_status INTEGER DEFAULT 0,
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (store_id) REFERENCES stores(id)
        )
      `).run();
      db.prepare("INSERT OR IGNORE INTO quotations SELECT * FROM quotations_old").run();
      db.prepare("DROP TABLE quotations_old").run();
  } catch(e) { console.log("[DB] Migration: quotations rewrite failed (SAFE - likely already handled)."); }

  // Ensure transactions has company_id
  try { db.prepare("ALTER TABLE transactions ADD COLUMN company_id TEXT").run(); } catch(e) {}

  // 7. Cleanup Orphaned Triggers (Fix for "no such table: accounts_old")
  try {
    const brokenTriggers = db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='trigger' AND (sql LIKE '%_old%' OR sql LIKE '%main.%')
    `).all();
    
    for (const trigger of brokenTriggers) {
      // Check if it specifically references one of our temporary migration tables
      if (trigger.sql.includes('accounts_old') || trigger.sql.includes('employees_old') || trigger.sql.includes('purchases_old')) {
        console.log(`[DB] Cleanup: Dropping broken legacy trigger [${trigger.name}] referencing _old tables...`);
        db.exec(`DROP TRIGGER IF EXISTS ${trigger.name}`);
      }
    }
  } catch (tErr) {
    console.warn("[DB] Trigger cleanup skipped:", tErr.message);
  }

  // Phase 15: Safe Schema Repair (Additive Only)
  // This phase adds missing columns and repairs broken references without renaming main tables.
  try {
    // 1. Disable Foreign Keys temporarily during repair to avoid "no such table" errors
    db.pragma('foreign_keys = OFF');

    // 2. Add Missing Columns to Core Tables
    const coreTables = ['sales', 'purchases', 'receivings', 'invoices', 'quotations', 'expense_categories', 'purchase_orders'];
    for (const table of coreTables) {
      try {
        const info = db.prepare(`PRAGMA table_info(${table})`).all();
        const cols = info.map(c => c.name);

        // a. Standard Currency Audit Trace
        if (!cols.includes('original_amount')) {
          console.log(`[DB] Safe Repair: Adding original_amount to ${table}...`);
          db.exec(`ALTER TABLE ${table} ADD COLUMN original_amount REAL`);
        }
        if (!cols.includes('original_currency')) {
          console.log(`[DB] Safe Repair: Adding original_currency to ${table}...`);
          db.exec(`ALTER TABLE ${table} ADD COLUMN original_currency TEXT`);
        }
        if (!cols.includes('company_id')) {
          console.log(`[DB] Safe Repair: Adding missing company_id to ${table}...`);
          db.exec(`ALTER TABLE ${table} ADD COLUMN company_id TEXT`);
        }
        if (!cols.includes('deleted_at')) {
          console.log(`[DB] Safe Repair: Adding missing deleted_at to ${table}...`);
          db.exec(`ALTER TABLE ${table} ADD COLUMN deleted_at TEXT`);
        }

        // b. Specific Column Repairs
        if (table === 'sales' && !cols.includes('quotation_id')) {
          console.log(`[DB] Safe Repair: Adding quotation_id to sales...`);
          db.exec(`ALTER TABLE sales ADD COLUMN quotation_id TEXT`);
        }
        if (table === 'sales' && !cols.includes('profit')) {
          console.log(`[DB] Safe Repair: Adding profit to sales...`);
          db.exec(`ALTER TABLE sales ADD COLUMN profit REAL DEFAULT 0`);
        }
        if (table === 'invoices' && !cols.includes('quotation_id')) {
          console.log(`[DB] Safe Repair: Adding quotation_id to invoices...`);
          db.exec(`ALTER TABLE invoices ADD COLUMN quotation_id TEXT`);
        }
      } catch (tableErr) {
        console.warn(`[DB] Safe Repair: Skipping table [${table}] - ${tableErr.message}`);
      }
    }
  
    // Phase 16: Item Kit Multi-Tenant Refinement
    try {
      const kitCols = db.prepare("PRAGMA table_info(item_kits)").all().map(c => c.name);
      if (!kitCols.includes('device_id')) {
        console.log("[DB] Migration: Adding device_id to item_kits...");
        db.prepare("ALTER TABLE item_kits ADD COLUMN device_id TEXT").run();
      }
      
      const kitItemCols = db.prepare("PRAGMA table_info(kit_items)").all().map(c => c.name);
      if (!kitItemCols.includes('device_id')) {
        console.log("[DB] Migration: Adding device_id to kit_items...");
        db.prepare("ALTER TABLE kit_items ADD COLUMN device_id TEXT").run();
      }

      // Relax SKU uniqueness for multi-tenancy
      const kitSchemaResult = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='item_kits'").get();
      const kitItemSchemaResult = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='kit_items'").get();
      
      const needsSkuFix = kitSchemaResult && (kitSchemaResult.sql.toLowerCase().includes("sku text unique") || kitSchemaResult.sql.toLowerCase().includes("sku unique"));
      const hasBrokenFK = kitItemSchemaResult && kitItemSchemaResult.sql.toLowerCase().includes("references item_kits_old");

      if (needsSkuFix || hasBrokenFK) {
          console.log("[DB] Migration: Refining Item Kit schema and fixing potential broken FKs...");
          db.transaction(() => {
            db.pragma('foreign_keys = OFF');
            
            if (needsSkuFix) {
              // 1. Rebuild item_kits
              db.exec("ALTER TABLE item_kits RENAME TO item_kits_old");
              db.exec(`
                CREATE TABLE item_kits (
                  id TEXT PRIMARY KEY,
                  company_id TEXT,
                  name TEXT NOT NULL,
                  sku TEXT,
                  category TEXT,
                  selling_price REAL NOT NULL,
                  store_id TEXT NOT NULL,
                  is_active INTEGER DEFAULT 1,
                  is_deleted INTEGER DEFAULT 0,
                  deleted_at TEXT,
                  device_id TEXT,
                  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                  sync_status INTEGER DEFAULT 0,
                  FOREIGN KEY (store_id) REFERENCES stores(id)
                )
              `);
              const currentKitCols = db.prepare("PRAGMA table_info(item_kits_old)").all().map(c => c.name);
              const targetKitCols = db.prepare("PRAGMA table_info(item_kits)").all().map(c => c.name);
              const commonKitCols = currentKitCols.filter(c => targetKitCols.includes(c));
              const kitColsStr = commonKitCols.join(', ');
              db.exec(`INSERT INTO item_kits (${kitColsStr}) SELECT ${kitColsStr} FROM item_kits_old`);
            }
            
            // 2. Rebuild kit_items to fix FKs (always do this if we had broken FKs or just renamed item_kits)
            db.exec("ALTER TABLE kit_items RENAME TO kit_items_old");
            db.exec(`
              CREATE TABLE kit_items (
                id TEXT PRIMARY KEY,
                kit_id TEXT,
                product_id TEXT,
                quantity REAL NOT NULL,
                company_id TEXT,
                device_id TEXT,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                sync_status INTEGER DEFAULT 0,
                FOREIGN KEY (kit_id) REFERENCES item_kits(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
              )
            `);
            const currentKitItemCols = db.prepare("PRAGMA table_info(kit_items_old)").all().map(c => c.name);
            const targetKitItemCols = db.prepare("PRAGMA table_info(kit_items)").all().map(c => c.name);
            const commonKitItemCols = currentKitItemCols.filter(c => targetKitItemCols.includes(c));
            const kitItemColsStr = commonKitItemCols.join(', ');
            db.exec(`INSERT INTO kit_items (${kitItemColsStr}) SELECT ${kitItemColsStr} FROM kit_items_old`);

            db.exec("DROP TABLE IF EXISTS item_kits_old");
            db.exec("DROP TABLE IF EXISTS kit_items_old");
            db.pragma('foreign_keys = ON');
          })();
      }

      // Add tenant-scoped unique index
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_item_kits_tenant_sku ON item_kits(company_id, sku) WHERE is_deleted = 0 AND sku IS NOT NULL");
      
    } catch (kitErr) {
      console.error('[DB] Item Kit Phase 16 Migration FAILED:', kitErr.message);
    }

    // Phase 17: Advanced Bundle Features (Price Mode & Display Mode)
    try {
      const kitCols = db.prepare("PRAGMA table_info(item_kits)").all().map(c => c.name);
      if (!kitCols.includes('price_mode')) {
        console.log("[DB] Migration: Adding price_mode to item_kits...");
        db.prepare("ALTER TABLE item_kits ADD COLUMN price_mode TEXT DEFAULT 'manual'").run();
      }
      if (!kitCols.includes('display_mode')) {
        console.log("[DB] Migration: Adding display_mode to item_kits...");
        db.prepare("ALTER TABLE item_kits ADD COLUMN display_mode TEXT DEFAULT 'single'").run();
      }
    } catch (kitErr) {
      console.error('[DB] Item Kit Phase 17 Migration FAILED:', kitErr.message);
    }


    // 3. Repair Dangling Foreign Keys (Ghost Tables Fix)
    // We check if invoice_items or sale_payments are pointing to defunct _old names
    const childTables = [
      { name: 'invoice_items', parent: 'invoices', sql: `
        CREATE TABLE invoice_items (
          id TEXT PRIMARY KEY,
          invoice_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          product_name TEXT,
          description TEXT,
          quantity REAL NOT NULL,
          unit_price REAL NOT NULL,
          discount_amount REAL DEFAULT 0,
          tax_amount REAL DEFAULT 0,
          total REAL NOT NULL,
          store_id TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          sync_status INTEGER DEFAULT 0,
          FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )` 
      },
      { name: 'sale_payments', parent: 'sales', sql: `
        CREATE TABLE sale_payments (
          id TEXT PRIMARY KEY,
          company_id TEXT,
          store_id TEXT NOT NULL,
          sale_id TEXT NOT NULL,
          account_id TEXT NOT NULL,
          payment_mode TEXT NOT NULL,
          amount REAL NOT NULL,
          device_id TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          sync_status INTEGER DEFAULT 0,
          deleted_at TEXT,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          FOREIGN KEY (store_id) REFERENCES stores(id)
        )` 
      }
    ];

    for (const child of childTables) {
      try {
        const tableDef = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(child.name);
        if (tableDef && (tableDef.sql.includes('_old') || tableDef.sql.includes('_fix'))) {
          console.log(`[DB] Safe Repair: Detected broken FK in [${child.name}]. Rebuilding child table...`);
          const tempName = `${child.name}_repair_temp`;
          db.exec(`ALTER TABLE ${child.name} RENAME TO ${tempName}`);
          db.exec(child.sql);
          
          // Map columns for data preservation
          const oldCols = db.prepare(`PRAGMA table_info(${tempName})`).all().map(c => c.name);
          const newInfo = db.prepare(`PRAGMA table_info(${child.name})`).all();
          const validCols = newInfo.filter(c => oldCols.includes(c.name)).map(c => c.name);
          const colList = validCols.join(', ');
          
          db.exec(`INSERT INTO ${child.name} (${colList}) SELECT ${colList} FROM ${tempName}`);
          db.exec(`DROP TABLE ${tempName}`);
        }
      } catch (childErr) {
        console.error(`[DB] Repair failed for [${child.name}]:`, childErr.message);
      }
    }

    // 4. Final Cleanup of Orphaned _old Tables
    const staleTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_old'").all();
    for (const st of staleTables) {
      // DON'T drop if it starts with one of our main tables - only if it's clearly a temporary leftover
      if (st.name.endsWith('_old')) {
        console.log(`[DB] Safe Repair: Cleanup leftover temp table [${st.name}]...`);
        db.exec(`DROP TABLE IF EXISTS ${st.name}`);
      }
    }

  } catch (repairErr) {
    console.error('[DB] Safe Schema Repair FAILED:', repairErr.message);
  } finally {
    db.pragma('foreign_keys = ON');
  }


  console.log('[DB] Health Check/Migrations COMPLETED');
  
  // --- GLOBAL FIX: Re-enable Foreign Keys after migrations ---
  db.pragma('foreign_keys = ON');
} catch (e) {
  db.pragma('foreign_keys = ON');
  console.error('[DB] Health Check/Migration FAILED:', e.message);
}

// Create tables with sync_status and updated_at everywhere
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    branch TEXT,
    address TEXT,
    phone TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    UNIQUE(company_id, name)
  );

  -- Many-to-many relationship: Users can access multiple stores
  CREATE TABLE IF NOT EXISTS user_stores (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    user_id TEXT,
    store_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    UNIQUE(user_id, store_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
  );
`);

  // Migration: Ensure user_stores has id column
  try {
    const info = db.prepare("PRAGMA table_info(user_stores)").all();
    if (!info.find(c => c.name === 'id')) {
        console.log("[DB] Migrating user_stores: adding 'id' column...");
        db.transaction(() => {
            db.exec("ALTER TABLE user_stores RENAME TO user_stores_old");
            db.exec(`
                CREATE TABLE user_stores (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    store_id TEXT,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    sync_status INTEGER DEFAULT 0,
                    UNIQUE(user_id, store_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
                )
            `);
            db.exec("INSERT INTO user_stores (id, user_id, store_id, updated_at, sync_status) SELECT lower(hex(randomblob(16))), user_id, store_id, updated_at, sync_status FROM user_stores_old");
            db.exec("DROP TABLE user_stores_old");
        })();
    }
  } catch (err) {
    console.error("[DB] user_stores migration failed:", err.message);
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'user', 'staff', 'super_admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant', 'employee')) NOT NULL,
    is_staff INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_driver INTEGER DEFAULT 0,
    store_id TEXT,
    avatar TEXT,
    -- User Profile Fields
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    pincode TEXT,
    phone TEXT,
    bio TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );


  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT UNIQUE,
    category TEXT,
    selling_price REAL NOT NULL,
    purchase_price REAL NOT NULL,
    quantity REAL DEFAULT 0,
    last_used TEXT,
    unit TEXT DEFAULT 'Pcs',
    brand TEXT,
    barcode TEXT,
    min_stock INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    categoryId TEXT,
    categoryName TEXT,
    is_deleted INTEGER DEFAULT 0,
    is_kit INTEGER DEFAULT 0,
    limited_qty INTEGER,
    barcode_enabled INTEGER DEFAULT 1,
    tax_slab_id TEXT,
    device_id TEXT,
    discount_percentage REAL DEFAULT 0,
    price_inr REAL,
    price_usd REAL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (categoryId) REFERENCES categories(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_company_store ON products(company_id, store_id);


  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    area TEXT,
    credit_balance REAL DEFAULT 0,
    credit_limit REAL DEFAULT 0,
    total_purchases REAL DEFAULT 0,
    store_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    source TEXT DEFAULT 'POS',
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );


  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    store_id TEXT NOT NULL,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS cheques (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    party_type TEXT CHECK(party_type IN ('supplier', 'customer')) NOT NULL,
    party_id TEXT NOT NULL,
    party_name TEXT NOT NULL,
    cheque_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    amount REAL NOT NULL,
    issue_date TEXT NOT NULL,
    clearing_date TEXT,
    status TEXT CHECK(status IN ('pending', 'cleared', 'bounced', 'cancelled')) DEFAULT 'pending',
    store_id TEXT NOT NULL,
    notes TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );
  `);

  // Migration: Ensure cheques has sync/multi-tenancy columns and unique index
  try {
    const info = db.prepare("PRAGMA table_info(cheques)").all();
    if (!info.find(c => c.name === 'is_deleted')) {
      console.log("[DB] Migrating cheques: adding sync/soft-delete columns...");
      db.exec("ALTER TABLE cheques ADD COLUMN is_deleted INTEGER DEFAULT 0");
      db.exec("ALTER TABLE cheques ADD COLUMN deleted_at TEXT");
    }
    if (!info.find(c => c.name === 'company_id')) {
      console.log("[DB] Migrating cheques: adding company_id column...");
      db.exec("ALTER TABLE cheques ADD COLUMN company_id TEXT");
    }
    if (!info.find(c => c.name === 'store_id')) {
      console.log("[DB] Migrating cheques: adding store_id column...");
      db.exec("ALTER TABLE cheques ADD COLUMN store_id TEXT NOT NULL DEFAULT 'default'");
    }
    // Add unique index for tenant-based uniqueness
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_cheques_tenant_unique ON cheques(company_id, bank_name, cheque_number) WHERE is_deleted = 0");
  } catch (err) {
    console.warn("[DB] cheques migration warning:", err.message);
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    store_id TEXT NOT NULL,
    customer_id TEXT,
    account_id TEXT NOT NULL,
    invoice_number TEXT,
    items TEXT NOT NULL, -- JSON String
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    original_amount REAL,
    original_currency TEXT,
    profit REAL DEFAULT 0,
    payment_mode TEXT,
    status TEXT DEFAULT 'completed',
    type TEXT DEFAULT 'retail',
    source TEXT DEFAULT 'POS',
    date TEXT NOT NULL DEFAULT (datetime('now')),
    quotation_id TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
  `);

  // Migration: Quotations Multi-Tenancy & Sync Safety
  try {
    const info = db.prepare("PRAGMA table_info(quotations)").all();
    if (!info.find(c => c.name === 'original_currency') || !info.find(c => c.name === 'is_deleted')) {
      console.log("[DB] Purging and re-creating quotations table for multi-tenancy...");
      db.exec("DROP TABLE IF EXISTS quotations");
    }
  } catch (err) {
    console.warn("[DB] Quotation migration check failed:", err.message);
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    quotation_number TEXT NOT NULL, -- UNIQUE removed to allow tenant-scoped index
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    original_amount REAL,
    original_currency TEXT,
    customer_id TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    store_id TEXT NOT NULL,
    date TEXT NOT NULL,
    expiry_date TEXT, -- Relaxed to NULL for sync parity
    status TEXT CHECK(status IN ('pending', 'active', 'converted', 'expired', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_tenant_unique ON quotations(company_id, quotation_number) WHERE is_deleted = 0;

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    supplier TEXT, -- Relaxed NOT NULL
    supplier_id TEXT,
    type TEXT CHECK(type IN ('cash', 'credit')) NOT NULL,
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    store_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    date TEXT NOT NULL,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    store_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    customer_id TEXT,
    expense_category_id TEXT,
    type TEXT NOT NULL, -- 'income', 'expense', 'payment'
    amount REAL NOT NULL,
    description TEXT,
    date TEXT NOT NULL DEFAULT (datetime('now')),
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
  CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
  CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
  CREATE INDEX IF NOT EXISTS idx_products_company_store ON products(company_id, store_id);
  CREATE INDEX IF NOT EXISTS idx_sales_company_store ON sales(company_id, store_id);
  CREATE INDEX IF NOT EXISTS idx_customers_company_store ON customers(company_id, store_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_company_store ON transactions(company_id, store_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_tenant_invoice ON sales(company_id, invoice_number) WHERE is_deleted = 0;

  CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    store_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    payment_mode TEXT NOT NULL, -- cash, card, upi, etc.
    amount REAL NOT NULL,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );
  CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
  CREATE INDEX IF NOT EXISTS idx_sale_payments_company_store ON sale_payments(company_id, store_id);

  CREATE TABLE IF NOT EXISTS stock_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    store_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity_change REAL NOT NULL,
    reason TEXT,
    reference_id TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS stock_transfers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    product_id TEXT NOT NULL,
    from_store_id TEXT NOT NULL,
    to_store_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    transferred_at TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (from_store_id) REFERENCES stores(id),
    FOREIGN KEY (to_store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    parent_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES expense_categories(id)
  );

  CREATE TABLE IF NOT EXISTS tax_slabs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    store_id TEXT,
    name TEXT NOT NULL,
    percentage REAL NOT NULL,
    device_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS loyalty_points (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    customer_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT,
    sale_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  );

  CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    user_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    amount REAL NOT NULL,
    percentage REAL NOT NULL,
    status TEXT CHECK(status IN ('pending', 'paid')) DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    supplier TEXT NOT NULL,
    supplier_id TEXT,
    items TEXT NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT CHECK(status IN ('draft', 'sent', 'received', 'cancelled')) DEFAULT 'draft',
    store_id TEXT NOT NULL,
    date TEXT NOT NULL,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    employee_id TEXT NOT NULL,
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    status TEXT CHECK(status IN ('present', 'late', 'absent', 'half_day')) DEFAULT 'present',
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS leaves (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    employee_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    type TEXT CHECK(type IN ('sick', 'casual', 'earned', 'unpaid')) NOT NULL,
    reason TEXT,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    employee_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    type TEXT CHECK(type IN ('morning', 'evening', 'full')) NOT NULL,
    status TEXT CHECK(status IN ('assigned', 'completed', 'cancelled')) DEFAULT 'assigned',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    user_id TEXT UNIQUE NOT NULL,
    permissions TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL,
    status TEXT CHECK(status IN ('applied', 'interview', 'offer', 'hired', 'rejected')) DEFAULT 'applied',
    resume_text TEXT,
    score INTEGER DEFAULT 0,
    skills TEXT,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    user_id TEXT, -- Relaxed NOT NULL
    department TEXT,
    designation TEXT,
    salary REAL,
    joining_date TEXT,
    documents TEXT, -- JSON array of URLs
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    store_id TEXT NOT NULL,
    device_id TEXT,
    deleted_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE INDEX IF NOT EXISTS idx_categories_company_store ON categories(company_id, store_id);

  CREATE TABLE IF NOT EXISTS payroll (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    employee_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    basic_salary REAL NOT NULL,
    deductions REAL DEFAULT 0,
    allowances REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    status TEXT DEFAULT 'draft',
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );
 
  CREATE TABLE IF NOT EXISTS performance_reviews (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    employee_id TEXT NOT NULL,
    reviewer_id TEXT,
    review_date TEXT NOT NULL,
    rating REAL DEFAULT 5,
    comments TEXT,
    store_id TEXT NOT NULL,
    device_id TEXT,
    is_deleted INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS item_kits (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category TEXT,
    selling_price REAL NOT NULL,
    store_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    price_mode TEXT DEFAULT 'manual',
    display_mode TEXT DEFAULT 'single',
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS kit_items (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    kit_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (kit_id) REFERENCES item_kits(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS custom_fields (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    store_id TEXT,
    label TEXT NOT NULL,
    type TEXT CHECK(type IN ('text', 'number', 'date', 'select')) NOT NULL,
    options TEXT, -- JSON string for select options
    is_required INTEGER DEFAULT 0,
    show_on_receipt INTEGER DEFAULT 0,
    target_type TEXT CHECK(target_type IN ('product', 'client', 'sale', 'employee')) NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    UNIQUE(company_id, label, target_type)
  );

  CREATE TABLE IF NOT EXISTS product_custom_values (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    store_id TEXT,
    product_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    value TEXT,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (field_id) REFERENCES custom_fields(id)
  );

  CREATE TABLE IF NOT EXISTS sale_custom_values (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    store_id TEXT,
    sale_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    value TEXT,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (field_id) REFERENCES custom_fields(id)
  );

  CREATE TABLE IF NOT EXISTS payment_terms (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    days INTEGER DEFAULT 0,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    supplier_code TEXT UNIQUE,
    company_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,
    account_number TEXT,
    opening_balance REAL DEFAULT 0,
    payment_term_id TEXT,
    credit_limit REAL DEFAULT 0,
    tax_number TEXT,
    currency TEXT DEFAULT 'USD',
    current_balance REAL DEFAULT 0,
    internal_notes TEXT,
    comments TEXT,
    logo TEXT,
    documents TEXT,
    status TEXT CHECK(status IN ('active', 'disabled')) DEFAULT 'active',
    rating INTEGER DEFAULT 5,
    is_preferred INTEGER DEFAULT 0,
    is_blacklisted INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    store_id TEXT NOT NULL,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id),
    FOREIGN KEY (payment_term_id) REFERENCES payment_terms(id)
  );

  CREATE TABLE IF NOT EXISTS supplier_documents (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    supplier_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    store_id TEXT NOT NULL,
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS supplier_custom_fields (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required INTEGER DEFAULT 0,
    show_on_receipt INTEGER DEFAULT 0,
    hide_label INTEGER DEFAULT 0,
    options TEXT,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS supplier_custom_values (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    supplier_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (field_id) REFERENCES supplier_custom_fields(id)
  );

  CREATE TABLE IF NOT EXISTS supplier_transactions (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    supplier_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    date TEXT NOT NULL,
    reference_id TEXT,
    description TEXT,
    store_id TEXT NOT NULL,
    device_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  -- ── Receiving Module ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS receivings (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    receiving_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT NOT NULL,
    purchase_order_id TEXT,
    total_amount REAL DEFAULT 0,
    discount_total REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    amount_due REAL DEFAULT 0,
    account_id TEXT,
    status TEXT CHECK(status IN ('draft','suspended','completed','returned')) DEFAULT 'draft',
    notes TEXT,
    custom_fields TEXT,
    store_id TEXT NOT NULL,
    device_id TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS receiving_items (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    receiving_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    cost REAL NOT NULL,
    quantity REAL NOT NULL,
    discount_pct REAL DEFAULT 0,
    total REAL NOT NULL,
    batch_number TEXT,
    expiry_date TEXT,
    serial_number TEXT,
    location TEXT,
    selling_price REAL,
    upc TEXT,
    description TEXT,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (receiving_id) REFERENCES receivings(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS gift_cards (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    card_number TEXT NOT NULL,
    value REAL NOT NULL,
    balance REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    customer_id TEXT,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    sale_id TEXT NOT NULL,
    payment_mode TEXT NOT NULL,
    amount REAL NOT NULL,
    account_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    sale_id TEXT UNIQUE NOT NULL,
    status TEXT CHECK(status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    notes TEXT,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    sale_id TEXT NOT NULL,
    employee_id TEXT,
    delivery_provider TEXT,
    tracking_number TEXT,
    delivery_type TEXT CHECK(delivery_type IN ('internal', 'external')) DEFAULT 'internal',
    address TEXT,
    delivery_charge REAL DEFAULT 0,
    is_cod INTEGER DEFAULT 0,
    status TEXT CHECK(status IN ('pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'failed')) DEFAULT 'pending',
    delivery_date TEXT,
    notes TEXT,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS delivery_zones (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    name TEXT NOT NULL,
    fee REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE INDEX IF NOT EXISTS idx_receivings_store ON receivings(store_id);
  CREATE INDEX IF NOT EXISTS idx_receivings_supplier ON receivings(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_receiving_items_receiving ON receiving_items(receiving_id);
  CREATE INDEX IF NOT EXISTS idx_gift_cards_number ON gift_cards(card_number);
  CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
  CREATE INDEX IF NOT EXISTS idx_delivery_zones_store ON delivery_zones(store_id);
  CREATE INDEX IF NOT EXISTS idx_sales_date_store ON sales(store_id, date);
  CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_deleted);
  CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);

  -- ── Invoice Module ──────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    invoice_number TEXT,
    type TEXT CHECK(type IN ('customer', 'supplier')) NOT NULL,
    status TEXT CHECK(status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
    customer_id TEXT,
    supplier_id TEXT,
    date TEXT NOT NULL,
    due_date TEXT,
    subtotal REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    amount_due REAL DEFAULT 0,
    original_amount REAL,
    original_currency TEXT,
    quotation_id TEXT,
    notes TEXT,
    store_id TEXT NOT NULL,
    device_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    deleted_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    invoice_id TEXT NOT NULL,
    product_id TEXT,
    description TEXT,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    store_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    sync_status INTEGER DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (store_id) REFERENCES stores(id)
  );

    CREATE INDEX IF NOT EXISTS idx_invoices_store ON invoices(store_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_tenant_invoice ON invoices(company_id, invoice_number) WHERE is_deleted = 0;
  `);

// --- Migrations for Elegance Frontend Compatibility ---
const addCol = (table, columnDef) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    console.log(`[DB] Migration: Added column ${columnDef} to ${table}`);
  } catch (e) {
    if (!e.message.includes('duplicate column name')) {
      console.warn(`[DB] Migration Warning for ${table} (${columnDef}):`, e.message);
    }
  }
};

addCol('users', 'address_line1 TEXT');
addCol('users', 'address_line2 TEXT');
addCol('users', 'city TEXT');
addCol('users', 'state TEXT');
addCol('users', 'country TEXT');
addCol('users', 'pincode TEXT');
addCol('users', 'phone TEXT');
addCol('users', 'bio TEXT');

addCol('products', 'discount_percentage INTEGER DEFAULT 0');
addCol('products', 'price_inr REAL');
addCol('products', 'price_usd REAL');

addCol('customers', 'source TEXT DEFAULT "POS"');
addCol('customers', 'joined_at TEXT');

// --- Soft-Delete migrations (is_deleted flag for all key tables) ---
addCol('customers',     'is_deleted INTEGER DEFAULT 0');
addCol('purchases',     'is_deleted INTEGER DEFAULT 0');
addCol('sales',         'is_deleted INTEGER DEFAULT 0');
addCol('quotations',    'is_deleted INTEGER DEFAULT 0');
addCol('transactions',  'is_deleted INTEGER DEFAULT 0');
addCol('receivings',    'is_deleted INTEGER DEFAULT 0');
addCol('invoices',      'is_deleted INTEGER DEFAULT 0');
addCol('users',         'is_deleted INTEGER DEFAULT 0');
addCol('users',         'is_superuser INTEGER DEFAULT 0');
addCol('employees',     'is_deleted INTEGER DEFAULT 0');
addCol('accounts',      'is_deleted INTEGER DEFAULT 0');
addCol('stores',        'is_deleted INTEGER DEFAULT 0');
addCol('users',         'deleted_at TEXT');
addCol('employees',     'deleted_at TEXT');
// --------------------------------------------------------
// --------------------------------------------------------
// --- AUTO-RESTORE DEVELOPER ACCOUNTS ---
try {
  const devAccounts = [
    { email: 'burhanuddinmoris52@gmail.com', pass: 'tmr@5253', name: 'Burhanuddin Moriswala', id: 'user-dev-52' },
    { email: 'burhanuddinmoris5253@gmail.com', pass: 'tmr@5253', name: 'Burhanuddin VPS Login', id: 'user-dev-5253' }
  ];

  devAccounts.forEach(acc => {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(acc.email);
    const hashedPassword = bcrypt.hashSync(acc.pass, 10);

    if (!existing) {
      console.log(`[DB] Auto-Restore: Creating developer account ${acc.email}...`);
      let storeId = 'store-1';
      const firstStore = db.prepare('SELECT id FROM stores LIMIT 1').get();
      if (firstStore) storeId = firstStore.id;
      else {
        db.prepare("INSERT INTO stores (id, name, updated_at) VALUES ('store-1', 'Main Store', datetime('now'))").run();
      }

      db.prepare(`
        INSERT INTO users (id, name, email, password, role, is_active, is_superuser, store_id, updated_at)
        VALUES (?, ?, ?, ?, 'super_admin', 1, 1, ?, datetime('now'))
      `).run(acc.id, acc.name, acc.email, hashedPassword, storeId);
    } else {
      // Only update if the user is not already in the desired state to avoid triggering sync cycles
      db.prepare(`
        UPDATE users 
        SET role = 'super_admin', is_active = 1, is_superuser = 1, is_deleted = 0 
        WHERE email = ? 
        AND (role != 'super_admin' OR is_active != 1 OR is_superuser != 1 OR is_deleted != 0)
      `).run(acc.email);
    }
  });
} catch (e) {
  console.error('[DB] Auto-Restore Failed:', e.message);
}
// --------------------------------------------------------
// --------------------------------------------------------


// EXPLICIT MIGRATION CHECK ON STARTUP
try {
  // Users Role Migration (Phase 3 RBAC)
  const usersCols = db.prepare('PRAGMA table_info(users)').all();
  if (!usersCols.some(col => col.name === 'is_driver')) {
    db.prepare('ALTER TABLE users ADD COLUMN is_driver INTEGER DEFAULT 0').run();
  }

  // Sales migration
  const salesTableInfo = db.prepare('PRAGMA table_info(sales)').all();
  if (!salesTableInfo.some(col => col.name === 'status')) {
    db.prepare("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed'").run();
  }
  if (!salesTableInfo.some(col => col.name === 'source')) {
    db.prepare("ALTER TABLE sales ADD COLUMN source TEXT DEFAULT 'POS'").run();
  }
  if (!salesTableInfo.some(col => col.name === 'subtotal')) {
    db.prepare("ALTER TABLE sales ADD COLUMN subtotal REAL DEFAULT 0").run();
  }
  if (!salesTableInfo.some(col => col.name === 'discount_amount')) {
    db.prepare("ALTER TABLE sales ADD COLUMN discount_amount REAL DEFAULT 0").run();
  }
  if (!salesTableInfo.some(col => col.name === 'tax_amount')) {
    db.prepare("ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0").run();
  }
  const productsTableInfo = db.prepare('PRAGMA table_info(products)').all();
  const hasBarcodeEnabled = productsTableInfo.some(col => col.name === 'barcode_enabled');
  if (!hasBarcodeEnabled) {
    db.prepare('ALTER TABLE products ADD COLUMN barcode_enabled INTEGER DEFAULT 1').run();
  }

  // --- Category Schema Migration ---
  const hasCategoryId = productsTableInfo.some(col => col.name === 'category_id');
  if (!hasCategoryId) {
    try {
      console.log('[DB] Migrating products table: category -> category_id, category_name');
      // 1. Add new columns
      db.prepare('ALTER TABLE products ADD COLUMN category_id TEXT').run();
      db.prepare('ALTER TABLE products ADD COLUMN category_name TEXT').run();
      
      // 2. Copy old 'category' data to 'category_name' (for baseline)
      db.prepare('UPDATE products SET category_name = category').run();
      
      console.log('[DB] Category columns added and initialized.');
    } catch (e) {
      console.error('[DB] Category migration failed:', e.message);
    }
  }

  // Individual column additions with error suppression to ensure idempotency
  const addColumn = (table, columnDef) => {
    try {
      db.prepare('ALTER TABLE ' + table + ' ADD COLUMN ' + columnDef).run();
      console.log('[DB] Added column ' + columnDef + ' to ' + table);
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.warn('[DB] Could not add column ' + columnDef + ' to ' + table + ': ', e.message);
      }
    }
  };

  const DEFAULT_TS = "'2026-01-01 00:00:00'";
  addColumn('kit_items', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  addColumn('kit_items', 'sync_status INTEGER DEFAULT 0');
  addColumn('product_custom_values', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  addColumn('product_custom_values', 'sync_status INTEGER DEFAULT 0');

  addColumn('stock_logs', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  addColumn('loyalty_points', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  addColumn('commissions', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  addColumn('supplier_documents', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  addColumn('supplier_transactions', 'updated_at TEXT NOT NULL DEFAULT ' + DEFAULT_TS);
  
  // Purchase Order Extensions
  addColumn('purchase_orders', 'expected_delivery_date TEXT');
  addColumn('purchase_orders', 'tax_amount REAL DEFAULT 0');
  addColumn('purchase_orders', 'discount_amount REAL DEFAULT 0');
  addColumn('purchase_orders', 'subtotal REAL DEFAULT 0');
  addColumn('purchase_orders', 'notes TEXT');
  addColumn('purchase_orders', 'po_number TEXT');

  // Deliveries & Work Orders
  addColumn('deliveries', 'delivery_date TEXT');
  addColumn('work_orders', 'notes TEXT');
  addColumn('customers', 'credit_limit REAL DEFAULT 0');

  // Sales Payment Mode Constraint Migration (Remove restrictive CHECK)
  const salesSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sales'").get();

  // Debug log to a file so we can see what's happening
  fs.appendFileSync('db_migration_log.txt', `[${new Date().toISOString()}] Sales Schema: ${salesSchema ? salesSchema.sql : 'NOT FOUND'}\n`);

  if (salesSchema && salesSchema.sql.includes("payment_mode") && salesSchema.sql.includes("CHECK") && salesSchema.sql.includes("'wallet'")) {
    fs.appendFileSync('db_migration_log.txt', `[${new Date().toISOString()}] Starting sales table migration...\n`);
    db.transaction(() => {
      // 1. Rename existing table
      db.prepare("ALTER TABLE sales RENAME TO sales_old").run();

      // 2. Create new table without the constraint
      db.exec(`
        CREATE TABLE sales (
          id TEXT PRIMARY KEY,
          invoice_number TEXT UNIQUE NOT NULL,
          type TEXT CHECK(type IN ('retail', 'cash', 'credit')) NOT NULL,
          status TEXT DEFAULT 'completed',
          items TEXT NOT NULL,
          subtotal REAL DEFAULT 0,
          discount_amount REAL DEFAULT 0,
          tax_amount REAL DEFAULT 0,
          total_amount REAL NOT NULL,
          profit REAL NOT NULL,
          payment_mode TEXT NOT NULL,
          account_id TEXT NOT NULL,
          customer_id TEXT,
          store_id TEXT NOT NULL,
          source TEXT DEFAULT 'POS',
          date TEXT NOT NULL,
          quotation_id TEXT,
          device_id TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          sync_status INTEGER DEFAULT 0,
          FOREIGN KEY (account_id) REFERENCES accounts(id),
          FOREIGN KEY (customer_id) REFERENCES customers(id),
          FOREIGN KEY (store_id) REFERENCES stores(id)
        )
      `);

      // 3. Copy data
      db.prepare("INSERT INTO sales SELECT * FROM sales_old").run();

      // 4. Create indexes that were lost
      db.prepare("CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id)").run();
      db.prepare("CREATE INDEX IF NOT EXISTS idx_sales_date_store ON sales(store_id, date)").run();

      fs.appendFileSync('db_migration_log.txt', `[${new Date().toISOString()}] Sales table migration completed successfully.\n`);
      console.log("[DB] Sales table migration completed successfully.");
    })();
  } else {
    fs.appendFileSync('db_migration_log.txt', `[${new Date().toISOString()}] Sales table migration NOT NEEDED or condition not met.\n`);
  }

  // FIX FOR TABLES POINTING TO OLD VERSIONS (_old)
  const tablesToFixFK = ['sale_payments', 'work_orders', 'deliveries', 'loyalty_points', 'commissions', 'attendance', 'leaves', 'shifts', 'payroll', 'cheques', 'employees'];
  for (const tbl of tablesToFixFK) {
    try {
      const fks = db.prepare(`PRAGMA foreign_key_list(${tbl})`).all();
      const brokenFKs = fks.filter(fk => fk.table.endsWith('_old'));

      if (brokenFKs.length > 0) {
        console.log(`[DB] FK Fix Required: ${tbl} has ${brokenFKs.length} broken references. Re-creating table...`);

        let createSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(tbl).sql;

        for (const brokenFK of brokenFKs) {
          const targetTable = brokenFK.table.replace('_old', '');
          console.log(`[DB]   - Replacing ${brokenFK.table} with ${targetTable}`);
          createSql = createSql.replace(new RegExp(`REFERENCES\\s+"?${brokenFK.table}"?`, 'g'), `REFERENCES ${targetTable}`);
        }

        db.transaction(() => {
          db.exec('PRAGMA foreign_keys = OFF;');
          db.exec(`ALTER TABLE ${tbl} RENAME TO ${tbl}_old_temp`);
          db.exec(createSql);
          db.exec(`INSERT INTO ${tbl} SELECT * FROM ${tbl}_old_temp`);
          db.exec(`DROP TABLE ${tbl}_old_temp`);
          db.exec('PRAGMA foreign_keys = ON;');
        })();
        console.log(`[DB] FK Fix Completed for ${tbl}.`);
      }
    } catch (fkErr) {
      if (!fkErr.message.includes('no such table')) {
        console.error(`[DB] FK Fix FAILED for ${tbl}:`, fkErr.message);
      }
    }
  }

  // Invoices migration for existing installs
  const invoicesTableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'").get();
  if (!invoicesTableInfo) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
    company_id TEXT,
  invoice_number TEXT UNIQUE NOT NULL,
  type TEXT CHECK(type IN('customer', 'supplier')) NOT NULL,
  status TEXT CHECK(status IN('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  customer_id TEXT,
  supplier_id TEXT,
  date TEXT NOT NULL,
  due_date TEXT,
  subtotal REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  amount_due REAL DEFAULT 0,
  notes TEXT,
  store_id TEXT NOT NULL,
  device_id TEXT,
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  sync_status INTEGER DEFAULT 0,
  FOREIGN KEY(customer_id) REFERENCES customers(id),
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY(store_id) REFERENCES stores(id)
);
      CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
    company_id TEXT,
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total REAL NOT NULL,
  store_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  sync_status INTEGER DEFAULT 0,
  FOREIGN KEY(invoice_id) REFERENCES invoices(id),
  FOREIGN KEY(product_id) REFERENCES products(id),
  FOREIGN KEY(store_id) REFERENCES stores(id)
);
`);
    console.log('[DB] Invoice tables created via migration.');
  }


  // Users Role Migration (Phase 3 RBAC)
  // Check if 'super_admin' is a valid role by trying to insert/check schema or just force update
  // Since we can't easily check check_constraints in sqlite seamlessly, we will recreate the table if needed.
  // We can check if a known user has a new role. If not, we might need to migrate.
  // Let's just do a schema migration pattern: rename table, create new, copy, drop old.
  // To avoid running this every time, we check a specific flag or just check if the schema matches.
  // Simplified: We will drop the check constraint by recreating the table.

  const userTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (userTableInfo && (!userTableInfo.sql.includes('super_admin') || !userTableInfo.sql.includes('accountant') || !userTableInfo.sql.includes('employee'))) {
    console.log('[DB] RE-SYNCING users table for RBAC...');

    try {
      db.exec('PRAGMA foreign_keys = OFF;');
      db.exec('DROP TABLE IF EXISTS users_new;');

      db.exec(`
          CREATE TABLE users_new(
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  password TEXT,
  role TEXT CHECK(role IN('admin', 'user', 'staff', 'super_admin', 'hr_manager', 'sales_manager', 'inventory_manager', 'accountant', 'employee')) NOT NULL,
  is_staff INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  store_id TEXT,
  avatar TEXT,
  device_id TEXT,
  updated_at TEXT NOT NULL DEFAULT(datetime('now')),
  sync_status INTEGER DEFAULT 0,
  FOREIGN KEY(store_id) REFERENCES stores(id)
);
`);

      db.exec('BEGIN TRANSACTION;');
      // Only copy columns that definitely exist or can be defaulted
      // Better-sqlite3 allows us to get PRAGMA table_info to be precise, but COALESCE is easier
      db.exec(`
          INSERT INTO users_new(
  id, name, email, username, first_name, last_name, password, role,
  is_staff, is_active, store_id, avatar, device_id, updated_at, sync_status
)
SELECT
id, name, email,
  COALESCE(username, email),
  COALESCE(first_name, name),
  COALESCE(last_name, ''),
  password, role,
  COALESCE(is_staff, 0),
  COALESCE(is_active, 1),
  store_id, avatar, device_id, updated_at, sync_status 
          FROM users;
`);

      db.exec('DROP TABLE users;');
      db.exec('ALTER TABLE users_new RENAME TO users;');
      db.exec('COMMIT;');
      console.log('[DB] Users table migrated successfully.');
    } catch (migrateError) {
      try { db.exec('ROLLBACK;'); } catch (e) { }
      console.error('[DB] Users migration failed:', migrateError.message);
    } finally {
      db.exec('PRAGMA foreign_keys = ON;');
    }
  }

  // Force fix for null passwords locally just in case
  try {
    const nullPasswords = db.prepare("SELECT count(*) as count FROM users WHERE password IS NULL").get();
    if (nullPasswords && nullPasswords.count > 0) {
      console.log(`[DB] Found ${nullPasswords.count} users with missing passwords.Applying fix and forcing sync...`);
      db.prepare("UPDATE users SET password = 'ChangeMe123!' WHERE password IS NULL").run();
    }
  } catch (e) { }

  // Users migration for alignment
  const userInfo = db.prepare('PRAGMA table_info(users)').all();
  const missingUserFields = [];
  if (!userInfo.some(col => col.name === 'username')) missingUserFields.push('username TEXT');
  if (!userInfo.some(col => col.name === 'first_name')) missingUserFields.push('first_name TEXT');
  if (!userInfo.some(col => col.name === 'last_name')) missingUserFields.push('last_name TEXT');
  try {
      db.prepare('ALTER TABLE products ADD COLUMN tax_slab_id TEXT').run();
    } catch(e) {}
    
    // Phase Multi-Tenant Tax Slabs Migration
    try { db.prepare('ALTER TABLE tax_slabs ADD COLUMN store_id TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE tax_slabs ADD COLUMN device_id TEXT').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE tax_slabs ADD COLUMN is_deleted INTEGER DEFAULT 0').run(); } catch(e) {}
    try { db.prepare('ALTER TABLE tax_slabs ADD COLUMN deleted_at TEXT').run(); } catch(e) {}
  if (!userInfo.some(col => col.name === 'is_staff')) missingUserFields.push('is_staff INTEGER DEFAULT 0');
  if (!userInfo.some(col => col.name === 'is_active')) missingUserFields.push('is_active INTEGER DEFAULT 1');
  if (!userInfo.some(col => col.name === 'password')) missingUserFields.push('password TEXT');

  missingUserFields.forEach(fieldSql => {
    db.prepare('ALTER TABLE users ADD COLUMN ' + fieldSql).run();
  });

  // Additional product fields for tax
  const productsCols = db.prepare('PRAGMA table_info(products)').all();
  if (!productsCols.some(col => col.name === 'tax_slab_id')) {
    db.prepare('ALTER TABLE products ADD COLUMN tax_slab_id TEXT').run();
  }
  if (!productsCols.some(col => col.name === 'min_stock')) {
    db.prepare('ALTER TABLE products ADD COLUMN min_stock INTEGER DEFAULT 0').run();
  }
  if (!productsCols.some(col => col.name === 'reorder_quantity')) {
    db.prepare('ALTER TABLE products ADD COLUMN reorder_quantity INTEGER DEFAULT 0').run();
  }
  
  if (!productsCols.some(col => col.name === 'description')) {
    db.prepare('ALTER TABLE products ADD COLUMN description TEXT').run();
  }

  // Suppliers Migration
  const suppliersCols = db.prepare('PRAGMA table_info(suppliers)').all();
  if (!suppliersCols.some(col => col.name === 'supplier_code')) {
    db.prepare('ALTER TABLE suppliers ADD COLUMN supplier_code TEXT').run();
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code)').run();
  }
  if (!suppliersCols.some(col => col.name === 'payment_term_id')) {
    db.prepare('ALTER TABLE suppliers ADD COLUMN payment_term_id TEXT').run();
  }

  // Receiving Module Migrations
  const receivingsCols = db.prepare('PRAGMA table_info(receivings)').all();
  if (receivingsCols.length > 0 && !receivingsCols.some(col => col.name === 'sync_status')) {
    console.log('[DB] Migrating receivings table: adding sync_status');
    db.prepare('ALTER TABLE receivings ADD COLUMN sync_status INTEGER DEFAULT 0').run();
  }

  const receivingItemsCols = db.prepare('PRAGMA table_info(receiving_items)').all();
  if (receivingItemsCols.length > 0 && !receivingItemsCols.some(col => col.name === 'sync_status')) {
    console.log('[DB] Migrating receiving_items table: adding sync_status');
    db.prepare('ALTER TABLE receiving_items ADD COLUMN sync_status INTEGER DEFAULT 0').run();
  }

  // Password Hashing Migration
  const usersToHash = db.prepare("SELECT id, password FROM users").all();
  for (const user of usersToHash) {
    // Skip if it's already a bcrypt hash OR a Django PBKDF2 hash (to avoid unnecessary re-hashing sync cycles)
    if (user.password && 
        !user.password.startsWith('$2a$') && 
        !user.password.startsWith('$2b$') && 
        !user.password.startsWith('$2y$') && 
        !user.password.startsWith('pbkdf2_sha')) {
      console.log(`[DB] Hashing plain - text password for user: ${user.id} `);
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, user.id);
    }
  }

  // Phase 6: Performance Indices (Ensure existing DBs get them)
  db.prepare('CREATE INDEX IF NOT EXISTS idx_sales_date_store ON sales(store_id, date)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_deleted)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id)').run();
  // Phase 12: HR Migration (user_id -> employee_id)
  const hrTables = ['attendance', 'leaves', 'shifts'];
  for (const table of hrTables) {
    const info = db.prepare(`PRAGMA table_info(${table})`).all();
    if (info.some(col => col.name === 'user_id')) {
      console.log(`[DB] Migrating ${table} table to employee_id...`);
      try {
        db.transaction(() => {
          db.exec(`ALTER TABLE ${table} RENAME TO ${table}_old`);

          // Create new table (definitions already updated above, but use explicit here for safety during migration)
          if (table === 'attendance') {
            db.exec(`
              CREATE TABLE attendance (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL,
                date TEXT NOT NULL,
                check_in TEXT,
                check_out TEXT,
                status TEXT CHECK(status IN ('present', 'late', 'absent', 'half_day')) DEFAULT 'present',
                store_id TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                sync_status INTEGER DEFAULT 0,
                FOREIGN KEY (employee_id) REFERENCES employees(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
              )
            `);
          } else if (table === 'leaves') {
            db.exec(`
              CREATE TABLE leaves (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                type TEXT CHECK(type IN ('sick', 'casual', 'earned', 'unpaid')) NOT NULL,
                reason TEXT,
                status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
                store_id TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                sync_status INTEGER DEFAULT 0,
                FOREIGN KEY (employee_id) REFERENCES employees(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
              )
            `);
          } else if (table === 'shifts') {
            db.exec(`
              CREATE TABLE shifts (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL,
                store_id TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                type TEXT CHECK(type IN ('morning', 'evening', 'full')) NOT NULL,
                status TEXT CHECK(status IN ('assigned', 'completed', 'cancelled')) DEFAULT 'assigned',
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                sync_status INTEGER DEFAULT 0,
                FOREIGN KEY (employee_id) REFERENCES employees(id),
                FOREIGN KEY (store_id) REFERENCES stores(id)
              )
            `);
          }

          // Move data, mapping user_id to employee_id
          if (table === 'attendance') {
            db.exec(`
              INSERT INTO attendance (id, employee_id, date, check_in, check_out, status, store_id, updated_at, sync_status) 
              SELECT t.id, e.id as employee_id, t.date, t.check_in, t.check_out, t.status, t.store_id, t.updated_at, t.sync_status
              FROM attendance_old t
              JOIN employees e ON t.user_id = e.user_id
            `).run();
          } else if (table === 'leaves') {
            db.exec(`
              INSERT INTO leaves (id, employee_id, start_date, end_date, type, reason, status, store_id, updated_at, sync_status)
              SELECT t.id, e.id as employee_id, t.start_date, t.end_date, t.type, t.reason, t.status, t.store_id, t.updated_at, t.sync_status
              FROM leaves_old t
              JOIN employees e ON t.user_id = e.user_id
            `);
          } else if (table === 'shifts') {
            db.exec(`
              INSERT INTO shifts (id, employee_id, store_id, start_time, end_time, type, status, updated_at, sync_status)
              SELECT t.id, e.id as employee_id, t.store_id, t.start_time, t.end_time, t.type, t.status, t.updated_at, t.sync_status
              FROM shifts_old t
              JOIN employees e ON t.user_id = e.user_id
            `);
          }

          // Note: If some users didn't have employee records, they are lost in HR history.
          // This is acceptable as we are enforcing the User-Employee link now.

          db.exec(`DROP TABLE ${table}_old`);
        })();
        console.log(`[DB] ${table} migrated successfully.`);
      } catch (e) {
        console.error(`[DB] Failed to migrate ${table}:`, e.message);
      }
    }
  }

} catch (err) {
  console.error('[DB] Migration Error:', err);
}

// Initialize device_id if not present
let deviceId = db.prepare('SELECT value FROM settings WHERE key = ?').get('device_id')?.value
if (!deviceId) {
  deviceId = crypto.randomUUID()
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('device_id', deviceId)
  console.log(`Generated new device_id: ${deviceId} `)
} else {
  console.log(`Existing device_id: ${deviceId} `)
}

// Phase 15: Category Migration (Recover categories from products table)
try {
  const existingProducts = db.prepare("SELECT DISTINCT category, store_id FROM products WHERE category IS NOT NULL AND category != ''").all();
  db.transaction(() => {
    for (const p of existingProducts) {
      // Check if category already exists in the new categories table
      const exists = db.prepare("SELECT id FROM categories WHERE name = ? AND store_id = ?").get(p.category, p.store_id);
      if (!exists) {
        const catId = `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        db.prepare("INSERT INTO categories(id, name, store_id, updated_at, sync_status) VALUES(?, ?, ?, datetime('now'), 0)").run(catId, p.category, p.store_id);
        console.log(`[DB] Migrated category '${p.category}' to categories table with id ${catId}`);
      }
    }
  })();
} catch (e) {
  console.error('[DB] Category migration failed:', e.message);
}

// Attendance & Leaves Migration
try {
  const tableInfoAtt = db.prepare("PRAGMA table_info(attendance)").all();
  const hasUserIdAtt = tableInfoAtt.some(col => col.name === 'user_id');
  const hasEmployeeIdAtt = tableInfoAtt.some(col => col.name === 'employee_id');

  if (hasUserIdAtt && !hasEmployeeIdAtt) {
    console.log("[DB] Migrating attendance table: user_id -> employee_id");
    db.exec("ALTER TABLE attendance RENAME COLUMN user_id TO employee_id");
  }
} catch (e) { }

// Phase 14: HR Data Integrity Cleanup (Fix user_id being used as employee_id)
try {
  const users = db.prepare("SELECT id, store_id FROM users").all();
  const insertEmp = db.prepare(`
    INSERT OR IGNORE INTO employees(id, user_id, department, designation, salary, joining_date, store_id)
    VALUES(?, ?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const u of users) {
      // Check if user already has an employee profile
      const existing = db.prepare("SELECT id FROM employees WHERE user_id = ?").get(u.id);
      if (!existing) {
        const empId = `emp-${u.id.replace('user-', '')}-${Math.floor(Math.random() * 1000)}`;
        insertEmp.run(empId, u.id, 'Management', 'Staff', 0, new Date().toISOString().split('T')[0], u.store_id || 'store-1');
        console.log(`[DB] Created missing employee profile ${empId} for user ${u.id}`);
      }
    }
  })();

  // Correct mismatched employee_id and store_id in attendance/leaves
  const hrTables = ['attendance', 'leaves', 'shifts'];
  db.transaction(() => {
    for (const table of hrTables) {
      // Find records where employee_id matches a user_id
      const recordsToFix = db.prepare(`
            SELECT t.id, t.employee_id, t.store_id, e.id as correct_employee_id, e.store_id as correct_store_id
            FROM ${table} t
            JOIN employees e ON t.employee_id = e.user_id
          `).all();

      if (recordsToFix.length > 0) {
        console.log(`[DB] Fixing ${recordsToFix.length} records in ${table} using incorrect employee_id/store_id...`);
        const updateStmt = db.prepare(`UPDATE ${table} SET employee_id = ?, store_id = ? WHERE id = ?`);
        for (const rec of recordsToFix) {
          updateStmt.run(rec.correct_employee_id, rec.correct_store_id || rec.store_id || 'store-1', rec.id);
        }
      }
    }
  })();
} catch (integrityErr) {
  console.error('[DB] Integrity Cleanup Error:', integrityErr.message);
}
try {
  const tableInfoLeaves = db.prepare("PRAGMA table_info(leaves)").all();
  const hasUserIdLeaves = tableInfoLeaves.some(col => col.name === 'user_id');
  const hasEmployeeIdLeaves = tableInfoLeaves.some(col => col.name === 'employee_id');

  if (hasUserIdLeaves && !hasEmployeeIdLeaves) {
    console.log("[DB] Migrating leaves table: user_id -> employee_id");
    db.exec("ALTER TABLE leaves RENAME COLUMN user_id TO employee_id");
  }
} catch (err) {
  console.warn("[DB] Migration error (non-critical):", err.message);
}

// FINALLY: Re-enable foreign keys after all migrations and fixes are done
console.log('[DB] Enabling Foreign Key Enforcement...');
db.pragma('foreign_keys = ON');

// Seed initial data if tables are empty
try {
  const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get().count
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count
  console.log(`Current DB status - Stores: ${storeCount}, Products: ${productCount} `)

  if (storeCount === 0 || productCount === 0) {
    console.log('Seeding initial data...')

    // Insert stores (only if missing)
    if (storeCount === 0) {
      db.prepare(`INSERT INTO stores(id, name, branch, address, phone, device_id) VALUES(?, ?, ?, ?, ?, ?)`).run(
        'store-1', 'Hardware Central', 'Main Branch', '123 Industrial Ave', '+1 555-0100', deviceId
      )
    }

    // Insert users
    db.prepare(`INSERT INTO users(id, name, email, role, store_id, device_id) VALUES(?, ?, ?, ?, ?, ?)`).run(
      'user-1', 'John Admin', 'admin@hardware.com', 'admin', 'store-1', deviceId
    )

    // 3. Insert accounts for each store
    const allStores = db.prepare('SELECT id FROM stores').all()
    for (const s of allStores) {
      const accountExists = db.prepare('SELECT COUNT(*) as count FROM accounts WHERE store_id = ?').get(s.id).count > 0
      if (!accountExists) {
        db.prepare(`INSERT INTO accounts(id, name, type, balance, store_id, device_id) VALUES(?, ?, ?, ?, ?, ?)`).run(
          `acc-${s.id}`, 'Main Cash', 'cash', 5000, s.id, deviceId
        )
      }

      // Also ensure 'acc-cash' exists for at least the primary store to handle legacy fallbacks
      if (s.id === 'store-1') {
        const accCashExists = db.prepare('SELECT id FROM accounts WHERE id = ?').get('acc-cash')
        if (!accCashExists) {
          db.prepare(`INSERT INTO accounts(id, name, type, balance, store_id, device_id) VALUES(?, ?, ?, ?, ?, ?)`).run(
            'acc-cash', 'Cash (Legacy)', 'cash', 0, 'store-1', deviceId
          )
          console.log('[DB] Created acc-cash fallback account for store-1');
        }
      }
    }

    // Insert demo products with barcodes
    const products = [
      ['prod-1', 'Power Drill 18V', 'PWR-001', 'Power Tools', 89.99, 55.00, 24, 'store-1', 'Pcs', 'DeWalt', '12345678'],
      ['prod-2', 'Hammer Claw 16oz', 'HND-002', 'Hand Tools', 19.99, 8.50, 56, 'store-1', 'Pcs', 'Stanley', '87654321'],
      ['prod-3', 'Screwdriver Set 12pc', 'HND-003', 'Hand Tools', 29.99, 12.00, 38, 'store-1', 'Set', 'Craftsman', '11223344'],
    ]

    const insertProduct = db.prepare(`
      INSERT INTO products(id, name, sku, category, selling_price, purchase_price, quantity, store_id, unit, brand, barcode, device_id, last_used)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    products.forEach(p => {
      console.log(`Inserting product: ${p[1]} `)
      const params = [...p]
      params.splice(11, 0, deviceId) // Insert deviceId at correct position
      insertProduct.run(...params)
    })

    console.log('Initial data seeded successfully!')
  }

  // Seed Attendance & Leaves for AI Testing
  const attendanceCount = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'").get()
    ? db.prepare('SELECT COUNT(*) as count FROM attendance').get().count
    : 0;

  if (attendanceCount === 0) {
    // Only seed if user-1 exists (FK safety)
    const userExists = db.prepare("SELECT id FROM users WHERE id = 'user-1'").get()
    if (userExists) {
      console.log('Seeding initial attendance data...')
      const userId = 'user-1'
      const today = new Date()

      // Disable FK checks during seeding to avoid order issues
      db.pragma('foreign_keys = OFF')

      try {
        const insertAtt = db.prepare(`INSERT OR IGNORE INTO attendance(id, employee_id, date, check_in, check_out, status, store_id, updated_at, sync_status) VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)`)

        for (let i = 30; i > 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          if (d.getDay() === 0) continue // Skip Sundays

          const isLate = d.getDay() === 1 || Math.random() < 0.2
          const checkInHour = isLate ? 10 : 9
          const checkInMin = Math.floor(Math.random() * 30)

          const checkInTime = new Date(d)
          checkInTime.setHours(checkInHour, checkInMin, 0)
          const checkOutTime = new Date(d)
          checkOutTime.setHours(18, Math.floor(Math.random() * 30), 0)

          insertAtt.run(
            `att-seed-${i}`, userId, dateStr,
            checkInTime.toISOString(), checkOutTime.toISOString(),
            isLate ? 'late' : 'present', 'store-1'
          )
        }

        // Seed Leaves (only if leaves table exists)
        const leavesExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leaves'").get()
        if (leavesExists) {
          db.prepare(`INSERT OR IGNORE INTO leaves(id, employee_id, start_date, end_date, type, reason, status, store_id) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`)
            .run('leave-seed-1', userId, '2023-11-10', '2023-11-11', 'sick', 'Fever', 'approved', 'store-1')
        }
      } finally {
        db.pragma('foreign_keys = ON')
      }
    } else {
      console.log('Skipping attendance seed: user-1 not found')
    }
  }

} catch (err) {
  console.error('Error during database initialization/seeding:', err.message)
}


// Helper to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (!obj) return obj
  const newObj = {}
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
    if (obj[key] !== null || newObj[camelKey] === undefined) {
      newObj[camelKey] = obj[key]
    }
  }
  // Alignment: ensure categories are accessible via categoryName (frontend expectation)
  if (newObj.category && !newObj.categoryName) {
    newObj.categoryName = newObj.category
  }
  return newObj
}

// Initialize HR Module
const hrHelpers = initHRDb(db, toCamelCase, deviceId);

// Initialize Currency Module
initCurrencyDb(db);

// Database helper functions
const resolveCompanyId = (inputCompanyId) => {
  let company = inputCompanyId;
  if (!company || company === 'showtime' || company === 'undefined') {
    const storeRow = db.prepare("SELECT company_id FROM stores WHERE is_deleted = 0 AND company_id IS NOT NULL AND company_id != '' LIMIT 1").get();
    if (storeRow) company = storeRow.company_id;
  }
  
  // Clean up numeric strings with .0 (common sync artifact)
  if (typeof company === 'string' && company.endsWith('.0')) {
    company = company.slice(0, -2);
  }
  
  // Always return as string for cloud compatibility
  return company ? String(company) : 'showtime';
};

const dbHelpers = {
  ...hrHelpers,
  // Permissions
  getPermissions: (userId) => {
    const row = db.prepare('SELECT * FROM user_permissions WHERE user_id = ?').get(userId);
    if (!row) return null;
    return {
      ...toCamelCase(row),
      permissions: JSON.parse(row.permissions || '{}')
    };
  },

  updatePermissions: (userId, permissions) => {
    const existing = db.prepare('SELECT id FROM user_permissions WHERE user_id = ?').get(userId);
    const permString = JSON.stringify(permissions);
    
    if (existing) {
      db.prepare(`
        UPDATE user_permissions 
        SET permissions = ?, updated_at = datetime('now'), sync_status = 0 
        WHERE user_id = ?
      `).run(permString, userId);
    } else {
      const id = `perm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO user_permissions (id, user_id, permissions, sync_status)
        VALUES (?, ?, ?, 0)
      `).run(id, userId, permString);
    }
    return dbHelpers.getPermissions(userId);
  },

  // --- CUSTOM FIELDS (Dynamic Attribute Schema) ---
  
  getCustomFields: (companyId, targetType) => {
    // Resolve the real company_id from the stores table if needed
    let company = companyId;
    if (!company || company === 'showtime') {
      const storeRow = db.prepare("SELECT company_id FROM stores WHERE is_deleted = 0 AND company_id IS NOT NULL AND company_id != '' LIMIT 1").get();
      if (storeRow) company = storeRow.company_id;
    }
    if (!company) company = 'showtime';
    
    let sql = "SELECT * FROM custom_fields WHERE (company_id = ? OR company_id IS NULL OR company_id = '') AND is_deleted = 0 AND label NOT LIKE '__DEL__%'";
    const params = [company];
    if (targetType) {
      sql += ' AND target_type = ?';
      params.push(targetType);
    }
    sql += ' ORDER BY label ASC';
    
    const results = db.prepare(sql).all(...params).map(toCamelCase).map(f => ({
      ...f,
      options: f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : [],
      isRequired: !!f.isRequired,
      showOnReceipt: !!f.showOnReceipt
    }));
    
    console.log(`[DB] getCustomFields: resolved company=${company} (input=${companyId}), found ${results.length} fields, type=${targetType}`);
    return results;
  },

  getAllCustomFields: (companyId) => {
    return dbHelpers.getCustomFields(companyId);
  },

  addCustomField: (field) => {
    console.log('[DB] addCustomField: input field', JSON.stringify(field, null, 2));
    
    // Resolve the real company_id from the stores table
    let resolvedCompanyId = field.companyId;
    if (!resolvedCompanyId || resolvedCompanyId === 'showtime') {
      const storeRow = db.prepare("SELECT company_id FROM stores WHERE is_deleted = 0 AND company_id IS NOT NULL AND company_id != '' LIMIT 1").get();
      if (storeRow) resolvedCompanyId = storeRow.company_id;
    }
    if (!resolvedCompanyId) resolvedCompanyId = 'showtime';
    
    console.log(`[DB] addCustomField: resolved company_id=${resolvedCompanyId} (input=${field.companyId})`);
    
    if (!field.label || !field.type || !field.targetType) throw new Error("Label, Type, and TargetType are required");

    // Prevent duplicate labels per company and targetType
    const existing = db.prepare('SELECT id FROM custom_fields WHERE company_id = ? AND label = ? AND target_type = ? AND is_deleted = 0').get(resolvedCompanyId, field.label, field.targetType);
    if (existing) {
      throw new Error(`A custom field with label "${field.label}" already exists for ${field.targetType}s.`);
    }

    const id = field.id || `cf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    db.prepare(`
      INSERT INTO custom_fields (
        id, company_id, store_id, label, type, options, is_required, show_on_receipt, target_type, device_id, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
    `).run(
      id, resolvedCompanyId, field.storeId, field.label, field.type, 
      field.options ? JSON.stringify(field.options) : JSON.stringify([]),
      field.isRequired ? 1 : 0, field.showOnReceipt ? 1 : 0, field.targetType,
      deviceId
    );
    
    console.log(`[DB] addCustomField: saved successfully with id=${id}, company=${resolvedCompanyId}`);
    const result = dbHelpers.getAllCustomFields(resolvedCompanyId).find(f => f.id === id);
    console.log(`[DB] addCustomField: post-save lookup returned`, result ? 'found' : 'NOT FOUND');
    return result;
  },

  updateCustomField: (id, updates, companyId) => {
    // Resolve the real company_id
    let resolved = companyId;
    if (!resolved || resolved === 'showtime') {
      const storeRow = db.prepare("SELECT company_id FROM stores WHERE is_deleted = 0 AND company_id IS NOT NULL AND company_id != '' LIMIT 1").get();
      if (storeRow) resolved = storeRow.company_id;
    }
    if (!resolved) resolved = 'showtime';

    // Check ownership
    const existing = db.prepare('SELECT company_id FROM custom_fields WHERE id = ?').get(id);
    if (!existing) throw new Error("Field not found");

    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(updates)) {
      if (['label', 'type', 'options', 'isRequired', 'showOnReceipt'].includes(key)) {
        fields.push(`${toSnakeCase(key)} = ?`);
        values.push(key === 'options' ? JSON.stringify(val) : (typeof val === 'boolean' ? (val ? 1 : 0) : val));
      }
    }

    if (fields.length > 0) {
      values.push(deviceId, id);
      db.prepare(`
        UPDATE custom_fields 
        SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0, device_id = ?
        WHERE id = ?
      `).run(...values);
    }
    return dbHelpers.getAllCustomFields(resolved).find(f => f.id === id);
  },

  deleteCustomField: (id, companyId) => {
    // Resolve the real company_id
    let resolved = companyId;
    if (!resolved || resolved === 'showtime') {
      const storeRow = db.prepare("SELECT company_id FROM stores WHERE is_deleted = 0 AND company_id IS NOT NULL AND company_id != '' LIMIT 1").get();
      if (storeRow) resolved = storeRow.company_id;
    }
    if (!resolved) resolved = 'showtime';

    db.prepare(`
      UPDATE custom_fields 
      SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, device_id = ?, label = '__DEL__' || label
      WHERE id = ? AND label NOT LIKE '__DEL__%'
    `).run(deviceId, id);
    return { success: true };
  },

  // --- CUSTOM VALUES STORAGE ---

  saveCustomValues: (targetId, values, targetType, companyId, storeId) => {
    if (!companyId) throw new Error("companyId is required to save values");
    const table = targetType === 'product' ? 'product_custom_values' : 'sale_custom_values';
    const idCol = targetType === 'product' ? 'product_id' : 'sale_id';

    db.transaction(() => {
      for (const [fieldId, value] of Object.entries(values)) {
        // Upsert logic
        const existing = db.prepare(`SELECT id FROM ${table} WHERE ${idCol} = ? AND field_id = ?`).get(targetId, fieldId);
        if (existing) {
          db.prepare(`
            UPDATE ${table} SET value = ?, updated_at = datetime('now'), sync_status = 0, device_id = ?
            WHERE id = ?
          `).run(value, deviceId, existing.id);
        } else {
          const valId = `cv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          db.prepare(`
            INSERT INTO ${table} (id, company_id, store_id, ${idCol}, field_id, value, device_id, updated_at, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
          `).run(valId, companyId, storeId, targetId, fieldId, value, deviceId);
        }
      }
    })();
  },

  getCustomValues: (targetId, targetType, companyId) => {
    const table = targetType === 'product' ? 'product_custom_values' : 'sale_custom_values';
    const idCol = targetType === 'product' ? 'product_id' : 'sale_id';
    
    return db.prepare(`
      SELECT cv.*, cf.label, cf.type 
      FROM ${table} cv
      JOIN custom_fields cf ON cv.field_id = cf.id
      WHERE cv.${idCol} = ? AND cv.company_id = ? AND cv.is_deleted = 0
    `).all(targetId, companyId).map(toCamelCase);
  },

  // Products
  getAllProducts: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const query = `
      SELECT p.*, c.name as categoryName 
      FROM products p 
      LEFT JOIN categories c ON (p.category_id = c.id OR p.categoryId = c.id)
      WHERE p.store_id = ? AND p.is_deleted = 0 
      ORDER BY p.updated_at DESC
    `
    const products = db.prepare(query).all(effectiveStoreId).map(toCamelCase)
    
    if (products.length === 0) return [];

    // Efficiently batch-fetch custom values for all products
    try {
      const productIds = products.map(p => p.id);
      const placeholders = productIds.map(() => '?').join(',');
      const values = db.prepare(`
        SELECT cv.*, cf.label, cf.type 
        FROM product_custom_values cv
        JOIN custom_fields cf ON cv.field_id = cf.id
        WHERE cv.product_id IN (${placeholders}) AND cv.is_deleted = 0
      `).all(...productIds).map(toCamelCase);

      // Group values by product_id
      const valuesMap = {};
      values.forEach(v => {
        if (!valuesMap[v.productId]) valuesMap[v.productId] = [];
        valuesMap[v.productId].push(v);
      });

      // Attach to products
      return products.map(p => ({
        ...p,
        customValues: valuesMap[p.id] || []
      }));
    } catch (err) {
      console.warn('[DB] Failed to attach custom values to products:', err.message);
      return products;
    }
  },

  getProductByBarcode: (barcode, storeId) => {
    const product = db.prepare(`
      SELECT p.*, c.name as categoryName 
      FROM products p 
      LEFT JOIN categories c ON (p.category_id = c.id OR p.categoryId = c.id)
      WHERE p.barcode = ? AND p.store_id = ?
    `).get(barcode, storeId)
    return product ? toCamelCase(product) : null
  },

  addProduct: (product) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO products(id, company_id, store_id, name, description, sku, category, selling_price, purchase_price, quantity, last_used, unit, brand, barcode, min_stock, reorder_quantity, device_id, updated_at, sync_status, categoryId, category_id)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, ?, ?)
      `)
      stmt.run(
        product.id, product.companyId, product.storeId, product.name, product.description, product.sku, product.category || product.categoryName,
        product.sellingPrice, product.purchasePrice, product.quantity || 0,
        product.lastUsed, product.unit, product.brand,
        product.barcode, product.minStock || 0, product.reorderQuantity || 0, deviceId, product.categoryId, product.categoryId
      )

      // Save Custom Values if provided
      if (product.customValues) {
        dbHelpers.saveCustomValues(product.id, product.customValues, 'product', product.companyId, product.storeId);
      }

      const result = db.prepare(`
        SELECT p.*, c.name as categoryName 
        FROM products p 
        LEFT JOIN categories c ON (p.category_id = c.id OR p.categoryId = c.id)
        WHERE p.id = ?
      `).get(product.id)
      return {
        ...toCamelCase(result),
        customValues: dbHelpers.getCustomValues(product.id, 'product', product.companyId)
      }
    } catch (err) {
      console.error('[DB] addProduct ERROR:', err.message);
      throw new Error(`Failed to add product: ${err.message}`);
    }
  },

  updateProduct: (id, updates) => {
    const fields = []
    const values = []

    const fieldMap = {
      name: 'name',
      description: 'description',
      sellingPrice: 'selling_price',
      purchasePrice: 'purchase_price',
      quantity: 'quantity',
      sku: 'sku',
      category: 'category',
      categoryName: 'category',
      unit: 'unit',
      brand: 'brand',
      barcode: 'barcode',
      minStock: 'min_stock',
      reorderQuantity: 'reorder_quantity',
      lastUsed: 'last_used',
      categoryId: 'category_id',
      category_id: 'category_id'
    }

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
        // If it's categoryId, also update the redundant categoryId column to keep them in sync locally
        if (key === 'categoryId' || key === 'category_id') {
          fields.push(`categoryId = ?`)
          values.push(updates[key])
        }
      }
    })

    if (fields.length === 0) return null

    fields.push(`updated_at = datetime('now')`)
    fields.push(`sync_status = 0`) // Dirty flag
    values.push(id)

    const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ? `)
    stmt.run(...values)

    // Log Manual Stock Change if Quantity changed
    // Update Custom Values if provided
    if (updates.customValues) {
      const product = db.prepare('SELECT company_id, store_id FROM products WHERE id = ?').get(id);
      if (product) {
        dbHelpers.saveCustomValues(id, updates.customValues, 'product', product.company_id, product.store_id);
      }
    }

    const result = db.prepare(`
      SELECT p.*, c.name as categoryName 
      FROM products p 
      LEFT JOIN categories c ON (p.category_id = c.id OR p.categoryId = c.id)
      WHERE p.id = ?
    `).get(id)
    return {
        ...toCamelCase(result),
        customValues: result ? dbHelpers.getCustomValues(id, 'product', result.company_id) : []
    }
  },

  updateProductWithLog: (id, updates, userId = 'system', reason = 'Manual Edit') => {
    // Wrapper to handle logging manually
    // First get current
    const current = db.prepare('SELECT quantity, store_id, name FROM products WHERE id = ?').get(id)

    const result = dbHelpers.updateProduct(id, updates)

    if (current && updates.quantity !== undefined && current.quantity !== updates.quantity) {
      const diff = updates.quantity - current.quantity
      db.prepare(`
            INSERT INTO stock_logs(id, product_id, product_name, store_id, quantity_change, reason, device_id, created_at)
VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).run(
        `log - ${Date.now()} `,
        id,
        current.name,
        current.store_id,
        diff,
        reason,
        deviceId
      )
    }
    return result
  },

  deleteProduct: (id) => {
    // Soft Delete with timestamp
    return db.prepare("UPDATE products SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  restoreProduct: (id) => {
    return db.prepare("UPDATE products SET is_deleted = 0, deleted_at = NULL, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  // Customers
  getAllCustomers: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const customers = db.prepare('SELECT * FROM customers WHERE store_id = ? AND is_deleted = 0 ORDER BY updated_at DESC').all(effectiveStoreId)
    return customers.map(toCamelCase)
  },

  deleteCustomer: (id) => {
    return db.prepare("UPDATE customers SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  addCustomer: (customer) => {
    const stmt = db.prepare(`
      INSERT INTO customers(id, company_id, name, phone, email, area, credit_balance, credit_limit, total_purchases, store_id, joined_at, device_id, updated_at)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    stmt.run(
      customer.id, customer.companyId, customer.name, customer.phone, customer.email,
      customer.area, customer.creditBalance || 0, customer.creditLimit || 0, customer.totalPurchases || 0,
      customer.storeId, customer.joinedAt, deviceId
    )
    const result = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id)
    return toCamelCase(result)
  },

  updateCustomer: (id, updates) => {
    const fields = []
    const values = []

    const fieldMap = {
      name: 'name',
      phone: 'phone',
      email: 'email',
      area: 'area',
      creditBalance: 'credit_balance',
      creditLimit: 'credit_limit',
      totalPurchases: 'total_purchases'
    }

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })

    if (fields.length === 0) return null

    fields.push(`updated_at = datetime('now')`)
    fields.push(`sync_status = 0`) // Dirty flag for sync
    values.push(id)

    const stmt = db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ? `)
    stmt.run(...values)
    const result = db.prepare('SELECT * FROM customers WHERE id = ?').get(id)
    return toCamelCase(result)
  },

  // Sales
  updateAccountBalance: (accountId, amount) => {
    const stmt = db.prepare('UPDATE accounts SET balance = balance + ?, sync_status = 0, updated_at = datetime(\'now\') WHERE id = ?')
    stmt.run(amount, accountId)
  },

  getAllSales: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const sales = db.prepare(`SELECT * FROM sales WHERE store_id = ? AND is_deleted = 0 AND invoice_number NOT LIKE '__DEL__%' ORDER BY date DESC`).all(effectiveStoreId)
    return sales.map(sale => {
      const camelSale = toCamelCase(sale)
      let items = [];
      try {
        items = JSON.parse(camelSale.items);
      } catch (e) {
        // Placeholder or corrupted sales from sync have non-JSON items — skip gracefully
        console.warn(`[DB] Skipping invalid items JSON for sale ${camelSale.id}: ${String(camelSale.items).substring(0, 50)}`);
      }
      return { ...camelSale, items }
    })
  },

  processSale: (sale) => {
    const transaction = db.transaction(() => {
      // 1. Validate Stock & Credit Limit (INSIDE TRANSACTION)
      const items = sale.items
      for (const item of items) {
        let product = db.prepare('SELECT id, quantity, name, is_kit FROM products WHERE id = ? AND is_deleted = 0').get(item.productId)
        // Fallback: try finding by name if ID lookup fails
        if (!product && item.productName) {
          product = db.prepare('SELECT id, quantity, name, is_kit FROM products WHERE name = ? AND store_id = ? AND is_deleted = 0').get(item.productName.trim(), sale.storeId)
          if (product) {
            console.log(`[DB] processSale: Product "${item.productName}" found by name fallback (id=${product.id}, requested=${item.productId})`)
            item.productId = product.id  // Fix the ID for the rest of the transaction
          }
        }
        if (!product) {
          console.error(`[DB] processSale: Product not found. productId=${item.productId}, productName=${item.productName}, storeId=${sale.storeId}`)
          throw new Error(`Product "${item.productName || item.productId}" not found. It may have been deleted or not synced yet.`)
        }

        if (product.is_kit) {
          const components = db.prepare('SELECT product_id, quantity FROM kit_items WHERE kit_id = ?').all(item.productId)
          if (components.length === 0) throw new Error(`Kit ${product.name} has no components!`)

          for (const comp of components) {
            const compProduct = db.prepare('SELECT quantity, name FROM products WHERE id = ?').get(comp.product_id)
            const totalNeeded = comp.quantity * item.quantity
            if (!compProduct || compProduct.quantity < totalNeeded) {
              if (!sale.overrideStock) {
                throw new Error(`Insufficient stock for kit component ${compProduct?.name || comp.product_id}.Available: ${compProduct?.quantity || 0}, Needed: ${totalNeeded} `)
              }
            }
          }
        } else {
          if (product.quantity < item.quantity && !sale.overrideStock) {
            throw new Error(`Insufficient stock for ${product.name}.Available: ${product.quantity}, Requested: ${item.quantity} `)
          }
        }
      }

      // Check Credit Limit if credit sale
      if (sale.type === 'credit' && sale.customerId) {
        const customer = db.prepare('SELECT credit_balance, credit_limit, name FROM customers WHERE id = ?').get(sale.customerId)
        // Only enforce if limit is set and greater than 0
        if (customer && customer.credit_limit !== null && customer.credit_limit > 0) {
          const potentialBalance = (customer.credit_balance || 0) + sale.totalAmount
          if (potentialBalance > customer.credit_limit) {
            throw new Error(`Credit Limit Exceeded for ${customer.name}. Limit: $${customer.credit_limit}, Potential: ${potentialBalance.toFixed(2)}`)
          }
        }
      }

      // Validate Account exists
      if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
        for (const p of sale.payments) {
          if (!p.accountId) throw new Error(`Missing Account ID for payment mode ${p.paymentMode}.`);
          const acc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(p.accountId)
          if (!acc) throw new Error(`Escrow Account ${p.accountId} not found in database.`)
        }
      } else if (sale.type !== 'credit') {
        const accountToUse = sale.accountId || 'acc-cash'
        const acc = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountToUse)
        if (!acc) throw new Error(`Escrow Account ${accountToUse} not found. Please select a valid account.`)
      }

      console.log(`[DB] Processing Sale: ${sale.id} (${sale.invoiceNumber}) Type: ${sale.type} Store: ${sale.storeId} Acc: ${sale.accountId}`);

      // 2. Insert Sale
      const saleStmt = db.prepare(`
        INSERT INTO sales(
          id, company_id, invoice_number, type, status, items, subtotal, discount_amount, tax_amount, total_amount, 
          original_amount, original_currency, profit, payment_mode, account_id, customer_id, store_id, date, quotation_id, device_id, updated_at, sync_status
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
  `)
      try {
        saleStmt.run(
          sale.id, sale.companyId, sale.invoiceNumber, sale.type, sale.status || 'completed', JSON.stringify(sale.items),
          sale.subtotal || 0, sale.discountAmount || 0, sale.taxAmount || 0,
          sale.totalAmount, sale.originalAmount || null, sale.originalCurrency || null,
          sale.profit || 0, sale.paymentMode || 'cash', sale.accountId || 'acc-cash',
          sale.customerId, sale.storeId, sale.date, sale.quotationId, deviceId
        )
      } catch (saleErr) {
        console.error(`[DB] Sale Insertion Failed: ${saleErr.message}. Values: `, {
          id: sale.id, invoice: sale.invoiceNumber, acc: sale.accountId || 'acc-cash', cust: sale.customerId, store: sale.storeId
        });
        throw saleErr;
      }

      // 2a. Insert Payments (Always generate records for audit)
      if (sale.payments && Array.isArray(sale.payments) && sale.payments.length > 0) {
        const payStmt = db.prepare(`
          INSERT INTO sale_payments(id, company_id, store_id, sale_id, payment_mode, amount, account_id, sync_status, updated_at)
          VALUES(?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
        `)
        for (const p of sale.payments) {
          console.log(`[DB] Inserting Payment: ${p.paymentMode} Amt: ${p.amount} Acc: ${p.accountId}`);
          try {
            payStmt.run(p.id || crypto.randomUUID(), sale.companyId, sale.storeId, sale.id, p.paymentMode, p.amount, p.accountId)
            dbHelpers.updateAccountBalance(p.accountId, p.amount)
          } catch (payErr) {
            console.error(`[DB] Payment Insertion Failed: ${payErr.message}. Values: `, {
              saleId: sale.id, mode: p.paymentMode, amt: p.amount, accId: p.accountId
            });
            throw payErr;
          }
        }
      } else if (sale.type !== 'credit') {
        // Fallback: Create single payment record if not credit
        const payId = crypto.randomUUID()
        const accountToUse = sale.accountId || 'acc-cash'
        console.log(`[DB] Fallback Payment Insertion: ${sale.paymentMode || 'cash'} Amt: ${sale.totalAmount} Acc: ${accountToUse}`);
        try {
          db.prepare(`
            INSERT INTO sale_payments(id, company_id, store_id, sale_id, payment_mode, amount, account_id, sync_status, updated_at)
            VALUES(?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
          `).run(payId, sale.companyId, sale.storeId, sale.id, sale.paymentMode || 'cash', sale.totalAmount, accountToUse)

          dbHelpers.updateAccountBalance(accountToUse, sale.totalAmount)
        } catch (fallErr) {
          console.error(`[DB] Fallback Payment Insertion Failed: ${fallErr.message}. Values: `, {
            saleId: sale.id, mode: sale.paymentMode || 'cash', amt: sale.totalAmount, accId: accountToUse
          });
          throw fallErr;
        }
      }

      // 2b. Handle Work Order
      if (sale.status === 'work_order' || sale.workOrder) {
        const wo = sale.workOrder || {}
        db.prepare(`
          INSERT INTO work_orders(id, company_id, sale_id, status, notes, store_id, updated_at, sync_status)
          VALUES(?, ?, ?, ?, ?, ?, datetime('now'), 0)
        `).run(wo.id || crypto.randomUUID(), sale.companyId, sale.id, wo.status || 'pending', wo.notes || '', sale.storeId)
      }

      // 2c. Handle Delivery
      if (sale.status === 'delivery' || sale.delivery) {
        const del = sale.delivery || {}
        if (del.employeeId) {
          const driver = db.prepare('SELECT is_driver FROM users WHERE id = ?').get(del.employeeId)
          if (!driver || driver.is_driver !== 1) {
            throw new Error(`Assignment Failed: User ${del.employeeId} is not a registered driver.`)
          }
        }
        db.prepare(`
          INSERT INTO deliveries(id, company_id, sale_id, employee_id, address, delivery_charge, is_cod, status, delivery_date, store_id, updated_at, sync_status)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
        `).run(
          del.id || crypto.randomUUID(), sale.companyId, sale.id, del.employeeId, del.address || '',
          del.deliveryCharge || 0, del.isCod ? 1 : 0, del.status || 'pending',
          del.deliveryDate, sale.storeId
        )
      }

      // 3. Update Stock & Logs
      const updateStockStmt = db.prepare('UPDATE products SET quantity = quantity - ?, last_used = ?, updated_at = datetime(\'now\'), sync_status = 0 WHERE id = ?')
      const logStmt = db.prepare(`
        INSERT INTO stock_logs(id, product_id, product_name, store_id, quantity_change, reason, reference_id, device_id, created_at)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)

      for (const item of items) {
        const product = db.prepare('SELECT is_kit FROM products WHERE id = ?').get(item.productId)
        if (product && product.is_kit) {
          const components = db.prepare('SELECT k.product_id, k.quantity, p.name FROM kit_items k JOIN products p ON k.product_id = p.id WHERE k.kit_id = ?').all(item.productId)
          for (const comp of components) {
            const compNeeded = comp.quantity * item.quantity
            updateStockStmt.run(compNeeded, new Date().toISOString(), comp.product_id)
            logStmt.run(
              `${Date.now()} -${Math.random().toString(36).substr(2, 9)} `,
              comp.product_id, comp.name, sale.storeId, -compNeeded, 'KIT_SALE_PART',
              sale.invoiceNumber, deviceId
            )
          }
        } else {
          updateStockStmt.run(item.quantity, new Date().toISOString(), item.productId)
          logStmt.run(
            `${Date.now()} -${Math.random().toString(36).substr(2, 9)} `,
            item.productId, item.productName, sale.storeId, -item.quantity, 'SALE',
            sale.invoiceNumber, deviceId
          )
        }
      }

      // 5. Update Customer (if credit)
      if (sale.type === 'credit' && sale.customerId) {
        const updateCustomerStmt = db.prepare('UPDATE customers SET credit_balance = credit_balance + ?, total_purchases = total_purchases + ?, sync_status = 0, updated_at = datetime(\'now\') WHERE id = ?')
        updateCustomerStmt.run(sale.totalAmount, sale.totalAmount, sale.customerId)
      }
      else if (sale.customerId) {
        const updateCustomerPurchasesStmt = db.prepare('UPDATE customers SET total_purchases = total_purchases + ?, sync_status = 0, updated_at = datetime(\'now\') WHERE id = ?')
        updateCustomerPurchasesStmt.run(sale.totalAmount, sale.customerId)
      }

      // Feature 5: Sales Commission (If userId present)
      if (sale.userId) {
        const commissionPercentage = 2.0 // Configurable default
        const commissionAmount = (sale.totalAmount * commissionPercentage) / 100
        const commStmt = db.prepare(`
          INSERT INTO commissions(id, user_id, sale_id, amount, percentage, sync_status)
VALUES(?, ?, ?, ?, ?, 0)
        `)
        commStmt.run(`${sale.id} -comm`, sale.userId, sale.id, commissionAmount, commissionPercentage)
      }

      // Feature 7: Loyalty Points
      if (sale.customerId) {
        const points = Math.floor(sale.totalAmount / 100) // 1 point per 100 rs
        if (points > 0) {
          dbHelpers.addLoyaltyPoints({
            id: `${sale.id} -lp`,
            customerId: sale.customerId,
            points: points,
            reason: `Sale ${sale.invoiceNumber} `,
            saleId: sale.id
          })
        }
      }

      // 6. Handle Quotation Conversion
      if (sale.quotationId) {
        db.prepare("UPDATE quotations SET status = 'converted', updated_at = datetime('now') WHERE id = ?").run(sale.quotationId)
      }

      // 6. Save Custom Values for the Sale
      if (sale.customValues) {
        dbHelpers.saveCustomValues(sale.id, sale.customValues, 'sale', sale.companyId, sale.storeId);
      }

      console.log(`[DB] Sale ${sale.id} processed successfully.`);
      return { success: true, saleId: sale.id };
    })

    // Execute Transaction
    transaction()

    // Return the inserted sale to confirm
    const result = db.prepare('SELECT * FROM sales WHERE id = ?').get(sale.id)
    const camelSale = toCamelCase(result)
    let parsedItems = [];
    try { parsedItems = JSON.parse(camelSale.items); } catch(e) {}
    return { ...camelSale, items: parsedItems }
  },

  // Legacy fallback (should ideally use processSale)
  addSale: (sale) => {
    return dbHelpers.processSale(sale) // Redirect to new logic
  },

  // Generic getters
  getAllStores: (companyId) => {
    const company = resolveCompanyId(companyId);
    console.log(`[DB] getAllStores - Resolved: ${company} (Input: ${companyId})`);
    
    const stmt = db.prepare('SELECT * FROM stores WHERE (company_id = ? OR company_id = ? OR company_id IS NULL) AND is_deleted = 0');
    // Match both "4" and "4.0" to be safe
    const rows = stmt.all(company, `${company}.0`);
    
    if (rows.length === 0) {
      console.log(`[DB] getAllStores: No stores found for company='${company}', falling back to all stores.`)
      return db.prepare('SELECT * FROM stores WHERE is_deleted = 0').all().map(toCamelCase)
    }
    return rows.map(toCamelCase)
  },
  getAllUsers: (companyId) => {
    const company = resolveCompanyId(companyId);
    console.log(`[DB] getAllUsers - Resolved: ${company} (Input: ${companyId})`);
    
    const stmt = db.prepare('SELECT u.*, e.id as employee_id FROM users u LEFT JOIN employees e ON u.id = e.user_id WHERE (u.company_id = ? OR u.company_id = ? OR u.company_id IS NULL) AND u.is_deleted = 0');
    const filtered = stmt.all(company, `${company}.0`).map(toCamelCase);
    
    if (filtered.length > 0) return filtered;
    console.log(`[DB] getAllUsers: No users found for company='${company}', falling back to all users.`);
    return db.prepare('SELECT u.*, e.id as employee_id FROM users u LEFT JOIN employees e ON u.id = e.user_id WHERE u.is_deleted = 0').all().map(toCamelCase);
  },

  getDashboardMetrics: (companyId, storeId, dateRange) => {
    try {
      const company = resolveCompanyId(companyId);
      const companyWithDecimal = `${company}.0`;
      
      let startDate = new Date();
      if (dateRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setHours(0, 0, 0, 0); // Start of today
      }
      const dateFilterStr = startDate.toISOString().split('T')[0];

      // 1. Sales Metrics (Aggregated with Breakdown)
      const effectiveStoreId = storeRedirects.get(storeId) || storeId;
      const salesMetrics = db.prepare(`
        SELECT
          SUM(total_amount) as total_revenue,
          SUM(profit) as total_profit,
          COUNT(*) as total_sales,
          SUM(CASE WHEN date >= ? THEN total_amount ELSE 0 END) as today_revenue,
          SUM(CASE WHEN date >= ? THEN profit ELSE 0 END) as today_profit,
          SUM(CASE WHEN source = 'Online' THEN total_amount ELSE 0 END) as online_revenue,
          SUM(CASE WHEN source = 'POS' OR source IS NULL THEN total_amount ELSE 0 END) as pos_revenue
        FROM sales 
        WHERE store_id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 AND date >= ?
      `).get(dateFilterStr, dateFilterStr, effectiveStoreId, company, companyWithDecimal, dateFilterStr)

      // 2. Inventory Metrics
      const inventoryMetrics = db.prepare(`
        SELECT
          SUM(quantity) as total_items,
          SUM(quantity * purchase_price) as inventory_value,
          COUNT(CASE WHEN quantity <= min_stock AND coalesce(is_deleted, 0) = 0 THEN 1 END) as low_stock_count
        FROM products 
        WHERE store_id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0
      `).get(effectiveStoreId, company, companyWithDecimal)

      // 3. Customers
      const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE store_id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0').get(effectiveStoreId, company, companyWithDecimal)?.count || 0

      // 4. Recent Activity (Last 5 Sales - Now including Source)
      const recentSales = db.prepare(`
        SELECT s.id, s.invoice_number, s.total_amount, s.date, s.source, c.name as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.store_id = ? AND (s.company_id = ? OR s.company_id = ? OR s.company_id IS NULL) AND coalesce(s.is_deleted, 0) = 0
        ORDER BY s.date DESC
        LIMIT 5
      `).all(effectiveStoreId, company, companyWithDecimal).map(toCamelCase)

      // 5. Low Stock Items
      const lowStockItems = db.prepare(`
        SELECT id, name, quantity, min_stock, sku
        FROM products
        WHERE store_id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL) AND quantity <= min_stock AND coalesce(is_deleted, 0) = 0
        LIMIT 5
      `).all(effectiveStoreId, company, companyWithDecimal).map(toCamelCase)

      return {
        revenue: salesMetrics?.total_revenue || 0,
        todayRevenue: salesMetrics?.today_revenue || 0,
        profit: salesMetrics?.total_profit || 0,
        todayProfit: salesMetrics?.today_profit || 0,
        totalSales: salesMetrics?.total_sales || 0,
        onlineRevenue: salesMetrics?.online_revenue || 0,
        posRevenue: salesMetrics?.pos_revenue || 0,
        inventoryValue: inventoryMetrics?.inventory_value || 0,
        totalItems: inventoryMetrics?.total_items || 0,
        lowStockCount: inventoryMetrics?.low_stock_count || 0,
        customerCount,
        recentSales,
        lowStockItems
      }
    } catch (err) {
      console.error('[DB] Error getting dashboard metrics:', err.message)
      return {
        revenue: 0, todayRevenue: 0, profit: 0, todayProfit: 0,
        totalSales: 0, inventoryValue: 0, totalItems: 0, lowStockCount: 0,
        customerCount: 0, recentSales: [], lowStockItems: []
      }
    }
  },

  getLowStockNotifications: (companyId, storeId) => {
    try {
      const effectiveStoreId = storeRedirects.get(storeId) || storeId;
      const lowStockProducts = db.prepare(`
        SELECT id, name, quantity, min_stock, sku, updated_at
        FROM products
        WHERE store_id = ? AND quantity <= min_stock AND is_deleted = 0
        ORDER BY quantity ASC
      `).all(effectiveStoreId);

      return lowStockProducts.map(p => ({
        id: `low-stock-${p.id}`,
        title: 'Low Stock Alert',
        message: `${p.name} (${p.sku || 'No SKU'}) is low on stock. Current: ${p.quantity}, Min Level: ${p.min_stock}`,
        type: 'stock_alert',
        is_read: false,
        created_at: p.updated_at || new Date().toISOString()
      }));
    } catch (err) {
      console.error('[DB] getLowStockNotifications ERROR:', err.message);
      return [];
    }
  },

  addUser: (user) => {
    // Check if user exists by email or username (including soft-deleted)
    const existing = db.prepare("SELECT id, is_deleted FROM users WHERE email = ? OR username = ?").get(user.email, user.username || user.email);

    if (existing) {
      if (existing.is_deleted === 1) {
        console.log(`[DB] Reactivating soft-deleted user: ${user.email} (ID: ${existing.id})`);
        const nameParts = (user.name || '').split(' ', 1)
        const firstName = user.firstName || nameParts[0] || ''
        const lastName = user.lastName || (user.name || '').split(' ').slice(1).join(' ') || ''
        
        // Hash password if present
        const password = user.password ? bcrypt.hashSync(user.password, 10) : null;
        const isSuperuser = user.role === 'super_admin' ? 1 : 0;
        const isStaff = (user.isStaff || user.role === 'admin' || user.role === 'super_admin') ? 1 : 0;

        const finalStoreIdUpdate = user.storeId === '' ? null : user.storeId;
        db.prepare(`
          UPDATE users SET 
            name = ?, email = ?, username = ?, first_name = ?, last_name = ?, 
            password = ?, role = ?, is_staff = ?, is_superuser = ?, 
            is_active = ?, is_deleted = 0, store_id = ?, avatar = ?, 
            device_id = ?, updated_at = datetime('now'), sync_status = 0
          WHERE id = ?
        `).run(
          user.name, user.email, user.username || user.email,
          firstName, lastName, password, user.role,
          isStaff, isSuperuser,
          user.isActive !== false ? 1 : 0,
          finalStoreIdUpdate, user.avatar, deviceId,
          existing.id
        )
        const result = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)
        return toCamelCase(result)
      } else {
        // User is active already
        throw new Error('A user with this email or username already exists and is active.');
      }
    }

    const stmt = db.prepare(`
      INSERT INTO users(id, name, email, username, first_name, last_name, password, role, is_staff, is_superuser, is_active, is_deleted, store_id, avatar, device_id, updated_at, sync_status)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, datetime('now'), 0)
    `)
    const nameParts = (user.name || '').split(' ', 1)
    const firstName = user.firstName || nameParts[0] || ''
    const lastName = user.lastName || (user.name || '').split(' ').slice(1).join(' ') || ''

    // Hash password if present
    const password = user.password ? bcrypt.hashSync(user.password, 10) : null;

    const isSuperuser = user.role === 'super_admin' ? 1 : 0;
    const isStaff = (user.isStaff || user.role === 'admin' || user.role === 'super_admin') ? 1 : 0;

    const finalStoreId = user.storeId === '' ? null : user.storeId;
    stmt.run(
      user.id, user.name, user.email, user.username || user.email,
      firstName, lastName, password, user.role,
      isStaff, isSuperuser,
      user.isActive !== false ? 1 : 0,  // Default to active
      finalStoreId, user.avatar, deviceId
    )
    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
    return toCamelCase(result)
  },

  updateUser: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      name: 'name',
      email: 'email',
      username: 'username',
      firstName: 'first_name',
      lastName: 'last_name',
      role: 'role',
      isStaff: 'is_staff',
      isActive: 'is_active',
      storeId: 'store_id',
      avatar: 'avatar',
      password: 'password'
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        let val = updates[key];
        
        // Fix: Only update password if a non-empty string is provided
        if (key === 'password') {
          if (!val || val.trim() === '') return; 
          val = bcrypt.hashSync(val, 10);
        }
        
        // Handle is_staff and is_superuser mapping for role updates
        if (key === 'role') {
           fields.push(`is_superuser = ?`);
           values.push(val === 'super_admin' ? 1 : 0);
           fields.push(`is_staff = ?`);
           values.push((val === 'admin' || val === 'super_admin') ? 1 : 0);
        }

        if (key === 'storeId' && val === '') {
           val = null;
        }

        fields.push(`${fieldMap[key]} = ?`)
        values.push(val)
      }
    })
    if (fields.length === 0) return dbHelpers.getAllUsers().find(u => u.id === id)
    values.push(id)
    db.prepare(`UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ? `).run(...values)
    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    return toCamelCase(result)
  },

  deleteUser: (id) => {
    const transaction = db.transaction(() => {
      // Prepend __DEL__ to avoid unique constraint conflicts in Django on email/username
      const user = db.prepare('SELECT email, username FROM users WHERE id = ?').get(id);
      if (user) {
        const newEmail = user.email && !user.email.startsWith('__DEL__') ? `__DEL__${user.email}` : user.email;
        const newUsername = user.username && !user.username.startsWith('__DEL__') ? `__DEL__${user.username}` : user.username;
        db.prepare("UPDATE users SET email = ?, username = ?, is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(newEmail, newUsername, id);
      } else {
        db.prepare("UPDATE users SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id);
      }
      
      db.prepare("UPDATE employees SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE user_id = ? AND is_deleted = 0").run(id);
    });
    transaction();
    return { success: true };
  },

  verifyPassword: (id, password) => {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(id)
    if (!user || !user.password) return false
    return bcrypt.compareSync(password, user.password)
  },

  verifySupervisor: (code) => {
    const admins = db.prepare("SELECT id, password FROM users WHERE role IN ('admin', 'super_admin')").all();
    for (const admin of admins) {
      if (admin.password && bcrypt.compareSync(code, admin.password)) {
        return true;
      }
    }
    return false;
  },

  toggleDriverStatus: (userId, isDriver) => {
    db.prepare('UPDATE users SET is_driver = ?, updated_at = datetime(\'now\'), sync_status = 0 WHERE id = ?').run(isDriver ? 1 : 0, userId)
    return toCamelCase(db.prepare('SELECT * FROM users WHERE id = ?').get(userId))
  },

  // Suppliers
  getAllSuppliers: (companyId, storeId) => {
    const company = resolveCompanyId(companyId);
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    console.log(`[DB] getAllSuppliers - Resolved: { company: ${company}, store: ${effectiveStoreId} }`);
    
    const suppliers = db.prepare(`
      SELECT * FROM suppliers 
      WHERE (company_id = ? OR company_id = ? OR company_id IS NULL OR company_id = '') 
      AND store_id = ? 
      AND is_deleted = 0 
      ORDER BY updated_at DESC
    `).all(company, `${company}.0`, effectiveStoreId)
    
    console.log(`[DB] Found ${suppliers.length} suppliers.`);
    return suppliers.map(toCamelCase)
  },

  addSupplier: (supplier) => {
    try {
      const effectiveStoreId = storeRedirects.get(supplier.storeId) || supplier.storeId;
      const stmt = db.prepare(`
        INSERT INTO suppliers(
          id, company_id, supplier_code, company_name, first_name, last_name, email, phone, website,
          address_line1, address_line2, city, state, zip_code, country,
          account_number, opening_balance, payment_term_id, credit_limit, tax_number, currency,
          current_balance, internal_notes, comments, logo, documents, status, rating,
          is_preferred, is_blacklisted, store_id, device_id, updated_at, sync_status
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `)
      stmt.run(
        supplier.id, supplier.companyId, supplier.supplierCode || null, supplier.companyName, supplier.firstName, supplier.lastName,
        supplier.email, supplier.phone, supplier.website, supplier.addressLine1,
        supplier.addressLine2, supplier.city, supplier.state, supplier.zipCode,
        supplier.country, supplier.accountNumber, supplier.openingBalance || 0,
        supplier.paymentTermId || null, supplier.creditLimit || 0, supplier.taxNumber,
        supplier.currency || 'USD', supplier.currentBalance || supplier.openingBalance || 0,
        supplier.internalNotes, supplier.comments, supplier.logo, supplier.documents,
        supplier.status || 'active', supplier.rating || 5, supplier.isPreferred ? 1 : 0,
        supplier.isBlacklisted ? 1 : 0, effectiveStoreId, deviceId
      )
      const result = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplier.id)
      return toCamelCase(result)
    } catch (err) {
      console.error('[DB] addSupplier error:', err.message)
      throw new Error(`Failed to add supplier: ${err.message}`)
    }
  },

  updateSupplier: (id, updates) => {
    try {
      const fields = []
      const values = []

      const fieldMap = {
        companyName: 'company_name',
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email',
        phone: 'phone',
        website: 'website',
        addressLine1: 'address_line1',
        addressLine2: 'address_line2',
        city: 'city',
        state: 'state',
        zipCode: 'zip_code',
        country: 'country',
        accountNumber: 'account_number',
        openingBalance: 'opening_balance',
        paymentTermId: 'payment_term_id',
        supplierCode: 'supplier_code',
        creditLimit: 'credit_limit',
        taxNumber: 'tax_number',
        currency: 'currency',
        currentBalance: 'current_balance',
        internalNotes: 'internal_notes',
        comments: 'comments',
        logo: 'logo',
        documents: 'documents',
        status: 'status',
        rating: 'rating',
        isPreferred: 'is_preferred',
        isBlacklisted: 'is_blacklisted',
        storeId: 'store_id' // Added to allow updating store if needed
      }

      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          let value = updates[key];
          
          // Sanitize empty strings for Foreign Key fields to prevent constraint failures
          if (value === "" && (key === 'storeId' || key === 'paymentTermId' || key === 'payment_term_id')) {
            value = null;
          }
          
          fields.push(`${fieldMap[key]} = ?`)
          values.push(key.startsWith('is') ? (value ? 1 : 0) : value)
        }
      })

      if (fields.length === 0) return null

      fields.push(`updated_at = datetime('now')`)
      fields.push(`sync_status = 0`)
      values.push(id)

      const stmt = db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ? `)
      stmt.run(...values)

      const result = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id)
      return toCamelCase(result)
    } catch (err) {
      console.error('[DB] updateSupplier error:', err.message, 'Updates:', updates);
      throw new Error(`Failed to update supplier: ${err.message}`)
    }
  },

  deleteSupplier: (id) => {
    return db.prepare("UPDATE suppliers SET is_deleted = 1, sync_status = 0, updated_at = datetime('now'), deleted_at = datetime('now') WHERE id = ?").run(id)
  },

  // Supplier Transactions
  getSupplierTransactions: (supplierId) => {
    const transactions = db.prepare('SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date DESC').all(supplierId)
    return transactions.map(toCamelCase)
  },

  addSupplierTransaction: (tx) => {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO supplier_transactions(id, supplier_id, type, amount, balance_after, date, reference_id, description, store_id, device_id, updated_at, sync_status)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `)
      stmt.run(
        tx.id, tx.supplierId, tx.type, tx.amount, tx.balanceAfter,
        tx.date, tx.referenceId, tx.description, tx.storeId, deviceId
      )

      // Update supplier current balance
      db.prepare('UPDATE suppliers SET current_balance = ?, sync_status = 0, updated_at = datetime(\'now\') WHERE id = ?').run(tx.balanceAfter, tx.supplierId)
    })

    transaction()
    const result = db.prepare('SELECT * FROM supplier_transactions WHERE id = ?').get(tx.id)
    return toCamelCase(result)
  },

  getSupplierLedger: (supplierId) => {
    // Get all purchases for supplier linked via ID instead of name
    const purchases = db.prepare(`
      SELECT 'purchase' as type, invoice_number as referenceId, '' as description, total_amount as amount, date 
      FROM purchases WHERE supplier_id = ?
   `).all(supplierId)

    // Get all payments (transactions) for supplier
    const txs = db.prepare(`
      SELECT 'payment' as type, reference_id as referenceId, description, amount, date 
      FROM supplier_transactions WHERE supplier_id = ?
   `).all(supplierId)

    // Combine and sort by date ascending for balance calculation
    const ledger = [...purchases, ...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let balance = 0
    return ledger.map(row => {
      balance += (row.type === 'purchase' ? row.amount : -row.amount)
      return { ...row, balanceAfter: balance }
    }).reverse() // Reverse for descending view in UI
  },

  // Payment Terms
  getPaymentTerms: (storeId) => {
    return db.prepare('SELECT * FROM payment_terms WHERE store_id = ? ORDER BY days ASC').all(storeId).map(toCamelCase)
  },
  addPaymentTerm: (term) => {
    db.prepare('INSERT INTO payment_terms (id, name, days, store_id, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))')
      .run(term.id, term.name, term.days, term.storeId)
    return toCamelCase(db.prepare('SELECT * FROM payment_terms WHERE id = ?').get(term.id))
  },

  // Supplier Documents
  getSupplierDocuments: (supplierId) => {
    return db.prepare('SELECT * FROM supplier_documents WHERE supplier_id = ? ORDER BY uploaded_at DESC').all(supplierId).map(toCamelCase)
  },
  addSupplierDocument: (doc) => {
    db.prepare('INSERT INTO supplier_documents (id, supplier_id, name, file_path, file_type, store_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(doc.id, doc.supplierId, doc.name, doc.filePath, doc.fileType, doc.storeId)
    return toCamelCase(db.prepare('SELECT * FROM supplier_documents WHERE id = ?').get(doc.id))
  },

  // Supplier Custom Fields
  getSupplierCustomFields: (storeId) => {
    const fields = db.prepare('SELECT * FROM supplier_custom_fields WHERE store_id = ? ORDER BY name ASC').all(storeId)
    return fields.map(toCamelCase)
  },

  addSupplierCustomField: (field) => {
    const stmt = db.prepare(`
      INSERT INTO supplier_custom_fields(id, name, field_type, is_required, show_on_receipt, hide_label, options, store_id, updated_at)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)
    stmt.run(
      field.id, field.name, field.fieldType, field.isRequired ? 1 : 0,
      field.showOnReceipt ? 1 : 0, field.hideLabel ? 1 : 0, field.options, field.storeId
    )
    const result = db.prepare('SELECT * FROM supplier_custom_fields WHERE id = ?').get(field.id)
    return toCamelCase(result)
  },

  getSupplierCustomValues: (supplierId) => {
    const values = db.prepare('SELECT * FROM supplier_custom_values WHERE supplier_id = ?').all(supplierId)
    return values.map(toCamelCase)
  },

  saveSupplierCustomValue: (val) => {
    const stmt = db.prepare(`
      INSERT INTO supplier_custom_values(id, supplier_id, field_id, value, updated_at)
VALUES(?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `)
    stmt.run(val.id, val.supplierId, val.fieldId, val.value)
    return true
  },

  // ── Receiving Module ──────────────────────────────────────────
  getReceivings: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const receivings = db.prepare(`
      SELECT r.*, s.company_name as supplier_name 
      FROM receivings r 
      JOIN suppliers s ON r.supplier_id = s.id 
      WHERE r.store_id = ? AND r.is_deleted = 0
      ORDER BY r.updated_at DESC
    `).all(effectiveStoreId)
    return receivings.map(toCamelCase)
  },

  deleteReceiving: (id) => {
    return db.prepare("UPDATE receivings SET is_deleted = 1, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  getReceivingById: (id) => {
    const stmt = db.prepare(`
      SELECT r.*, s.company_name as supplier_name 
      FROM receivings r 
      JOIN suppliers s ON r.supplier_id = s.id 
      WHERE r.id = ?
  `)
    const receiving = stmt.get(id)
    if (!receiving) return null

    const items = db.prepare('SELECT * FROM receiving_items WHERE receiving_id = ?').all(id)
    return {
      ...toCamelCase(receiving),
      items: items.map(toCamelCase)
    }
  },

  addReceiving: (receiving) => {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO receivings(
    id, receiving_number, supplier_id, purchase_order_id, total_amount,
    discount_total, amount_paid, amount_due, account_id, status, notes,
    custom_fields, store_id, device_id, updated_at
  )
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

      stmt.run(
        receiving.id, receiving.receivingNumber, receiving.supplierId,
        receiving.purchaseOrderId || null, receiving.totalAmount,
        receiving.discountTotal || 0, receiving.amountPaid || 0,
        receiving.amountDue || receiving.totalAmount, receiving.accountId || null,
        receiving.status || 'draft', receiving.notes,
        receiving.customFields || null, receiving.storeId, deviceId
      )

      if (receiving.items && receiving.items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO receiving_items(
    id, receiving_id, product_id, product_name, cost, quantity,
    discount_pct, total, batch_number, expiry_date, serial_number,
    location, selling_price, upc, description, store_id, updated_at
  )
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)

        for (const item of receiving.items) {
          itemStmt.run(
            item.id, receiving.id, item.productId, item.productName,
            item.cost, item.quantity, item.discountPct || 0, item.total,
            item.batchNumber, item.expiryDate, item.serialNumber,
            item.location, item.sellingPrice, item.upc, item.description,
            receiving.storeId
          )
        }
      }
    })

    transaction()
    return dbHelpers.getReceivingById(receiving.id)
  },

  updateReceiving: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      status: 'status',
      notes: 'notes',
      customFields: 'custom_fields',
      amountPaid: 'amount_paid',
      amountDue: 'amount_due',
      accountId: 'account_id'
    }

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })

    if (fields.length > 0) {
      fields.push(`updated_at = datetime('now')`)
      fields.push(`sync_status = 0`)
      values.push(id)
      db.prepare(`UPDATE receivings SET ${fields.join(', ')} WHERE id = ? `).run(...values)
    }

    // Special case: update items if provided
    if (updates.items) {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM receiving_items WHERE receiving_id = ?').run(id)
        const itemStmt = db.prepare(`
          INSERT INTO receiving_items(
  id, receiving_id, product_id, product_name, cost, quantity,
  discount_pct, total, batch_number, expiry_date, serial_number,
  location, selling_price, upc, description, store_id, updated_at
)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

        const receiving = db.prepare('SELECT store_id FROM receivings WHERE id = ?').get(id)
        for (const item of updates.items) {
          itemStmt.run(
            item.id, id, item.productId, item.productName,
            item.cost, item.quantity, item.discountPct || 0, item.total,
            item.batchNumber, item.expiryDate, item.serialNumber,
            item.location, item.sellingPrice, item.upc, item.description,
            receiving.store_id
          )
        }
      })
      transaction()
    }

    return dbHelpers.getReceivingById(id)
  },

  completeReceiving: (id, accountId, amountPaid) => {
    const transaction = db.transaction(() => {
      const receiving = dbHelpers.getReceivingById(id)
      if (!receiving || receiving.status === 'completed') return { success: false, error: 'Invalid or already completed' }

      // 1. Update Product Quantities & Purchase Prices
      const updateProdStmt = db.prepare('UPDATE products SET quantity = quantity + ?, purchase_price = ?, updated_at = datetime(\'now\'), sync_status = 0 WHERE id = ?')
      const logStmt = db.prepare(`
        INSERT INTO stock_logs(id, product_id, product_name, store_id, quantity_change, reason, reference_id, device_id, created_at)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)

      for (const item of receiving.items) {
        updateProdStmt.run(item.quantity, item.cost, item.productId)
        logStmt.run(`${id} -${item.productId} -log`, item.productId, item.productName, receiving.storeId, item.quantity, 'receiving', receiving.receivingNumber, deviceId)
      }

      // 2. Create Supplier Transaction (Purchase) & Update Balance
      const supplier = db.prepare('SELECT id, COALESCE(current_balance, 0) as current_balance FROM suppliers WHERE id = ?').get(receiving.supplierId)
      if (!supplier) throw new Error(`Supplier ${receiving.supplierId} not found`)

      const newBalance = supplier.current_balance + receiving.totalAmount

      // Atomic Balance Update
      db.prepare('UPDATE suppliers SET current_balance = ?, updated_at = datetime(\'now\'), sync_status = 0 WHERE id = ?').run(newBalance, receiving.supplierId)

      dbHelpers.addSupplierTransaction({
        id: `stx - ${Date.now()} `,
        supplierId: receiving.supplierId,
        type: 'purchase',
        amount: receiving.totalAmount,
        balanceAfter: newBalance,
        date: new Date().toISOString(),
        referenceId: receiving.receivingNumber,
        description: `Receiving #${receiving.receivingNumber} `,
        storeId: receiving.storeId
      })

      // 3. Update Purchase Order Status if linked
      if (receiving.purchaseOrderId) {
        db.prepare("UPDATE purchase_orders SET status = 'received', updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(receiving.purchaseOrderId)
      }

      // 4. Update Receiving Header
      db.prepare(`
        UPDATE receivings 
        SET status = 'completed', amount_paid = ?, amount_due = ?, account_id = ?,
  completed_at = datetime('now'), updated_at = datetime('now'), sync_status = 0 
        WHERE id = ?
  `).run(amountPaid, receiving.totalAmount - amountPaid, accountId || null, id)

      // 5. If payment made, create payment transaction
      if (amountPaid > 0) {
        const balanceAfterPayment = newBalance - amountPaid
        dbHelpers.addSupplierTransaction({
          id: `stx - ${Date.now()} -pay`,
          supplierId: receiving.supplierId,
          type: 'payment',
          amount: amountPaid,
          balanceAfter: balanceAfterPayment,
          date: new Date().toISOString(),
          referenceId: receiving.receivingNumber,
          description: `Payment for Receiving #${receiving.receivingNumber}`,
          storeId: receiving.storeId
        })

        // Update account balance
        if (accountId) {
          dbHelpers.updateAccountBalance(accountId, -amountPaid)
        }
      }
    })

    transaction()
    return { success: true }
  },

  suspendReceiving: (id) => {
    db.prepare("UPDATE receivings SET status = 'suspended', updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(id)
    return { success: true }
  },

  addReceivingPayment: (id, amount, accountId) => {
    const transaction = db.transaction(() => {
      const receiving = db.prepare('SELECT * FROM receivings WHERE id = ?').get(id)
      if (!receiving) return { success: false, error: 'Not found' }

      const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(receiving.supplier_id)
      const newBalance = supplier.current_balance - amount

      dbHelpers.addSupplierTransaction({
        id: `stx - ${Date.now()} `,
        supplierId: receiving.supplier_id,
        type: 'payment',
        amount: amount,
        balanceAfter: newBalance,
        date: new Date().toISOString(),
        referenceId: receiving.receiving_number,
        description: `Partial payment for #${receiving.receiving_number}`,
        storeId: receiving.store_id
      })

      db.prepare('UPDATE receivings SET amount_paid = amount_paid + ?, amount_due = amount_due - ?, account_id = ?, updated_at = datetime(\'now\'), sync_status = 0 WHERE id = ?')
        .run(amount, amount, accountId, id)

      if (accountId) {
        dbHelpers.updateAccountBalance(accountId, -amount)
      }
    })
    transaction()
    return { success: true }
  },

  deleteReceiving: (id) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM receiving_items WHERE receiving_id = ?').run(id)
      db.prepare('DELETE FROM receivings WHERE id = ?').run(id)
    })
    transaction()
    return { success: true }
  },

  // ── Invoice Module ──────────────────────────────────────────
  getInvoices: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const invoices = db.prepare(`
      SELECT i.*, 
             c.name as customer_name,
             s.company_name as supplier_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.store_id = ? AND i.is_deleted = 0
      ORDER BY i.date DESC
    `).all(effectiveStoreId)
    return invoices.map(toCamelCase)
  },

  getInvoiceById: (id) => {
    const invoice = db.prepare(`
      SELECT i.*,
  c.name as customer_name,
  s.company_name as supplier_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.id = ?
  `).get(id)

    if (!invoice) return null

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id)
    return {
      ...toCamelCase(invoice),
      items: items.map(toCamelCase)
    }
  },

  createInvoice: (invoice) => {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO invoices(
          id, company_id, invoice_number, type, status, customer_id, supplier_id,
          date, due_date, subtotal, discount_amount, tax_amount,
          total_amount, amount_paid, amount_due, original_amount, original_currency,
          notes, store_id, device_id, updated_at
        )
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)

      stmt.run(
        invoice.id, invoice.companyId, invoice.invoiceNumber, invoice.type, invoice.status || 'draft',
        invoice.customerId || null, invoice.supplierId || null, invoice.date,
        invoice.dueDate || null, invoice.subtotal || 0, invoice.discountAmount || 0,
        invoice.taxAmount || 0, invoice.totalAmount || 0, invoice.amountPaid || 0,
        invoice.amountDue || invoice.totalAmount, 
        invoice.originalAmount || null, invoice.originalCurrency || null,
        invoice.notes || null, invoice.storeId, deviceId
      )

      if (invoice.items && invoice.items.length > 0) {
        const itemStmt = db.prepare(`
          INSERT INTO invoice_items(
    id, invoice_id, product_id, description, quantity, unit_price,
    discount_amount, tax_amount, total, store_id, updated_at
  )
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `)

        for (const item of invoice.items) {
          itemStmt.run(
            item.id, invoice.id, item.productId || null, item.description || null,
            item.quantity, item.unitPrice, item.discountAmount || 0,
            item.taxAmount || 0, item.total, invoice.storeId
          )
        }
      }
    })

    transaction()
    return dbHelpers.getInvoiceById(invoice.id)
  },

  updateInvoice: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      status: 'status',
      dueDate: 'due_date',
      amountPaid: 'amount_paid',
      amountDue: 'amount_due',
      notes: 'notes'
    }

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })

    if (fields.length > 0) {
      fields.push(`updated_at = datetime('now')`)
      fields.push(`sync_status = 0`)
      values.push(id)
      db.prepare(`UPDATE invoices SET ${fields.join(', ')} WHERE id = ? `).run(...values)
    }

    if (updates.items) {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)
        const itemStmt = db.prepare(`
          INSERT INTO invoice_items(
  id, invoice_id, product_id, description, quantity, unit_price,
  discount_amount, tax_amount, total, store_id, updated_at
)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

        const inv = db.prepare('SELECT store_id FROM invoices WHERE id = ?').get(id)
        for (const item of updates.items) {
          itemStmt.run(
            item.id, id, item.productId || null, item.description || null,
            item.quantity, item.unitPrice, item.discountAmount || 0,
            item.taxAmount || 0, item.total, inv.store_id
          )
        }
      })
      transaction()
    }

    return dbHelpers.getInvoiceById(id)
  },

  deleteInvoice: (id) => {
    return db.prepare("UPDATE invoices SET is_deleted = 1, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },


  clearLocalData: (storeId) => {
    // 0. Disable foreign keys for the purge
    db.pragma('foreign_keys = OFF');

    const transaction = db.transaction(() => {
      // 1. Clear Dependent Child Tables first to avoid constraint issues
      const childTables = [
        'sale_items', 'sale_payments', 'invoice_items', 'receiving_items',
        'stock_logs', 'stock_transfers', 'loyalty_points', 'commissions',
        'item_kit_items', 'supplier_custom_values', 'product_custom_values'
      ];

      for (const table of childTables) {
        try {
          // Try with store_id first, fallback to full clear if fails
          db.prepare(`DELETE FROM ${table} WHERE store_id = ?`).run(storeId);
        } catch (e) {
          try {
            if (table === 'sale_items' || table === 'sale_payments') {
               db.prepare(`DELETE FROM ${table} WHERE sale_id IN (SELECT id FROM sales WHERE store_id = ?)`).run(storeId);
            } else if (table === 'invoice_items') {
               db.prepare(`DELETE FROM ${table} WHERE invoice_id IN (SELECT id FROM invoices WHERE store_id = ?)`).run(storeId);
            } else if (table === 'stock_logs' || table === 'stock_transfers' || table === 'product_custom_values') {
               db.prepare(`DELETE FROM ${table} WHERE product_id IN (SELECT id FROM products WHERE store_id = ?)`).run(storeId);
            } else {
               db.prepare(`DELETE FROM ${table}`).run();
            }
          } catch (inner) {
            // Table might not exist or have different schema
          }
        }
      }

      // 2. Keep 3 Products
      const recentProducts = db.prepare('SELECT id FROM products WHERE store_id = ? ORDER BY updated_at DESC LIMIT 3').all(storeId);
      const productIds = recentProducts.map(p => p.id);
      
      const placeholders = productIds.map(() => '?').join(',');
      if (productIds.length > 0) {
        db.prepare(`DELETE FROM products WHERE store_id = ? AND id NOT IN (${placeholders})`).run(storeId, ...productIds);
      } else {
        db.prepare('DELETE FROM products WHERE store_id = ?').run(storeId);
      }

      // 3. Keep 3 Sales
      const recentSales = db.prepare('SELECT id FROM sales WHERE store_id = ? ORDER BY date DESC LIMIT 3').all(storeId);
      const saleIds = recentSales.map(s => s.id);
      
      const salePlaceholders = saleIds.map(() => '?').join(',');
      if (saleIds.length > 0) {
        db.prepare(`DELETE FROM sales WHERE store_id = ? AND id NOT IN (${salePlaceholders})`).run(storeId, ...saleIds);
      } else {
        db.prepare('DELETE FROM sales WHERE store_id = ?').run(storeId);
      }

      // 4. Clear other tables completely
      const tablesToClear = [
        'customers', 'suppliers', 'purchases', 'transactions', 
        'quotations', 'receivings', 'receiving_items', 'invoices', 
        'invoice_items', 'cheques', 'item_kits', 'stock_transfers',
        'attendance', 'leaves', 'payroll', 'gift_cards', 'work_orders'
      ];

      for (const table of tablesToClear) {
        try {
          if (table === 'stock_transfers') {
            db.prepare(`DELETE FROM stock_transfers WHERE from_store_id = ? OR to_store_id = ?`).run(storeId, storeId);
          } else {
            db.prepare(`DELETE FROM ${table} WHERE store_id = ?`).run(storeId);
          }
        } catch (e) {
          // Table might not exist or have different schema
        }
      }
      
      return true;
    });

    const result = transaction();
    
    // 5. Re-enable foreign keys (Global setting is OFF, but we'll stick to startup preference)
    db.pragma('foreign_keys = OFF'); 
    
    return result;
  },

  deleteSale: (id) => {
    // Soft-delete: mark as deleted, mark dirty for sync, and rename invoice_number to __DEL__ prefix 
    // to survive remote backend sync limitations where is_deleted is not sent back during pulls.
    return db.prepare(`UPDATE sales SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now'), status = 'suspended', invoice_number = '__DEL__' || invoice_number WHERE id = ? AND invoice_number NOT LIKE '__DEL__%'`).run(id);
  },

  deletePurchase: (id) => {
    // Soft-delete: mark as deleted and rename invoice_number to survive cloud sync
    return db.prepare(`UPDATE purchases SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now'), invoice_number = '__DEL__' || invoice_number WHERE id = ? AND invoice_number NOT LIKE '__DEL__%'`).run(id);
  },

  deleteQuotation: (id) => {
    return db.prepare(`UPDATE quotations SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now'), status = 'cancelled', quotation_number = '__DEL__' || quotation_number WHERE id = ? AND quotation_number NOT LIKE '__DEL__%'`).run(id);
  },
  restoreQuotation: (id) => {
    return db.prepare(`UPDATE quotations SET is_deleted = 0, sync_status = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  },
  getTrashQuotations: (companyId) => {
    const quotations = db.prepare('SELECT * FROM quotations WHERE company_id = ? AND is_deleted = 1 ORDER BY updated_at DESC').all(companyId)
    return quotations.map(q => {
      const camelQ = toCamelCase(q)
      let qItems = [];
      try { qItems = JSON.parse(camelQ.items); } catch(e) {}
      return { ...camelQ, items: qItems }
    })
  },

  deleteTransaction: (id) => {
    return db.prepare(`UPDATE transactions SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
  },

  runQuery: (query, params = []) => {
    const result = db.prepare(query).all(params)
    return result.map(toCamelCase)
  },


  getAllCategories: (companyId, storeId) => {
    const categories = db.prepare("SELECT * FROM categories WHERE company_id = ? AND store_id = ? AND is_deleted = 0 AND name NOT LIKE '__DEL__%' ORDER BY name ASC").all(companyId, storeId)
    return categories.map(toCamelCase)
  },
  
  getCategories: (companyId, storeId) => dbHelpers.getAllCategories(companyId, storeId),

  addCategory: (category) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO categories(id, company_id, name, description, store_id, device_id, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      stmt.run(category.id, category.companyId, category.name, category.description, category.storeId, deviceId)
      const result = db.prepare('SELECT * FROM categories WHERE id = ?').get(category.id)
      return toCamelCase(result)
    } catch (err) {
      console.error('[DB] addCategory ERROR:', err.message);
      throw new Error(`Failed to add category: ${err.message}`);
    }
  },

  updateCategory: (id, updates) => {
    try {
      const fields = []
      const values = []
      const fieldMap = {
        name: 'name',
        description: 'description'
      }

      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = ?`)
          values.push(updates[key])
        }
      })

      if (fields.length === 0) return null

      fields.push(`updated_at = datetime('now')`)
      fields.push(`sync_status = 0`)
      values.push(id)

      db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
      return toCamelCase(db.prepare('SELECT * FROM categories WHERE id = ?').get(id))
    } catch (err) {
      console.error('[DB] updateCategory ERROR:', err.message);
      throw new Error(`Failed to update category: ${err.message}`);
    }
  },

  deleteCategory: (id) => {
    try {
      const transaction = db.transaction(() => {
        // 1. Soft Delete the Category
        db.prepare("UPDATE categories SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now'), name = '__DEL__' || name WHERE id = ? AND name NOT LIKE '__DEL__%'").run(id)
        
        // 2. SET_NULL for Products (Orphan Protection)
        db.prepare("UPDATE products SET categoryId = NULL, sync_status = 0, updated_at = datetime('now') WHERE categoryId = ?").run(id)
      })
      return transaction()
    } catch (err) {
      console.error('[DB] deleteCategory ERROR:', err.message);
      throw new Error(`Failed to delete category: ${err.message}`);
    }
  },

  restoreCategory: (id) => {
    return db.prepare("UPDATE categories SET is_deleted = 0, deleted_at = NULL, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  getAllAccounts: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM accounts WHERE store_id = ? AND is_deleted = 0').all(effectiveStoreId).map(toCamelCase)
  },

  addAccount: (account) => {
    const stmt = db.prepare(`
      INSERT INTO accounts(id, company_id, name, type, balance, store_id, device_id, updated_at)
VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)
    stmt.run(account.id, account.companyId, account.name, account.type, account.balance || 0, account.storeId, deviceId)
    const result = db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id)
    return toCamelCase(result)
  },

  updateAccount: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      name: 'name',
      type: 'type',
      balance: 'balance'
    }

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })

    if (fields.length === 0) return null

    fields.push(`updated_at = datetime('now')`)
    fields.push(`sync_status = 0`)
    values.push(id)

    const stmt = db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    return toCamelCase(db.prepare('SELECT * FROM accounts WHERE id = ?').get(id))
  },

  deleteAccount: (id) => {
    // Check if account has transactions or sales linked to it
    const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?').get(id).count
    const saleCount = db.prepare('SELECT COUNT(*) as count FROM sales WHERE account_id = ?').get(id).count
    
    if (txCount > 0 || saleCount > 0) {
      throw new Error('Cannot delete account with existing transactions or sales.')
    }

    return db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  },
  getAllQuotations: (companyId, storeId) => {
    // Relax companyId locally, default to all non-deleted
    let query = `SELECT * FROM quotations WHERE is_deleted = 0 AND quotation_number NOT LIKE '__DEL__%'`;
    let params = [];
    
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    if (effectiveStoreId) {
      query += ' AND store_id = ?';
      params.push(effectiveStoreId);
    }
    
    query += ' ORDER BY date DESC';
    
    const quotations = db.prepare(query).all(...params)
    return quotations.map(q => {
      const camelQ = toCamelCase(q)
      let qItems = [];
      try { qItems = JSON.parse(camelQ.items); } catch(e) {}
      return { ...camelQ, items: qItems }
    })
  },
  getAllPurchases: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const purchases = db.prepare(`SELECT * FROM purchases WHERE store_id = ? AND is_deleted = 0 AND invoice_number NOT LIKE '__DEL__%' ORDER BY date DESC`).all(effectiveStoreId)
    return purchases.map(p => {
      const camelP = toCamelCase(p)
      let pItems = [];
      try { pItems = JSON.parse(camelP.items); } catch(e) {}
      return { ...camelP, items: pItems }
    })
  },
  getAllTransactions: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM transactions WHERE store_id = ? AND is_deleted = 0 ORDER BY date DESC').all(effectiveStoreId).map(toCamelCase)
  },

  addQuotation: (quotation) => {
    const stmt = db.prepare(`
      INSERT INTO quotations(
        id, company_id, quotation_number, items, total_amount, 
        original_amount, original_currency,
        customer_id, customer_name, customer_phone, 
        store_id, date, expiry_date, status, notes, 
        device_id, updated_at, sync_status
      )
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
    `)
    return stmt.run(
      quotation.id, 
      quotation.companyId,
      quotation.quotationNumber, 
      JSON.stringify(quotation.items),
      quotation.totalAmount, 
      quotation.originalAmount,
      quotation.originalCurrency,
      quotation.customerId, 
      quotation.customerName,
      quotation.customerPhone, 
      quotation.storeId, 
      quotation.date,
      quotation.expiryDate, 
      quotation.status, 
      quotation.notes, 
      deviceId
    )
  },

  // Atomic Purchase Processing
  processPurchase: (purchase) => {
    try {
      const transaction = db.transaction(() => {
        // AI CAPTURE: Auto-create supplier if missing but name provided
        if (!purchase.supplierId && purchase.supplier) {
          const existing = db.prepare('SELECT id FROM suppliers WHERE company_name = ? COLLATE NOCASE').get(purchase.supplier);
          if (existing) {
            purchase.supplierId = existing.id;
          } else {
            // Create minimal supplier
            const newSuppId = `supp-${Date.now()}`;
            db.prepare(`
              INSERT INTO suppliers(id, company_id, company_name, current_balance, store_id, device_id, updated_at, sync_status)
              VALUES(?, ?, ?, 0, ?, ?, datetime('now'), 0)
            `).run(newSuppId, purchase.companyId, purchase.supplier, purchase.storeId, deviceId);
            purchase.supplierId = newSuppId;
          }
        }

        // 1. Insert Purchase
        const stmt = db.prepare(`
          INSERT INTO purchases(
            id, company_id, invoice_number, supplier, supplier_id, type, items, total_amount, 
            original_amount, original_currency,
            store_id, account_id, date, device_id, updated_at, sync_status
          )
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
        `)
        stmt.run(
          purchase.id, purchase.companyId, purchase.invoiceNumber, purchase.supplier, purchase.supplierId || null, purchase.type,
          JSON.stringify(purchase.items), purchase.totalAmount, 
          purchase.originalAmount || null, purchase.originalCurrency || null,
          purchase.storeId, purchase.accountId, purchase.date, deviceId
        )

        // 2. Update Stock & Logs
        const updateStockStmt = db.prepare('UPDATE products SET quantity = quantity + ?, updated_at = datetime(\'now\'), sync_status = 0 WHERE id = ?')

        const logStmt = db.prepare(`
          INSERT INTO stock_logs(id, company_id, product_id, product_name, store_id, quantity_change, reason, reference_id, device_id, created_at, sync_status)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
        `)

        for (const item of purchase.items) {
          // FK FIX: Ensure product exists before updating stock or logs
          const productExists = db.prepare('SELECT COUNT(*) as count FROM products WHERE id = ?').get(item.productId).count > 0
          if (!productExists) {
            db.prepare(`
              INSERT INTO products(id, company_id, store_id, name, sku, category, selling_price, purchase_price, quantity, updated_at, sync_status)
              VALUES(?, ?, ?, ?, ?, ?, 0, ?, datetime('now'), 0)
            `).run(
              item.productId,
              purchase.companyId,
              purchase.storeId,
              item.productName,
              `AUTO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
              'AI Captured',
              item.price * 1.5, // Default margin
              item.price
            )
          }

          updateStockStmt.run(item.quantity, item.productId)

          logStmt.run(
            `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            purchase.companyId,
            item.productId,
            item.productName,
            purchase.storeId,
            item.quantity, // Positive change
            'PURCHASE',
            purchase.invoiceNumber,
            deviceId
          )
        }

        // 3. Update Account Balance (Deduct Money)
        if (purchase.type === 'cash') {
          dbHelpers.updateAccountBalance(purchase.accountId, -purchase.totalAmount)
        }
      })

      transaction()
      return { success: true }
    } catch (err) {
      console.error('[DB] processPurchase error:', err.message)
      throw new Error(`Failed to process purchase: ${err.message}`)
    }
  },

  addPurchase: (purchase) => {
    return dbHelpers.processPurchase(purchase)
  },

  addTransaction: (transaction) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO transactions(id, company_id, type, amount, description, customer_id, store_id, account_id, date, device_id, updated_at, sync_status, expense_category_id)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, ?)
      `)
      stmt.run(
        transaction.id, transaction.companyId, transaction.type, transaction.amount, transaction.description,
        transaction.customerId, transaction.storeId,
        transaction.accountId, transaction.date, deviceId, transaction.expenseCategoryId
      )
    } catch (err) {
      console.error('[DB] addTransaction ERROR:', err.message);
      throw err;
    }

    // Update Account Balance
    const adjustment = transaction.type === 'cash_in' ? transaction.amount : -transaction.amount;
    dbHelpers.updateAccountBalance(transaction.accountId, adjustment)

    // Update Customer Balance if relevant
    if (transaction.customerId && transaction.type === 'cash_in') {
      const updateCustomerStmt = db.prepare('UPDATE customers SET credit_balance = credit_balance - ?, sync_status = 0, updated_at = datetime(\'now\') WHERE id = ?')
      updateCustomerStmt.run(transaction.amount, transaction.customerId)
    }

    return true
  },

  deleteAccount: (id) => {
    return db.prepare("UPDATE accounts SET is_deleted = 1, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  deleteShift: (id) => {
    return db.prepare("UPDATE shifts SET status = 'cancelled', sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
  },

  // Performance & Risk
  getStaffPerformanceData: (storeId, startDate, endDate) => {
    return db.prepare(`
      SELECT
        u.id as user_id,
        u.name,
        COUNT(c.id) as sale_count,
        COALESCE(SUM(c.amount), 0) / (COALESCE(c.percentage, 2.0) / 100.0) as estimated_revenue
      FROM users u
      LEFT JOIN commissions c ON u.id = c.user_id
      LEFT JOIN sales s ON c.sale_id = s.id
      WHERE u.company_id = ? AND u.store_id = ? AND s.date BETWEEN ? AND ?
      GROUP BY u.id
    `).all(companyId, storeId, startDate, endDate).map(toCamelCase)
  },

  getInventoryShrinkage: (companyId, storeId, startDate, endDate) => {
    return db.prepare(`
        SELECT sl.*, p.name as product_name, p.sku
        FROM stock_logs sl
        JOIN products p ON sl.product_id = p.id
        WHERE sl.company_id = ? AND sl.store_id = ?
        AND sl.reason != 'SALE'
        AND sl.created_at BETWEEN ? AND ?
        ORDER BY sl.created_at DESC
    `).all(companyId, storeId, startDate, endDate).map(toCamelCase)
  },

  // 1. Stock Transfers
  processStockTransfer: (transfer) => {
    const transaction = db.transaction(() => {
      // 1. Get the source product to verify stock and get details
      const sourceProduct = db.prepare('SELECT * FROM products WHERE id = ? AND store_id = ?').get(transfer.productId, transfer.fromStoreId);
      if (!sourceProduct) {
        throw new Error(`Source product ${transfer.productId} not found in store ${transfer.fromStoreId}`);
      }
      if (sourceProduct.quantity < transfer.quantity) {
        throw new Error(`Insufficient stock for transfer. Available: ${sourceProduct.quantity}, Requested: ${transfer.quantity}`);
      }

      // 2. Create transfer record (marked completed)
      const stmt = db.prepare(`
        INSERT INTO stock_transfers(id, company_id, product_id, from_store_id, to_store_id, quantity, status, device_id, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'))
      `);
      stmt.run(transfer.id, transfer.companyId, transfer.productId, transfer.fromStoreId, transfer.toStoreId, transfer.quantity, deviceId);

      // 3. Deduct from source store
      db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(transfer.quantity, transfer.productId);
      
      // Log outgoing transfer
      db.prepare(`
        INSERT INTO stock_logs(id, product_id, product_name, store_id, quantity_change, reason, reference_id, device_id, created_at)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(`${Date.now()}-out-${Math.random().toString(36).substr(2, 5)}`, transfer.productId, sourceProduct.name, transfer.fromStoreId, -transfer.quantity, 'TRANSFER_OUT', transfer.id, deviceId);

      // 4. Handle destination store (Find by SKU or Barcode)
      let destProduct = db.prepare('SELECT id FROM products WHERE store_id = ? AND (sku = ? OR (barcode = ? AND barcode IS NOT NULL AND barcode != \'\'))').get(transfer.toStoreId, sourceProduct.sku, sourceProduct.barcode);
      
      let destProductId = destProduct ? destProduct.id : null;

      if (!destProduct) {
        // Create product in destination store
        destProductId = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        db.prepare(`
          INSERT INTO products(id, company_id, name, sku, category, category_id, categoryId, category_name, description, selling_price, purchase_price, quantity, store_id, unit, brand, barcode, min_stock, reorder_quantity, is_deleted, is_kit, barcode_enabled, tax_slab_id, device_id, discount_percentage, price_inr, price_usd, updated_at, sync_status)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
        `).run(
          destProductId, sourceProduct.company_id, sourceProduct.name, sourceProduct.sku, sourceProduct.category, 
          sourceProduct.category_id, sourceProduct.categoryId, sourceProduct.category_name, sourceProduct.description,
          sourceProduct.selling_price, sourceProduct.purchase_price, transfer.quantity, 
          transfer.toStoreId, sourceProduct.unit, sourceProduct.brand, sourceProduct.barcode, 
          sourceProduct.min_stock, sourceProduct.reorder_quantity, sourceProduct.is_deleted, 
          sourceProduct.is_kit, sourceProduct.barcode_enabled, sourceProduct.tax_slab_id, 
          deviceId, sourceProduct.discount_percentage, sourceProduct.price_inr, sourceProduct.price_usd
        );
      } else {
        // Add to existing product
        db.prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(transfer.quantity, destProductId);
      }

      // Log incoming transfer
      db.prepare(`
        INSERT INTO stock_logs(id, product_id, product_name, store_id, quantity_change, reason, reference_id, device_id, created_at)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(`${Date.now()}-in-${Math.random().toString(36).substr(2, 5)}`, destProductId, sourceProduct.name, transfer.toStoreId, transfer.quantity, 'TRANSFER_IN', transfer.id, deviceId);

    });
    transaction();
    return { success: true };
  },
  getStockTransfers: (companyId, storeId) => {
    const company = resolveCompanyId(companyId);
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM stock_transfers WHERE (company_id = ? OR company_id = ? OR company_id IS NULL) AND (from_store_id = ? OR to_store_id = ?) ORDER BY updated_at DESC').all(company, `${company}.0`, effectiveStoreId, effectiveStoreId).map(toCamelCase)
  },

  // 4. Expense Categories
  getExpenseCategories: (companyId) => {
    const company = resolveCompanyId(companyId);
    return db.prepare('SELECT * FROM expense_categories WHERE (company_id = ? OR company_id = ? OR company_id IS NULL)').all(company, `${company}.0`).map(toCamelCase)
  },
  addExpenseCategory: (cat) => {
    db.prepare("INSERT INTO expense_categories (id, name, parent_id, company_id, updated_at) VALUES (?, ?, ?, ?, datetime('now'))")
      .run(cat.id, cat.name, cat.parentId, cat.companyId)
    return db.prepare('SELECT * FROM expense_categories WHERE id = ?').get(cat.id)
  },

  // 6. Tax Management
  getTaxSlabs: (companyId) => {
    const company = resolveCompanyId(companyId);
    return db.prepare('SELECT * FROM tax_slabs WHERE (company_id = ? OR company_id = ? OR company_id IS NULL) AND is_deleted = 0').all(company, `${company}.0`).map(toCamelCase)
  },
  addTaxSlab: (slab) => {
    db.prepare("INSERT INTO tax_slabs (id, name, percentage, company_id, store_id, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, datetime('now'), 0)")
      .run(slab.id, slab.name, slab.percentage, slab.companyId, slab.storeId)
    return db.prepare('SELECT * FROM tax_slabs WHERE id = ?').get(slab.id)
  },
  deleteTaxSlab: (id) => {
    const transaction = db.transaction(() => {
        db.prepare("UPDATE tax_slabs SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0 WHERE id = ?").run(id);
        // Remove from products
        db.prepare("UPDATE products SET tax_slab_id = NULL, sync_status = 0 WHERE tax_slab_id = ?").run(id);
    });
    transaction();
    return { success: true };
  },

  // 7. Loyalty Program
  addLoyaltyPoints: (points) => {
    db.prepare('INSERT INTO loyalty_points (id, company_id, customer_id, points, reason, sale_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(points.id, points.companyId, points.customerId, points.points, points.reason, points.saleId)
    return true
  },
  getLoyaltyPoints: (customerId) => {
    return db.prepare('SELECT * FROM loyalty_points WHERE customer_id = ? ORDER BY updated_at DESC').all(customerId).map(toCamelCase)
  },

  // 3. Customer Ledger
  getCustomerLedger: (customerId) => {
    // Get all sales for customer
    const sales = db.prepare(`
      SELECT 'SALE' as type, invoice_number as reference, total_amount as debit, 0 as credit, date 
      FROM sales WHERE customer_id = ?
  `).all(customerId)

    // Get all payments (transactions) for customer
    const txs = db.prepare(`
      SELECT 'PAYMENT' as type, type as reference, 0 as debit, amount as credit, date 
      FROM transactions WHERE customer_id = ? AND type = 'cash_in'
  `).all(customerId)

    // Combine and sort by date ascending for balance calculation
    const ledger = [...sales, ...txs].sort((a, b) => new Date(a.date) - new Date(b.date))

    let balance = 0
    return ledger.map(row => {
      balance += (row.debit - row.credit)
      return { ...row, cumulative_balance: balance }
    }).reverse() // Reverse for descending view in UI
  },

  // 2. Purchase Orders
  getPurchaseOrders: (companyId, storeId) => {
    const company = resolveCompanyId(companyId);
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM purchase_orders WHERE (company_id = ? OR company_id = ? OR company_id IS NULL) AND store_id = ?').all(company, `${company}.0`, effectiveStoreId).map(row => {
      const po = toCamelCase(row);
      if (typeof po.items === 'string') {
        try { po.items = JSON.parse(po.items); } catch (e) { po.items = []; }
      }
      return po;
    });
  },
  getPurchaseOrderById: (id, companyId) => {
    const company = resolveCompanyId(companyId);
    const row = db.prepare('SELECT * FROM purchase_orders WHERE id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL)').get(id, company, `${company}.0`);
    if (!row) return null;
    const po = toCamelCase(row);
    if (typeof po.items === 'string') {
      try { po.items = JSON.parse(po.items); } catch (e) { po.items = []; }
    }
    return po;
  },
  addPurchaseOrder: (po) => {
    try {
      const company = resolveCompanyId(po.companyId);
      const effectiveStoreId = storeRedirects.get(po.storeId) || po.storeId;
      db.prepare(`
        INSERT INTO purchase_orders (
          id, company_id, supplier, supplier_id, items, total_amount, status, store_id, date, device_id, 
          po_number, notes, expected_delivery_date, tax_amount, discount_amount, subtotal,
          updated_at, sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(
        po.id, company, po.supplier, po.supplierId || null, JSON.stringify(po.items),
        po.totalAmount, po.status || 'draft', effectiveStoreId, po.date, deviceId,
        po.poNumber || null, po.notes || null, po.expectedDeliveryDate || null,
        po.taxAmount || 0, po.discountAmount || 0, po.subtotal || 0
      )
      return true
    } catch (err) {
      console.error('[DB] addPurchaseOrder error:', err.message)
      throw new Error(`Failed to add purchase order: ${err.message}`)
    }
  },
  updatePurchaseOrder: (id, updates, companyId) => {
    try {
      const company = resolveCompanyId(companyId);
      // Build dynamic SET clause from updates
      const allowedFields = {
        supplier: 'supplier', supplierId: 'supplier_id', items: 'items',
        totalAmount: 'total_amount', status: 'status', date: 'date',
        expectedDeliveryDate: 'expected_delivery_date',
        taxAmount: 'tax_amount', discountAmount: 'discount_amount',
        subtotal: 'subtotal', notes: 'notes', poNumber: 'po_number'
      };
      const setClauses = [];
      const values = [];
      for (const [key, col] of Object.entries(allowedFields)) {
        if (updates[key] !== undefined) {
          setClauses.push(`${col} = ?`);
          values.push(key === 'items' ? JSON.stringify(updates[key]) : updates[key]);
        }
      }
      if (setClauses.length === 0) return true;
      setClauses.push("updated_at = datetime('now')", "sync_status = 0");
      values.push(id);
      db.prepare(`UPDATE purchase_orders SET ${setClauses.join(', ')} WHERE id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL)`).run(...values, company, `${company}.0`);
      return true;
    } catch (err) {
      console.error('[DB] updatePurchaseOrder error:', err.message);
      throw new Error(`Failed to update purchase order: ${err.message}`);
    }
  },
  deletePurchaseOrder: (id, companyId) => {
    try {
      const company = resolveCompanyId(companyId);
      // Check if received — prevent delete
      const po = db.prepare('SELECT status FROM purchase_orders WHERE id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL)').get(id, company, `${company}.0`);
      if (!po) throw new Error('Purchase order not found');
      if (po.status === 'received') throw new Error('Cannot delete a received purchase order');
      // Soft delete by setting status to cancelled
      db.prepare("UPDATE purchase_orders SET status = 'cancelled', updated_at = datetime('now'), sync_status = 0 WHERE id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL)").run(id, company, `${company}.0`);
      return true;
    } catch (err) {
      console.error('[DB] deletePurchaseOrder error:', err.message);
      throw new Error(`Failed to delete purchase order: ${err.message}`);
    }
  },
  receivePurchaseOrder: (id, companyId) => {
    try {
      const company = resolveCompanyId(companyId);
      const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL)').get(id, company, `${company}.0`);
      if (!po) throw new Error('Purchase order not found');
      if (po.status === 'received') throw new Error('Purchase order already received');
      if (po.status === 'cancelled') throw new Error('Cannot receive a cancelled purchase order');
      if (po.status !== 'sent') throw new Error('Purchase order must be in Sent status to receive');

      const items = JSON.parse(po.items || '[]');
      if (!items.length) throw new Error('No items in purchase order to receive');

      // Run in a transaction: update PO status + increase stock for each item
      const receiveTransaction = db.transaction(() => {
        // 1. Update PO status
        db.prepare("UPDATE purchase_orders SET status = 'received', updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(id);

        // 2. Update inventory for each item
        for (const item of items) {
          const productId = item.productId || item.product_id;
          const qty = Number(item.quantity) || 0;
          if (!productId || qty <= 0) continue;

          // Increase product stock
          db.prepare("UPDATE products SET quantity = quantity + ?, updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(qty, productId);

          // Log stock change
          const logId = `sl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          db.prepare(`
            INSERT INTO stock_logs (id, company_id, store_id, product_id, quantity_change, reason, reference_id, device_id, updated_at, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
          `).run(logId, companyId, po.store_id, productId, qty, 'Purchase Order Received', id, deviceId);
        }
        return true;
      });

      receiveTransaction();
      console.log(`[DB] Purchase Order ${id} received. ${items.length} products stock updated.`);
      return true;
    } catch (err) {
      console.error('[DB] receivePurchaseOrder error:', err.message);
      throw new Error(`Failed to receive purchase order: ${err.message}`);
    }
  },

  // 8. Barcode Designer/Printer (Utility)
  generateBarcode: (sku) => {
    // Return a mock SVG as a data URI
    const barcodeText = `${sku} -${Date.now().toString().slice(-4)} `
    const bars = barcodeText.split('').map((c, i) => {
      const width = (c.charCodeAt(0) % 4) + 1
      return `< rect x = "${i * 10}" y = "0" width = "${width}" height = "40" fill = "black" /> `
    }).join('')

    const svg = `
  < svg xmlns = "http://www.w3.org/2000/svg" width = "250" height = "80" >
        <rect width="250" height="80" fill="white"/>
        <g transform="translate(10,10)">
          ${bars}
        </g>
        <text x="125" y="70" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="black">${barcodeText}</text>
      </svg >
  `
    return `data: image / svg + xml; base64, ${Buffer.from(svg).toString('base64')} `
  },

  // Stores
  addStore: (store) => {
    try {
      let companyId = store.companyId;
      if (!companyId) {
        console.warn("[DB] addStore: Missing company_id. Store will be created with default tenant scope 1.");
        companyId = 1;
      }
      
      const existing = db.prepare(`SELECT id, is_deleted FROM stores WHERE company_id = ? AND name = ?`).get(companyId, store.name);
      
      if (existing) {
        if (existing.is_deleted === 1) {
           console.log(`[DB] Reactivating soft-deleted store: ${store.name}`);
           db.prepare(`UPDATE stores SET branch = ?, address = ?, phone = ?, device_id = ?, updated_at = datetime('now'), sync_status = 0, is_deleted = 0 WHERE id = ?`).run(store.branch, store.address, store.phone, deviceId, existing.id);
           return dbHelpers.getAllStores(companyId).find(s => s.id === existing.id);
        } else {
           throw new Error("A store with this name already exists in your company.");
        }
      }

      const stmt = db.prepare(`
        INSERT INTO stores(id, company_id, name, branch, address, phone, device_id, updated_at, sync_status, is_deleted)
        VALUES(?, ?, ?, ?, ?, ?, ?, datetime('now'), 0, 0)
      `)
      stmt.run(store.id, companyId, store.name, store.branch, store.address, store.phone, deviceId)
      return dbHelpers.getAllStores(companyId).find(s => s.id === store.id)
    } catch (err) {
      console.error('[DB] addStore ERROR:', err.message)
      throw err
    }
  },

  addUserStore: (userId, storeId) => {
    // Generate a unique ID for the mapping
    const id = `us-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    try {
      db.prepare(`
        INSERT OR IGNORE INTO user_stores (id, user_id, store_id, updated_at, sync_status)
        VALUES (?, ?, ?, datetime('now'), 0)
      `).run(id, userId, storeId);
      return { success: true };
    } catch (err) {
      console.error("[DB] addUserStore failed:", err.message);
      return { success: false, error: err.message };
    }
  },

  updateStore: (id, updates) => {
    try {
      const fields = []
      const values = []
      const fieldMap = {
        name: 'name',
        branch: 'branch',
        address: 'address',
        phone: 'phone',
        companyId: 'company_id'
      }
      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          fields.push(`${fieldMap[key]} = ?`)
          values.push(updates[key])
        }
      })
      if (fields.length === 0) return null
      fields.push(`updated_at = datetime('now')`)
      fields.push(`sync_status = 0`)
      values.push(id)
      db.prepare(`UPDATE stores SET ${fields.join(', ')} WHERE id = ? `).run(...values)
      
      const updated = db.prepare('SELECT * FROM stores WHERE id = ?').get(id)
      return updated ? toCamelCase(updated) : null
    } catch (err) {
      console.error('[DB] updateStore ERROR:', err.message)
      throw err
    }
  },

  deleteStore: (id) => {
    try {
      // 1. Fetch store to find company_id
      const store = db.prepare('SELECT company_id FROM stores WHERE id = ?').get(id)
      if (!store) throw new Error("Store not found")

      // 2. Guard: Cannot delete the last store of a company
      const companyStores = db.prepare('SELECT COUNT(*) as count FROM stores WHERE company_id = ? AND is_deleted = 0').get(store.company_id)
      if (companyStores && companyStores.count <= 1) {
        throw new Error("CANNOT_DELETE_LAST_STORE: Every company must have at least one active store.")
      }

      // 3. Soft Delete
      db.prepare("UPDATE stores SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id)
      return { success: true, id }
    } catch (err) {
      console.error('[DB] deleteStore ERROR:', err.message)
      throw err
    }
  },

  // Settings
  getSetting: (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return row ? row.value : null
  },

  setSetting: (key, value) => {
    return db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value))
  },



  // Item Kits CRUD
  getAllItemKits: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    // Tenancy isolation is guaranteed by store_id locally. 
    // We skip company_id check to avoid mismatch between string slugs and integer IDs from cloud.
    const kits = db.prepare('SELECT * FROM item_kits WHERE store_id = ? AND is_deleted = 0 ORDER BY name').all(effectiveStoreId).map(toCamelCase)
    return kits.map(kit => {
      const items = db.prepare('SELECT product_id, quantity FROM kit_items WHERE kit_id = ?').all(kit.id).map(toCamelCase)
      return { ...kit, items }
    })
  },

  addItemKit: (kit) => {
    try {
      const transaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO item_kits(id, company_id, name, sku, category, selling_price, store_id, is_active, device_id, price_mode, display_mode, updated_at, sync_status)
          VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
        `).run(kit.id, kit.companyId, kit.name, kit.sku || null, kit.category, kit.sellingPrice, kit.storeId, kit.isActive ? 1 : 0, kit.deviceId || null, kit.priceMode || 'manual', kit.displayMode || 'single')

        const itemStmt = db.prepare('INSERT INTO kit_items (id, kit_id, product_id, quantity, company_id, device_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, 0)')
        for (const item of kit.items) {
          itemStmt.run(`${kit.id}-${item.productId}`, kit.id, item.productId, item.quantity, kit.companyId, kit.deviceId || null)
        }
      })
      transaction()
      return dbHelpers.getAllItemKits(kit.companyId, kit.storeId).find(k => k.id === kit.id)
    } catch (err) {
      console.error('[DB] addItemKit failed:', err.message)
      throw err
    }
  },

  updateItemKit: (id, updates) => {
    try {
      const transaction = db.transaction(() => {
        const existingKit = db.prepare('SELECT company_id, store_id, device_id FROM item_kits WHERE id = ?').get(id)
        if (!existingKit) return;

        if (updates.name || updates.sku || updates.category || updates.sellingPrice !== undefined || updates.isActive !== undefined || updates.priceMode !== undefined || updates.displayMode !== undefined) {
          const fields = []
          const values = []
          const fieldMap = {
            name: 'name',
            sku: 'sku',
            category: 'category',
            sellingPrice: 'selling_price',
            isActive: 'is_active',
            priceMode: 'price_mode',
            displayMode: 'display_mode'
          }
          Object.keys(updates).forEach(key => {
            if (fieldMap[key] !== undefined) {
              fields.push(`${fieldMap[key]} = ?`)
              values.push(key === 'isActive' ? (updates[key] ? 1 : 0) : updates[key])
            }
          })
          if (fields.length > 0) {
            values.push(id)
            db.prepare(`UPDATE item_kits SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ?`).run(...values)
          }
        }

        if (updates.items) {
          db.prepare('DELETE FROM kit_items WHERE kit_id = ?').run(id)
          const itemStmt = db.prepare('INSERT INTO kit_items (id, kit_id, product_id, quantity, company_id, device_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, 0)')
          for (const item of updates.items) {
            itemStmt.run(`${id}-${item.productId}`, id, item.productId, item.quantity, existingKit.company_id, updates.deviceId || existingKit.device_id)
          }
        }
      })
      transaction()
      const kit = db.prepare('SELECT * FROM item_kits WHERE id = ?').get(id)
      return kit ? dbHelpers.getAllItemKits(kit.company_id, kit.store_id).find(k => k.id === id) : null
    } catch (err) {
      console.error('[DB] updateItemKit failed:', err.message)
      throw err
    }
  },

  deleteItemKit: (id) => {
    db.transaction(() => {
      db.prepare("UPDATE item_kits SET is_deleted = 1, deleted_at = datetime('now'), updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(id)
      db.prepare("UPDATE kit_items SET sync_status = 0 WHERE kit_id = ?").run(id)
    })()
    return { success: true }
  },



  getProductCustomValues: (productId) => {
    return db.prepare('SELECT field_id, value FROM product_custom_values WHERE product_id = ?').all(productId).map(toCamelCase)
  },

  getAllProductCustomValues: () => {
    return db.prepare('SELECT * FROM product_custom_values').all().map(toCamelCase)
  },

  updateProductCustomValues: (productId, values) => {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM product_custom_values WHERE product_id = ?').run(productId)
      const stmt = db.prepare('INSERT INTO product_custom_values (id, product_id, field_id, value) VALUES (?, ?, ?, ?)')
      for (const val of values) {
        stmt.run(`${productId} -${val.fieldId} `, productId, val.fieldId, val.value)
      }
    })
    transaction()
    return dbHelpers.getProductCustomValues(productId)
  },

  // Bulk Product Actions
  bulkDeleteProducts: (ids) => {
    const placeholders = ids.map(() => '?').join(',')
    // Correctly handle stock logs and dependencies if needed, or just soft delete
    db.prepare(`UPDATE products SET is_deleted = 1, updated_at = datetime('now'), sync_status = 0 WHERE id IN(${placeholders})`).run(...ids)
    return { success: true, count: ids.length }
  },

  bulkUpdateProducts: (ids, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      category: 'category',
      categoryName: 'category',
      sellingPrice: 'selling_price',
      purchasePrice: 'purchase_price',
      unit: 'unit',
      brand: 'brand',
      barcodeEnabled: 'barcode_enabled'
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(key === 'barcodeEnabled' ? (updates[key] ? 1 : 0) : updates[key])
      }
    })

    if (fields.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      db.prepare(`UPDATE products SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id IN(${placeholders})`).run(...values, ...ids)
      return { success: true, count: ids.length }
    }
    return { success: false, message: 'No updates provided' }
  },

  updateSale: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      status: 'status',
      type: 'type',
      totalAmount: 'total_amount',
      profit: 'profit',
      paymentMode: 'payment_mode',
      accountId: 'account_id',
      customerId: 'customer_id',
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })
    if (fields.length === 0) return null
    fields.push(`updated_at = datetime('now')`)
    fields.push(`sync_status = 0`)
    values.push(id)
    db.prepare(`UPDATE sales SET ${fields.join(', ')} WHERE id = ? `).run(...values)
    return dbHelpers.getAllSales().find(s => s.id === id)
  },

  getGiftCards: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM gift_cards WHERE (company_id = ? OR company_id IS NULL) AND store_id = ?').all(companyId, effectiveStoreId).map(toCamelCase)
  },
  addGiftCard: (gc) => {
    db.prepare(`
      INSERT INTO gift_cards(id, company_id, card_number, value, balance, is_active, customer_id, store_id, updated_at, sync_status)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
    `).run(gc.id, gc.companyId, gc.cardNumber, gc.value, gc.balance, gc.isActive ? 1 : 0, gc.customerId, gc.storeId)
    return toCamelCase(db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(gc.id))
  },
  updateGiftCard: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      balance: 'balance',
      isActive: 'is_active',
      customerId: 'customer_id'
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key] !== undefined) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(key === 'isActive' ? (updates[key] ? 1 : 0) : updates[key])
      }
    })
    if (fields.length === 0) return null
    values.push(id)
    db.prepare(`UPDATE gift_cards SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ? `).run(...values)
    return toCamelCase(db.prepare('SELECT * FROM gift_cards WHERE id = ?').get(id))
  },

  getWorkOrders: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM work_orders WHERE (company_id = ? OR company_id IS NULL) AND store_id = ?').all(companyId, effectiveStoreId).map(toCamelCase)
  },
  updateWorkOrder: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      status: 'status',
      notes: 'notes'
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })
    if (fields.length === 0) return null
    values.push(id)
    db.prepare(`UPDATE work_orders SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ? `).run(...values)
    return toCamelCase(db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id))
  },

  getDeliveries: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM deliveries WHERE (company_id = ? OR company_id IS NULL) AND store_id = ?').all(companyId, effectiveStoreId).map(toCamelCase)
  },
  updateDelivery: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      employeeId: 'employee_id',
      address: 'address',
      status: 'status',
      deliveryDate: 'delivery_date'
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        if (key === 'employeeId' && updates[key]) {
          const driver = db.prepare('SELECT is_driver FROM users WHERE id = ?').get(updates[key])
          if (!driver || driver.is_driver !== 1) {
            throw new Error(`Invalid Assignment: User is not a registered driver.`)
          }
        }
        fields.push(`${fieldMap[key]} = ?`)
        values.push(updates[key])
      }
    })
    if (fields.length === 0) return null
    values.push(id)
    db.prepare(`UPDATE deliveries SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ? `).run(...values)
    return toCamelCase(db.prepare('SELECT * FROM deliveries WHERE id = ?').get(id))
  },

  // Delivery Zones
  getDeliveryZones: (companyId, storeId) => {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM delivery_zones WHERE (company_id = ? OR company_id IS NULL) AND store_id = ?').all(companyId, effectiveStoreId).map(toCamelCase)
  },
  addDeliveryZone: (zone) => {
    db.prepare(`
      INSERT INTO delivery_zones(id, name, fee, is_active, store_id, company_id, updated_at, sync_status)
      VALUES(?, ?, ?, ?, ?, ?, datetime('now'), 0)
    `).run(zone.id, zone.name, zone.fee, zone.isActive ? 1 : 0, zone.storeId, zone.companyId)
    return toCamelCase(db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(zone.id))
  },
  updateDeliveryZone: (id, updates) => {
    const fields = []
    const values = []
    const fieldMap = {
      name: 'name',
      fee: 'fee',
      isActive: 'is_active'
    }
    Object.keys(updates).forEach(key => {
      if (fieldMap[key] !== undefined) {
        fields.push(`${fieldMap[key]} = ?`)
        values.push(key === 'isActive' ? (updates[key] ? 1 : 0) : updates[key])
      }
    })
    if (fields.length === 0) return null
    values.push(id)
    db.prepare(`UPDATE delivery_zones SET ${fields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ? `).run(...values)
    return toCamelCase(db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(id))
  },
  deleteDeliveryZone: (id) => {
    db.prepare('DELETE FROM delivery_zones WHERE id = ?').run(id)
    return { success: true }
  },

  // Store Configuration
  saveStoreConfig: (storeId, configData) => {
    const key = `store_config_${storeId} `;
    const stmt = db.prepare(`
      INSERT INTO settings(key, value)
VALUES(?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
    stmt.run(key, JSON.stringify(configData));
    return { success: true };
  },
  getStoreConfig: (storeId) => {
    const key = `store_config_${storeId} `;
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    if (result && result.value) {
      try {
        return JSON.parse(result.value);
      } catch (e) {
        console.error('Error parsing store config:', e);
        return null;
      }
    }
    return null;
  },

  getAllCheques(companyId, storeId) {
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    const results = db.prepare('SELECT * FROM cheques WHERE store_id = ? AND is_deleted = 0 ORDER BY issue_date DESC').all(effectiveStoreId)
    return results.map(toCamelCase)
  },

  addCheque(cheque) {
    const stmt = db.prepare(`
      INSERT INTO cheques(
    id, company_id, party_type, party_id, party_name, cheque_number, bank_name,
    amount, issue_date, clearing_date, status, store_id, notes, device_id, updated_at, sync_status
  ) VALUES(
    @id, @companyId, @partyType, @partyId, @partyName, @chequeNumber, @bankName,
    @amount, @issueDate, @clearingDate, @status, @storeId, @notes, @deviceId, datetime('now'), 0
  )
    `)
    return stmt.run({
      clearingDate: null,
      notes: '',
      ...cheque,
      deviceId
    })
  },

  updateCheque(id, updates) {
    const fields = Object.keys(updates).map(key => {
      // camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      return `${snakeKey} = @${key} `
    }).join(', ')

    console.log(`[DB] updateCheque called for ID: ${id} with:`, JSON.stringify(updates));
    try {
      const stmt = db.prepare(`
        UPDATE cheques 
        SET ${fields}, updated_at = datetime('now'), sync_status = 0 
        WHERE id = @id
      `);
      const result = stmt.run({ ...updates, id });
      console.log(`[DB] updateCheque result:`, JSON.stringify(result));
      return result;
    } catch (err) {
      console.error(`[DB] updateCheque FAILED:`, err.message);
      throw err;
    }
  },

  deleteCheque(id) {
    return db.prepare("UPDATE cheques SET is_deleted = 1, deleted_at = datetime('now'), sync_status = 0 WHERE id = ?").run(id)
  },

  backup(destinationPath) {
    return db.backup(destinationPath)
  },

  getReportData(type, storeId, dateFrom, dateTo, companyId) {
    console.log(`[DB] getReportData: Fetching ${type} | storeId: ${storeId} | companyId: ${companyId} | Range: ${dateFrom} to ${dateTo}`);
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    if (effectiveStoreId !== storeId) {
      console.log(`[DB] getReportData: Redirecting storeId ${storeId} -> ${effectiveStoreId}`);
    }
    const company = resolveCompanyId(companyId);
    let query = ''
    const params = { storeId: effectiveStoreId, company: company, companyWithDecimal: `${company}.0` }

    // Date filter clause
    const dateFilter = (dateField) => {
      let clause = ''
      if (dateFrom) {
        clause += ` AND ${dateField} >= @dateFrom`
        params.dateFrom = dateFrom
      }
      if (dateTo) {
        clause += ` AND ${dateField} <= @dateTo`
        params.dateTo = dateTo
      }
      return clause
    }

    try {
      if (!companyId) {
        console.error('[Report] Security Violation: Attempted report synthesis without companyId authority.');
        return [];
      }

      // DEBUG: dump actual values in DB
      try {
        const debugSales = db.prepare('SELECT DISTINCT company_id, store_id FROM sales LIMIT 10').all();
        console.log(`[REPORT DEBUG] Resolved company=${company}, companyWithDecimal=${company}.0, effectiveStoreId=${effectiveStoreId}`);
        console.log(`[REPORT DEBUG] Distinct company_id+store_id in sales:`, JSON.stringify(debugSales));
        const countAll = db.prepare('SELECT COUNT(*) as cnt FROM sales').get();
        console.log(`[REPORT DEBUG] Total rows in sales table:`, countAll?.cnt);
        const countFiltered = db.prepare('SELECT COUNT(*) as cnt FROM sales WHERE store_id = ? AND (company_id = ? OR company_id = ? OR company_id IS NULL)').get(effectiveStoreId, company, `${company}.0`);
        console.log(`[REPORT DEBUG] Filtered rows (store+company match):`, countFiltered?.cnt);
      } catch(debugErr) { console.log('[REPORT DEBUG ERROR]', debugErr.message); }

      switch (type) {
        case 'sales_summary':
          query = `
          SELECT date, COUNT(*) as count, SUM(total_amount) as total, SUM(profit) as profit
          FROM sales 
          WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('date')}
          GROUP BY date ORDER BY date DESC
  `
          break;

        case 'sales_by_product':
          query = `
          SELECT p.name, p.sku, SUM(json_extract(item.value, '$.quantity')) as qty, SUM(json_extract(item.value, '$.price') * json_extract(item.value, '$.quantity')) as revenue
          FROM sales s, json_each(s.items) as item
          JOIN products p ON p.id = json_extract(item.value, '$.productId')
          WHERE s.store_id = @storeId AND (s.company_id = @company OR s.company_id = @companyWithDecimal OR s.company_id IS NULL) AND coalesce(s.is_deleted, 0) = 0 ${dateFilter('s.date')}
          GROUP BY p.id ORDER BY revenue DESC
  `
          break;

        case 'inventory_status':
          query = `
          SELECT name, sku, category, quantity, purchase_price, (quantity * purchase_price) as value
          FROM products 
          WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0
          ORDER BY quantity ASC
  `
          break;

        case 'profit_loss':
          query = `
SELECT
  (SELECT SUM(total_amount) FROM sales WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('date')}) as revenue,
  (SELECT SUM(profit) FROM sales WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('date')}) as gross_profit,
    (SELECT SUM(total_amount) FROM receivings WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('completed_at')}) as purchases,
      (SELECT SUM(amount) FROM transactions WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 AND type = 'expense' ${dateFilter('date')}) as expenses
        `
          break;

        case 'tax_report':
          query = `
          SELECT invoice_number, date, total_amount, (total_amount - profit) as taxable_value, (total_amount * 0.18) as tax_amount
          FROM sales 
          WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('date')}
          ORDER BY date DESC
  `
          break;

        case 'cheque_report':
          query = `
          SELECT party_name, party_type, cheque_number, bank_name, amount, issue_date, status
          FROM cheques 
          WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('issue_date')}
          ORDER BY issue_date DESC
  `
          break;

        case 'hr_attendance':
          query = `
          SELECT u.name, a.date, a.check_in, a.check_out, a.status
          FROM attendance a
          JOIN employees e ON e.id = a.employee_id
          JOIN users u ON u.id = e.user_id
          WHERE a.store_id = @storeId AND (a.company_id = @company OR a.company_id = @companyWithDecimal OR a.company_id IS NULL) AND coalesce(a.is_deleted, 0) = 0 ${dateFilter('a.date')}
          ORDER BY a.date DESC
  `
          break;

        case 'purchases_summary':
          query = `
          SELECT supplier_id, (SELECT company_name FROM suppliers WHERE id = supplier_id) as supplier_name,
  COUNT(*) as count, SUM(total_amount) as total
          FROM receivings
          WHERE store_id = @storeId AND (company_id = @company OR company_id = @companyWithDecimal OR company_id IS NULL) AND coalesce(is_deleted, 0) = 0 ${dateFilter('completed_at')}
          GROUP BY supplier_id
  `
          break;

        default:
          return []
      }

      const results = db.prepare(query).all(params)
      return results.map(toCamelCase)
    } catch (err) {
      console.error(`[Report] CRITICAL_ERROR: Failed to synthesize ${type} matrix: `, err)
      return []
    }
  },

  // Legacy HR duplicates removed

  // Categories
  getCategories: (companyId, storeId) => {
    const company = resolveCompanyId(companyId);
    const effectiveStoreId = storeRedirects.get(storeId) || storeId;
    return db.prepare('SELECT * FROM categories WHERE (company_id = ? OR company_id = ? OR company_id IS NULL) AND store_id = ? ORDER BY name ASC').all(company, `${company}.0`, effectiveStoreId).map(toCamelCase)
  },

  addCategory: (cat) => {
    db.prepare(`
      INSERT INTO categories(id, company_id, name, description, store_id, device_id, updated_at, sync_status)
      VALUES(?, ?, ?, ?, ?, ?, datetime('now'), 0)
    `).run(cat.id, cat.companyId, cat.name, cat.description || '', cat.storeId, deviceId)
    return toCamelCase(db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id))
  },

  // Barcode / SKU Stock Out
  handleBarcodeScan: (barcode, mode, storeId) => {
    // Match by SKU (primary) or barcode field (secondary)
    const product = db.prepare(`
      SELECT * FROM products
      WHERE store_id = ? AND is_deleted = 0 AND (sku = ? OR barcode = ?)
      LIMIT 1
    `).get(storeId, barcode, barcode);

    if (!product) {
      return {
        barcode,
        status: 'NOT_FOUND',
        warning: 'Product not found in current store inventory.'
      };
    }

    const p = toCamelCase(product);
    const delta = mode === 'IN' ? 1 : -1;
    const newQty = p.quantity + delta;

    if (newQty < 0) {
      return {
        product_id: p.id,
        product_name: p.name,
        barcode: p.sku,
        previous_stock: p.quantity,
        updated_stock: p.quantity,
        status: 'ERROR',
        warning: 'Cannot reduce stock below zero.',
        action_type: mode
      };
    }

    db.prepare(`
      UPDATE products SET quantity = ?, updated_at = datetime('now'), sync_status = 0
      WHERE id = ?
    `).run(newQty, p.id);

    return {
      product_id: p.id,
      product_name: p.name,
      barcode: p.sku,
      previous_stock: p.quantity,
      updated_stock: newQty,
      status: 'SUCCESS',
      action_type: mode
    };
  },

  getSetting: (key) => {
    const result = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return result ? result.value : null
  },

  setSetting: (key, value) => {
    db.prepare(`
      INSERT INTO settings(key, value)
      VALUES(?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value)
    return { success: true }
  },

  /**
   * PURGE ALL TENANT DATA:
   * Wipes every transactional table to ensure a clean slate for a new login/tenant.
   * This is critical for security and data isolation.
   */
  clearTenantData: (forceHardPurge = false) => {
    const tables = [
      'stores', 'users', 'products', 'customers', 'accounts', 'sales', 
      'quotations', 'purchases', 'transactions', 'stock_logs', 'stock_transfers',
      'expense_categories', 'tax_slabs', 'loyalty_points', 'commissions',
      'purchase_orders', 'suppliers', 'payment_terms', 'receivings',
      'receiving_items', 'gift_cards', 'sale_payments', 'work_orders',
      'deliveries', 'supplier_custom_fields', 'supplier_custom_values',
      'supplier_transactions', 'supplier_documents', 'attendance', 'leaves',
      'shifts', 'candidates', 'employees', 'payroll', 'performance_reviews',
      'categories', 'item_kits', 'kit_items', 'custom_fields', 
      'product_custom_values', 'user_permissions', 'cheques'
    ];

    db.pragma('foreign_keys = OFF');
    
    const transaction = db.transaction(() => {
      for (const table of tables) {
        try {
          // Check if table has sync_status column
          const columns = db.prepare(`PRAGMA table_info(${table})`).all();
          const hasSyncStatus = columns.some(c => c.name === 'sync_status');

          let result;
          if (hasSyncStatus && !forceHardPurge) {
            // Delete ALL records: synced AND unsynced (orphaned pending changes can't be pushed after logout)
            result = db.prepare(`DELETE FROM ${table}`).run();
            console.log(`[DB] Purged ALL data from ${table} (${result.changes} rows cleared)`);
          } else {
            // Hard purge: wipe the whole table regardless of sync status
            result = db.prepare(`DELETE FROM ${table}`).run();
            console.log(`[DB] HARD Purged full table ${table} (${result.changes} rows cleared)`);
          }
        } catch (err) {
          console.error(`[DB] Failed to wipe ${table}:`, err.message);
        }
      }
      
      // Clear settings that are user-specific
      db.prepare("DELETE FROM settings WHERE key NOT LIKE 'system_%'").run();
    });

    try {
      transaction();
      db.pragma('foreign_keys = ON');
      console.log('[DB] Tenant data purged successfully.');
      return { success: true };
    } catch (error) {
      console.error('[DB] Tenant purge failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Ensure getCommissions exists to prevent main IPC handler from crashing
if (dbHelpers && typeof dbHelpers.getCommissions !== 'function') {
  dbHelpers.getCommissions = () => [];
}

module.exports = { db, dbHelpers, deviceId }
 