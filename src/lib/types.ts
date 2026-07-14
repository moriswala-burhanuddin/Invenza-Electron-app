// Shared ERP Types - Decoupled for Circular Dependency Fix
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
  avatar?: string;
  isDriver?: boolean;
  deviceId?: string;
  updatedAt?: string;
  employeeId?: string;
  password?: string;
  phone?: string;
  bio?: string;
  addressLine1?: string;
  address_line1?: string;
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
  companyId?: string;
  company_id?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  storeId: string;
  companyId?: string;
  company_id?: string;
  updatedAt: string;
  syncStatus?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  categoryId?: string;
  categoryName?: string;
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
  paymentMode: string;
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
  companyId?: string;
  company_id?: string;
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
  assignedTo?: string;
  storeId: string;
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
  assignedTo?: string;
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
  canSeeBuyingPrice: boolean;
  canSeeProfit: boolean;
  canEditProduct: boolean;
  canAddProduct: boolean;
  canChangeStock: boolean;
  canTransferStock: boolean;
  canSeePurchases: boolean;
  canSeeExpectedSales: boolean;
  canSeeDetailedPurchases: boolean;
  canSeeDetailedSales: boolean;
  canApplyDiscounts: boolean;
  canAccessAllInvoices: boolean;
  canManageCustomers: boolean;
  canSeeSuppliers: boolean;
  canSeeRevenueMetrics: boolean;
  canManageEmployees: boolean;
  canManagePayroll: boolean;
  canManageAttendance: boolean;
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
  companyId?: string;
  company_id?: string;
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
  documents?: string;
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
  options?: string;
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
  supplierName?: string;
  purchaseOrderId?: string;
  totalAmount: number;
  discountTotal: number;
  amountPaid: number;
  amountDue: number;
  accountId?: string;
  status: 'draft' | 'suspended' | 'completed' | 'returned';
  notes?: string;
  customFields?: string;
  storeId: string;
  deviceId?: string;
  completedAt?: string;
  updatedAt: string;
  items?: ReceivingItem[];
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
  storeId: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  totalAmount: number;
  status: 'pending' | 'received' | 'partially_received' | 'cancelled';
  date: string;
  storeId: string;
}

export interface Commission {
  id: string;
  employeeId: string;
  saleId: string;
  amount: number;
  date: string;
  storeId: string;
}

export interface LoyaltyPoint {
  id: string;
  customerId: string;
  points: number;
  type: 'earned' | 'redeemed';
  date: string;
}

export interface ProductCustomValue {
  productId: string;
  fieldId: string;
  value: string;
}

export interface CustomerCustomValue {
  customerId: string;
  fieldId: string;
  value: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  storeId: string;
}

export interface HRAttendance {
  id: string;
  employeeId: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  storeId: string;
}

export interface HRLeave {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason?: string;
  storeId: string;
}

export interface HRPayroll {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending';
  storeId: string;
}
