import { StateCreator } from 'zustand';
// ERP Demo Data - Hardware Store

import { persist } from 'zustand/middleware';
import { API_URL } from '../config';
import { useStoreConfig } from '../store-config';
import { BarcodeResponse, InventoryRow, ExcelUploadSummary, validateBarcode } from '../inventory-utils';
import { dbAdapter } from '../db-adapter';
import { isElectron } from '../electron-helper';
import { useState, useEffect } from "react";
import { generateId, generateInvoice } from '../utils';

// Types
type Updates<T> = Partial<T> & { id?: string };
export type Role = 'admin' | 'staff' | 'user' | 'hr_manager' | 'super_admin' | 'sales_manager' | 'inventory_manager' | 'accountant' | 'employee';

export interface User {
  id: string;
  name: string;  // Display name (first + last)
  email: string;
  username?: string;  // For Django compatibility
  firstName?: string;
  lastName?: string;
  role: Role;
  isStaff?: boolean;
  isActive?: boolean;
  storeId?: string;
  companyId?: string; // SECURE MULTI-TENANCY
  avatar?: string;
  isDriver?: boolean;
  deviceId?: string;
  updatedAt?: string;
  employeeId?: string;
  password?: string;
  // Professional Profile Fields
  phone?: string;
  bio?: string;
  addressLine1?: string;
  address_line1?: string; // Support for snake_case sync
  addressLine2?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface Store {
  id: string;
  name: string;
  branch: string;
  address: string;
  phone: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  companyId?: string;
  updatedAt: string;
  syncStatus?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  categoryId?: string; // Change from category: string
  categoryName?: string; // For display convenience
  sellingPrice: number;
  purchasePrice: number;
  quantity: number;
  storeId: string;
  lastUsed: string;
  unit?: string;
  brand?: string;
  updatedAt: string;
  barcode?: string;
  minStock?: number;
  reorderQuantity?: number;
  isKit?: boolean;
  limitedQty?: number;
  barcodeEnabled?: boolean;
}

export interface HRDocument {
  name: string;
  type: string;
  size: number;
  date: string;
  path?: string;
}

export interface Employee {
  id: string;
  userId: string;
  department: string;
  designation: string;
  salary: number;
  joiningDate: string;
  documents: HRDocument[];
  storeId: string;
  updatedAt?: string;
  user?: {
    name: string;
    email: string;
    role: string;
    isActive?: boolean;
    avatar?: string | null;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  area?: string;
  creditBalance: number;
  creditLimit?: number | null;
  totalPurchases: number;
  storeId: string;
  joinedAt: string;
  deviceId?: string;
  updatedAt?: string;
  source?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  purchasePrice?: number;
  gst?: number;
  gstAmount?: number;
  discountPct?: number;
  discountAmount?: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  paymentMode: 'cash' | 'card' | 'upi' | 'store_credit' | 'gift_card';
  amount: number;
  accountId: string;
  giftCardId?: string;
}

interface SyncResponse {
  status: string;
  updates?: Record<string, unknown[]>;
  server_time?: string;
  synced_ids?: Record<string, string[]>;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  status: 'completed' | 'suspended' | 'work_order' | 'delivery' | 'returned';
  type: string;
  source?: string;
  overrideStock?: boolean;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  profit: number;
  paymentMode: string; // Legacy
  payments?: SalePayment[];
  accountId: string;
  customerId?: string;
  storeId: string;
  date: string;
  originalAmount?: number;
  originalCurrency?: string;
  quotationId?: string;
  deviceId?: string;
  updatedAt?: string;
  workOrder?: Partial<WorkOrder>;
  delivery?: Partial<Delivery>;
  company_id?: string;
  companyId?: string;
}

export interface GiftCard {
  id: string;
  cardNumber: string;
  value: number;
  balance: number;
  isActive: boolean;
  customerId?: string;
  storeId: string;
  updatedAt: string;
}

export interface WorkOrder {
  id: string;
  saleId: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  assignedTo?: string; // Employee Name or ID
  storeId: string;
  companyId?: string;
  updatedAt: string;
}

export interface Cheque {
  id: string;
  partyType: 'supplier' | 'customer';
  partyId: string;
  partyName: string;
  chequeNumber: string;
  bankName: string;
  amount: number;
  issueDate: string;
  clearingDate?: string | null;
  originalAmount?: number;
  originalCurrency?: string;
  status: 'pending' | 'cleared' | 'bounced' | 'cancelled';
  storeId: string;
  notes?: string;
  deviceId?: string;
  updatedAt?: string;
  syncStatus?: number;
}

export interface Delivery {
  id: string;
  saleId: string;
  employeeId?: string;
  address: string;
  deliveryCharge: number;
  isCod: boolean;
  status: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'failed';
  deliveryType?: 'internal' | 'external';
  deliveryProvider?: string;
  trackingNumber?: string;
  assignedTo?: string; // Employee Name or ID
  deliveryDate?: string;
  storeId: string;
  notes?: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  revenue: number;
  todayRevenue: number;
  onlineRevenue: number;
  posRevenue: number;
  profit: number;
  todayProfit: number;
  totalSales: number;
  inventoryValue: number;
  totalItems: number;
  lowStockCount: number;
  customerCount: number;
  recentSales: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    date: string;
    customerName: string;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    quantity: number;
    minStock: number;
    sku: string;
  }>;
}

export interface PermissionSet {
  // Inventory
  canSeeBuyingPrice: boolean;
  canSeeProfit: boolean;
  canEditProduct: boolean;
  canAddProduct: boolean;
  canChangeStock: boolean;
  canTransferStock: boolean;

