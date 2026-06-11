import {
    Product, Customer, Sale, User, Store, Transaction, Purchase,
    GiftCard, WorkOrder, Delivery, Supplier, SupplierTransaction,
    SupplierCustomField, SupplierCustomValue, ItemKit, Quotation,
    PaymentTerm, SupplierDocument, ReceivingItem, Account, Receiving,
    StockTransfer, PurchaseOrder, ExpenseCategory, TaxSlab, Commission,
    LoyaltyPoint, ProductCustomValue, CustomField, ActivityLog,
    DeliveryZone, HRAttendance, HRLeave, Employee, HRPayroll, Invoice, InvoiceItem,
    Cheque, UserPermission, PermissionSet, Category
} from '../lib/store-data'
import { InventoryRow, ExcelUploadSummary, BarcodeResponse } from '../lib/inventory-utils'

type Updates<T> = Partial<T> & { id?: string };

export interface HiringCandidate {
    id: string;
    name: string;
    role: string;
    status: 'applied' | 'interview' | 'offer' | 'hired' | 'rejected';
    score: number;
    email?: string;
    phone?: string;
    skills?: string;
    storeId?: string;
}

export interface ElectronAPI {
    // Products
    getProducts: (storeId: string, companyId: string) => Promise<Product[]>;
    getDashboardMetrics: (storeId: string, companyId: string) => Promise<DashboardMetrics>;
    getLowStockNotifications: (storeId: string, companyId: string) => Promise<unknown[]>;
    getProductByBarcode: (barcode: string, storeId: string) => Promise<Product | null>;
    addProduct: (product: Product) => Promise<{ success: boolean; id?: string }>;
    updateProduct: (id: string, updates: Updates<Product>) => Promise<{ success: boolean }>;
    deleteProduct: (id: string) => Promise<{ success: boolean }>;

    // Customers
    getCustomers: (storeId: string, companyId: string) => Promise<Customer[]>;
    addCustomer: (customer: Customer) => Promise<{ success: boolean; id?: string }>;
    updateCustomer: (id: string, updates: Updates<Customer>) => Promise<{ success: boolean }>;
    deleteCustomer: (id: string) => Promise<{ success: boolean }>;
    bulkDeleteCustomers: (ids: string[]) => Promise<{ success: boolean; count: number }>;

    // Sales
    getSales: (storeId: string, companyId: string) => Promise<Sale[]>;
    addSale: (sale: Omit<Sale, "id" | "invoiceNumber">) => Promise<string>;
    deleteSale: (id: string) => Promise<void>;
    updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;

    // Quotations
    getQuotations: (storeId: string, companyId: string) => Promise<Quotation[]>;
    addQuotation: (quotation: Quotation) => Promise<{ success: boolean; id?: string; quotationNumber?: string }>;
    updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<{ success: boolean }>;
    deleteQuotation: (id: string) => Promise<void>;
    getTrashQuotations: (companyId: string) => Promise<Quotation[]>;
    restoreQuotation: (id: string) => Promise<{ success: boolean }>;

    // Purchases
    getPurchases: (storeId: string, companyId: string) => Promise<Purchase[]>;
    addPurchase: (purchase: Purchase) => Promise<void>;
    deletePurchase: (id: string) => Promise<void>;

