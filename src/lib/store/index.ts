import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ERPState } from './types';

// Import Slices
import { createCoreSlice } from './modules/core';
import { createInventorySlice } from './modules/inventory';
import { createSalesSlice } from './modules/sales';
import { createPurchasesSlice } from './modules/purchases';
import { createFinanceSlice } from './modules/finance';
import { createHRSlice } from './modules/hr';
import { createSystemSlice } from './modules/system';

// Export all types for backward compatibility
export * from './types';
export * from './initial-data';

export const useERPStore = create<ERPState>()(
  persist(
    (...args) => ({
      ...createCoreSlice(...args),
      ...createInventorySlice(...args),
      ...createSalesSlice(...args),
      ...createPurchasesSlice(...args),
      ...createFinanceSlice(...args),
      ...createHRSlice(...args),
      ...createSystemSlice(...args),
    }),
    {
      name: 'invenza-erp-store-v1',
      partialize: (state) => {
        const { isSyncing, ...rest } = state;
        return rest;
      },
    }
  )
);