  // Sales & Purchases
  canSeePurchases: boolean;
  canSeeExpectedSales: boolean;
  canSeeDetailedPurchases: boolean;
  canSeeDetailedSales: boolean;
  canApplyDiscounts: boolean;
  canAccessAllInvoices: boolean;
  canManageCustomers: boolean;

  // Suppliers
  canSeeSuppliers: boolean;

  // Dashboard
  canSeeRevenueMetrics: boolean;

  // HR
  canManageEmployees: boolean;
  canManagePayroll: boolean;
  canManageAttendance: boolean;

  // Finance & Accounts
  canManageLedger: boolean;
  canManageCommissions: boolean;
  canManageCheques: boolean;
  canManageTaxes: boolean;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissions: PermissionSet;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  totalAmount: number;
  originalAmount?: number;
  originalCurrency?: string;
  date: string;
  expiryDate?: string;
  status: 'active' | 'converted' | 'expired' | 'cancelled';
  notes?: string;
  storeId: string;
  customerId?: string;
  deviceId?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  company_id?: string;
  companyId?: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'sale_return' | 'purchase' | 'expense' | 'cash_in' | 'cash_out';
  amount: number;
  description: string;
  customerId?: string;
  customerName?: string;
  storeId: string;
  accountId: string;
  date: string;
  referenceId?: string;
  expenseCategoryId?: string;
  originalAmount?: number;
  originalCurrency?: string;
  deviceId?: string;
  updatedAt?: string;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplier: string;
  supplierId?: string;
  type: 'cash' | 'credit';
  items: SaleItem[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount: number;
  storeId: string;
  accountId: string;
  date: string;
  originalAmount?: number;
  originalCurrency?: string;
  deviceId?: string;
  updatedAt?: string;
}

export interface PaymentTerm {
  id: string;
  name: string;
  days: number;
  storeId: string;
  updatedAt: string;
}

export interface SupplierDocument {
  id: string;
  supplierId: string;
  name: string;
  filePath: string;
  fileType?: string;
  uploadedAt: string;
  storeId: string;
}

export interface Supplier {
  id: string;
  supplierCode?: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  accountNumber?: string;
  openingBalance: number;
  paymentTermId?: string;
  creditLimit: number;
  taxNumber?: string;
  currency: string;
  currentBalance: number;
  internalNotes?: string;
  comments?: string;
  logo?: string;
  documents?: string; // JSON string (legacy or fallback)
  status: 'active' | 'disabled';
  rating: number;
  isPreferred: boolean;
  isBlacklisted: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  storeId: string;
  deviceId?: string;
  updatedAt: string;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: 'purchase' | 'payment' | 'credit_note' | 'opening_balance';
  amount: number;
  balanceAfter: number;
  date: string;
  referenceId?: string;
  description?: string;
  storeId: string;
  deviceId?: string;
  createdAt: string;
}

export interface SupplierCustomField {
  id: string;
  name: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown';
  isRequired: boolean;
  showOnReceipt: boolean;
  hideLabel: boolean;
  options?: string; // JSON string
  storeId: string;
  updatedAt: string;
}

export interface SupplierCustomValue {
  id: string;
  supplierId: string;
  fieldId: string;
  value: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'wallet' | 'bank' | 'savings' | 'credit';
  balance: number;
  storeId: string;
}

export interface ReceivingItem {
  id?: string;
  receivingId?: string;
  productId: string;
  productName: string;
  cost: number;
  quantity: number;
  discountPct: number;
  total: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
  location?: string;
  sellingPrice?: number;
  upc?: string;
  description?: string;
  storeId: string;
  updatedAt?: string;
}

export interface Receiving {
  id: string;
  receivingNumber: string;
  supplierId: string;
  supplierName?: string; // Loaded via join
  purchaseOrderId?: string;
  totalAmount: number;
  discountTotal: number;
  amountPaid: number;
  amountDue: number;
  accountId?: string;
  status: 'draft' | 'suspended' | 'completed' | 'returned';
  notes?: string;
  customFields?: string; // JSON string
  storeId: string;
  originalAmount?: number;
  originalCurrency?: string;
  deviceId?: string;
  completedAt?: string;
  updatedAt: string;
  items?: ReceivingItem[]; // Nested items
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string;
  productName?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  storeId: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'customer' | 'supplier';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  customerId?: string;
  supplierId?: string;
  customerName?: string;
  supplierName?: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  storeId: string;
  updatedAt: string;
  items?: InvoiceItem[];
}


export interface TaxSlab {
  id: string;
  companyId?: string;
  storeId?: string;
  name: string;
  percentage: number;
}

export interface StockTransfer {
  id: string;
  productId: string;
  fromStoreId: string;
  toStoreId: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  transferredAt?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  parentId?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber?: string;
  supplierId?: string;
  supplier: string;
  items: SaleItem[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'received' | 'cancelled' | 'partially_received';
  storeId: string;
  date: string;
  expectedDeliveryDate?: string;
  notes?: string;
  updatedAt?: string;
  companyId?: string;
}

export interface Commission {
  id: string;
  userId: string;
  saleId: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'paid';
}

export interface LoyaltyPoint {
  id: string;
  customerId: string;
  points: number;
  reason: string;
  saleId?: string;
}

export interface KitItem {
  productId: string;
  quantity: number;
}

export interface ItemKit {
  id: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  storeId: string;
  isActive: boolean;
  items: KitItem[];
  updatedAt: string;
  priceMode?: 'auto' | 'manual';
  displayMode?: 'single' | 'expanded';
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // Parsed from JSON
  isRequired: boolean;
  showOnReceipt: boolean;
  targetType: 'product' | 'client';
  defaultValue?: string;
  updatedAt: string;
}

export interface ProductCustomValue {
  id: string;
  productId: string;
  fieldId: string;
  value: string;
}

export interface CustomerCustomValue {
  id: string;
  customerId: string;
  fieldId: string;
  value: string;
}

// HR Specific Types
export interface HRAttendance {
  id: string;
  employeeId: string;
  name: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
}

export interface HRLeave {
  id: string;
  employeeId: string;
  type: 'sick' | 'casual' | 'earned' | 'unpaid';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface HRPayroll {
  id: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'paid';
}

export interface HRPerformance {
  id: string;
  employeeId: string;
  reviewDate: string;
  rating: number;
  feedback: string;
  reviewerId: string;
}
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  storeId: string;
  companyId?: string;
  company_id?: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  isActive: boolean;
  storeId: string;
  updatedAt: string;
  companyId?: string;
  company_id?: string;
}

// --- Slice Interfaces ---

export interface CoreState {
  currentUser: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  activeStoreId: string;
  isInitialLoading: boolean;
  users: User[];
  stores: Store[];
  customers: Customer[];
  userPermissions: UserPermission[];
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setActiveStore: (storeId: string) => void;
  addStore: (store: Omit<Store, 'id'>) => Promise<void>;
  updateStore: (id: string, updates: Partial<Store>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'> & { id?: string }) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  bulkDeleteCustomers: (ids: string[]) => Promise<void>;
  mergeCustomers: (masterId: string, slaveIds: string[]) => Promise<void>;
  fetchPermissions: (userId?: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: PermissionSet) => Promise<void>;
  checkPermission: (permKey: keyof PermissionSet) => boolean;
  
  // Getters
  getActiveStore: () => Store | undefined;
  getStoreUsers: () => User[];
  getStoreCustomers: () => Customer[];
}

export interface InventoryState {
  products: Product[];
  categories: Category[];
  stockTransfers: StockTransfer[];
  itemKits: ItemKit[];
  customFields: CustomField[];
  productCustomValues: ProductCustomValue[];
  customerCustomValues: CustomerCustomValue[];
  