    // Transactions
    getTransactions: (storeId: string, companyId: string) => Promise<Transaction[]>;
    addTransaction: (transaction: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;

    // Accounts
    getAccounts: (storeId: string, companyId: string) => Promise<Account[]>;
    addAccount: (account: Account) => Promise<Account>;
    updateAccount: (id: string, updates: Updates<Account>) => Promise<Account>;
    deleteAccount: (id: string) => Promise<boolean>;

    // Stores
    getStores: (companyId?: string) => Promise<Store[]>;
    addStore: (store: Store) => Promise<{ success: boolean; id?: string }>;
    addUserStore: (userId: string, storeId: string) => Promise<{ success: boolean }>;
    updateStore: (id: string, updates: Updates<Store>) => Promise<{ success: boolean }>;
    deleteStore: (id: string) => Promise<{ success: boolean }>;


    // Users
    getUsers: (companyId?: string) => Promise<User[]>;
    addUser: (user: User) => Promise<{ success: boolean; id?: string }>;
    updateUser: (id: string, updates: Updates<User>) => Promise<{ success: boolean }>;
    deleteUser: (id: string) => Promise<{ success: boolean }>;

    // Auth & Security
    verifyPassword: (id: string, password: string) => Promise<boolean>;
    verifySupervisor: (code: string) => Promise<boolean>;

    // System
    manualBackup: () => Promise<{ success: boolean; path?: string; error?: string }>;
    updateSecondaryDisplay: (data: unknown) => void;
    handleBarcodeScan: (barcode: string, mode: 'IN' | 'OUT', storeId: string) => Promise<BarcodeResponse>;
    getVersion: () => Promise<string>;
    log: (message: string) => void;

    // Sync
    getDirtyData: () => Promise<{ deviceId: string, timestamp: string, payload: Record<string, unknown[]>, totalCount: number } | null>;
    markAsSynced: (confirmedIds: Record<string, string[]>) => Promise<{ success: boolean; error?: string }>;
    markAsUnsynced: (idsToReset: Record<string, string[]>) => Promise<{ success: boolean; error?: string }>;
    getLastPullTimestamp: () => Promise<string | null>;
    applyCloudUpdates: (data: { updates: Record<string, unknown[]>, serverTime: string }) => Promise<{ success: boolean; error?: string }>;
    onSyncTrigger: (callback: () => void) => void;

    // Advanced Features
    processStockTransfer: (transfer: StockTransfer) => Promise<{ success: boolean }>;
    getStockTransfers: (storeId: string, companyId: string) => Promise<StockTransfer[]>;
    getCustomerLedger: (customerId: string, companyId: string) => Promise<unknown[]>;
    getPurchaseOrders: (storeId: string, companyId: string) => Promise<PurchaseOrder[]>;
    getPurchaseOrderById: (id: string) => Promise<PurchaseOrder | null>;
    addPurchaseOrder: (po: PurchaseOrder) => Promise<{ success: boolean }>;
    updatePurchaseOrder: (id: string, updates: Updates<PurchaseOrder>, companyId: string) => Promise<{ success: boolean }>;
    deletePurchaseOrder: (id: string, companyId: string) => Promise<{ success: boolean }>;
    receivePurchaseOrder: (id: string, companyId: string) => Promise<{ success: boolean }>;
    getExpenseCategories: (companyId: string) => Promise<ExpenseCategory[]>;
    addExpenseCategory: (cat: ExpenseCategory) => Promise<{ success: boolean }>;
    getTaxSlabs: (companyId: string) => Promise<TaxSlab[]>;
    addTaxSlab: (slab: TaxSlab) => Promise<{ success: boolean }>;
    getCommissions: (storeId: string, companyId: string) => Promise<Commission[]>;
    getLoyaltyPoints: (customerId: string, companyId: string) => Promise<LoyaltyPoint[]>;
    generateBarcode: (sku: string) => Promise<string>;
    processExcelUpload: (rows: InventoryRow[], storeId: string) => Promise<ExcelUploadSummary>;

    // AI Features
    askAI: (query: string, contextData: Record<string, unknown>) => Promise<string>;
    getInventoryForecast: (products: Product[], sales: Sale[]) => Promise<string>;
    processInvoiceOCR: (imageBase64: string, products: Product[]) => Promise<{
        supplier: string;
        date: string;
        totalAmount: number;
        items: Array<{ name: string; quantity: number; price: number; productId?: string }>;
    }>;
    optimizeReorder: (products: Product[], sales: Sale[]) => Promise<Record<string, { minStock: number; reorderQuantity: number }>>;
    suggestCategory: (productName: string) => Promise<{ category?: string; brand?: string; unit?: string } | null>;

    // Item Kits
    getItemKits: (storeId: string, companyId: string) => Promise<ItemKit[]>;
    addItemKit: (kit: ItemKit) => Promise<{ success: boolean }>;
    updateItemKit: (id: string, updates: Updates<ItemKit>) => Promise<{ success: boolean }>;
    deleteItemKit: (id: string) => Promise<{ success: boolean }>;

    // Custom Fields
    getCustomFields: (companyId: string) => Promise<CustomField[]>;
    addCustomField: (field: CustomField) => Promise<{ success: boolean }>;
    updateCustomField: (id: string, updates: Updates<CustomField>, companyId: string) => Promise<{ success: boolean }>;
    deleteCustomField: (id: string, companyId: string) => Promise<{ success: boolean }>;
    getProductCustomValues: (productId: string) => Promise<ProductCustomValue[]>;
    getAllProductCustomValues: () => Promise<ProductCustomValue[]>;
    updateProductCustomValues: (productId: string, values: ProductCustomValue[]) => Promise<{ success: boolean }>;
    getCustomerCustomValues: (customerId: string) => Promise<CustomerCustomValue[]>;
    getAllCustomerCustomValues: () => Promise<CustomerCustomValue[]>;
    updateCustomerCustomValues: (customerId: string, values: CustomerCustomValue[]) => Promise<{ success: boolean }>;

    // Bulk Actions
    bulkDeleteProducts: (ids: string[]) => Promise<{ success: boolean }>;
    bulkUpdateProducts: (ids: string[], updates: Updates<Product>) => Promise<{ success: boolean }>;

    // Data Reset
    clearLocalData: (storeId: string) => Promise<boolean>;

    // Suppliers
    getSuppliers: (storeId: string, companyId: string) => Promise<Supplier[]>;
    addSupplier: (supplier: Supplier) => Promise<{ success: boolean }>;
    updateSupplier: (id: string, updates: Updates<Supplier>) => Promise<{ success: boolean }>;
    deleteSupplier: (id: string) => Promise<{ success: boolean }>;
    getSupplierTransactions: (supplierId: string) => Promise<SupplierTransaction[]>;
    addSupplierTransaction: (tx: SupplierTransaction) => Promise<{ success: boolean }>;
    getSupplierCustomFields: (storeId: string, companyId: string) => Promise<SupplierCustomField[]>;
    addSupplierCustomField: (field: SupplierCustomField) => Promise<{ success: boolean }>;
    getSupplierCustomValues: (supplierId: string) => Promise<SupplierCustomValue[]>;
    saveSupplierCustomValue: (val: SupplierCustomValue) => Promise<{ success: boolean }>;
    getSupplierLedger: (supplierId: string) => Promise<SupplierTransaction[]>;
    getPaymentTerms: (storeId: string, companyId: string) => Promise<PaymentTerm[]>;
    addPaymentTerm: (term: PaymentTerm) => Promise<{ success: boolean }>;
    getSupplierDocuments: (supplierId: string) => Promise<SupplierDocument[]>;
    addSupplierDocument: (doc: SupplierDocument) => Promise<{ success: boolean }>;

    // Receiving
    getReceivings: (storeId: string, companyId: string) => Promise<Receiving[]>;
    getReceivingById: (id: string) => Promise<Receiving | null>;
    suspendReceiving: (id: string) => Promise<{ success: boolean }>;
    addReceiving: (receiving: Receiving) => Promise<{ success: boolean }>;
    updateReceiving: (id: string, updates: Updates<Receiving>) => Promise<{ success: boolean }>;
    completeReceiving: (data: { id: string, accountId?: string, amountPaid: number }) => Promise<{ success: boolean }>;
    addReceivingPayment: (data: { id: string, amount: number, accountId: string }) => Promise<{ success: boolean }>;
    deleteReceiving: (id: string) => Promise<{ success: boolean }>;

    // Delivery & Logistics
    getDeliveries: (storeId: string, companyId: string) => Promise<Delivery[]>;
    updateDelivery: (id: string, updates: Updates<Delivery>) => Promise<{ success: boolean }>;
    getDeliveryZones: (storeId: string, companyId: string) => Promise<DeliveryZone[]>;
    addDeliveryZone: (zone: DeliveryZone) => Promise<{ success: boolean }>;
    updateDeliveryZone: (id: string, updates: Updates<DeliveryZone>) => Promise<{ success: boolean }>;
    deleteDeliveryZone: (id: string) => Promise<{ success: boolean }>;

    // Categories
    getCategories: (storeId: string, companyId: string) => Promise<Category[]>;
    addCategory: (category: Category) => Promise<{ success: boolean; id?: string }>;
    updateCategory: (id: string, updates: Updates<Category>) => Promise<{ success: boolean }>;
    deleteCategory: (id: string) => Promise<{ success: boolean }>;

    // More Sales Features
    getGiftCards: (storeId: string, companyId: string) => Promise<GiftCard[]>;
    addGiftCard: (gc: GiftCard) => Promise<{ success: boolean }>;
    updateGiftCard: (id: string, updates: Updates<GiftCard>) => Promise<{ success: boolean }>;
    getWorkOrders: (storeId: string, companyId: string) => Promise<WorkOrder[]>;
    updateWorkOrder: (id: string, updates: Updates<WorkOrder>) => Promise<{ success: boolean }>;

    // Printing & POS UI
    printReceipt: (html: string) => Promise<{ success: boolean; error?: string }>;
    generatePDF: (html: string, filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    openSecondaryDisplay: () => Promise<{ success: boolean; error?: string }>;
    onCustomerDisplayData: (callback: (data: unknown) => void) => void;

    // HR Methods
    checkIn: (employeeId: string, storeId: string, companyId?: string) => Promise<{ success: boolean; checkInTime: string; status: string }>;
    checkOut: (employeeId: string) => Promise<{ success: boolean; checkOutTime: string }>;
    getAttendance: (employeeId?: string, startDate?: string, endDate?: string) => Promise<HRAttendance[]>;
    applyLeave: (leave: Omit<HRLeave, 'id' | 'status'> & { employeeId: string; storeId: string }) => Promise<{ success: boolean; id: string }>;
    getLeaves: (storeId: string, companyId?: string, employeeId?: string) => Promise<HRLeave[]>;
    updateLeaveStatus: (id: string, status: string) => Promise<boolean>;
    analyzeAttendance: (attendanceData: HRAttendance[], leaveData: HRLeave[]) => Promise<{ employees: RiskEmployee[]; summary: string }>;
    analyzePerformance: (storeId: string, companyId: string) => Promise<{ topPerformers: Array<{ name: string; reason: string; score: string | number }>; riskAlerts: Array<{ name: string; riskLevel: string; reason: string }> }>;
    getEmployees: (storeId: string, companyId: string) => Promise<Employee[]>;
    addEmployee: (employee: Omit<User, 'id'> & Omit<Employee, 'id' | 'userId'>) => Promise<Employee>;
    updateEmployee: (id: string, updates: Partial<Employee> & { user?: Partial<User> }) => Promise<Employee>;
    deleteEmployee: (id: string) => Promise<{ success: boolean }>;
    saveHRDocument: (sourcePath: string, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>;
    openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    selectFile: () => Promise<{ success: boolean; path?: string; name?: string; size?: number; type?: string; error?: string }>;
    getPayroll: (storeId: string, companyId?: string, employeeId?: string) => Promise<HRPayroll[]>;
    addPayroll: (payroll: HRPayroll) => Promise<void>;
    updatePayrollStatus: (id: string, status: string) => Promise<{ success: boolean }>;
    getLeaveBalances: (employeeId: string, companyId?: string) => Promise<Array<{ leaveType: string; balance: number }>>;
    setLeaveBalance: (data: { employeeId: string; companyId: string; leaveType: string; balance: number; storeId: string }) => Promise<{ success: boolean }>;
    getShifts: (storeId: string, startDate?: string, endDate?: string, employeeId?: string, companyId?: string) => Promise<unknown[]>;
    assignShift: (shift: Record<string, unknown>) => Promise<{ success: boolean }>;
    getCandidates: (storeId: string, companyId: string) => Promise<HiringCandidate[]>;
    addCandidate: (candidate: HiringCandidate & { resumeText?: string }) => Promise<{ success: boolean }>;
    updateCandidateStatus: (id: string, status: string) => Promise<{ success: boolean }>;
    parseResume: (resumeText: string) => Promise<{ name?: string; email?: string; phone?: string; skills?: string | string[]; score?: number }>;

    // Store Configuration
    getStoreConfig: (storeId: string) => Promise<Record<string, unknown> | null>;
    saveStoreConfig: (storeId: string, configData: Record<string, unknown>) => Promise<{ success: boolean } | null>;

    // Invoices
    getInvoices: (storeId: string, companyId: string) => Promise<Invoice[]>;
    getInvoiceById: (id: string) => Promise<Invoice | null>;
    createInvoice: (invoice: Invoice) => Promise<{ success: boolean }>;
    updateInvoice: (id: string, updates: Updates<Invoice>) => Promise<{ success: boolean }>;
    deleteInvoice: (id: string) => Promise<{ success: boolean }>;

    // Cheques
    getCheques: (storeId: string, companyId: string) => Promise<Cheque[]>;
    addCheque: (cheque: Cheque) => Promise<{ success: boolean; id?: string }>;
    updateCheque: (id: string, updates: Updates<Cheque>) => Promise<{ success: boolean }>;
    deleteCheque: (id: string) => Promise<boolean>;

    // Reports
    getReport: (type: string, storeId: string, dateFrom?: string, dateTo?: string, companyId?: string) => Promise<Record<string, unknown>[]>;
    
    // Permissions
    getPermissions: (userId: string) => Promise<UserPermission | null>;
    updatePermissions: (userId: string, permissions: PermissionSet) => Promise<UserPermission | null>;
    clearTenantData: (forceHardPurge?: boolean) => Promise<{ success: boolean; error?: string }>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
