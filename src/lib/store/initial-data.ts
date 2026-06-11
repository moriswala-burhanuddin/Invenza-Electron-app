import { Store, User, Product, Customer, Account, Sale, Transaction, Purchase } from './types';

// Initial Demo Data
const initialStores: Store[] = [
  { id: 'store-1', name: 'Hardware Central', branch: 'Main Branch', address: '123 Industrial Ave', phone: '+1 555-0100' },
  { id: 'store-2', name: 'Hardware Central', branch: 'East Side', address: '456 Commerce St', phone: '+1 555-0200' },
];

const initialUsers: User[] = [
  { id: 'user-1', name: 'Burhanuddin', email: 'admin@moriswala.com', role: 'admin', storeId: 'store-1' },
  { id: 'user-2', name: 'Sales Assistant', email: 'sales@moriswala.com', role: 'staff', storeId: 'store-1' },
  { id: 'user-3', name: 'John Delivery', email: 'john@moriswala.com', role: 'staff', storeId: 'store-1' },
  { id: 'user-4', name: 'Sarah Tech', email: 'sarah@moriswala.com', role: 'staff', storeId: 'store-1' },
  { id: 'user-5', name: 'Mike Sales', email: 'mike@hardware.com', role: 'staff', storeId: 'store-2' },
  { id: 'user-demo', name: 'Professional Demo', email: 'demo@invenza.app', password: 'demo123', role: 'super_admin', storeId: 'store-1' },
];

const initialProducts: Product[] = [
  { id: 'prod-1', name: 'Bosch GWS 900-100 Angle Grinder', sku: 'BSH-AG-900', categoryName: 'Power Tools', sellingPrice: 89.99, purchasePrice: 55.00, quantity: 24, storeId: 'store-1', lastUsed: '2024-01-15', unit: 'Pcs', brand: 'Bosch', updatedAt: '2024-01-10', barcode: '12345678', minStock: 10, reorderQuantity: 20 },
  { id: 'prod-2', name: 'Stanley Claw Hammer 16oz', sku: 'STY-CH-16', categoryName: 'Hand Tools', sellingPrice: 19.99, purchasePrice: 8.50, quantity: 56, storeId: 'store-1', lastUsed: '2024-01-14', unit: 'Pcs', brand: 'Stanley', updatedAt: '2023-12-05', barcode: '87654321', minStock: 15, reorderQuantity: 30 },
  { id: 'prod-3', name: 'Makita Circular Saw 7.25"', sku: 'MKT-CS-725', categoryName: 'Power Tools', sellingPrice: 129.99, purchasePrice: 85.00, quantity: 12, storeId: 'store-1', lastUsed: '2024-01-13', unit: 'Pcs', brand: 'Makita', updatedAt: '2023-11-20', minStock: 5, reorderQuantity: 10 },
  { id: 'prod-4', name: 'DeWalt 20V Max Drill Kit', sku: 'DWT-DK-20V', categoryName: 'Power Tools', sellingPrice: 159.99, purchasePrice: 110.00, quantity: 8, storeId: 'store-1', lastUsed: '2024-01-12', unit: 'Set', brand: 'DeWalt', updatedAt: '2024-01-02', minStock: 10, reorderQuantity: 15 },
  { id: 'prod-5', name: 'Hilti TE-30 Rotary Hammer', sku: 'HLT-RH-30', categoryName: 'Power Tools', sellingPrice: 450.00, purchasePrice: 320.00, quantity: 4, storeId: 'store-1', lastUsed: '2024-01-11', unit: 'Pcs', brand: 'Hilti', updatedAt: '2023-10-15', minStock: 2, reorderQuantity: 5 },
  { id: 'prod-6', name: 'Industrial PVC Pipe 2" x 10ft', sku: 'PVC-2-10', categoryName: 'Plumbing', sellingPrice: 12.99, purchasePrice: 5.50, quantity: 120, storeId: 'store-1', lastUsed: '2024-01-10', unit: 'Length', brand: 'Generic', updatedAt: '2024-01-08' },
  { id: 'prod-7', name: 'Philips LED Industrial Bulb 60W', sku: 'PHL-LED-60', categoryName: 'Electrical', sellingPrice: 15.99, purchasePrice: 7.00, quantity: 85, storeId: 'store-1', lastUsed: '2024-01-09', unit: 'Pack', brand: 'Philips', updatedAt: '2023-12-28' },
  { id: 'prod-8', name: '3M Protective Goggles', sku: '3M-SAF-GOG', categoryName: 'Safety', sellingPrice: 12.99, purchasePrice: 4.50, quantity: 65, storeId: 'store-1', lastUsed: '2024-01-08', unit: 'Pair', brand: '3M', updatedAt: '2023-11-12' },
  { id: 'prod-9', name: 'Heavy Duty Steel Bolts 10mm x 50mm (Box 100)', sku: 'FST-BOLT-10x50', categoryName: 'Fasteners', sellingPrice: 24.50, purchasePrice: 15.00, quantity: 200, storeId: 'store-1', lastUsed: '2024-01-15', unit: 'Box', brand: 'Generic', updatedAt: '2024-01-10' },
  { id: 'prod-10', name: 'Industrial Welding Gloves Leather', sku: 'SAF-GLV-WLD', categoryName: 'Safety', sellingPrice: 35.00, purchasePrice: 18.50, quantity: 45, storeId: 'store-1', lastUsed: '2024-01-14', unit: 'Pair', brand: 'SafeGuard', updatedAt: '2024-01-12' },
];

