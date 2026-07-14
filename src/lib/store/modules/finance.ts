import { StoreSlice, FinanceState, ExpenseCategory, TaxSlab, Account, Transaction, Invoice, Cheque, Commission, PurchaseOrder } from '../types';
import { dbAdapter } from '../../db-adapter';
import { isElectron } from '../../electron-helper';
import { generateId, generateInvoice } from '../../utils';
import { initialAccounts, initialTransactions } from '../initial-data';

export const createFinanceSlice: StoreSlice<FinanceState> = (set, get) => ({
  accounts: initialAccounts,
  transactions: initialTransactions,
  expenseCategories: [],
  taxSlabs: [],
  invoices: [],
  cheques: [],
  commissions: [],
  loyaltyPoints: [],

  addExpenseCategory: async (catData) => {
    if (!isElectron()) return;
    const cat = { 
      ...catData, 
      id: `exp-cat-${Date.now()}`,
      companyId: get().currentUser?.companyId 
    } as ExpenseCategory;
    await dbAdapter.addExpenseCategory?.(cat);
    const expenseCategories = await dbAdapter.getExpenseCategories?.(get().currentUser?.companyId || '') as ExpenseCategory[];
    if (expenseCategories) set({ expenseCategories });
  },

  addTaxSlab: async (slabData) => {
    if (!isElectron()) return;
    const slab = { 
      ...slabData, 
      id: `tax-${Date.now()}`,
      companyId: get().currentUser?.companyId,
      storeId: get().activeStoreId
    } as TaxSlab;
    await dbAdapter.addTaxSlab?.(slab);
    const taxSlabs = await dbAdapter.getTaxSlabs?.(get().currentUser?.companyId || '') as TaxSlab[];
    if (taxSlabs) set({ taxSlabs });
  },

  deleteTaxSlab: async (id) => {
    if (!isElectron()) return;
    await dbAdapter.deleteTaxSlab?.(id);
    const taxSlabs = await dbAdapter.getTaxSlabs?.(get().currentUser?.companyId || '') as TaxSlab[];
    if (taxSlabs) set({ taxSlabs });
  },

  addAccount: async (accountData) => {
    const id = generateId('acc');
    const newAccount = {
      ...accountData,
      id,
      companyId: get().currentUser?.companyId,
      updatedAt: new Date().toISOString(),
    } as Account;
    set(state => ({ accounts: [...state.accounts, newAccount] }));
    if (isElectron()) await dbAdapter.addAccount?.(newAccount);
  },

  updateAccount: async (id, updates) => {
    set(state => ({
      accounts: state.accounts.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a)
    }));
    if (isElectron()) await dbAdapter.updateAccount?.(id, updates);
  },

  deleteAccount: async (id) => {
    try {
      if (isElectron()) {
        await dbAdapter.deleteAccount?.(id);
      }
      set(state => ({
        accounts: state.accounts.filter(a => a.id !== id)
      }));
      return true;
    } catch (error) {
      console.error('Delete account failed:', error);
      throw error;
    }
  },

  addTransaction: (transaction) => {
    const newTransaction = { ...transaction, id: generateId(), companyId: get().currentUser?.companyId, updatedAt: new Date().toISOString() } as Transaction;

    set((state) => {
      const updatedAccounts = state.accounts.map(a => {
        if (a.id === transaction.accountId) {
          const adjustment = transaction.type === 'cash_in' ? transaction.amount : -transaction.amount;
          return { ...a, balance: a.balance + adjustment };
        }
        return a;
      });

      const updatedCustomers = state.customers.map(c => {
        if (transaction.customerId === c.id && transaction.type === 'cash_in') {
          return { ...c, creditBalance: c.creditBalance - transaction.amount };
        }
        return c;
      });

      return {
        transactions: [...state.transactions, newTransaction],
        accounts: updatedAccounts,
        customers: updatedCustomers,
      };
    });

    dbAdapter.addTransaction?.(newTransaction);
  },

  fetchInvoices: async () => {
    if (!isElectron()) return;
    const commissions = await dbAdapter.getCommissions?.(get().activeStoreId, get().currentUser?.companyId || '') as Commission[];
    const invoices = await dbAdapter.getInvoices?.(get().activeStoreId) || [];
    set({ invoices, commissions });
  },

  getInvoiceById: async (id) => {
    if (!isElectron()) return get().invoices.find(i => i.id === id) || null;
    return await dbAdapter.getInvoiceById?.(id) || null;
  },

  createInvoice: async (invoiceData) => {
    const id = generateId('inv');
    const invoiceNumber = invoiceData.invoiceNumber || generateInvoice('INV');
    const newInvoice = {
      ...invoiceData,
      id,
      updatedAt: new Date().toISOString(),
      status: invoiceData.status || 'draft'
    } as Invoice;

    set((state) => ({ invoices: [newInvoice, ...state.invoices] }));

    if (isElectron()) {
      await dbAdapter.createInvoice?.(newInvoice);
      await (get() as any).fetchInvoices();
    }
  },

  updateInvoice: async (id, updates) => {
    set((state) => ({
      invoices: state.invoices.map(inv => inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv)
    }));

    if (isElectron()) {
      await dbAdapter.updateInvoice?.(id, updates);
      await (get() as any).fetchInvoices();
    }
  },

  deleteInvoice: async (id) => {
    set((state) => ({
      invoices: state.invoices.filter(inv => inv.id !== id)
    }));

    if (isElectron()) {
      await dbAdapter.deleteInvoice?.(id);
      await (get() as any).fetchInvoices();
    }
  },

  fetchCheques: async () => {
    const purchaseOrders = await dbAdapter.getPurchaseOrders?.(get().activeStoreId, get().currentUser?.companyId || '') as PurchaseOrder[];
    const data = await dbAdapter.getCheques?.(get().activeStoreId);
    if (data) set({ cheques: data as Cheque[], purchaseOrders });
  },

  addCheque: async (chequeData) => {
    const id = generateId('chq');
    const newCheque = {
      companyId: get().currentUser?.companyId,
      ...chequeData,
      id,
      storeId: get().activeStoreId,
      updatedAt: new Date().toISOString(),
      status: 'pending'
    } as Cheque;
    await dbAdapter.addCheque?.(newCheque);
    await (get() as any).fetchCheques();
  },

  updateChequeStatus: async (id, status, clearingDate) => {
    const updates: Partial<Cheque> = { status };
    if (clearingDate) updates.clearingDate = clearingDate;
    await dbAdapter.updateCheque?.(id, updates);
    await (get() as any).fetchCheques();
  },

  deleteCheque: async (id) => {
    await dbAdapter.deleteCheque?.(id);
    await (get() as any).fetchCheques();
  },

  getStoreTransactions: () => get().transactions.filter(t => t.storeId === get().activeStoreId),
  getStoreAccounts: () => get().accounts.filter(a => a.storeId === get().activeStoreId),
  getAccountTransactions: (accountId: string) => {
    const { transactions, sales, purchases, activeStoreId } = get();
    
    // 1. Regular transactions (Cash In/Out)
    const baseTxs = transactions.filter(t => t.accountId === accountId && t.storeId === activeStoreId);
    
    // 2. Map Sales to Transactions
    const saleTxs = sales
      .filter(s => s.storeId === activeStoreId && (s.accountId === accountId || s.payments?.some(p => p.accountId === accountId)))
      .map(s => ({
        id: s.id,
        type: 'sale',
        amount: s.totalAmount,
        description: `Sale Invoice #${s.invoiceNumber}`,
        customerId: s.customerId,
        storeId: s.storeId,
        accountId: accountId, // Already filtered to include this account
        date: s.date,
        referenceId: s.id,
        updatedAt: s.updatedAt
      }) as Transaction);

    // 3. Map Purchases to Transactions
    const purchaseTxs = purchases
      .filter(p => p.storeId === activeStoreId && p.accountId === accountId)
      .map(p => ({
        id: p.id,
        type: 'purchase',
        amount: p.totalAmount,
        description: `Purchase Invoice #${p.invoiceNumber} (${p.supplier})`,
        storeId: p.storeId,
        accountId: p.accountId,
        date: p.date,
        referenceId: p.id,
        updatedAt: p.updatedAt
      }) as Transaction);

    return [...baseTxs, ...saleTxs, ...purchaseTxs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
});
