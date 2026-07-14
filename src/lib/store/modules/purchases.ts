import { StoreSlice, PurchasesState, Purchase, PurchaseOrder, Supplier, SupplierTransaction, SupplierCustomField, SupplierCustomValue, SupplierDocument, PaymentTerm, Receiving } from '../types';
import { dbAdapter } from '../../db-adapter';
import { isElectron } from '../../electron-helper';
import { generateId, generateInvoice } from '../../utils';
import { initialPurchases } from '../initial-data';

export const createPurchasesSlice: StoreSlice<PurchasesState> = (set, get) => ({
  purchases: initialPurchases,
  purchaseOrders: [],
  suppliers: [],
  supplierTransactions: [],
  supplierCustomFields: [],
  supplierCustomValues: [],
  paymentTerms: [],
  supplierDocuments: {},
  receivings: [],

  addPurchase: async (purchaseData) => {
    const existingPurchase = purchaseData as Partial<Purchase>;
    const invoiceNumber = existingPurchase.invoiceNumber || generateInvoice('PUR');
    const newPurchase = {
      companyId: get().currentUser?.companyId,
      ...purchaseData,
      id: generateId(),
      invoiceNumber,
      updatedAt: new Date().toISOString()
    } as Purchase;

    try {
      if (window.electronAPI) {
        await window.electronAPI.addPurchase?.(newPurchase);
      }
    } catch (error) {
      console.error("Failed to process purchase transaction:", error);
      throw new Error((error as Error).message || "Purchase transaction failed");
    }

    set((state) => {
      const updatedProducts = state.products.map(p => {
        const item = purchaseData.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, quantity: p.quantity + item.quantity };
        }
        return p;
      });

      return {
        purchases: [newPurchase, ...state.purchases],
        products: updatedProducts,
        accounts: purchaseData.accountId ? state.accounts.map(a =>
          a.id === purchaseData.accountId
            ? { ...a, balance: a.balance - purchaseData.totalAmount }
            : a
        ) : state.accounts
      } as any;
    });
  },

  deletePurchase: (id) => {
    set((state) => ({
      purchases: state.purchases.filter(p => p.id !== id)
    }));
    dbAdapter.deletePurchase?.(id);
  },

  addPurchaseOrder: async (poData) => {
    if (!isElectron()) return;
    const po = { 
      ...poData, 
      id: generateId('po'),
      companyId: get().currentUser?.companyId,
      updatedAt: new Date().toISOString()
    } as PurchaseOrder;
    await dbAdapter.addPurchaseOrder?.(po);
    await (get() as any).loadFromDatabase();
  },

  updatePurchaseOrder: async (id, updates) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    if (!companyId) return;
    await dbAdapter.updatePurchaseOrder?.(id, updates, companyId);
    await (get() as any).loadFromDatabase();
  },

  deletePurchaseOrder: async (id) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    if (!companyId) return;
    await dbAdapter.deletePurchaseOrder?.(id, companyId);
    await (get() as any).loadFromDatabase();
  },

  receivePurchaseOrder: async (id) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    if (!companyId) return;
    await dbAdapter.receivePurchaseOrder?.(id, companyId);
    await (get() as any).loadFromDatabase();
  },

  addSupplier: async (supplierData) => {
    const id = generateId('sup');
    const newSupplier = {
      companyId: get().currentUser?.companyId,
      ...supplierData,
      id,
      currentBalance: supplierData.openingBalance || 0,
      isDeleted: false,
      updatedAt: new Date().toISOString()
    } as Supplier;

    await dbAdapter.addSupplier?.(newSupplier);
    await (get() as any).loadFromDatabase();
  },

  updateSupplier: async (id, updates) => {
    await dbAdapter.updateSupplier?.(id, updates);
    await (get() as any).loadFromDatabase();
  },

  deleteSupplier: async (id) => {
    await dbAdapter.deleteSupplier?.(id);
    await (get() as any).loadFromDatabase();
  },

  getSupplierLedger: async (supplierId) => await dbAdapter.getSupplierLedger?.(supplierId) || [],

  addSupplierTransaction: async (txData) => {
    const id = generateId('stx');
    const newTx = {
      companyId: get().currentUser?.companyId,
      ...txData,
      id,
      createdAt: new Date().toISOString()
    } as SupplierTransaction;

    await dbAdapter.addSupplierTransaction?.(newTx);
    await (get() as any).loadFromDatabase();
  },

  addSupplierCustomField: async (fieldData) => {
    const id = generateId('scf');
    const newField = {
      companyId: get().currentUser?.companyId,
      ...fieldData,
      id,
      updatedAt: new Date().toISOString()
    } as SupplierCustomField;

    await dbAdapter.addSupplierCustomField?.(newField);
    await (get() as any).loadFromDatabase();
  },

  saveSupplierCustomValue: async (valData) => {
    const id = `scfv-${valData.supplierId}-${valData.fieldId}`;
    const newVal = {
      ...valData,
      id,
      updatedAt: new Date().toISOString()
    } as SupplierCustomValue;

    await dbAdapter.saveSupplierCustomValue?.(newVal);
  },

  getPaymentTerms: async () => {
    if (!get().paymentTerms.length) {
      await (get() as any).loadFromDatabase();
    }
    return get().paymentTerms;
  },

  addPaymentTerm: async (termData) => {
    const id = generateId('pt');
    const newTerm = {
      companyId: get().currentUser?.companyId,
      ...termData,
      id,
      storeId: get().activeStoreId,
      updatedAt: new Date().toISOString()
    } as PaymentTerm;
    await dbAdapter.addPaymentTerm?.(newTerm);
    await (get() as any).loadFromDatabase();
  },

  getSupplierDocuments: async (supplierId) => {
    const docs = await dbAdapter.getSupplierDocuments?.(supplierId) || [];
    set(state => ({
      supplierDocuments: {
        ...state.supplierDocuments,
        [supplierId]: docs
      }
    }));
    return docs;
  },

  addSupplierDocument: async (docData) => {
    const id = generateId('sdoc');
    const newDoc = {
      companyId: get().currentUser?.companyId,
      ...docData,
      id,
      storeId: get().activeStoreId,
      uploadedAt: new Date().toISOString()
    } as SupplierDocument;
    await dbAdapter.addSupplierDocument?.(newDoc);
    if (docData.supplierId) {
      await (get() as any).getSupplierDocuments(docData.supplierId);
    }
  },

  addReceiving: async (receivingData) => {
    const id = generateId('recv');
    const newReceiving = {
      ...receivingData,
      id,
      updatedAt: new Date().toISOString(),
      items: receivingData.items?.map(item => ({
        ...item,
        id: item.id && item.id !== '' ? item.id : generateId('ri'),
        receivingId: id
      }))
    } as Receiving;
    await dbAdapter.addReceiving?.(newReceiving);
    await (get() as any).loadFromDatabase();
  },

  updateReceiving: async (id, updates) => {
    await dbAdapter.updateReceiving?.(id, updates);
    await (get() as any).loadFromDatabase();
  },

  completeReceiving: async (id, amountPaid, accountId) => {
    await dbAdapter.completeReceiving?.({ id, accountId, amountPaid });
    await (get() as any).loadFromDatabase();
  },

  suspendReceiving: async (id) => {
    await dbAdapter.suspendReceiving?.(id);
    await (get() as any).loadFromDatabase();
  },

  deleteReceiving: async (id) => {
    await dbAdapter.deleteReceiving?.(id);
    await (get() as any).loadFromDatabase();
  },

  getReceivingById: async (id) => {
    return await dbAdapter.getReceivingById?.(id) || null;
  },

  getStorePurchases: () => get().purchases.filter(p => p.storeId === get().activeStoreId),
  getStoreSuppliers: () => get().suppliers,
});