const initialCustomers: Customer[] = [
  { id: 'cust-1', name: 'ABC Construction', phone: '+1 555-1001', area: 'Downtown', creditBalance: 1250.00, totalPurchases: 8500.00, storeId: 'store-1', joinedAt: '2023-05-10' },
  { id: 'cust-2', name: 'Home Renovators Inc', phone: '+1 555-1002', area: 'Westside', creditBalance: 0, totalPurchases: 5200.00, storeId: 'store-1', joinedAt: '2023-06-15' },
  { id: 'cust-3', name: 'Quick Fix Plumbing', phone: '+1 555-1003', area: 'East End', creditBalance: 450.00, totalPurchases: 3200.00, storeId: 'store-1', joinedAt: '2023-08-20' },
];

const initialAccounts: Account[] = [
  { id: 'acc-1', name: 'Cash Register', type: 'cash', balance: 5420.50, storeId: 'store-1' },
  { id: 'acc-2', name: 'Card Terminal', type: 'card', balance: 12850.00, storeId: 'store-1' },
];

const initialSales: Sale[] = [
  { id: 'sale-1', invoiceNumber: 'INV-001', status: 'completed', type: 'cash', items: [{ productId: 'prod-1', productName: 'Bosch GWS 900-100', quantity: 2, price: 89.99 }], subtotal: 179.98, discountAmount: 0, taxAmount: 0, totalAmount: 179.98, profit: 69.98, paymentMode: 'cash', accountId: 'acc-1', storeId: 'store-1', date: '2024-01-15T10:30:00' },
  { id: 'sale-2', invoiceNumber: 'INV-002', status: 'completed', type: 'credit', items: [{ productId: 'prod-2', productName: 'Stanley Claw Hammer', quantity: 5, price: 19.99 }], subtotal: 99.95, discountAmount: 0, taxAmount: 0, totalAmount: 99.95, profit: 57.45, paymentMode: 'cash', accountId: 'acc-1', customerId: 'cust-1', storeId: 'store-1', date: '2024-01-15T11:45:00' },
  { id: 'sale-3', invoiceNumber: 'INV-003', status: 'completed', type: 'cash', items: [{ productId: 'prod-9', productName: 'Heavy Duty Steel Bolts', quantity: 10, price: 24.50 }], subtotal: 245.00, discountAmount: 0, taxAmount: 0, totalAmount: 245.00, profit: 95.00, paymentMode: 'card', accountId: 'acc-2', storeId: 'store-1', date: '2024-01-14T14:20:00' },
];

const initialTransactions: Transaction[] = [
  { id: 'trans-1', type: 'cash_in', amount: 500.00, description: 'Credit payment from ABC Construction', customerId: 'cust-1', customerName: 'ABC Construction', storeId: 'store-1', accountId: 'acc-1', date: '2024-01-15T09:00:00' },
  { id: 'trans-2', type: 'expense', amount: 150.00, description: 'Office supplies', storeId: 'store-1', accountId: 'acc-1', date: '2024-01-14T11:30:00' },
  { id: 'trans-3', type: 'cash_out', amount: 2000.00, description: 'Bank deposit', storeId: 'store-1', accountId: 'acc-1', date: '2024-01-13T17:00:00' },
  { id: 'trans-4', type: 'sale_return', amount: 19.99, description: 'Returned hammer - defective', storeId: 'store-1', accountId: 'acc-1', date: '2024-01-12T10:15:00' },
];

const initialPurchases: Purchase[] = [
  { id: 'purch-1', invoiceNumber: 'PO-001', supplier: 'Tool Distributors Inc', type: 'cash', items: [{ productId: 'prod-1', productName: 'Power Drill 18V', quantity: 20, price: 55.00 }], totalAmount: 1100.00, storeId: 'store-1', accountId: 'acc-1', date: '2024-01-10T08:00:00' },
  { id: 'purch-2', invoiceNumber: 'PO-002', supplier: 'FastenAll Supply', type: 'credit', items: [{ productId: 'prod-8', productName: 'Wood Screws Box 100ct', quantity: 100, price: 3.00 }], totalAmount: 300.00, storeId: 'store-1', accountId: 'acc-2', date: '2024-01-08T09:30:00' },
];

export { initialStores, initialUsers, initialProducts, initialCustomers, initialAccounts, initialSales, initialTransactions, initialPurchases };
