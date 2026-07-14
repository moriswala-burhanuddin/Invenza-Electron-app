const { app, BrowserWindow, ipcMain, Menu, shell, Notification, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { markAllDirty } = require('./migration-utils.cjs')
const { autoUpdater } = require('electron-updater')
const log = require('electron-log')
const bwipjs = require('bwip-js')

// Configure logging
autoUpdater.logger = log
autoUpdater.logger.transports.file.level = 'info'
log.info('[Main] App starting...')

// IPC for version
ipcMain.handle('system:getVersion', () => {
    const version = app.getVersion();
    log.info('[Main] Returning app version:', version);
    return version;
});

ipcMain.handle('db:getDashboardMetrics', async (event, storeId, companyId, dateRange) => {
    console.log(`IPC: getDashboardMetrics for store ${storeId} (company: ${companyId})`)
    return dbHelpers.getDashboardMetrics(companyId, storeId, dateRange)
});

ipcMain.handle('db:getLowStockNotifications', async (event, storeId, companyId) => {
    console.log(`IPC: getLowStockNotifications for store ${storeId} (company: ${companyId})`)
    return dbHelpers.getLowStockNotifications(companyId, storeId)
});

// Crypto for device ID
const crypto = require('crypto')

// License & Device ID IPCs
ipcMain.handle('system:getDeviceId', async () => {
    return dbDeviceId
})

ipcMain.handle('system:getLicenseKey', async () => {
    return dbHelpers.getSetting('license_key')
})

ipcMain.handle('system:saveLicenseKey', async (event, key) => {
    return dbHelpers.setSetting('license_key', key)
})


// Use the name from package.json (no hardcoded override)
log.info('[MAIN] App Name:', app.name);
log.info('[MAIN] Current UserData:', app.getPath('userData'));
log.info('[MAIN] App Version:', app.getVersion());


const { db, dbHelpers, deviceId: dbDeviceId } = require('./db.cjs')
const { askAI, getInventoryForecast, suggestProductCategory, processInvoiceOCR, optimizeReorderPoints } = require('./ai-service.cjs')

// Cheques
ipcMain.handle('db:getCheques', async (event, storeId, companyId) => {
    return dbHelpers.getAllCheques(companyId, storeId)
})

ipcMain.handle('db:addCheque', async (event, cheque) => {
    const result = dbHelpers.addCheque(cheque)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateCheque', async (event, id, updates) => {
    console.log(`[IPC] updateCheque called for ${id}`, updates)
    const result = dbHelpers.updateCheque(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteCheque', async (event, id) => {
    const result = dbHelpers.deleteCheque(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

let mainWindow;
let secondaryWindow;

console.log('[MAIN] App Name:', app.getName());
console.log('[MAIN] UserData Path:', app.getPath('userData'));
try {
    const stores = db.prepare('SELECT id, name FROM stores').all();
    console.log('[MAIN] Available Stores in DB:', JSON.stringify(stores));
} catch (e) {
    console.error('[MAIN] DB Store Check Error:', e.message);
}

function createWindow() {
    // Persistence for sync automation
    const userDataPath = app.getPath('userData');
    const migrationLockPath = path.join(userDataPath, 'vps_migration_v1.lock');

    if (!fs.existsSync(migrationLockPath)) {
        console.log('[MAIN] performing one-time VPS migration (marking all data as dirty)...');
        try {
            const { db } = require('./db.cjs');
            markAllDirty(db);
            fs.writeFileSync(migrationLockPath, 'Migration to VPS initiated at ' + new Date().toISOString());
            console.log('[MAIN] Migration lock created.');
        } catch (err) {
            console.error('[MAIN] Migration failed:', err.message);
        }
    }

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../build/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    // In development, reload the local server (Port 8081 for SaaS Dev)
    if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
        mainWindow.loadURL("http://127.0.0.1:8081/")
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
        // mainWindow.webContents.openDevTools() // Disable auto-open for production
    }

    // Trigger initial sync after window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[MAIN] Triggering initial sync...');
        mainWindow.webContents.send('sync:trigger');
    });
}

// Set up periodic sync (every 5 minutes)
setInterval(() => {
    if (mainWindow) {
        console.log('[MAIN] Triggering periodic sync...');
        mainWindow.webContents.send('sync:trigger');
    }
}, 5 * 60 * 1000);

// IPC Handlers for Database Operations

// Products
ipcMain.handle('db:getProducts', async (event, storeId, companyId) => {
    console.log(`IPC: getProducts for store ${storeId} (company: ${companyId})`)
    try {
        const products = dbHelpers.getAllProducts(companyId, storeId)
        console.log(`IPC: getProducts returning ${products.length} products`)
        return products
    } catch (err) {
        console.error(`IPC: getProducts ERROR:`, err.message)
        throw err
    }
})

ipcMain.handle('db:getProductByBarcode', async (event, barcode, storeId) => {
    console.log(`IPC: getProductByBarcode ${barcode} for store ${storeId}`)
    return dbHelpers.getProductByBarcode(barcode, storeId)
})

ipcMain.handle('db:addProduct', async (event, product) => {
    console.log(`IPC: addProduct ${product.name}`)
    const result = dbHelpers.addProduct(product)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateProduct', async (event, id, updates) => {
    console.log(`IPC: updateProduct ${id}`)
    // Use the logging wrapper to track manual stock changes
    const result = dbHelpers.updateProductWithLog(id, updates, 'system', 'Manual Edit via App')
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteProduct', async (event, id) => {
    console.log(`IPC: deleteProduct ${id}`)
    const result = dbHelpers.deleteProduct(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:bulkDeleteProducts', async (event, ids) => {
    console.log(`IPC: bulkDeleteProducts ${ids.length} items`)
    const result = dbHelpers.bulkDeleteProducts(ids)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Reporting
ipcMain.handle('db:getReport', async (event, type, storeId, dateFrom, dateTo, companyId) => {
    console.log(`IPC: getReport ${type} for store ${storeId} (Company: ${companyId})`)
    return dbHelpers.getReportData(type, storeId, dateFrom, dateTo, companyId)
})

ipcMain.handle('db:bulkUpdateProducts', async (event, ids, updates) => {
    console.log(`IPC: bulkUpdateProducts ${ids.length} items`)
    const result = dbHelpers.bulkUpdateProducts(ids, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Item Kits
ipcMain.handle('db:getItemKits', async (event, storeId, companyId) => {
    return dbHelpers.getAllItemKits(companyId, storeId)
})

ipcMain.handle('db:addItemKit', async (event, kit) => {
    const result = dbHelpers.addItemKit(kit)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateItemKit', async (event, id, updates) => {
    const result = dbHelpers.updateItemKit(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteItemKit', async (event, id) => {
    const result = dbHelpers.deleteItemKit(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Custom Fields
ipcMain.handle('db:getCustomFields', async (event, companyId) => {
    return dbHelpers.getAllCustomFields(companyId)
})

ipcMain.handle('db:addCustomField', async (event, field) => {
    const result = dbHelpers.addCustomField(field)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateCustomField', async (event, id, updates, companyId) => {
    const result = dbHelpers.updateCustomField(id, updates, companyId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteCustomField', async (event, id, companyId) => {
    const result = dbHelpers.deleteCustomField(id, companyId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getProductCustomValues', async (event, productId) => {
    return dbHelpers.getProductCustomValues(productId)
})

ipcMain.handle('db:getAllProductCustomValues', async () => {
    return dbHelpers.getAllProductCustomValues()
})

ipcMain.handle('db:updateProductCustomValues', async (event, productId, values) => {
    const result = dbHelpers.updateProductCustomValues(productId, values)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Customers
ipcMain.handle('db:getCustomers', async (event, storeId, companyId) => {
    return dbHelpers.getAllCustomers(companyId, storeId)
})

ipcMain.handle('db:addCustomer', async (event, customer) => {
    const result = dbHelpers.addCustomer(customer)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateCustomer', async (event, id, updates) => {
    const result = dbHelpers.updateCustomer(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteCustomer', async (event, id) => {
    const result = dbHelpers.deleteCustomer(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Sales
ipcMain.handle('db:getSales', async (event, storeId, companyId) => {
    return dbHelpers.getAllSales(companyId, storeId)
})

ipcMain.handle('db:addSale', async (event, sale) => {
    console.log(`IPC: addSale (Transaction) ${sale.id}`)
    try {
        const result = dbHelpers.processSale(sale)
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    } catch (err) {
        console.error(`IPC: addSale Transaction Error:`, err.message)
        throw err // Propagate error to renderer
    }
})

// Quotations
ipcMain.handle('db:deleteSale', async (event, id) => {
    const result = dbHelpers.deleteSale(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getQuotations', async (event, storeId, companyId) => {
    return dbHelpers.getAllQuotations(companyId, storeId)
})

ipcMain.handle('db:addQuotation', async (event, quotation) => {
    const result = dbHelpers.addQuotation(quotation)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateQuotation', async (event, id, updates) => {
    const fields = Object.keys(updates).map(key => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        return `${snakeKey} = @${key}`
    }).join(', ')

    const stmt = db.prepare(`UPDATE quotations SET ${fields}, updated_at = datetime('now'), sync_status = 0 WHERE id = @id`)
    const result = stmt.run({ id, ...updates })
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteQuotation', async (event, id) => {
    const result = dbHelpers.deleteQuotation(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getTrashQuotations', async (event, companyId) => {
    return dbHelpers.getTrashQuotations(companyId)
})

ipcMain.handle('db:restoreQuotation', async (event, id) => {
    const result = dbHelpers.restoreQuotation(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Purchases
ipcMain.handle('db:getPurchases', async (event, storeId, companyId) => {
    return dbHelpers.getAllPurchases(companyId, storeId)
})

ipcMain.handle('db:addPurchase', async (event, purchase) => {
    console.log(`IPC: addPurchase (Transaction) ${purchase.id}`)
    const result = dbHelpers.processPurchase(purchase)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Transactions
ipcMain.handle('db:deletePurchase', async (event, id) => {
    const result = dbHelpers.deletePurchase(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getTransactions', async (event, storeId, companyId) => {
    return dbHelpers.getAllTransactions(companyId, storeId)
})

ipcMain.handle('db:addTransaction', async (event, transaction) => {
    const result = dbHelpers.addTransaction(transaction)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteTransaction', async (event, id) => {
    const result = dbHelpers.deleteTransaction(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Accounts
ipcMain.handle('db:getAccounts', async (event, storeId, companyId) => {
    return dbHelpers.getAllAccounts(companyId, storeId)
})

ipcMain.handle('db:addAccount', async (event, account) => {
    const result = dbHelpers.addAccount(account)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateAccount', async (event, id, updates) => {
    const result = dbHelpers.updateAccount(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteAccount', async (event, id) => {
    const result = dbHelpers.deleteAccount(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:clearLocalData', async (event, storeId) => {
    const result = dbHelpers.clearLocalData(storeId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Stores & Users
ipcMain.handle('db:getStores', async (event, companyId) => {
    return dbHelpers.getAllStores(companyId)
})

ipcMain.handle('db:getUsers', async (event, companyId) => {
    return dbHelpers.getAllUsers(companyId)
})

ipcMain.handle('db:deleteUser', async (event, id) => {
    const result = dbHelpers.deleteUser(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:addStore', async (event, store) => {
    if (!store.companyId) {
      console.warn("[MAIN] db:addStore called without companyId. Store will be created without tenant scope.")
    }
    const result = dbHelpers.addStore(store)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:addUserStore', async (event, userId, storeId) => {
    const result = dbHelpers.addUserStore(userId, storeId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateStore', async (event, id, updates) => {
    const result = dbHelpers.updateStore(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteStore', async (event, id) => {
    const result = dbHelpers.deleteStore(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:addUser', async (event, user) => {
    const result = dbHelpers.addUser(user)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateUser', async (event, id, updates) => {
    const result = dbHelpers.updateUser(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:toggleDriverStatus', async (event, userId, isDriver) => {
    const result = dbHelpers.toggleDriverStatus(userId, isDriver)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:clearTenantData', async (event, forceHardPurge = false) => {
    return dbHelpers.clearTenantData(forceHardPurge)
})

ipcMain.handle('db:verifyPassword', async (event, id, password) => {
    return dbHelpers.verifyPassword(id, password)
})

ipcMain.handle('db:verifySupervisor', async (event, code) => {
    return dbHelpers.verifySupervisor(code)
})

// Advanced Phase 11 IPCs
ipcMain.handle('db:processStockTransfer', async (event, transfer) => {
    const result = dbHelpers.processStockTransfer(transfer)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getStockTransfers', async (event, storeId, companyId) => {
    return dbHelpers.getStockTransfers(companyId, storeId)
})

ipcMain.handle('db:getCustomerLedger', async (event, customerId, companyId) => {
    return dbHelpers.getCustomerLedger(customerId) // Ledger is still customerId based, but we accept companyId for consistency
})

ipcMain.handle('db:getPurchaseOrders', async (event, storeId, companyId) => {
    return dbHelpers.getPurchaseOrders(companyId, storeId)
})

ipcMain.handle('db:addPurchaseOrder', async (event, po) => {
    const result = dbHelpers.addPurchaseOrder(po)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updatePurchaseOrder', async (event, id, updates, companyId) => {
    const result = dbHelpers.updatePurchaseOrder(id, updates, companyId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deletePurchaseOrder', async (event, id, companyId) => {
    const result = dbHelpers.deletePurchaseOrder(id, companyId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:receivePurchaseOrder', async (event, id, companyId) => {
    const result = dbHelpers.receivePurchaseOrder(id, companyId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getExpenseCategories', async (event, companyId) => {
    return dbHelpers.getExpenseCategories(companyId)
})

ipcMain.handle('db:addExpenseCategory', async (event, cat) => {
    const result = dbHelpers.addExpenseCategory(cat)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getTaxSlabs', async (event, companyId) => {
    return dbHelpers.getTaxSlabs(companyId)
})

ipcMain.handle('db:addTaxSlab', async (event, slab) => {
    const result = dbHelpers.addTaxSlab(slab)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteTaxSlab', async (event, id) => {
    const result = dbHelpers.deleteTaxSlab(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getCommissions', async (event, storeId, companyId) => {
    return dbHelpers.getCommissions(storeId) // commissions might need companyId later
})

ipcMain.handle('db:getLoyaltyPoints', async (event, customerId) => {
    return dbHelpers.getLoyaltyPoints(customerId)
})

// Feature 10: Auto-Backup System
async function backupDatabase() {
    try {
        const dbPath = path.join(app.getPath('userData'), 'storeflow.db')
        const backupsDir = path.join(app.getPath('userData'), 'backups')
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir)

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupPath = path.join(backupsDir, `backup-${timestamp}.db`)

        await dbHelpers.backup(backupPath)
        console.log('[Backup] Auto-backup created:', backupPath)

        // Keep only last 5 backups
        const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith('backup-'))
            .sort((a, b) => fs.statSync(path.join(backupsDir, b)).mtime - fs.statSync(path.join(backupsDir, a)).mtime)

        if (files.length > 5) {
            files.slice(5).forEach(f => fs.unlinkSync(path.join(backupsDir, f)))
        }
        return { success: true, path: backupPath }
    } catch (err) {
        console.error('[Backup] Failed:', err)
        return { success: false, error: err.message }
    }
}

ipcMain.handle('system:backup', async () => {
    await backupDatabase()
    return { success: true }
})

ipcMain.handle('system:manualBackup', async () => {
    try {
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Database Backup',
            defaultPath: path.join(app.getPath('desktop'), `storeflow-backup-${new Date().toISOString().split('T')[0]}.db`),
            filters: [
                { name: 'SQLite Database', extensions: ['db'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        })

        if (canceled || !filePath) return { success: false, error: 'Cancelled' }

        await dbHelpers.backup(filePath)

        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Backup Successful',
            message: `Database successfully exported to:\n${filePath}`,
            buttons: ['OK']
        })

        return { success: true, path: filePath }
    } catch (err) {
        console.error('[Manual Backup] Failed:', err)
        dialog.showErrorBox('Backup Failed', `Failed to create backup: ${err.message}`)
        return { success: false, error: err.message }
    }
})

// Excel Upload Handler
ipcMain.handle('db:processExcelUpload', async (event, rows, storeId) => {
    let createdCount = 0
    let updatedCount = 0
    let failedCount = 0
    const errors = []

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        try {
            const existingProduct = dbHelpers.getProductByBarcode(row.barcode, storeId)

            // Resolve categoryId from category name if possible
            let categoryId = null;
            let categoryName = String(row.category || row.Category || 'Uncategorized').trim();
            
            if (categoryName) {
                // Try exact match or case-insensitive match
                let cat = db.prepare('SELECT id, name FROM categories WHERE name = ? COLLATE NOCASE').get(categoryName);
                if (!cat) {
                    // AUTO-CREATE CATEGORY
                    console.log(`[Excel] Category "${categoryName}" not found. Creating...`);
                    const newCatId = `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    db.prepare("INSERT INTO categories (id, name, store_id, updated_at, sync_status) VALUES (?, ?, ?, datetime('now'), 0)").run(
                        newCatId, categoryName, storeId
                    );
                    cat = { id: newCatId, name: categoryName };
                    if (mainWindow) mainWindow.webContents.send('sync:trigger');
                }
                categoryId = cat.id;
                categoryName = cat.name;
            }

            const productData = {
                name: row.name,
                description: row.description || row.Description || '',
                barcode: row.barcode,
                sku: row.barcode, 
                sellingPrice: Number(row.price || 0),
                purchasePrice: Number(row.purchasePrice || row.purchase_price || row.price * 0.7 || 0),
                quantity: Number(row.stock || row.quantity || 0),
                categoryId: categoryId,
                category: categoryName, // Fix: maps to 'category' column in DB
                brand: row.brand || row.Brand || '',
                unit: row.unit || row.Unit || 'Pcs',
                minStock: Number(row.minStock || row.min_stock || 0),
                reorderQuantity: Number(row.reorderQuantity || row.reorder_quantity || 0),
                storeId: storeId,
                updatedAt: new Date().toISOString()
            };

            if (existingProduct) {
                dbHelpers.updateProduct(existingProduct.id, {
                    ...productData,
                    // When updating via Excel, we add to existing stock
                    quantity: existingProduct.quantity + productData.quantity
                })
                updatedCount++
            } else {
                dbHelpers.addProduct({
                    ...productData,
                    id: `prod-${Date.now()}-${i}`,
                    lastUsed: new Date().toISOString()
                })
                createdCount++
            }
        } catch (e) {
            failedCount++
            errors.push({ row: i + 2, reason: e.message })
        }
    }

    return {
        total_rows: rows.length,
        created_products: createdCount,
        updated_products: updatedCount,
        failed_rows: failedCount,
        errors
    }
})

// Sync Engine IPC
ipcMain.handle('db:getDirtyData', () => {
    try {
        const { syncEngine } = require('./sync-engine.cjs');
        return syncEngine.getDirtyData();
    } catch (err) {
        console.error('db:getDirtyData error:', err);
        return null;
    }
});

ipcMain.handle('db:markAsSynced', (event, confirmedIds) => {
    try {
        const { syncEngine } = require('./sync-engine.cjs');
        return syncEngine.markAsSynced(confirmedIds);
    } catch (err) {
        console.error('db:markAsSynced error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:markAsUnsynced', (event, idsToReset) => {
    try {
        const { syncEngine } = require('./sync-engine.cjs');
        return syncEngine.markAsUnsynced(idsToReset);
    } catch (err) {
        console.error('db:markAsUnsynced error:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('db:getLastPullTimestamp', () => {
    try {
        const { dbHelpers } = require('./db.cjs');
        return dbHelpers.getSetting('last_pull_timestamp');
    } catch (err) {
        console.error('db:getLastPullTimestamp error:', err);
        return null;
    }
});

ipcMain.handle('db:applyCloudUpdates', (event, { updates, serverTime }) => {
    try {
        const { syncEngine } = require('./sync-engine.cjs');
        const { dbHelpers } = require('./db.cjs');
        const result = syncEngine.applyUpdates(updates);
        if (result.success) {
            dbHelpers.setSetting('last_pull_timestamp', serverTime);
        }
        return result;
    } catch (err) {
        console.error('db:applyCloudUpdates error:', err);
        return { success: false, error: err.message };
    }
});

// Debug Logger
ipcMain.on('db:log', (event, message) => {
    console.log(`[Renderer] ${message}`)
})

ipcMain.handle('ai:ask', async (event, query, contextData) => {
    console.log(`AI: Querying for "${query}"`)
    return askAI(query, contextData)
})

ipcMain.handle('ai:getForecast', async (event, products, sales) => {
    console.log('AI: Generating Inventory Forecast')
    return getInventoryForecast(products, sales)
})

ipcMain.handle('ai:suggestCategory', async (event, productName) => {
    console.log(`AI: Suggesting category for "${productName}"`)
    return suggestProductCategory(productName)
})

ipcMain.handle('ai:processOCR', async (event, imageBase64, products) => {
    console.log('AI: Processing Invoice OCR')
    return processInvoiceOCR(imageBase64, products)
})

ipcMain.handle('ai:optimizeReorder', async (event, products, sales) => {
    console.log('AI: Optimizing Reorder Points')
    return optimizeReorderPoints(products, sales)
})

const { analyzeAttendancePatterns } = require('./ai-service.cjs')

ipcMain.handle('ai:analyzeAttendance', async (event, attendanceData, leaveData) => {
    console.log('AI: Analyzing Attendance Patterns')
    return analyzeAttendancePatterns(attendanceData, leaveData)
})

// HR & Attendance IPCs
ipcMain.handle('db:checkIn', async (event, employeeId, storeId, companyId) => {
    const result = dbHelpers.checkIn(employeeId, storeId, companyId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:checkOut', async (event, employeeId) => {
    const result = dbHelpers.checkOut(employeeId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getAttendance', async (event, employeeId, startDate, endDate) => {
    return dbHelpers.getAttendance(employeeId, startDate, endDate)
})

ipcMain.handle('db:applyLeave', async (event, leave) => {
    const result = dbHelpers.applyLeave(leave)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getLeaves', async (event, storeId, companyId, employeeId) => {
    return dbHelpers.getLeaves(storeId, companyId, employeeId)
})

ipcMain.handle('db:updateLeaveStatus', async (event, id, status) => {
    const result = dbHelpers.updateLeaveStatus(id, status)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Shift Management
ipcMain.handle('db:getShifts', async (event, storeId, startDate, endDate, employeeId, companyId) => {
    return dbHelpers.getShifts(storeId, startDate, endDate, employeeId, companyId)
})

ipcMain.handle('db:assignShift', async (event, shift) => {
    const result = dbHelpers.assignShift(shift)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('ai:optimizeSchedule', async (event, salesHistory, staffList) => {
    console.log('AI: Optimizing Shift Schedule')
    const { optimizeShiftSchedule } = require('./ai-service.cjs')
    return optimizeShiftSchedule(salesHistory, staffList)
})

ipcMain.handle('ai:analyzePerformance', async (event, storeId, companyId) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = new Date().toISOString().split('T')[0];

    const performance = dbHelpers.getStaffPerformanceData(companyId, storeId, startStr, endStr);
    const shrinkage = dbHelpers.getInventoryShrinkage(companyId, storeId, startStr, endStr);
    const shifts = dbHelpers.getShifts(storeId, startStr, endStr);

    const { analyzePerformanceAndRisk } = require('./ai-service.cjs');
    return analyzePerformanceAndRisk(performance, shrinkage, shifts);
})

// Phase 4: HR Chat & Hiring
ipcMain.handle('ai:hrChat', async (event, query, context) => {
    const { chatWithHR } = require('./ai-service.cjs')
    return chatWithHR(query, context)
})

ipcMain.handle('ai:parseResume', async (event, resumeText) => {
    const { parseResume } = require('./ai-service.cjs')
    return parseResume(resumeText)
})

ipcMain.handle('db:getCandidates', async (event, storeId, companyId) => {
    return dbHelpers.getCandidates(storeId) // Candidates might need companyId soon
})

ipcMain.handle('db:addCandidate', async (event, candidate) => {
    const result = dbHelpers.addCandidate(candidate)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateCandidateStatus', async (event, id, status) => {
    const result = dbHelpers.updateCandidateStatus(id, status)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:generateBarcode', async (event, sku) => {
    try {
        const png = await bwipjs.toBuffer({
            bcid: 'code128',       // Barcode type
            text: sku,             // Text to encode
            scale: 3,              // 3x scaling factor
            height: 10,            // Bar height, in millimeters
            includetext: true,      // Show human-readable text
            textxalign: 'center',  // Always good to set this
        })
        return `data:image/png;base64,${png.toString('base64')}`
    } catch (err) {
        console.error('Barcode Generation Error:', err)
        throw err
    }
})

// Employees
ipcMain.handle('db:getEmployees', async (event, storeId, companyId) => {
    return dbHelpers.getEmployees(storeId) // Employees need companyId update in db.cjs later
})

ipcMain.handle('db:addEmployee', async (event, employee) => {
    try {
        const result = dbHelpers.addEmployee(employee)
        if (mainWindow) mainWindow.webContents.send('sync:trigger')
        return result
    } catch (err) {
        console.error('IPC: addEmployee error:', err.message)
        throw err
    }
})

ipcMain.handle('db:updateEmployee', async (event, id, updates) => {
    const result = dbHelpers.updateEmployee(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteEmployee', async (event, id) => {
    const result = dbHelpers.deleteEmployee(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Permissions
ipcMain.handle('db:getPermissions', async (event, userId) => {
    return dbHelpers.getPermissions(userId)
})

ipcMain.handle('db:updatePermissions', async (event, userId, permissions) => {
    const result = dbHelpers.updatePermissions(userId, permissions)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Payroll
ipcMain.handle('db:getPayroll', async (event, storeId, companyId, employeeId) => {
    return dbHelpers.getPayroll(storeId, companyId, employeeId)
})

ipcMain.handle('db:addPayroll', async (event, payroll) => {
    const result = dbHelpers.addPayroll(payroll)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updatePayrollStatus', async (event, id, status) => {
    const result = dbHelpers.updatePayrollStatus(id, status)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Leaves Balances
ipcMain.handle('db:getLeaveBalances', async (event, employeeId, companyId) => {
    return dbHelpers.getLeaveBalances(employeeId, companyId)
})

ipcMain.handle('db:setLeaveBalance', async (event, data) => {
    const result = dbHelpers.setLeaveBalance(data)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Performance Reviews
ipcMain.handle('db:getPerformanceReviews', async (event, storeId, companyId, employeeId) => {
    return dbHelpers.getPerformanceReviews(storeId, companyId, employeeId)
})

ipcMain.handle('db:addPerformanceReview', async (event, review) => {
    const result = dbHelpers.addPerformanceReview(review)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Categories
ipcMain.handle('db:getCategories', async (event, storeId, companyId) => {
    return dbHelpers.getCategories(companyId, storeId)
})

ipcMain.handle('db:addCategory', async (event, category) => {
    const result = dbHelpers.addCategory(category)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})


// Suppliers
ipcMain.handle('db:getSuppliers', async (event, storeId, companyId) => {
    return dbHelpers.getAllSuppliers(companyId, storeId)
})

ipcMain.handle('db:addSupplier', async (event, supplier) => {
    const result = dbHelpers.addSupplier(supplier)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateSupplier', async (event, id, updates) => {
    const result = dbHelpers.updateSupplier(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteSupplier', async (event, id) => {
    const result = dbHelpers.deleteSupplier(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getSupplierTransactions', async (event, supplierId) => {
    return dbHelpers.getSupplierTransactions(supplierId)
})

ipcMain.handle('db:sendSupplierEmail', async (event, { supplierEmail, subject, message }) => {
    try {
        const { getSetting } = require('./db.cjs');
        const token = getSetting('auth_token');
        const apiBase = getSetting('api_base_url') || 'http://127.0.0.1:8000';
        
        const response = await fetch(`${apiBase}/api/erp/online-reports/send-supplier-email/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ supplier_email: supplierEmail, subject, message })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send email');
        return { success: true, data };
    } catch (err) {
        console.error('db:sendSupplierEmail error:', err.message);
        return { success: false, error: err.message };
    }
})

ipcMain.handle('db:addSupplierTransaction', async (event, tx) => {
    const result = dbHelpers.addSupplierTransaction(tx)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getSupplierCustomFields', async (event, storeId, companyId) => {
    return dbHelpers.getSupplierCustomFields(companyId, storeId)
})

ipcMain.handle('db:addSupplierCustomField', async (event, field) => {
    const result = dbHelpers.addSupplierCustomField(field)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getSupplierCustomValues', async (event, supplierId) => {
    return dbHelpers.getSupplierCustomValues(supplierId)
})

ipcMain.handle('db:saveSupplierCustomValue', async (event, val) => {
    const result = dbHelpers.saveSupplierCustomValue(val)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getSupplierLedger', async (event, supplierId) => {
    return dbHelpers.getSupplierLedger(supplierId)
})

ipcMain.handle('db:getPaymentTerms', async (event, storeId, companyId) => {
    return dbHelpers.getPaymentTerms(companyId, storeId)
})

ipcMain.handle('db:addPaymentTerm', async (event, term) => {
    const result = dbHelpers.addPaymentTerm(term)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getSupplierDocuments', async (event, supplierId) => {
    return dbHelpers.getSupplierDocuments(supplierId)
})

ipcMain.handle('db:addSupplierDocument', async (event, doc) => {
    const result = dbHelpers.addSupplierDocument(doc)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Receiving Module
ipcMain.handle('db:getReceivings', async (event, storeId, companyId) => {
    return dbHelpers.getReceivings(companyId, storeId)
})

ipcMain.handle('db:getReceivingById', async (event, id) => {
    return dbHelpers.getReceivingById(id)
})

ipcMain.handle('db:addReceiving', async (event, receiving) => {
    const result = dbHelpers.addReceiving(receiving)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateReceiving', async (event, id, updates) => {
    const result = dbHelpers.updateReceiving(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:completeReceiving', async (event, { id, accountId, amountPaid }) => {
    const result = dbHelpers.completeReceiving(id, accountId, amountPaid)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:suspendReceiving', async (event, id) => {
    const result = dbHelpers.suspendReceiving(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:addReceivingPayment', async (event, { id, amount, accountId }) => {
    const result = dbHelpers.addReceivingPayment(id, amount, accountId)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})


ipcMain.handle('db:deleteReceiving', async (event, id) => {
    const result = dbHelpers.deleteReceiving(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Invoice Module
ipcMain.handle('db:getInvoices', async (event, storeId, companyId) => {
    return dbHelpers.getInvoices(companyId, storeId)
})

ipcMain.handle('db:getInvoiceById', async (event, id) => {
    return dbHelpers.getInvoiceById(id)
})

ipcMain.handle('db:createInvoice', async (event, invoice) => {
    const result = dbHelpers.createInvoice(invoice)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateInvoice', async (event, id, updates) => {
    const result = dbHelpers.updateInvoice(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteInvoice', async (event, id) => {
    const result = dbHelpers.deleteInvoice(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})


// New Sales Module IPCs
ipcMain.handle('db:updateSale', async (event, id, updates) => {
    const result = dbHelpers.updateSale(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getGiftCards', async (event, storeId, companyId) => {
    return dbHelpers.getGiftCards(companyId, storeId)
})

ipcMain.handle('db:addGiftCard', async (event, gc) => {
    const result = dbHelpers.addGiftCard(gc)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateGiftCard', async (event, id, updates) => {
    const result = dbHelpers.updateGiftCard(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getWorkOrders', async (event, storeId, companyId) => {
    return dbHelpers.getWorkOrders(companyId, storeId)
})

ipcMain.handle('db:updateWorkOrder', async (event, id, updates) => {
    const result = dbHelpers.updateWorkOrder(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:getDeliveries', async (event, storeId, companyId) => {
    return dbHelpers.getDeliveries(companyId, storeId)
})

ipcMain.handle('db:updateDelivery', async (event, id, updates) => {
    const result = dbHelpers.updateDelivery(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Delivery Zones
ipcMain.handle('db:getDeliveryZones', async (event, storeId, companyId) => {
    return dbHelpers.getDeliveryZones(companyId, storeId)
})

ipcMain.handle('db:addDeliveryZone', async (event, zone) => {
    const result = dbHelpers.addDeliveryZone(zone)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:updateDeliveryZone', async (event, id, updates) => {
    const result = dbHelpers.updateDeliveryZone(id, updates)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('db:deleteDeliveryZone', async (event, id) => {
    const result = dbHelpers.deleteDeliveryZone(id)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

// Store Configuration
ipcMain.handle('db:getStoreConfig', async (event, storeId) => {
    return dbHelpers.getStoreConfig(storeId)
})

ipcMain.handle('db:saveStoreConfig', async (event, storeId, configData) => {
    const result = dbHelpers.saveStoreConfig(storeId, configData)
    if (mainWindow) mainWindow.webContents.send('sync:trigger')
    return result
})

ipcMain.handle('system:printReceipt', async (event, html) => {
    let printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } })
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    return new Promise((resolve) => {
        printWindow.webContents.on('did-finish-load', async () => {
            try {
                const printResult = printWindow.webContents.print({ silent: true, printBackground: true });
                if (printResult && typeof printResult.then === 'function') {
                    const success = await printResult;
                    printWindow.close();
                    resolve({ success });
                } else {
                    // Fallback for cases where print returns void or fails to return a promise
                    setTimeout(() => {
                        printWindow.close();
                        resolve({ success: true });
                    }, 1000);
                }
            } catch (err) {
                if (!printWindow.isDestroyed()) printWindow.close();
                resolve({ success: false, error: err.message });
            }
        })
    })
})

ipcMain.handle('system:generatePDF', async (event, html, filename) => {
    let printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } })
    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    const { dialog } = require('electron');
    const fs = require('fs');

    return new Promise((resolve) => {
        printWindow.webContents.on('did-finish-load', async () => {
            try {
                const { filePath } = await dialog.showSaveDialog({
                    title: 'Save Invoice PDF',
                    defaultPath: filename || 'invoice.pdf',
                    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
                });

                if (!filePath) {
                    printWindow.close();
                    resolve({ success: false, error: 'Cancelled' });
                    return;
                }

                const data = await printWindow.webContents.printToPDF({
                    printBackground: true,
                    margins: { marginType: 'default' }
                });

                fs.writeFileSync(filePath, data);
                printWindow.close();
                resolve({ success: true, filePath });
            } catch (err) {
                if (!printWindow.isDestroyed()) printWindow.close();
                resolve({ success: false, error: err.message });
            }
        })
    })
})

ipcMain.handle('system:openSecondaryDisplay', async () => {
    if (secondaryWindow) {
        secondaryWindow.focus()
        return { success: true }
    }

    const { screen } = require('electron')
    const displays = screen.getAllDisplays()
    const externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    })

    secondaryWindow = new BrowserWindow({
        width: 800,
        height: 600,
        x: externalDisplay ? externalDisplay.bounds.x : 100,
        y: externalDisplay ? externalDisplay.bounds.y : 100,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
        secondaryWindow.loadURL("http://127.0.0.1:8080/#/customer-display")
    } else {
        secondaryWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'customer-display' })
    }

    secondaryWindow.on('closed', () => {
        secondaryWindow = null
    })

    return { success: true }
})

ipcMain.on('customer-display:update', (event, data) => {
    if (secondaryWindow) {
        secondaryWindow.webContents.send('customer-display:data', data)
    }
})

console.log('[Main] IPC Handlers registered successfully');

// ─── Auto-Updater Setup ──────────────────────────────────────────────────────
function setupAutoUpdater() {
    // Do not check for updates in dev mode
    if (!app.isPackaged) {
        console.log('[Updater] Dev mode — skipping update check.');
        return;
    }

    if (process.platform === 'darwin') {
        autoUpdater.autoDownload = false; // Mac requires Apple Code Signing for background auto-updates
        autoUpdater.autoInstallOnAppQuit = false;
    } else {
        autoUpdater.autoDownload = true;       // Download in background silently
        autoUpdater.autoInstallOnAppQuit = true; // Install when the user quits normally
    }

    // Check for update immediately when app opens
    autoUpdater.checkForUpdates().catch(err => {
        console.error('[Updater] Check failed:', err);
    });

    // Update is available — notify renderer so it can show a banner
    autoUpdater.on('update-available', (info) => {
        console.log('[Updater] Update available:', info.version);
        
        // Show native alert on macOS directing them to the site
        if (process.platform === 'darwin') {
            const { dialog, shell } = require('electron');
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: `A new version (${info.version}) of Invenza ERP is ready. 

macOS requires manual installation for security. Would you like to go to our website now to download the latest update?`,
                buttons: ['Update Now', 'Later'],
                defaultId: 0
            }).then(result => {
                if (result.response === 0) {
                    shell.openExternal('https://invenza-enterprise-resource-planning.netlify.app/');
                }
            });
        }
        
        if (mainWindow) {
            mainWindow.webContents.send('updater:update-available', { version: info.version });
        }
    });

    // No update — just log
    autoUpdater.on('update-not-available', () => {
        console.log('[Updater] App is up to date.');
    });

    // Download progress (optional — we send to renderer so it can show %)
    autoUpdater.on('download-progress', (progress) => {
        if (mainWindow) {
            mainWindow.webContents.send('updater:download-progress', {
                percent: Math.floor(progress.percent)
            });
        }
    });

    // Update has been fully downloaded — prompt user to restart
    autoUpdater.on('update-downloaded', (info) => {
        console.log('[Updater] Update downloaded:', info.version);
        if (mainWindow) {
            mainWindow.webContents.send('updater:update-downloaded', { version: info.version });
        }
    });

    autoUpdater.on('error', (err) => {
        log.error('[Updater] Error:', err);
        if (mainWindow) {
            mainWindow.webContents.send('updater:error', { message: err.message });
        }
    });
}

// IPC: Manual check for updates (can be called from a hidden button or console)
ipcMain.handle('updater:check', async () => {
    log.info('[Updater] Manual check requested');
    try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, info: result ? result.updateInfo : null };
    } catch (err) {
        log.error('[Updater] Manual check failed:', err);
        return { success: false, error: err.message };
    }
});

// Barcode / SKU Scanner - Stock IN or OUT
ipcMain.handle('db:handleBarcodeScan', async (event, barcode, mode, storeId) => {
    const result = dbHelpers.handleBarcodeScan(barcode, mode, storeId)
    if (result?.status === 'SUCCESS' && mainWindow) {
        mainWindow.webContents.send('sync:trigger')
    }
    return result
})

// IPC: Renderer clicked "Restart & Install"
ipcMain.on('updater:install-now', () => {
    autoUpdater.quitAndInstall(false, true); // silent=false, forceRunAfter=true
});

// ─────────────────────────────────────────────────────────────────────────────
// HR DOCUMENTS & MEDIA
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('db:saveHRDocument', async (event, sourcePath, filename) => {
    try {
        const userDataPath = app.getPath('userData');
        const hrMediaPath = path.join(userDataPath, 'media', 'hr');
        
        // Ensure directory exists
        if (!fs.existsSync(hrMediaPath)) {
            fs.mkdirSync(hrMediaPath, { recursive: true });
        }

        const targetPath = path.join(hrMediaPath, filename);
        
        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        
        return { success: true, path: targetPath };
    } catch (error) {
        console.error('Failed to save HR document:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('system:selectFile', async (event) => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'jpeg'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'User canceled file selection' };
    }

    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);
    return {
        success: true,
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        type: path.extname(filePath).toLowerCase()
    };
});

ipcMain.handle('system:openFile', async (event, filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File does not exist' };
        }
        await shell.openPath(filePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
    log.info('[Main] App is ready, creating window');
    createWindow();

    // Wait slightly more to ensure React is mounted before checking
    setTimeout(() => {
        setupAutoUpdater();
    }, 5000);
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
