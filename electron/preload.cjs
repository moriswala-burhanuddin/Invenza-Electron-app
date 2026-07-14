const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Products
    getProducts: (storeId, companyId) => ipcRenderer.invoke('db:getProducts', storeId, companyId),
    getProductByBarcode: (barcode, storeId) => ipcRenderer.invoke('db:getProductByBarcode', barcode, storeId),
    addProduct: (product) => ipcRenderer.invoke('db:addProduct', product),
    updateProduct: (id, updates) => ipcRenderer.invoke('db:updateProduct', id, updates),
    deleteProduct: (id) => ipcRenderer.invoke('db:deleteProduct', id),

    // Customers
    getCustomers: (storeId, companyId) => ipcRenderer.invoke('db:getCustomers', storeId, companyId),
    addCustomer: (customer) => ipcRenderer.invoke('db:addCustomer', customer),
    updateCustomer: (id, updates) => ipcRenderer.invoke('db:updateCustomer', id, updates),
    deleteCustomer: (id) => ipcRenderer.invoke('db:deleteCustomer', id),

    // Sales
    getSales: (storeId, companyId) => ipcRenderer.invoke('db:getSales', storeId, companyId),
    addSale: (sale) => ipcRenderer.invoke('db:addSale', sale),
    deleteSale: (id) => ipcRenderer.invoke('db:deleteSale', id),

    // Quotations
    getQuotations: (storeId, companyId) => ipcRenderer.invoke('db:getQuotations', storeId, companyId),
    addQuotation: (quotation) => ipcRenderer.invoke('db:addQuotation', quotation),
    updateQuotation: (id, updates) => ipcRenderer.invoke('db:updateQuotation', id, updates),
    deleteQuotation: (id) => ipcRenderer.invoke('db:deleteQuotation', id),
    getTrashQuotations: (companyId) => ipcRenderer.invoke('db:getTrashQuotations', companyId),
    restoreQuotation: (id) => ipcRenderer.invoke('db:restoreQuotation', id),

    // Purchases
    getPurchases: (storeId, companyId) => ipcRenderer.invoke('db:getPurchases', storeId, companyId),
    addPurchase: (purchase) => ipcRenderer.invoke('db:addPurchase', purchase),
    deletePurchase: (id) => ipcRenderer.invoke('db:deletePurchase', id),

    // Transactions
    getTransactions: (storeId, companyId) => ipcRenderer.invoke('db:getTransactions', storeId, companyId),
    addTransaction: (transaction) => ipcRenderer.invoke('db:addTransaction', transaction),
    deleteTransaction: (id) => ipcRenderer.invoke('db:deleteTransaction', id),

    // Accounts
    getAccounts: (storeId, companyId) => ipcRenderer.invoke('db:getAccounts', storeId, companyId),
    addAccount: (account) => ipcRenderer.invoke('db:addAccount', account),
    updateAccount: (id, updates) => ipcRenderer.invoke('db:updateAccount', id, updates),
    deleteAccount: (id) => ipcRenderer.invoke('db:deleteAccount', id),

    // Stores & Users
    getStores: (companyId) => ipcRenderer.invoke('db:getStores', companyId),
    getUsers: (companyId) => ipcRenderer.invoke('db:getUsers', companyId),
    addStore: (store) => ipcRenderer.invoke('db:addStore', store),
    updateStore: (id, updates) => ipcRenderer.invoke('db:updateStore', id, updates),
    deleteStore: (id) => ipcRenderer.invoke('db:deleteStore', id),
    addUser: (user) => ipcRenderer.invoke('db:addUser', user),
    updateUser: (id, updates) => ipcRenderer.invoke('db:updateUser', id, updates),
    deleteUser: (id) => ipcRenderer.invoke('db:deleteUser', id),
    addUserStore: (userId, storeId) => ipcRenderer.invoke('db:addUserStore', userId, storeId),
    verifyPassword: (id, password) => ipcRenderer.invoke('db:verifyPassword', id, password),
    verifySupervisor: (code) => ipcRenderer.invoke('db:verifySupervisor', code),

    // Barcode Operations
    handleBarcodeScan: (barcode, mode, storeId) => ipcRenderer.invoke('db:handleBarcodeScan', barcode, mode, storeId),

    // Excel Import
    processExcelUpload: (rows, storeId) => ipcRenderer.invoke('db:processExcelUpload', rows, storeId),

    // Sync
    getDirtyData: () => ipcRenderer.invoke('db:getDirtyData'),
    markAsSynced: (confirmedIds) => ipcRenderer.invoke('db:markAsSynced', confirmedIds),
    markAsUnsynced: (idsToReset) => ipcRenderer.invoke('db:markAsUnsynced', idsToReset),
    getLastPullTimestamp: () => ipcRenderer.invoke('db:getLastPullTimestamp'),
    applyCloudUpdates: (data) => ipcRenderer.invoke('db:applyCloudUpdates', data),
    onSyncTrigger: (callback) => ipcRenderer.on('sync:trigger', () => callback()),

    // Phase 11
    processStockTransfer: (transfer) => ipcRenderer.invoke('db:processStockTransfer', transfer),
    getStockTransfers: (storeId, companyId) => ipcRenderer.invoke('db:getStockTransfers', storeId, companyId),
    getCustomerLedger: (customerId, companyId) => ipcRenderer.invoke('db:getCustomerLedger', customerId, companyId),
    getPurchaseOrders: (storeId, companyId) => ipcRenderer.invoke('db:getPurchaseOrders', storeId, companyId),
    getPurchaseOrderById: (id) => ipcRenderer.invoke('db:getPurchaseOrderById', id),
    addPurchaseOrder: (po) => ipcRenderer.invoke('db:addPurchaseOrder', po),
    updatePurchaseOrder: (id, updates, companyId) => ipcRenderer.invoke('db:updatePurchaseOrder', id, updates, companyId),
    deletePurchaseOrder: (id, companyId) => ipcRenderer.invoke('db:deletePurchaseOrder', id, companyId),
    receivePurchaseOrder: (id, companyId) => ipcRenderer.invoke('db:receivePurchaseOrder', id, companyId),
    getExpenseCategories: (companyId) => ipcRenderer.invoke('db:getExpenseCategories', companyId),
    addExpenseCategory: (cat) => ipcRenderer.invoke('db:addExpenseCategory', cat),
    getTaxSlabs: (companyId) => ipcRenderer.invoke('db:getTaxSlabs', companyId),
    addTaxSlab: (slab) => ipcRenderer.invoke('db:addTaxSlab', slab),
    deleteTaxSlab: (id) => ipcRenderer.invoke('db:deleteTaxSlab', id),
    getCommissions: (storeId, companyId) => ipcRenderer.invoke('db:getCommissions', storeId, companyId),
    getLoyaltyPoints: (customerId, companyId) => ipcRenderer.invoke('db:getLoyaltyPoints', customerId, companyId),
    generateBarcode: (sku) => ipcRenderer.invoke('db:generateBarcode', sku),

    // Log for debugging
    log: (message) => ipcRenderer.send('db:log', message),
    manualBackup: () => ipcRenderer.invoke('system:manualBackup'),
    clearLocalData: (storeId) => ipcRenderer.invoke('db:clearLocalData', storeId),
    askAI: (query, contextData) => ipcRenderer.invoke('ai:ask', query, contextData),
    getInventoryForecast: (products, sales) => ipcRenderer.invoke('ai:getForecast', products, sales),
    suggestCategory: (productName) => ipcRenderer.invoke('ai:suggestCategory', productName),
    processInvoiceOCR: (imageBase64, products) => ipcRenderer.invoke('ai:processOCR', imageBase64, products),
    optimizeReorder: (products, sales) => ipcRenderer.invoke('ai:optimizeReorder', products, sales),
    analyzeAttendance: (attendanceData, leaveData) => ipcRenderer.invoke('ai:analyzeAttendance', attendanceData, leaveData),

    // HR & Attendance
    checkIn: (employeeId, storeId, companyId) => ipcRenderer.invoke('db:checkIn', employeeId, storeId, companyId),
    checkOut: (userId) => ipcRenderer.invoke('db:checkOut', userId),
    getAttendance: (userId, startDate, endDate) => ipcRenderer.invoke('db:getAttendance', userId, startDate, endDate),
    applyLeave: (leave) => ipcRenderer.invoke('db:applyLeave', leave),
    getLeaves: (storeId, companyId, employeeId) => ipcRenderer.invoke('db:getLeaves', storeId, companyId, employeeId),
    updateLeaveStatus: (id, status) => ipcRenderer.invoke('db:updateLeaveStatus', id, status),

    // Shifts
    getShifts: (storeId, startDate, endDate, employeeId, companyId) => ipcRenderer.invoke('db:getShifts', storeId, startDate, endDate, employeeId, companyId),
    assignShift: (shift) => ipcRenderer.invoke('db:assignShift', shift),
    optimizeSchedule: (salesHistory, staffList) => ipcRenderer.invoke('ai:optimizeSchedule', salesHistory, staffList),
    analyzePerformance: (storeId, companyId) => ipcRenderer.invoke('ai:analyzePerformance', storeId, companyId),

    // Hiring & Chat
    hrChat: (query, context) => ipcRenderer.invoke('ai:hrChat', query, context),
    parseResume: (resumeText) => ipcRenderer.invoke('ai:parseResume', resumeText),
    getCandidates: (storeId, companyId) => ipcRenderer.invoke('db:getCandidates', storeId, companyId),
    addCandidate: (candidate) => ipcRenderer.invoke('db:addCandidate', candidate),
    updateCandidateStatus: (id, status) => ipcRenderer.invoke('db:updateCandidateStatus', id, status),

    // Employees
    getEmployees: (storeId, companyId) => ipcRenderer.invoke('db:getEmployees', storeId, companyId),
    addEmployee: (employee) => ipcRenderer.invoke('db:addEmployee', employee),
    updateEmployee: (id, updates) => ipcRenderer.invoke('db:updateEmployee', id, updates),
    deleteEmployee: (id) => ipcRenderer.invoke('db:deleteEmployee', id),
    saveHRDocument: (sourcePath, filename) => ipcRenderer.invoke('db:saveHRDocument', sourcePath, filename),
    openFile: (filePath) => ipcRenderer.invoke('system:openFile', filePath),
    selectFile: () => ipcRenderer.invoke('system:selectFile'),

    // Item Kits
    getItemKits: (storeId, companyId) => ipcRenderer.invoke('db:getItemKits', storeId, companyId),
    addItemKit: (kit) => ipcRenderer.invoke('db:addItemKit', kit),
    updateItemKit: (id, updates) => ipcRenderer.invoke('db:updateItemKit', id, updates),
    deleteItemKit: (id) => ipcRenderer.invoke('db:deleteItemKit', id),

    // Custom Fields
    getCustomFields: (companyId) => ipcRenderer.invoke('db:getCustomFields', companyId),
    addCustomField: (field) => ipcRenderer.invoke('db:addCustomField', field),
    updateCustomField: (id, updates, companyId) => ipcRenderer.invoke('db:updateCustomField', id, updates, companyId),
    deleteCustomField: (id, companyId) => ipcRenderer.invoke('db:deleteCustomField', id, companyId),

    // Custom Field Values
    getProductCustomValues: (productId) => ipcRenderer.invoke('db:getProductCustomValues', productId),
    getAllProductCustomValues: () => ipcRenderer.invoke('db:getAllProductCustomValues'),
    updateProductCustomValues: (productId, values) => ipcRenderer.invoke('db:updateProductCustomValues', productId, values),

    // Bulk Actions
    bulkDeleteProducts: (ids) => ipcRenderer.invoke('db:bulkDeleteProducts', ids),
    bulkUpdateProducts: (ids, updates) => ipcRenderer.invoke('db:bulkUpdateProducts', ids, updates),

    // Suppliers
    getSuppliers: (storeId, companyId) => ipcRenderer.invoke('db:getSuppliers', storeId, companyId),
    addSupplier: (supplier) => ipcRenderer.invoke('db:addSupplier', supplier),
    updateSupplier: (id, updates) => ipcRenderer.invoke('db:updateSupplier', id, updates),
    deleteSupplier: (id) => ipcRenderer.invoke('db:deleteSupplier', id),
    getSupplierTransactions: (supplierId) => ipcRenderer.invoke('db:getSupplierTransactions', supplierId),
    addSupplierTransaction: (tx) => ipcRenderer.invoke('db:addSupplierTransaction', tx),
    getSupplierCustomFields: (storeId, companyId) => ipcRenderer.invoke('db:getSupplierCustomFields', storeId, companyId),
    addSupplierCustomField: (field) => ipcRenderer.invoke('db:addSupplierCustomField', field),
    getSupplierCustomValues: (supplierId) => ipcRenderer.invoke('db:getSupplierCustomValues', supplierId),
    saveSupplierCustomValue: (val) => ipcRenderer.invoke('db:saveSupplierCustomValue', val),
    getSupplierLedger: (supplierId) => ipcRenderer.invoke('db:getSupplierLedger', supplierId),
    getPaymentTerms: (storeId, companyId) => ipcRenderer.invoke('db:getPaymentTerms', storeId, companyId),
    addPaymentTerm: (term) => ipcRenderer.invoke('db:addPaymentTerm', term),
    getSupplierDocuments: (supplierId) => ipcRenderer.invoke('db:getSupplierDocuments', supplierId),
    addSupplierDocument: (doc) => ipcRenderer.invoke('db:addSupplierDocument', doc),

    // Receiving Module
    getReceivings: (storeId, companyId) => ipcRenderer.invoke('db:getReceivings', storeId, companyId),
    getReceivingById: (id) => ipcRenderer.invoke('db:getReceivingById', id),
    addReceiving: (receiving) => ipcRenderer.invoke('db:addReceiving', receiving),
    updateReceiving: (id, updates) => ipcRenderer.invoke('db:updateReceiving', id, updates),
    completeReceiving: (data) => ipcRenderer.invoke('db:completeReceiving', data),
    suspendReceiving: (id) => ipcRenderer.invoke('db:suspendReceiving', id),
    addReceivingPayment: (data) => ipcRenderer.invoke('db:addReceivingPayment', data),
    deleteReceiving: (id) => ipcRenderer.invoke('db:deleteReceiving', id),

    // Invoice Module
    getInvoices: (storeId, companyId) => ipcRenderer.invoke('db:getInvoices', storeId, companyId),
    getInvoiceById: (id) => ipcRenderer.invoke('db:getInvoiceById', id),
    createInvoice: (invoice) => ipcRenderer.invoke('db:createInvoice', invoice),
    updateInvoice: (id, updates) => ipcRenderer.invoke('db:updateInvoice', id, updates),
    deleteInvoice: (id) => ipcRenderer.invoke('db:deleteInvoice', id),


    // New Sales Module IPCs
    updateSale: (id, updates) => ipcRenderer.invoke('db:updateSale', id, updates),
    getGiftCards: (storeId, companyId) => ipcRenderer.invoke('db:getGiftCards', storeId, companyId),
    addGiftCard: (gc) => ipcRenderer.invoke('db:addGiftCard', gc),
    updateGiftCard: (id, updates) => ipcRenderer.invoke('db:updateGiftCard', id, updates),
    getWorkOrders: (storeId, companyId) => ipcRenderer.invoke('db:getWorkOrders', storeId, companyId),
    updateWorkOrder: (id, updates) => ipcRenderer.invoke('db:updateWorkOrder', id, updates),
    getDeliveries: (storeId, companyId) => ipcRenderer.invoke('db:getDeliveries', storeId, companyId),
    updateDelivery: (id, updates) => ipcRenderer.invoke('db:updateDelivery', id, updates),

    // Dashboard
    getDashboardMetrics: (storeId, companyId, dateRange) => ipcRenderer.invoke('db:getDashboardMetrics', storeId, companyId, dateRange),
    getLowStockNotifications: (storeId, companyId) => ipcRenderer.invoke('db:getLowStockNotifications', storeId, companyId),

    // System Features
    printReceipt: (html) => ipcRenderer.invoke('system:printReceipt', html),
    generatePDF: (html, filename) => ipcRenderer.invoke('system:generatePDF', html, filename),
    openSecondaryDisplay: () => ipcRenderer.invoke('system:openSecondaryDisplay',),
    updateSecondaryDisplay: (data) => ipcRenderer.send('customer-display:update', data),
    onCustomerDisplayData: (callback) => ipcRenderer.on('customer-display:data', (event, data) => callback(data)),

    // Store Configuration
    getStoreConfig: (storeId) => ipcRenderer.invoke('db:getStoreConfig', storeId),
    saveStoreConfig: (storeId, configData) => ipcRenderer.invoke('db:saveStoreConfig', storeId, configData),

    // Cheques
    getCheques: (storeId, companyId) => ipcRenderer.invoke('db:getCheques', storeId, companyId),
    addCheque: (cheque) => ipcRenderer.invoke('db:addCheque', cheque),
    updateCheque: (id, updates) => ipcRenderer.invoke('db:updateCheque', id, updates),
    deleteCheque: (id) => ipcRenderer.invoke('db:deleteCheque', id),

    // Reports
    getReport: (type, storeId, dateFrom, dateTo, companyId) => ipcRenderer.invoke('db:getReport', type, storeId, dateFrom, dateTo, companyId),

    // ─── Auto-Updater ─────────────────────────────────────────────────────────
    // Call these from React to listen for update notifications
    onUpdateAvailable: (callback) => ipcRenderer.on('updater:update-available', (_, info) => callback(info)),
    onDownloadProgress: (callback) => ipcRenderer.on('updater:download-progress', (_, info) => callback(info)),
    onUpdateDownloaded: (callback) => ipcRenderer.on('updater:update-downloaded', (_, info) => callback(info)),
    onUpdaterError: (callback) => ipcRenderer.on('updater:error', (_, info) => callback(info)),

    // Actions
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    installUpdate: () => ipcRenderer.send('updater:install-now'),
    getVersion: () => ipcRenderer.invoke('system:getVersion'),

    // License & Feature Flags
    getDeviceId: () => ipcRenderer.invoke('system:getDeviceId'),
    getLicenseKey: () => ipcRenderer.invoke('system:getLicenseKey'),
    saveLicenseKey: (key) => ipcRenderer.invoke('system:saveLicenseKey', key),

    getPayroll: (storeId, companyId, employeeId) => ipcRenderer.invoke('db:getPayroll', storeId, companyId, employeeId),
    addPayroll: (payroll) => ipcRenderer.invoke('db:addPayroll', payroll),
    updatePayrollStatus: (id, status) => ipcRenderer.invoke('db:updatePayrollStatus', id, status),

    // Leave Balances
    getLeaveBalances: (employeeId, companyId) => ipcRenderer.invoke('db:getLeaveBalances', employeeId, companyId),
    setLeaveBalance: (data) => ipcRenderer.invoke('db:setLeaveBalance', data),

    // Categories
    getCategories: (storeId, companyId) => ipcRenderer.invoke('db:getCategories', storeId, companyId),
    addCategory: (category) => ipcRenderer.invoke('db:addCategory', category),
    updateCategory: (id, updates) => ipcRenderer.invoke('db:updateCategory', id, updates),
    deleteCategory: (id) => ipcRenderer.invoke('db:deleteCategory', id),
    
    // Permissions
    getPermissions: (userId) => ipcRenderer.invoke('db:getPermissions', userId),
    updatePermissions: (userId, permissions) => ipcRenderer.invoke('db:updatePermissions', userId, permissions),
    clearTenantData: (forceHardPurge = false) => ipcRenderer.invoke('db:clearTenantData', forceHardPurge),
})
