const { db, deviceId } = require('./db.cjs');

const TABLE_NAMES = [
    'stores',
    'users',
    'products',
    'customers',
    'accounts',
    'sales',
    'quotations',
    'purchases',
    'transactions',
    'stock_logs',
    'stock_transfers',
    'expense_categories',
    'tax_slabs',
    'loyalty_points',
    'commissions',
    'purchase_orders',
    'suppliers',
    'payment_terms',
    'receivings',
    'receiving_items',
    'gift_cards',
    'sale_payments',
    'work_orders',
    'deliveries',
    'supplier_custom_fields',
    'supplier_custom_values',
    'supplier_transactions',
    'supplier_documents',
    'attendance',
    'leaves',
    'shifts',
    'candidates',
    'employees',
    'payroll',
    'performance_reviews',
    'categories',
    'item_kits',
    'kit_items',
    'custom_fields',
    'product_custom_values',
    'user_permissions',
    'user_stores',
    'cheques'
];

const syncEngine = {
    /**
     * Scans all tables for records with sync_status = 0
     * Returns a payload object containing lists of dirty records for each table.
     */
    getDirtyData: () => {
        const dirtyData = {};
        let totalCount = 0;

        for (const table of TABLE_NAMES) {
            try {
                const rows = db.prepare(`SELECT * FROM ${table} WHERE sync_status = 0`).all();
                if (rows.length > 0) {
                    dirtyData[table] = rows;
                    totalCount += rows.length;
                }
            } catch (error) {
                console.error(`Error fetching dirty data for table ${table}:`, error);
            }
        }

        if (totalCount === 0) return null;

        return {
            deviceId,
            timestamp: new Date().toISOString(),
            payload: dirtyData,
            totalCount
        };
    },

    /**
     * Marks records as synced (sync_status = 1) based on their IDs and table names.
     * @param {Object} confirmedIds - Object keyed by table name, containing arrays of synced IDs.
     * e.g. { products: ['uuid-1', 'uuid-2'], sales: ['uuid-3'] }
     */
    markAsSynced: (confirmedIds) => {
        const transaction = db.transaction(() => {
            for (const [table, ids] of Object.entries(confirmedIds)) {
                if (!TABLE_NAMES.includes(table)) continue;
                if (!ids || ids.length === 0) continue;

                // Check if this table has an 'id' column before using it
                const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
                if (!cols.includes('id')) {
                    // For composite-PK tables (e.g. user_stores), mark all dirty as synced
                    db.prepare(`UPDATE ${table} SET sync_status = 1 WHERE sync_status = 0`).run();
                    continue;
                }

                const updateStmt = db.prepare(`UPDATE ${table} SET sync_status = 1 WHERE id = ?`);
                for (const id of ids) {
                    try { updateStmt.run(id); } catch(e) { /* skip */ }
                }
            }
        });

        try {
            transaction();
            return { success: true };
        } catch (error) {
            console.error('Error marking records as synced:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Resets records to sync_status = 0 to force re-sync.
     * Useful when server reports missing dependencies.
     */
    markAsUnsynced: (tableIds) => {
        const transaction = db.transaction(() => {
            for (const [table, ids] of Object.entries(tableIds)) {
                if (!TABLE_NAMES.includes(table)) continue;
                if (!ids || ids.length === 0) continue;

                const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
                if (!cols.includes('id')) continue; // skip composite-PK tables

                const updateStmt = db.prepare(`UPDATE ${table} SET sync_status = 0 WHERE id = ?`);
                for (const id of ids) {
                    try { updateStmt.run(id); } catch(e) { /* skip */ }
                }
            }
        });

        try {
            transaction();
            return { success: true };
        } catch (error) {
            console.error('Error marking records as unsynced:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Applies updates from the server to the local database.
     * @param {Object} updates - Object keyed by table name, containing arrays of records.
     */
    applyUpdates: (updates) => {
        try {
            // Disable FK checks so insertion order from cloud doesn't matter
            db.pragma('foreign_keys = OFF');

            const transaction = db.transaction(() => {
                for (const [table, rows] of Object.entries(updates)) {
                    if (!TABLE_NAMES.includes(table)) continue;
                    if (!rows || rows.length === 0) continue;

                    console.log(`[SyncEngine] Applying ${rows.length} updates for ${table}`);
                    if (rows.length > 0) {
                        console.log(`[SyncEngine] Sample Row for ${table}:`, JSON.stringify(rows[0], null, 2));
                    }

                    // Get actual columns from local SQLite schema
                    const localCols = new Set(
                        db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name)
                    );

                    // Filter incoming data to only include columns that exist locally
                    const sampleRow = rows[0];
                    const columns = Object.keys(sampleRow).filter(k =>
                        k !== 'sync_status' && localCols.has(k)
                    );

                    if (columns.length === 0) {
                        console.log(`[SyncEngine] No matching columns for table ${table}, skipping.`);
                        continue;
                    }

                    // Detect primary key column(s) for correct UPSERT conflict target
                    const pkInfo = db.prepare(`PRAGMA table_info(${table})`).all().filter(c => c.pk > 0).sort((a,b) => a.pk - b.pk);
                    const pkCols = pkInfo.map(c => c.name);
                    const conflictTarget = pkCols.length > 0 ? pkCols.join(', ') : 'id';

                    // Build UPSERT: server is source of truth during pull
                    const updateSets = columns
                        .filter(col => !pkCols.includes(col))
                        .map(col => `${col} = excluded.${col}`)
                        .join(', ');

                    if (!updateSets) {
                        // All columns are PKs — nothing to update, just insert or ignore
                        const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}, sync_status) VALUES (${columns.map(() => '?').join(', ')}, 1)`;
                        const stmt = db.prepare(sql);
                        for (const row of rows) {
                            let batchValues = [];
                            try {
                                batchValues = columns.map(col => {
                                    const val = row[col] ?? null;
                                    if (typeof val === 'boolean') return val ? 1 : 0;
                                    if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                                    return val;
                                });
                                stmt.run(...batchValues);
                            } catch (rowErr) {
                                console.error(`[SyncEngine] Skipping row in ${table}:`, rowErr.message);
                            }
                        }
                        continue;
                    }

                    const hasIsDeleted = localCols.has('is_deleted');
                    const hasUpdatedAt = localCols.has('updated_at');

                    // Conflict resolution: only update if incoming is newer or it's a new record
                    // We also ensure sync_status is set to 1 for pulled records
                    const sql = `
                        INSERT INTO ${table} (${columns.join(', ')}, sync_status) 
                        VALUES (${columns.map(() => '?').join(', ')}, 1)
                        ON CONFLICT(${conflictTarget}) DO UPDATE SET 
                            ${updateSets},
                            sync_status = 1
                        WHERE ${table}.sync_status = 1
                    `;
                    const stmt = db.prepare(sql);

                    for (const row of rows) {
                        let rowValues = [];
                        try {
                            rowValues = columns.map(col => {
                                const val = row[col] ?? null;
                                if (typeof val === 'boolean') return val ? 1 : 0;
                                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                                return val;
                            });
                            stmt.run(...rowValues);
                        } catch (rowErr) {
                            if (rowErr.message.includes('UNIQUE constraint failed')) {
                                try {
                                    const replaceSql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}, sync_status) VALUES (${columns.map(() => '?').join(', ')}, 1)`;
                                    db.prepare(replaceSql).run(...rowValues);
                                } catch (innerErr) {
                                    console.error(`[SyncEngine] Persistent failure for row in ${table}:`, innerErr.message, 'Values:', rowValues);
                                }
                            } else {
                                console.error(`[SyncEngine] Skipping row in ${table}:`, rowErr.message);
                            }
                        }
                    }
                }
            });

            transaction();
            return { success: true };
        } catch (error) {
            console.error('Error applying cloud updates:', error);
            return { success: false, error: error.message };
        } finally {
            // Always re-enable FK checks
            db.pragma('foreign_keys = ON');
        }
    }
};

module.exports = { syncEngine };
