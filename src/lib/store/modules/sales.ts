import { StoreSlice, SalesState, Sale, Quotation, GiftCard, WorkOrder, Delivery, DeliveryZone, ERPState } from '../types';
import { dbAdapter } from '../../db-adapter';
import { isElectron } from '../../electron-helper';
import { generateId, generateInvoice } from '../../utils';
import { initialSales } from '../initial-data';

export const createSalesSlice: StoreSlice<SalesState> = (set, get) => ({
  sales: initialSales,
  quotations: [],
  giftCards: [],
  workOrders: [],
  deliveries: [],
  deliveryZones: [],
  deliveryPersonnel: [],

  addSale: async (saleData: Omit<Sale, 'id' | 'invoiceNumber'>) => {
    const invoiceNumber = generateInvoice('INV');
    const newSale = {
      ...saleData,
      id: generateId(),
      invoiceNumber,
      companyId: get().currentUser?.companyId,
      updatedAt: new Date().toISOString()
    } as Sale;

    try {
      if (isElectron()) {
        await window.electronAPI.addSale?.(newSale);
      }
    } catch (error) {
      console.error("Failed to process sale transaction:", error);
      throw new Error((error as Error).message || "Sale transaction failed");
    }

    set((state: ERPState) => {
      if (state.testModeEnabled) {
        return {
          sales: [newSale, ...state.sales],
        };
      }

      const { activeStoreId } = get();
      const newState: Partial<ERPState> = {
        sales: [newSale, ...state.sales],
        products: state.products.map(p => {
          const soldItem = saleData.items.find(i => i.productId === p.id);
          return soldItem ? { ...p, quantity: p.quantity - soldItem.quantity, lastUsed: new Date().toISOString() } : p;
        }),
        customers: state.customers.map(c => {
          if (c.id === saleData.customerId) {
            let creditAdjustment = 0;
            if (saleData.type === 'credit') {
              creditAdjustment = saleData.totalAmount;
            }
            const storeCreditPayment = saleData.payments?.find(p => p.paymentMode === 'store_credit');
            if (storeCreditPayment) {
              creditAdjustment -= storeCreditPayment.amount;
            }
            return {
              ...c,
              totalPurchases: (c.totalPurchases || 0) + saleData.totalAmount,
              creditBalance: (c.creditBalance || 0) + creditAdjustment
            };
          }
          return c;
        }),
        giftCards: state.giftCards.map(gc => {
          const gcPayment = saleData.payments?.find(p => p.paymentMode === 'gift_card' && p.giftCardId === gc.id);
          return gcPayment ? { ...gc, balance: gc.balance - gcPayment.amount, updatedAt: new Date().toISOString() } : gc;
        }),
        accounts: state.accounts.map(a => {
          const accountPayments = saleData.payments?.filter(p => p.accountId === a.id) || [];
          const totalForAccount = accountPayments.reduce((sum, p) => sum + p.amount, 0);
          return totalForAccount > 0 ? { ...a, balance: a.balance + totalForAccount } : a;
        })
      };

      if (newSale.status === 'work_order') {
        const wo: WorkOrder = {
          id: generateId(),
          saleId: newSale.id,
          status: 'pending',
          storeId: activeStoreId,
          companyId: get().currentUser?.companyId,
          updatedAt: new Date().toISOString()
        };
        newState.workOrders = [wo, ...state.workOrders];
        if (isElectron()) dbAdapter.updateWorkOrder?.(wo.id, wo);
      }

      if (newSale.status === 'delivery') {
        const delivery: Delivery = {
          id: generateId(),
          saleId: newSale.id,
          address: newSale.delivery?.address || '',
          deliveryCharge: newSale.delivery?.deliveryCharge || 0,
          isCod: newSale.delivery?.isCod || false,
          status: 'pending',
          storeId: activeStoreId,
          updatedAt: new Date().toISOString()
        };
        newState.deliveries = [delivery, ...state.deliveries];
        if (isElectron()) dbAdapter.updateDelivery?.(delivery.id, delivery);
      }

      return newState;
    });

    return newSale.id;
  },

  resumeSale: async (saleId) => {
    const sale = get().sales.find(s => s.id === saleId);
    if (!sale) return;
    (get() as ERPState).deleteSale(saleId);
  },

  updateSale: async (id, updates) => {
    set((state) => ({
      sales: state.sales.map(s => s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)
    }));
    if (isElectron()) {
      await dbAdapter.updateSale?.(id, updates);
    }
  },

  deleteSale: (id) => {
    const sale = get().sales.find(s => s.id === id);
    const state = get() as ERPState;
    if (sale && state.addActivityLog) {
      state.addActivityLog({
        action: 'SALE_DELETED',
        details: `Invoice #${sale.invoiceNumber} deleted. Amount: $${sale.totalAmount}`
      });
    }
    set((state) => ({
      sales: state.sales.filter(s => s.id !== id)
    }));
    dbAdapter.deleteSale?.(id);
  },

  addGiftCard: async (gcData) => {
    const id = generateId('gc');
    const newGC = { ...gcData, id, updatedAt: new Date().toISOString() } as GiftCard;
    set((state) => ({ giftCards: [newGC, ...state.giftCards] }));
    if (isElectron()) {
      await dbAdapter.addGiftCard?.(newGC);
    }
  },

  updateGiftCard: async (id, updates) => {
    set((state) => ({
      giftCards: state.giftCards.map(gc => gc.id === id ? { ...gc, ...updates, updatedAt: new Date().toISOString() } : gc)
    }));
    if (isElectron()) {
      await dbAdapter.updateGiftCard?.(id, updates);
    }
  },

  getGiftCardByNumber: (number) => {
    return get().giftCards.find(gc => gc.cardNumber === number);
  },

  addDeliveryZone: async (zoneData) => {
    const { activeStoreId } = get();
    const newZone: DeliveryZone = {
      companyId: get().currentUser?.companyId,
      id: generateId('dz'),
      name: zoneData.name || 'New Zone',
      fee: Number(zoneData.fee) || 0,
      isActive: true,
      storeId: activeStoreId,
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ deliveryZones: [newZone, ...state.deliveryZones] }));
    if (isElectron()) await window.electronAPI.addDeliveryZone?.(newZone);
  },

  updateDeliveryZone: async (id, updates) => {
    set(state => ({
      deliveryZones: state.deliveryZones.map((z: DeliveryZone): DeliveryZone =>
        z.id === id ? {
          ...z,
          ...updates,
          fee: updates.fee !== undefined ? Number(updates.fee) : z.fee,
          updatedAt: new Date().toISOString()
        } : z
      )
    }));
    if (isElectron()) await window.electronAPI.updateDeliveryZone?.(id, updates);
  },

  deleteDeliveryZone: async (id) => {
    set(state => ({
      deliveryZones: state.deliveryZones.filter(z => z.id !== id)
    }));
    if (isElectron()) await window.electronAPI.deleteDeliveryZone?.(id);
  },

  toggleDriverStatus: async (userId, isDriver) => {
    set(state => ({
      users: state.users.map(u => u.id === userId ? { ...u, isDriver } : u)
    }));
    if (isElectron()) await dbAdapter.updateUser?.(userId, { isDriver });
  },

  updateWorkOrder: async (id, updates) => {
    set((state) => ({
      workOrders: state.workOrders.map(wo => wo.id === id ? { ...wo, ...updates, updatedAt: new Date().toISOString() } : wo)
    }));
    if (isElectron()) {
      await dbAdapter.updateWorkOrder?.(id, updates);
    }
  },

  updateDelivery: async (id, updates) => {
    set((state) => ({
      deliveries: state.deliveries.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)
    }));
    if (isElectron()) {
      await dbAdapter.updateDelivery?.(id, updates);
    }
  },

  addQuotation: (quotation) => {
    const quotationNumber = generateInvoice('QTN');
    const newQuotation = {
      companyId: get().currentUser?.companyId,
      ...quotation,
      id: generateId(),
      quotationNumber,
      status: 'pending',
      updatedAt: new Date().toISOString()
    } as unknown as Quotation;

    set((state) => ({
      quotations: [...state.quotations, newQuotation]
    }));

    dbAdapter.addQuotation?.(newQuotation);
  },

  updateQuotation: (id, quotation) => {
    set((state) => ({
      quotations: state.quotations.map(q => q.id === id ? { ...q, ...quotation } : q)
    }));
    dbAdapter.updateQuotation?.(id, quotation);
  },

  deleteQuotation: (id: string) => {
    set((state) => ({
      quotations: state.quotations.filter(q => q.id !== id)
    }));
    dbAdapter.deleteQuotation?.(id);
  },

  restoreQuotation: async (id: string) => {
    const result = await dbAdapter.restoreQuotation?.(id);
    if (result) {
      (get() as ERPState).loadFromDatabase(); 
    }
  },

  convertQuotationToSale: (quotationId: string, saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'quotationId'>) => {
    const invoiceNumber = generateInvoice('INV');
    const newSale = {
      ...saleData,
      id: generateId(),
      invoiceNumber,
      quotationId,
      updatedAt: new Date().toISOString()
    } as Sale;

    set((state) => {
      const updatedQuotations = state.quotations.map(q =>
        q.id === quotationId ? { ...q, status: 'converted' as const } : q
      );

      const updatedProducts = state.products.map(p => {
        const soldItem = saleData.items.find(i => i.productId === p.id);
        return soldItem ? { ...p, quantity: p.quantity - soldItem.quantity, lastUsed: new Date().toISOString() } : p;
      });

      return {
        sales: [newSale, ...state.sales],
        quotations: updatedQuotations,
        products: updatedProducts
      } as Partial<ERPState>;
    });

    const store = get() as ERPState;
    if (store.addSale) store.addSale(newSale);
    if (store.syncData) store.syncData();
  },

  getStoreSales: () => get().sales.filter(s => s.storeId === get().activeStoreId),
  getStoreQuotations: () => get().quotations.filter(q => q.storeId === get().activeStoreId && !q.isDeleted),
  getTrashQuotations: () => get().quotations.filter(q => q.storeId === get().activeStoreId && q.isDeleted),

});
