import { StoreSlice, InventoryState, Product, Category, ItemKit, CustomField, ProductCustomValue, CustomerCustomValue, StockTransfer } from '../types';
import { dbAdapter } from '../../db-adapter';
import { isElectron } from '../../electron-helper';
import { generateId } from '../../utils';
import { initialProducts } from '../initial-data';
import { validateBarcode, BarcodeResponse } from '../../inventory-utils';

export const createInventorySlice: StoreSlice<InventoryState> = (set, get) => ({
  products: initialProducts,
  categories: [],
  stockTransfers: [],
  itemKits: [],
  customFields: [],
  productCustomValues: [],
  customerCustomValues: [],

  processStockTransfer: async (transferData) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    const transfer = { 
      ...transferData, 
      id: `xfer-${Date.now()}`, 
      status: (transferData as any).status || 'completed',
      companyId
    } as StockTransfer;
    await dbAdapter.processStockTransfer?.(transfer);
    await (get() as any).loadFromDatabase();
  },

  generateBarcode: async (sku) => {
    if (!isElectron()) return `BC-${sku}`;
    return await dbAdapter.generateBarcode?.(sku) || `BC-${sku}`;
  },

  addItemKit: async (kitData) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    const activeStoreId = get().activeStoreId;
    const kit = { 
      ...kitData, 
      id: generateId(), 
      companyId,
      updatedAt: new Date().toISOString() 
    } as ItemKit;
    await dbAdapter.addItemKit?.(kit);
    const itemKits = await dbAdapter.getItemKits?.(activeStoreId, companyId) as ItemKit[];
    if (itemKits) set({ itemKits });
  },

  updateItemKit: async (id, updates) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    const activeStoreId = get().activeStoreId;
    await dbAdapter.updateItemKit?.(id, updates);
    const itemKits = await dbAdapter.getItemKits?.(activeStoreId, companyId) as ItemKit[];
    if (itemKits) set({ itemKits });
  },

  deleteItemKit: async (id) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId;
    const activeStoreId = get().activeStoreId;
    await dbAdapter.deleteItemKit?.(id);
    const itemKits = await dbAdapter.getItemKits?.(activeStoreId, companyId) as ItemKit[];
    if (itemKits) set({ itemKits });
  },

  addCustomField: async (fieldData) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId || 'showtime';
    const field = { 
      ...fieldData, 
      id: generateId(), 
      companyId,
      updatedAt: new Date().toISOString() 
    } as CustomField;
    await dbAdapter.addCustomField?.(field);
    const customFields = await dbAdapter.getCustomFields?.(companyId) as CustomField[];
    if (customFields) set({ customFields });
  },

  updateCustomField: async (id, updates) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId || 'showtime';
    await dbAdapter.updateCustomField?.(id, updates, companyId);
    const customFields = await dbAdapter.getCustomFields?.(companyId) as CustomField[];
    if (customFields) set({ customFields });
  },

  deleteCustomField: async (id) => {
    if (!isElectron()) return;
    const companyId = get().currentUser?.companyId || 'showtime';
    await dbAdapter.deleteCustomField?.(id, companyId);
    const customFields = await dbAdapter.getCustomFields?.(companyId) as CustomField[];
    if (customFields) set({ customFields });
  },

  getProductCustomValues: async (productId) => await dbAdapter.getProductCustomValues?.(productId) || [],
  
  updateProductCustomValues: async (productId, values) => {
    const fullValues = values.map(v => ({
      ...v,
      id: `${productId}-${v.fieldId}`,
      productId
    }));
    await dbAdapter.updateProductCustomValues?.(productId, fullValues);
    const allValues = await dbAdapter.getAllProductCustomValues?.() as ProductCustomValue[];
    if (allValues) set({ productCustomValues: allValues });
  },
  
  getCustomerCustomValues: async (customerId) => await dbAdapter.getCustomerCustomValues?.(customerId) || [],
  
  updateCustomerCustomValues: async (customerId, values) => {
    const fullValues = values.map(v => ({
      ...v,
      id: `${customerId}-${v.fieldId}`,
      customerId
    }));
    await dbAdapter.updateCustomerCustomValues?.(customerId, fullValues);
    const allValues = await dbAdapter.getAllCustomerCustomValues?.() as CustomerCustomValue[];
    if (allValues) set({ customerCustomValues: allValues });
  },

  bulkDeleteProducts: async (ids) => {
    const companyId = get().currentUser?.companyId;
    const activeStoreId = get().activeStoreId;
    if (!isElectron()) {
      set((state) => ({
        products: state.products.filter(p => !ids.includes(p.id))
      }));
      return;
    }
    await dbAdapter.bulkDeleteProducts?.(ids);
    const products = await dbAdapter.getProducts?.(activeStoreId, companyId) as Product[];
    if (products) set({ products });
  },

  bulkUpdateProducts: async (ids, updates) => {
    const companyId = get().currentUser?.companyId;
    const activeStoreId = get().activeStoreId;
    if (!isElectron()) {
      set((state) => ({
        products: state.products.map(p => ids.includes(p.id) ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
      }));
      return;
    }
    await dbAdapter.bulkUpdateProducts?.(ids, updates);
    const products = await dbAdapter.getProducts?.(activeStoreId, companyId) as Product[];
    if (products) set({ products });
  },

  addProduct: async (product) => {
    const newProduct = { 
      ...product, 
      id: generateId(), 
      companyId: get().currentUser?.companyId,
      updatedAt: new Date().toISOString() 
    } as Product;
    set((state) => ({
      products: [...state.products, newProduct]
    }));
    await dbAdapter.addProduct(newProduct);
    (get() as any).syncData();
    return newProduct;
  },

  updateProduct: async (id, product) => {
    set((state) => ({
      products: state.products.map(p => p.id === id ? { ...p, ...product, updatedAt: new Date().toISOString() } : p)
    }));
    await dbAdapter.updateProduct(id, product);
    (get() as any).syncData();
  },

  deleteProduct: async (id) => {
    const product = get().products.find(p => p.id === id);
    if (product && (get() as any).addActivityLog) {
      (get() as any).addActivityLog({
        action: 'PRODUCT_DELETED',
        details: `Product ${product.name} (SKU: ${product.sku}) deleted.`
      });
    }
    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));
    await dbAdapter.deleteProduct(id);
    (get() as any).syncData();
  },

  addCategory: async (categoryData) => {
    const id = generateId('cat');
    const newCategory: Category = {
      ...categoryData,
      id,
      companyId: get().currentUser?.companyId,
      updatedAt: new Date().toISOString()
    };
    set(state => ({ categories: [newCategory, ...state.categories] }));
    if (isElectron()) await dbAdapter.addCategory?.(newCategory);
    return newCategory;
  },

  updateCategory: async (id, updates) => {
    set(state => ({
      categories: state.categories.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)
    }));
    if (isElectron()) await dbAdapter.updateCategory?.(id, updates);
  },

  deleteCategory: async (id) => {
    set(state => ({
      categories: state.categories.filter(c => c.id !== id)
    }));
    if (isElectron()) await dbAdapter.deleteCategory?.(id);
  },

  handleBarcodeScan: async (barcode, mode = 'OUT') => {
    const state = get();
    const companyId = state.currentUser?.companyId;
    if (isElectron()) {
      const result = await dbAdapter.handleBarcodeScan?.(barcode, mode, state.activeStoreId) as BarcodeResponse;
      if (result) {
        const products = await dbAdapter.getProducts?.(state.activeStoreId, companyId) as Product[];
        if (products) set({ products });
        return result;
      }
    }

    if (!validateBarcode(barcode)) {
      return {
        barcode,
        status: 'ERROR',
        warning: 'Invalid barcode format. Must be 8-14 numeric digits.',
      } as BarcodeResponse;
    }

    const product = state.products.find(p =>
      (p.sku === barcode || p.barcode === barcode) && p.storeId === state.activeStoreId
    );

    if (!product) {
      return {
        barcode,
        status: 'NOT_FOUND',
        warning: 'Product not found in current store inventory.'
      } as BarcodeResponse;
    }

    const newQuantity = mode === 'IN' ? product.quantity + 1 : product.quantity - 1;

    if (newQuantity < 0) {
      return {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode || barcode,
        previous_stock: product.quantity,
        updated_stock: product.quantity,
        status: 'ERROR',
        warning: 'Cannot reduce stock below zero.',
        action_type: mode,
      } as BarcodeResponse;
    }

    let warning: string | undefined = undefined;
    if (newQuantity < 10) {
      warning = `Low stock warning! Current: ${newQuantity}`;
    }

    const updatedProduct = { ...product, quantity: newQuantity, updatedAt: new Date().toISOString() };
    (state as any).updateProduct(product.id, updatedProduct);

    return {
      product_id: updatedProduct.id,
      product_name: updatedProduct.name,
      barcode: updatedProduct.barcode || barcode,
      previous_stock: product.quantity,
      updated_stock: updatedProduct.quantity,
      status: 'SUCCESS',
      warning,
      action_type: mode
    } as BarcodeResponse;
  },

  processExcelUpload: async (rows) => {
    const state = get();
    const companyId = state.currentUser?.companyId;
    if (isElectron() && dbAdapter.processExcelUpload) {
      const summary = await dbAdapter.processExcelUpload(rows, state.activeStoreId);
      if (summary) {
        const products = await dbAdapter.getProducts?.(state.activeStoreId, companyId) as Product[];
        if (products) set({ products });
        return summary;
      }
    }
    
    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: { row: number; reason: string }[] = [];

    rows.forEach((row, index) => {
      try {
        const existingProduct = state.products.find(p => p.barcode === row.barcode && p.storeId === state.activeStoreId);

        if (existingProduct) {
          (state as any).updateProduct(existingProduct.id, {
            name: row.name,
            sellingPrice: row.price,
            purchasePrice: row.purchasePrice || existingProduct.purchasePrice,
            quantity: existingProduct.quantity + row.stock,
            categoryName: row.category || existingProduct.categoryName,
            brand: row.brand || existingProduct.brand,
            unit: row.unit || existingProduct.unit,
            minStock: row.minStock !== undefined ? row.minStock : existingProduct.minStock,
            reorderQuantity: row.reorderQuantity !== undefined ? row.reorderQuantity : existingProduct.reorderQuantity,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        } else {
          (state as any).addProduct({
            name: row.name,
            barcode: row.barcode,
            sellingPrice: row.price,
            purchasePrice: row.purchasePrice || row.price * 0.7,
            quantity: row.stock,
            sku: row.barcode,
            categoryName: row.category || 'Uncategorized',
            brand: row.brand || '',
            unit: row.unit || 'Pcs',
            minStock: row.minStock || 0,
            reorderQuantity: row.reorderQuantity || 0,
            storeId: state.activeStoreId,
            lastUsed: new Date().toISOString(),
          });
          createdCount++;
        }
      } catch (e) {
        failedCount++;
        errors.push({ row: index + 2, reason: (e as Error).message });
      }
    });

    return {
      total_rows: rows.length,
      created_products: createdCount,
      updated_products: updatedCount,
      failed_rows: failedCount,
      errors
    };
  },

  getStoreProducts: () => get().products.filter(p => p.storeId === get().activeStoreId),
  getStoreItemKits: () => get().itemKits.filter(k => k.storeId === get().activeStoreId),
});