  // Actions
  processStockTransfer: (transfer: Omit<StockTransfer, 'id' | 'status'>) => Promise<void>;
  generateBarcode: (sku: string) => Promise<string>;
  addItemKit: (kit: Omit<ItemKit, 'id'>) => Promise<void>;
  updateItemKit: (id: string, updates: Partial<ItemKit>) => Promise<void>;
  deleteItemKit: (id: string) => Promise<void>;
  addCustomField: (field: Omit<CustomField, 'id'>) => Promise<void>;
  updateCustomField: (id: string, updates: Partial<CustomField>) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  getProductCustomValues: (productId: string) => Promise<ProductCustomValue[]>;
  updateProductCustomValues: (productId: string, values: Omit<ProductCustomValue, 'id' | 'productId'>[]) => Promise<void>;
  getCustomerCustomValues: (customerId: string) => Promise<CustomerCustomValue[]>;
  updateCustomerCustomValues: (customerId: string, values: Omit<CustomerCustomValue, 'id' | 'customerId'>[]) => Promise<void>;
  bulkDeleteProducts: (ids: string[]) => Promise<void>;
  bulkUpdateProducts: (ids: string[], updates: Partial<Product>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'updatedAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  handleBarcodeScan: (barcode: string, mode?: 'IN' | 'OUT') => Promise<BarcodeResponse>;
  processExcelUpload: (data: InventoryRow[]) => Promise<ExcelUploadSummary>;
  
  // Getters
  getStoreProducts: () => Product[];
  getStoreItemKits: () => ItemKit[];
}

export interface SalesState {
  sales: Sale[];
  quotations: Quotation[];
  giftCards: GiftCard[];
  workOrders: WorkOrder[];
  deliveries: Delivery[];
  deliveryZones: DeliveryZone[];
  deliveryPersonnel: User[];
  
