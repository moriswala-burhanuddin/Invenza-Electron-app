const fs = require('fs');
const path = require('path');

function markAllDirty(db) {
    const TABLE_NAMES = [
        'stores', 'users', 'products', 'customers', 'accounts', 'sales', 
        'quotations', 'purchases', 'transactions', 'stock_logs', 'stock_transfers', 
        'expense_categories', 'tax_slabs', 'loyalty_points', 'commissions', 
        'purchase_orders', 'suppliers', 'payment_terms', 'receivings', 
        'receiving_items', 'gift_cards', 'sale_payments', 'work_orders', 
        'deliveries', 'supplier_custom_fields', 'supplier_custom_values', 
        'supplier_transactions', 'supplier_documents', 'attendance', 'leaves', 
        'shifts', 'candidates', 'employees', 'item_kits', 'kit_items', 
        'custom_fields', 'product_custom_values', 'categories', 'payroll',
        'invoices', 'invoice_items', 'cheques'
    ];

    console.log('[MIGRATION] Starting to mark all records as dirty...');

    db.transaction(() => {
        let totalUpdated = 0;
        for (const table of TABLE_NAMES) {
            try {
                // Check if table exists
                const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
                if (!tableExists) continue;

                // Check if sync_status column exists
                const columns = db.prepare(`PRAGMA table_info(${table})`).all();
                if (!columns.some(c => c.name === 'sync_status')) continue;

                const result = db.prepare(`UPDATE ${table} SET sync_status = 0`).run();
                if (result.changes > 0) {
                    console.log(`[MIGRATION] Updated ${result.changes} records in ${table}`);
                }
                totalUpdated += result.changes;
            } catch (err) {
                console.error(`[MIGRATION] Error updating table ${table}:`, err.message);
            }
        }
        console.log(`[MIGRATION] Finished! Total records marked for sync: ${totalUpdated}`);
    })();
}

module.exports = { markAllDirty };
