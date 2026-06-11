import { StateCreator } from 'zustand';
import { BarcodeResponse, InventoryRow, ExcelUploadSummary } from '../inventory-utils';

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

export interface Employee {
  id: string;
  userId: string;
  department: string;
  designation: string;
  salary: number;
  joiningDate: string;
  documents: string[];
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
  quotationId?: string;
  deviceId?: string;
  updatedAt?: string;
  workOrder?: Partial<WorkOrder>;
  delivery?: Partial<Delivery>;
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
  date: string;
  expiryDate?: string;
  status: 'active' | 'converted' | 'expired';
  notes?: string;
  storeId: string;
  customerId?: string;
  deviceId?: string;
  updatedAt?: string;
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
  category?: string;
  deviceId?: string;
  updatedAt?: string;
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplier: string;
  type: 'cash' | 'credit';
  items: SaleItem[];
  totalAmount: number;
  storeId: string;
  accountId: string;
  date: string;
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
  type: 'cash' | 'card' | 'wallet';
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
  totalAmount: number;
  status: 'draft' | 'sent' | 'received' | 'cancelled' | 'partially_received';
  storeId: string;
  date: string;
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
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  isActive: boolean;
  storeId: string;
  updatedAt: string;
}