  // Actions
  addSale: (sale: Omit<Sale, 'id' | 'invoiceNumber'>) => Promise<string>;
  resumeSale: (saleId: string) => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => void;
  addGiftCard: (gc: Omit<GiftCard, 'id' | 'updatedAt'>) => Promise<void>;
  updateGiftCard: (id: string, updates: Partial<GiftCard>) => Promise<void>;
  getGiftCardByNumber: (number: string) => GiftCard | undefined;
  addDeliveryZone: (zoneData: Partial<DeliveryZone>) => Promise<void>;
  updateDeliveryZone: (id: string, updates: Partial<DeliveryZone>) => Promise<void>;
  deleteDeliveryZone: (id: string) => Promise<void>;
  toggleDriverStatus: (userId: string, isDriver: boolean) => Promise<void>;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => Promise<void>;
  updateDelivery: (id: string, updates: Partial<Delivery>) => Promise<void>;
  addQuotation: (quotation: Omit<Quotation, 'id' | 'quotationNumber'>) => void;
  updateQuotation: (id: string, quotation: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  restoreQuotation: (id: string) => Promise<void>;
  convertQuotationToSale: (quotationId: string, saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'quotationId'>) => void;
  
  // Getters
  getStoreSales: () => Sale[];
  getStoreQuotations: () => Quotation[];
  getTrashQuotations: () => Quotation[];
}

export interface PurchasesState {
  purchases: Purchase[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  supplierTransactions: SupplierTransaction[];
  supplierCustomFields: SupplierCustomField[];
  supplierCustomValues: SupplierCustomValue[];
  paymentTerms: PaymentTerm[];
  supplierDocuments: Record<string, SupplierDocument[]>; // Map supplierId -> docs
  receivings: Receiving[];
  
  // Actions
  addPurchase: (purchase: Omit<Purchase, 'id' | 'invoiceNumber'>) => void;
  deletePurchase: (id: string) => void;
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => Promise<void>;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  receivePurchaseOrder: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'updatedAt' | 'currentBalance' | 'isDeleted'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  getSupplierLedger: (supplierId: string) => Promise<SupplierTransaction[]>;
  addSupplierTransaction: (tx: Omit<SupplierTransaction, 'id' | 'createdAt'>) => Promise<void>;
  addSupplierCustomField: (field: Omit<SupplierCustomField, 'id' | 'updatedAt'>) => Promise<void>;
  saveSupplierCustomValue: (val: Omit<SupplierCustomValue, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  getPaymentTerms: () => Promise<PaymentTerm[]>;
  addPaymentTerm: (term: Omit<PaymentTerm, 'id' | 'updatedAt' | 'storeId'>) => Promise<void>;
  getSupplierDocuments: (supplierId: string) => Promise<SupplierDocument[]>;
  addSupplierDocument: (doc: Omit<SupplierDocument, 'id' | 'uploadedAt' | 'storeId'>) => Promise<void>;
  addReceiving: (receiving: Omit<Receiving, 'id' | 'updatedAt'>) => Promise<void>;
  updateReceiving: (id: string, updates: Partial<Receiving>) => Promise<void>;
  completeReceiving: (id: string, amountPaid: number, accountId?: string) => Promise<void>;
  suspendReceiving: (id: string) => Promise<void>;
  deleteReceiving: (id: string) => Promise<void>;
  getReceivingById: (id: string) => Promise<Receiving | null>;
  
  // Getters
  getStorePurchases: () => Purchase[];
  getStoreSuppliers: () => Supplier[];
}

export interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  expenseCategories: ExpenseCategory[];
  taxSlabs: TaxSlab[];
  invoices: Invoice[];
  cheques: Cheque[];
  commissions: Commission[];
  loyaltyPoints: LoyaltyPoint[];
  
  // Actions
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (id: string, updates: Updates<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<boolean>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  fetchInvoices: () => Promise<void>;
  getInvoiceById: (id: string) => Promise<Invoice | null>;
  createInvoice: (invoice: Omit<Invoice, 'id' | 'updatedAt'>) => Promise<void>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  fetchCheques: () => Promise<void>;
  addCheque: (cheque: Omit<Cheque, 'id' | 'updatedAt' | 'storeId' | 'status'>) => Promise<void>;
  updateChequeStatus: (id: string, status: Cheque['status'], clearingDate?: string) => Promise<void>;
  deleteCheque: (id: string) => Promise<void>;
  addExpenseCategory: (cat: Omit<ExpenseCategory, 'id'>) => Promise<void>;
  addTaxSlab: (slab: Omit<TaxSlab, 'id'>) => Promise<void>;
  deleteTaxSlab: (id: string) => Promise<void>;
  
  // Getters
  getStoreTransactions: () => Transaction[];
  getStoreAccounts: () => Account[];
  getAccountTransactions: (accountId: string) => Transaction[];
}

export interface HRState {
  employees: Employee[];
  hrAttendance: HRAttendance[];
  hrLeaves: HRLeave[];
  hrPayroll: HRPayroll[];
  hrPerformance: HRPerformance[];
  
  // Actions
  checkIn: () => Promise<{ success: boolean; message?: string }>;
  checkOut: () => Promise<{ success: boolean; message?: string }>;
  fetchAttendance: (startDate?: string, endDate?: string) => Promise<void>;
  applyLeave: (leave: Omit<HRLeave, 'id' | 'status'>) => Promise<void>;
  fetchLeaves: () => Promise<void>;
  updateLeaveStatus: (id: string, status: HRLeave['status']) => Promise<void>;
  fetchPayroll: () => Promise<void>;
  addPayroll: (payroll: Omit<HRPayroll, 'id'>) => Promise<void>;
  updatePayrollStatus: (id: string, status: string) => Promise<void>;
  getLeaveBalances: (employeeId: string) => Promise<Array<{ leaveType: string; balance: number }>>;
  setLeaveBalance: (employeeId: string, leaveType: string, balance: number, year: number) => Promise<void>;
  addEmployee: (employee: Omit<User, 'id'> & Omit<Employee, 'id' | 'userId'>) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee> & { user?: Partial<User> }) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
}

export interface SystemState {
  isSyncing: boolean;
  syncError: string | null;
  testModeEnabled: boolean;
  activityLogs: ActivityLog[];
  
  // Actions
  toggleTestMode: () => void;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'storeId'>) => void;
  syncData: () => Promise<'success' | 'error' | 'already_syncing' | 'no_token' | 'not_electron' | 'bypass_mode'>;
  resetSyncStatus: () => void;
  loadFromDatabase: () => Promise<void>;
  clearLocalData: () => Promise<void>;
}

export interface ERPState extends CoreState, InventoryState, SalesState, PurchasesState, FinanceState, HRState, SystemState {}

export type StoreSlice<T> = StateCreator<ERPState, [['zustand/persist', unknown]], [], T>;