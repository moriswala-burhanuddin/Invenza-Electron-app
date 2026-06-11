// Database adapter - uses Electron IPC when available, falls back to mock data
import { isElectron } from './electron-helper'
import {
    Product, Customer, Sale, User, Store, Transaction, Purchase,
    GiftCard, WorkOrder, Delivery, Supplier, SupplierTransaction,
    SupplierCustomField, SupplierCustomValue, ItemKit, Quotation,
    PaymentTerm, SupplierDocument, ReceivingItem, Account, Receiving,
    StockTransfer, PurchaseOrder, ExpenseCategory, TaxSlab, Commission,
    LoyaltyPoint, ProductCustomValue, CustomerCustomValue, CustomField, DashboardMetrics,
    HRAttendance, HRLeave, Employee, HRPayroll, Invoice, InvoiceItem,
    Cheque, Category, UserPermission, PermissionSet
} from './store-data'
import { InventoryRow } from './inventory-utils'


// Helper for Partial updates
type Updates<T> = Partial<T> & { id?: string };

export const dbAdapter = {
    async getProducts(storeId: string, companyId: string): Promise<Product[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getProducts(storeId, companyId)
        }
        return null
    },

    getDashboardMetrics: (storeId: string, companyId: string): Promise<DashboardMetrics | null> => isElectron() ? window.electronAPI.getDashboardMetrics(storeId, companyId) : Promise.resolve(null),
    getLowStockNotifications: (storeId: string, companyId: string): Promise<unknown[]> => isElectron() ? window.electronAPI.getLowStockNotifications(storeId, companyId) : Promise.resolve([]),

    async getProductByBarcode(barcode: string, storeId: string) {
        if (isElectron()) {
            return await window.electronAPI.getProductByBarcode(barcode, storeId)
        }
        return null
    },

    async addProduct(product: Product) {
        if (isElectron()) {
            return await window.electronAPI.addProduct(product)
        }
        return null
    },

    async updateProduct(id: string, updates: Updates<Product>) {
        if (isElectron()) {
            return await window.electronAPI.updateProduct(id, updates)
        }
        return null
    },

    async deleteProduct(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteProduct(id)
        }
        return null
    },

    async getCustomers(storeId: string, companyId: string): Promise<Customer[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getCustomers(storeId, companyId)
        }
        return null
    },

    async addCustomer(customer: Customer) {
        if (isElectron()) {
            return await window.electronAPI.addCustomer(customer)
        }
        return null
    },

    async updateCustomer(id: string, updates: Updates<Customer>) {
        if (isElectron()) {
            return await window.electronAPI.updateCustomer(id, updates)
        }
        return null
    },

    async deleteCustomer(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteCustomer(id)
        }
        return null
    },

    async getSales(storeId: string, companyId: string): Promise<Sale[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getSales(storeId, companyId)
        }
        return null
    },

    async addSale(sale: Sale) {
        if (isElectron()) {
            return await window.electronAPI.addSale(sale)
        }
        return null
    },

    async deleteSale(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteSale(id)
        }
        return null
    },

    async getQuotations(storeId: string, companyId: string): Promise<Quotation[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getQuotations(storeId, companyId)
        }
        return null
    },

    async addQuotation(quotation: Quotation) {
        if (isElectron()) {
            return await window.electronAPI.addQuotation(quotation)
        }
        return null
    },

    async updateQuotation(id: string, updates: Updates<Quotation>) {
        if (isElectron()) {
            return await window.electronAPI.updateQuotation(id, updates)
        }
        return null
    },

    async deleteQuotation(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteQuotation(id)
        }
        return null
    },

    async getTrashQuotations(companyId: string): Promise<Quotation[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getTrashQuotations(companyId)
        }
        return null
    },

    async restoreQuotation(id: string) {
        if (isElectron()) {
            return await window.electronAPI.restoreQuotation(id)
        }
        return null
    },

    async getPurchases(storeId: string, companyId: string): Promise<Purchase[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getPurchases(storeId, companyId)
        }
        return null
    },

    async addPurchase(purchase: Purchase) {
        if (isElectron()) {
            return await window.electronAPI.addPurchase(purchase)
        }
        return null
    },

    async deletePurchase(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deletePurchase(id)
        }
        return null
    },

    async getTransactions(storeId: string, companyId: string): Promise<Transaction[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getTransactions(storeId, companyId)
        }
        return null
    },

    async addTransaction(transaction: Transaction) {
        if (isElectron()) {
            return await window.electronAPI.addTransaction(transaction)
        }
        return null
    },

    async deleteTransaction(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteTransaction(id)
        }
        return null
    },

    async getAccounts(storeId: string, companyId: string): Promise<Account[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getAccounts(storeId, companyId)
        }
        return null
    },

    async addAccount(account: Account) {
        if (isElectron()) {
            return await window.electronAPI.addAccount(account)
        }
        return null
    },

    async updateAccount(id: string, updates: Updates<Account>) {
        if (isElectron()) {
            return await window.electronAPI.updateAccount(id, updates)
        }
        return null
    },

    async deleteAccount(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteAccount(id)
        }
        return null
    },

    async getStores(companyId?: string): Promise<Store[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getStores(companyId)
        }
        return null
    },

    async addStore(store: Store) {
        if (isElectron()) {
            return await window.electronAPI.addStore(store)
        }
        return null
    },

    async addUserStore(userId: string, storeId: string) {
        if (isElectron()) {
            return await window.electronAPI.addUserStore(userId, storeId)
        }
        return null
    },

    async updateStore(id: string, updates: Updates<Store>) {
        if (isElectron()) {
            return await window.electronAPI.updateStore(id, updates)
        }
        return null
    },

    async deleteStore(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteStore(id)
        }
        return null
    },

    async getUsers(companyId?: string): Promise<User[] | null> {
        if (isElectron()) {
            return await window.electronAPI.getUsers(companyId)
        }
        return null
    },

    async handleBarcodeScan(barcode: string, mode: 'IN' | 'OUT', storeId: string) {
        if (isElectron()) {
            return await window.electronAPI.handleBarcodeScan(barcode, mode, storeId)
        }
        return null
    },

    async addUser(user: User) {
        if (isElectron()) {
            return await window.electronAPI.addUser(user)
        }
        return null
    },

    async updateUser(id: string, updates: Updates<User>) {
        if (isElectron()) {
            return await window.electronAPI.updateUser(id, updates)
        }
        return null
    },

    async deleteUser(id: string) {
        if (isElectron()) {
            return await window.electronAPI.deleteUser(id)
        }
        return null
    },

    processStockTransfer: (transfer: StockTransfer) => isElectron() ? window.electronAPI.processStockTransfer(transfer) : Promise.resolve(null),
    getStockTransfers: (storeId: string, companyId: string): Promise<StockTransfer[] | null> => isElectron() ? window.electronAPI.getStockTransfers(storeId, companyId) : Promise.resolve(null),
    getCustomerLedger: (customerId: string, companyId: string): Promise<unknown[] | null> => isElectron() ? window.electronAPI.getCustomerLedger(customerId, companyId) : Promise.resolve(null),
    getSupplierLedger: (supplierId: string): Promise<SupplierTransaction[] | null> => isElectron() ? window.electronAPI.getSupplierLedger(supplierId) : Promise.resolve(null),
    getPurchaseOrders: (storeId: string, companyId: string): Promise<PurchaseOrder[] | null> => isElectron() ? window.electronAPI.getPurchaseOrders(storeId, companyId) : Promise.resolve(null),
    addPurchaseOrder: (po: PurchaseOrder) => isElectron() ? window.electronAPI.addPurchaseOrder(po) : Promise.resolve(null),
    updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>, companyId: string) => isElectron() ? window.electronAPI.updatePurchaseOrder(id, updates, companyId) : Promise.resolve(null),
    deletePurchaseOrder: (id: string, companyId: string) => isElectron() ? window.electronAPI.deletePurchaseOrder(id, companyId) : Promise.resolve(null),
    receivePurchaseOrder: (id: string, companyId: string) => isElectron() ? window.electronAPI.receivePurchaseOrder(id, companyId) : Promise.resolve(null),
    getExpenseCategories: (companyId: string): Promise<ExpenseCategory[] | null> => isElectron() ? window.electronAPI.getExpenseCategories(companyId) : Promise.resolve(null),
    addExpenseCategory: (cat: ExpenseCategory) => isElectron() ? window.electronAPI.addExpenseCategory(cat) : Promise.resolve(null),
    getTaxSlabs: (companyId: string): Promise<TaxSlab[] | null> => isElectron() ? window.electronAPI.getTaxSlabs(companyId) : Promise.resolve(null),
    addTaxSlab: (slab: TaxSlab) => isElectron() ? window.electronAPI.addTaxSlab(slab) : Promise.resolve(null),
    getCommissions: (storeId: string, companyId: string): Promise<Commission[] | null> => isElectron() ? window.electronAPI.getCommissions(storeId, companyId) : Promise.resolve(null),
    getLoyaltyPoints: (customerId: string, companyId: string): Promise<LoyaltyPoint[] | null> => isElectron() ? window.electronAPI.getLoyaltyPoints(customerId, companyId) : Promise.resolve(null),
    generateBarcode: (sku: string): Promise<string | null> => isElectron() ? window.electronAPI.generateBarcode(sku) : Promise.resolve(null),

    log: (message: string) => isElectron() ? window.electronAPI.log(message) : Promise.resolve(null),

    async processExcelUpload(rows: InventoryRow[], storeId: string) {
        if (isElectron()) {
            return await window.electronAPI.processExcelUpload(rows, storeId)
        }
        return null
    },

    getItemKits: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getItemKits(storeId, companyId) : Promise.resolve(null),
    addItemKit: (kit: ItemKit) => isElectron() ? window.electronAPI.addItemKit(kit) : Promise.resolve(null),
    updateItemKit: (id: string, updates: Partial<ItemKit>) => isElectron() ? window.electronAPI.updateItemKit(id, updates) : Promise.resolve(null),
    deleteItemKit: (id: string) => isElectron() ? window.electronAPI.deleteItemKit(id) : Promise.resolve(null),

    getCustomFields: (companyId: string) => isElectron() ? window.electronAPI.getCustomFields(companyId) : Promise.resolve(null),
    onCustomerDisplayData: (callback: (data: unknown) => void) => isElectron() ? window.electronAPI.onCustomerDisplayData(callback) : Promise.resolve(null),
    addCustomField: (field: CustomField) => isElectron() ? window.electronAPI.addCustomField(field) : Promise.resolve(null),
    updateCustomField: (id: string, updates: Updates<CustomField>, companyId: string) => isElectron() ? window.electronAPI.updateCustomField(id, updates, companyId) : Promise.resolve(null),
    deleteCustomField: (id: string, companyId: string) => isElectron() ? window.electronAPI.deleteCustomField(id, companyId) : Promise.resolve(null),

    getProductCustomValues: (productId: string) => isElectron() ? window.electronAPI.getProductCustomValues(productId) : Promise.resolve(null),
    getAllProductCustomValues: () => isElectron() ? window.electronAPI.getAllProductCustomValues() : Promise.resolve(null),
    updateProductCustomValues: (productId: string, values: ProductCustomValue[]) => isElectron() ? window.electronAPI.updateProductCustomValues(productId, values) : Promise.resolve(null),

    getCustomerCustomValues: (customerId: string) => isElectron() ? window.electronAPI.getCustomerCustomValues?.(customerId) : Promise.resolve(null),
    getAllCustomerCustomValues: () => isElectron() ? window.electronAPI.getAllCustomerCustomValues?.() : Promise.resolve(null),
    updateCustomerCustomValues: (customerId: string, values: CustomerCustomValue[]) => isElectron() ? window.electronAPI.updateCustomerCustomValues?.(customerId, values) : Promise.resolve(null),

    bulkDeleteProducts: (ids: string[]) => isElectron() ? window.electronAPI.bulkDeleteProducts(ids) : Promise.resolve(null),
    bulkUpdateProducts: (ids: string[], updates: Updates<Product>) => isElectron() ? window.electronAPI.bulkUpdateProducts(ids, updates) : Promise.resolve(null),

    getSuppliers: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getSuppliers(storeId, companyId) : Promise.resolve(null),
    addSupplier: (supplier: Supplier) => isElectron() ? window.electronAPI.addSupplier(supplier) : Promise.resolve(null),
    updateSupplier: (id: string, updates: Updates<Supplier>) => isElectron() ? window.electronAPI.updateSupplier(id, updates) : Promise.resolve(null),
    deleteSupplier: (id: string) => isElectron() ? window.electronAPI.deleteSupplier(id) : Promise.resolve(null),
    getSupplierTransactions: (supplierId: string) => isElectron() ? window.electronAPI.getSupplierTransactions(supplierId) : Promise.resolve(null),
    addSupplierTransaction: (tx: SupplierTransaction) => isElectron() ? window.electronAPI.addSupplierTransaction(tx) : Promise.resolve(null),
    getSupplierCustomFields: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getSupplierCustomFields(storeId, companyId) : Promise.resolve(null),
    addSupplierCustomField: (field: SupplierCustomField) => isElectron() ? window.electronAPI.addSupplierCustomField(field) : Promise.resolve(null),
    getSupplierCustomValues: (supplierId: string) => isElectron() ? window.electronAPI.getSupplierCustomValues(supplierId) : Promise.resolve(null),
    saveSupplierCustomValue: (val: SupplierCustomValue) => isElectron() ? window.electronAPI.saveSupplierCustomValue(val) : Promise.resolve(null),
    getPaymentTerms: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getPaymentTerms(storeId, companyId) : Promise.resolve(null),
    addPaymentTerm: (term: PaymentTerm) => isElectron() ? window.electronAPI.addPaymentTerm(term) : Promise.resolve(null),
    getSupplierDocuments: (supplierId: string) => isElectron() ? window.electronAPI.getSupplierDocuments(supplierId) : Promise.resolve(null),
    addSupplierDocument: (doc: SupplierDocument) => isElectron() ? window.electronAPI.addSupplierDocument(doc) : Promise.resolve(null),

    getReceivings: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getReceivings(storeId, companyId) : Promise.resolve(null),
    getReceivingById: (id: string) => isElectron() ? window.electronAPI.getReceivingById(id) : Promise.resolve(null),
    addReceiving: (receiving: Receiving) => isElectron() ? window.electronAPI.addReceiving(receiving) : Promise.resolve(null),
    updateReceiving: (id: string, updates: Updates<Receiving>) => isElectron() ? window.electronAPI.updateReceiving(id, updates) : Promise.resolve(null),
    completeReceiving: (data: { id: string, accountId?: string, amountPaid: number }) => isElectron() ? window.electronAPI.completeReceiving(data) : Promise.resolve(null),
    suspendReceiving: (id: string) => isElectron() ? window.electronAPI.suspendReceiving(id) : Promise.resolve(null),
    addReceivingPayment: (data: { id: string, amount: number, accountId: string }) => isElectron() ? window.electronAPI.addReceivingPayment(data) : Promise.resolve(null),
    deleteReceiving: (id: string) => isElectron() ? window.electronAPI.deleteReceiving(id) : Promise.resolve(null),

    updateSale: (id: string, updates: Updates<Sale>) => isElectron() ? window.electronAPI.updateSale(id, updates) : Promise.resolve(null),
    getGiftCards: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getGiftCards(storeId, companyId) : Promise.resolve(null),
    addGiftCard: (gc: GiftCard) => isElectron() ? window.electronAPI.addGiftCard(gc) : Promise.resolve(null),
    updateGiftCard: (id: string, updates: Updates<GiftCard>) => isElectron() ? window.electronAPI.updateGiftCard(id, updates) : Promise.resolve(null),
    getWorkOrders: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getWorkOrders(storeId, companyId) : Promise.resolve(null),
    updateWorkOrder: (id: string, updates: Updates<WorkOrder>) => isElectron() ? window.electronAPI.updateWorkOrder(id, updates) : Promise.resolve(null),
    getDeliveries: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getDeliveries(storeId, companyId) : Promise.resolve(null),
    updateDelivery: (id: string, updates: Updates<Delivery>) => isElectron() ? window.electronAPI.updateDelivery(id, updates) : Promise.resolve(null),
    getDeliveryZones: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getDeliveryZones(storeId, companyId) : Promise.resolve(null),
    getShifts: (storeId: string, startDate?: string, endDate?: string, employeeId?: string, companyId?: string) => isElectron() ? window.electronAPI.getShifts(storeId, startDate, endDate, employeeId, companyId) : Promise.resolve(null),

    checkIn: (employeeId: string, storeId: string, companyId?: string): Promise<{ success: boolean; checkInTime: string; status: string } | null> =>
        isElectron() ? window.electronAPI.checkIn(employeeId, storeId, companyId) : Promise.resolve(null),
    checkOut: (employeeId: string): Promise<{ success: boolean; checkOutTime: string } | null> =>
        isElectron() ? window.electronAPI.checkOut(employeeId) : Promise.resolve(null),
    getAttendance: (employeeId?: string, startDate?: string, endDate?: string): Promise<HRAttendance[] | null> =>
        isElectron() ? window.electronAPI.getAttendance(employeeId, startDate, endDate) : Promise.resolve(null),
    applyLeave: (leave: Omit<HRLeave, 'id' | 'status'> & { employeeId: string; storeId: string }): Promise<{ success: boolean; id: string } | null> =>
        isElectron() ? window.electronAPI.applyLeave(leave) : Promise.resolve(null),
    getLeaves: (storeId: string, companyId?: string, employeeId?: string): Promise<HRLeave[] | null> =>
        isElectron() ? window.electronAPI.getLeaves(storeId, companyId, employeeId) : Promise.resolve(null),
    updateLeaveStatus: (id: string, status: string): Promise<boolean | null> =>
        isElectron() ? window.electronAPI.updateLeaveStatus(id, status) : Promise.resolve(null),
    getEmployees: (storeId: string, companyId: string): Promise<Employee[] | null> =>
        isElectron() ? window.electronAPI.getEmployees(storeId, companyId) : Promise.resolve(null),
    addEmployee: (employee: Omit<User, 'id'> & Omit<Employee, 'id' | 'userId'>): Promise<Employee | null> =>
        isElectron() ? window.electronAPI.addEmployee(employee) : Promise.resolve(null),
    updateEmployee: (id: string, updates: Partial<Employee> & { user?: Partial<User> }): Promise<Employee | null> =>
        isElectron() ? window.electronAPI.updateEmployee(id, updates) : Promise.resolve(null),
    deleteEmployee: (id: string): Promise<{ success: boolean } | null> =>
        isElectron() ? window.electronAPI.deleteEmployee(id) : Promise.resolve(null),
    getPayroll: (storeId: string, companyId?: string, employeeId?: string): Promise<HRPayroll[] | null> =>
        isElectron() ? window.electronAPI.getPayroll(storeId, companyId, employeeId) : Promise.resolve(null),
    getCandidates: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getCandidates(storeId, companyId) : Promise.resolve(null),
    addPayroll: (payroll: HRPayroll) => isElectron() ? window.electronAPI.addPayroll(payroll) : Promise.resolve(null),
    updatePayrollStatus: (id: string, status: string) => isElectron() ? window.electronAPI.updatePayrollStatus(id, status) : Promise.resolve(null),

    getLeaveBalances: (employeeId: string, companyId?: string) => isElectron() ? window.electronAPI.getLeaveBalances(employeeId, companyId) : Promise.resolve(null),
    setLeaveBalance: (data: { employeeId: string; companyId: string; leaveType: string; balance: number; storeId: string }) => isElectron() ? window.electronAPI.setLeaveBalance(data) : Promise.resolve(null),

    getStoreConfig: (storeId: string): Promise<Record<string, unknown> | null> =>
        isElectron() ? window.electronAPI.getStoreConfig(storeId) : Promise.resolve(null),
    saveStoreConfig: (storeId: string, configData: Record<string, unknown>): Promise<{ success: boolean } | null> =>
        isElectron() ? window.electronAPI.saveStoreConfig(storeId, configData) : Promise.resolve(null),

    getInvoices: (storeId: string, companyId: string): Promise<Invoice[] | null> => isElectron() ? window.electronAPI.getInvoices(storeId, companyId) : Promise.resolve(null),
    getInvoiceById: (id: string): Promise<Invoice | null> => isElectron() ? window.electronAPI.getInvoiceById(id) : Promise.resolve(null),
    createInvoice: (invoice: Invoice) => isElectron() ? window.electronAPI.createInvoice(invoice) : Promise.resolve(null),
    updateInvoice: (id: string, updates: Partial<Invoice>) => isElectron() ? window.electronAPI.updateInvoice(id, updates) : Promise.resolve(null),
    deleteInvoice: (id: string) => isElectron() ? window.electronAPI.deleteInvoice(id) : Promise.resolve(null),

    getCheques: (storeId: string, companyId: string) => isElectron() ? window.electronAPI.getCheques(storeId, companyId) : Promise.resolve(null),
    addCheque: (cheque: Cheque) => isElectron() ? window.electronAPI.addCheque(cheque) : Promise.resolve(null),
    updateCheque: (id: string, updates: Updates<Cheque>) => isElectron() ? window.electronAPI.updateCheque(id, updates) : Promise.resolve(null),
    deleteCheque: (id: string) => isElectron() ? window.electronAPI.deleteCheque(id) : Promise.resolve(null),
    clearLocalData: (storeId: string) => isElectron() ? window.electronAPI.clearLocalData(storeId) : Promise.resolve(false),

    getReport: (type: string, storeId: string, dateFrom?: string, dateTo?: string, companyId?: string) =>
        isElectron() ? window.electronAPI.getReport(type, storeId, dateFrom, dateTo, companyId) : Promise.resolve([]),

    getCategories: (storeId: string, companyId: string): Promise<Category[] | null> => isElectron() ? window.electronAPI.getCategories(storeId, companyId) : Promise.resolve(null),
    addCategory: (category: Category) => isElectron() ? window.electronAPI.addCategory(category) : Promise.resolve(null),
    updateCategory: (id: string, updates: Updates<Category>) => isElectron() ? window.electronAPI.updateCategory(id, updates) : Promise.resolve(null),
    deleteCategory: (id: string) => isElectron() ? window.electronAPI.deleteCategory(id) : Promise.resolve(null),

    getPermissions: (userId: string): Promise<UserPermission | null> => isElectron() ? window.electronAPI.getPermissions(userId) : Promise.resolve(null),
    updatePermissions: (userId: string, permissions: PermissionSet): Promise<UserPermission | null> => isElectron() ? window.electronAPI.updatePermissions(userId, permissions) : Promise.resolve(null),
    saveHRDocument: (sourcePath: string, filename: string) => isElectron() ? window.electronAPI.saveHRDocument(sourcePath, filename) : Promise.resolve({ success: false, error: 'Not in Electron' }),
    openFile: (filePath: string) => isElectron() ? window.electronAPI.openFile(filePath) : Promise.resolve({ success: false, error: 'Not in Electron' }),
    selectFile: () => isElectron() ? window.electronAPI.selectFile() : Promise.resolve({ success: false, error: 'Not in Electron' }),
}
