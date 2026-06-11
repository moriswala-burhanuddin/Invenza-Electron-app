import { StoreSlice, SystemState, ActivityLog, Product, Customer, Sale, Quotation, Purchase, Transaction, Account, Store, User, StockTransfer, ExpenseCategory, TaxSlab, PurchaseOrder, Commission, LoyaltyPoint, ItemKit, CustomField, ProductCustomValue, CustomerCustomValue, Supplier, SupplierCustomField, PaymentTerm, Receiving, Invoice, Category, UserPermission, Employee, HRAttendance, HRLeave, HRPayroll, Cheque } from '../types';
import { API_URL } from '../../config';
import { isElectron } from '../../electron-helper';
import { dbAdapter } from '../../db-adapter';
import { generateId } from '../../utils';
import { useStoreConfig } from '../../store-config';

export const createSystemSlice: StoreSlice<SystemState> = (set, get) => ({
  isSyncing: false,
  syncError: null,
  testModeEnabled: false,
  activityLogs: [],

  toggleTestMode: () => set((state) => ({ testModeEnabled: !state.testModeEnabled })),

  addActivityLog: (log: { action: string; details: string }) => {
    const { currentUser, activeStoreId } = get();
    const newLog: ActivityLog = {
      companyId: get().currentUser?.companyId,
      id: generateId('log'),
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'System',
      action: log.action,
      details: log.details,
      timestamp: new Date().toISOString(),
      storeId: activeStoreId,
    };
    set(state => ({ activityLogs: [newLog, ...state.activityLogs] }));
  },

  syncData: async () => {
    const { isSyncing, accessToken, refreshToken, activeStoreId, loadFromDatabase, logout } = get();

    console.log('[SYNC] Request received. Current state:', { isSyncing, hasToken: !!accessToken, isElectron: isElectron() });

    const isMockToken = accessToken === 'mock-local-token' || accessToken === 'bypass-token-offline';
    const isSuperAdmin = get().currentUser?.role === 'super_admin';

    if (isSyncing) {
      console.warn('[SYNC] Already syncing, ignoring request.');
      return 'already_syncing';
    }
    if (!accessToken) {
      console.warn('[SYNC] No access token found. Please login.');
      return 'no_token';
    }
    if (!isElectron()) {
      console.warn('[SYNC] Not in electron, skipping sync.');
      return 'not_electron';
    }

    if (isMockToken) {
      console.log('[SYNC] Note: This is a local-only / bootstrap session.');
    }

    set({ isSyncing: true, syncError: null });

    const authenticatedFetch = async (url: string, options: RequestInit, retry = true): Promise<Response> => {
      const currentToken = get().accessToken;
      const user = get().currentUser;
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>)
      };
      let finalUrl = url;

      const isSyncUrl = url.includes('/sync/');
      const isSuperAdmin = user?.role === 'super_admin';
      const isMock = currentToken === 'mock-local-token' || currentToken === 'local-token-123';

      if (isMock || (isSyncUrl && isSuperAdmin)) {
        console.log('[SYNC] Elevating request with Bootstrap Auth...');
        headers['X-Bootstrap-Auth'] = 'super-admin-init';
        const separator = finalUrl.includes('?') ? '&' : '?';
        if (!finalUrl.includes('bootstrap=true')) {
          finalUrl = `${finalUrl}${separator}bootstrap=true`;
        }
      }

      if (!isMock && currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const response = await fetch(finalUrl, {
        ...options,
        headers
      });

      if (response.status === 401 && retry && get().refreshToken) {
        console.log('[SYNC] Token expired, attempting refresh...');
        const { authApi } = await import('../../auth-api');
        const refreshResult = await authApi.refreshToken(get().refreshToken);

        if (refreshResult && refreshResult.access) {
          console.log('[SYNC] Token refreshed successfully');
          set({
            accessToken: refreshResult.access,
            refreshToken: refreshResult.refresh || get().refreshToken
          });

          return authenticatedFetch(url, options, false);
        } else {
          console.error('[SYNC] Refresh failed, logging out');
          logout();
          return response;
        }
      }

      return response;
    };

    try {
      console.log('[SYNC] Starting two-way sync...');

      const dirtyData = await window.electronAPI.getDirtyData() as {
        totalCount: number;
        deviceId: string;
        payload: Record<string, any[]>;
      };
      if (dirtyData && dirtyData.totalCount > 0) {
        if (dirtyData.payload.users) {
          dirtyData.payload.users = dirtyData.payload.users.map(u => ({
            ...u,
            username: u.username || u.email
          }));
        }
        
        console.log(`[SYNC] Pushing ${dirtyData.totalCount} changes to cloud...`);
        const pushResponse = await authenticatedFetch(`${API_URL}/sync/push/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: dirtyData.deviceId,
            payload: dirtyData.payload
          })
        });

        if (pushResponse.ok) {
          const pushResult = await pushResponse.json();
          console.log('%c[SYNC] PUSH RESPONSE:', 'color: green; font-weight: bold; font-size: 14px', pushResult);

          if (pushResult.synced_ids) {
            await window.electronAPI.markAsSynced(pushResult.synced_ids);
            console.log('[SYNC] Local database updated with synced status');
          }

          if (pushResult.errors && pushResult.errors.length > 0) {
            console.warn(`[SYNC] Server reported ${pushResult.errors.length} errors during push. Attempting recovery...`);
            const idsToReset: Record<string, string[]> = {};
            const idsToMarkSynced: Record<string, string[]> = {};

            for (const error of (pushResult.errors as any[] || [])) {
              const msg = error.message || "";

              if (msg.includes("Missing dependency")) {
                const match = msg.match(/Missing dependency ([a-zA-Z0-9\-_]+) for ([a-z_]+)\.([a-z_]+)/);
                if (match) {
                  const missingId = match[1];
                  const dependentTable = match[2];
                  const fieldName = match[3];

                  let targetTable = fieldName.replace("_id", "s"); 
                  if (fieldName === "customer_id") targetTable = "customers";
                  if (fieldName === "store_id") targetTable = "stores";
                  if (fieldName === "user_id") targetTable = "users";
                  if (fieldName === "sale_id") targetTable = "sales";
                  if (fieldName === "employee_id") targetTable = "employees";

                  console.log(`[SYNC] Recovery: Forcing re-sync of ${targetTable} ID: ${missingId}`);
                  if (!idsToReset[targetTable]) idsToReset[targetTable] = [];
                  idsToReset[targetTable].push(missingId);
                }
              }

              if (msg.includes("duplicate key value violates unique constraint") || msg.includes("UniqueViolation")) {
                const empMatch = msg.match(/syncing employees row ([a-zA-Z0-9\-_]+):/);
                if (empMatch) {
                  const localId = empMatch[1];
                  console.log(`[SYNC] Recovery: Employee ${localId} already exists on server (unique constraint). Marking as synced locally.`);
                  if (!idsToMarkSynced['employees']) idsToMarkSynced['employees'] = [];
                  idsToMarkSynced['employees'].push(localId);
                }
              }
            }

            if (Object.keys(idsToReset).length > 0) {
              await window.electronAPI.markAsUnsynced(idsToReset);
            }
            if (Object.keys(idsToMarkSynced).length > 0) {
              await window.electronAPI.markAsSynced(idsToMarkSynced);
            }
          }

          console.log('[SYNC] Push successful');
        } else {
          const pushErrorText = await pushResponse.text();
          console.error(`%c[SYNC] Push failed (400/500). Status: ${pushResponse.status}`, 'color: red; font-weight: bold');
          console.error(`[SYNC] Error detail: ${pushErrorText}`);

          let msg = 'Push failed';
          try {
            const errJson = JSON.parse(pushErrorText);
            msg = errJson.error || errJson.detail || pushErrorText;
          } catch (e) {
            msg = pushErrorText || `Push failed (${pushResponse.status})`;
          }
          set({ syncError: msg });
        }
      } else {
        console.log('[SYNC] No local changes to push.');
      }

      console.log('[SYNC] Starting Pull stage...');
      const lastSync = await window.electronAPI.getLastPullTimestamp() || '2000-01-01T00:00:00.000Z';
      console.log('[SYNC] Pulling updates since:', lastSync);

      const pullResponse = await authenticatedFetch(`${API_URL}/sync/pull/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: activeStoreId,
          last_sync: lastSync
        }),
      });

      if (pullResponse.ok) {
        const pullResult = await pullResponse.json();
        if (pullResult.status === 'success' && pullResult.updates) {
          const tableNames = Object.keys(pullResult.updates);
          console.log(`[SYNC] Pull received updates for ${tableNames.length} tables:`, tableNames);

          if (pullResult.updates.company_details) {
            const details = pullResult.updates.company_details;
            console.log('[SYNC] Auto-filling Company Identity from cloud:', details.legal_name);
            useStoreConfig.getState().updateConfig({
              companyName: details.legal_name || undefined,
              taxId: details.tax_id || undefined,
              websiteUrl: details.website || undefined,
              companyEmail: details.company_email || undefined,
            });
            delete pullResult.updates.company_details;
          }

          const applyResult = await window.electronAPI.applyCloudUpdates({
            updates: pullResult.updates,
            serverTime: pullResult.server_time || ''
          });
          if (applyResult.success) {
            console.log('[SYNC] Local state refreshing from DB...');
            await loadFromDatabase();
          }
        }
        console.log('%c[SYNC] TWO-WAY SYNC COMPLETED SUCCESSFULLY', 'color: green; font-weight: bold; font-size: 16px');
        return 'success';
      } else {
        console.error(`[SYNC] Pull stage failed with status: ${pullResponse.status}`);
        return 'error';
      }

    } catch (error) {
      console.error('[SYNC] Synchronisation failed:', error);
      set({ syncError: (error as Error).message });
      return 'error';
    } finally {
      set({ isSyncing: false });
    }
  },

  resetSyncStatus: () => {
    set({ isSyncing: false, syncError: null });
    console.log('[SYNC] Sync status manually reset.');
  },

  loadFromDatabase: async () => {
    if (!isElectron()) return;

    const state = get();
    try {
      const log = (msg: string) => isElectron() ? window.electronAPI.log(msg) : console.log(msg);

      const companyId = state.currentUser?.companyId || 'showtime';

      log(`[Store] Loading from database for store: ${state.activeStoreId} (company: ${companyId})`);
      const [
        products, customers, sales, quotations, purchases,
        transactions, accounts, stores, users, stockTransfers,
        expenseCategories, taxSlabs, purchaseOrders, commissions,
        loyaltyPoints, itemKits, customFields, productCustomValues, customerCustomValues,
        suppliers, supplierCustomFields, paymentTerms, receivings, invoices,
        categories, userPermissions, employees, hrAttendance, hrLeaves, hrPayroll, cheques
      ] = await Promise.all([
        dbAdapter.getProducts(state.activeStoreId, companyId) as Promise<Product[]>,
        dbAdapter.getCustomers(state.activeStoreId, companyId) as Promise<Customer[]>,
        dbAdapter.getSales(state.activeStoreId, companyId) as Promise<Sale[]>,
        dbAdapter.getQuotations(state.activeStoreId, companyId) as Promise<Quotation[]>,
        dbAdapter.getPurchases(state.activeStoreId, companyId) as Promise<Purchase[]>,
        dbAdapter.getTransactions(state.activeStoreId, companyId) as Promise<Transaction[]>,
        dbAdapter.getAccounts(state.activeStoreId, companyId) as Promise<Account[]>,
        dbAdapter.getStores(companyId) as Promise<Store[]>,
        dbAdapter.getUsers(companyId) as Promise<User[]>,
        dbAdapter.getStockTransfers ? dbAdapter.getStockTransfers(state.activeStoreId, companyId) as Promise<StockTransfer[]> : Promise.resolve([]),
        dbAdapter.getExpenseCategories ? dbAdapter.getExpenseCategories(companyId) as Promise<ExpenseCategory[]> : Promise.resolve([]),
        dbAdapter.getTaxSlabs ? dbAdapter.getTaxSlabs(companyId) as Promise<TaxSlab[]> : Promise.resolve([]),
        dbAdapter.getPurchaseOrders ? dbAdapter.getPurchaseOrders(state.activeStoreId, companyId) as Promise<PurchaseOrder[]> : Promise.resolve([]),
        dbAdapter.getCommissions ? dbAdapter.getCommissions(state.activeStoreId, companyId) as Promise<Commission[]> : Promise.resolve([]),
        dbAdapter.getLoyaltyPoints ? dbAdapter.getLoyaltyPoints('', companyId) as Promise<LoyaltyPoint[]> : Promise.resolve([]), // Placeholder for loyalty Points if needed globally
        dbAdapter.getItemKits ? dbAdapter.getItemKits(state.activeStoreId, companyId) as Promise<ItemKit[]> : Promise.resolve([]),
        dbAdapter.getCustomFields ? dbAdapter.getCustomFields(companyId) as Promise<CustomField[]> : Promise.resolve([]),
        dbAdapter.getAllProductCustomValues ? dbAdapter.getAllProductCustomValues() as Promise<ProductCustomValue[]> : Promise.resolve([]),
        dbAdapter.getAllCustomerCustomValues ? dbAdapter.getAllCustomerCustomValues() as Promise<CustomerCustomValue[]> : Promise.resolve([]),
        dbAdapter.getSuppliers ? dbAdapter.getSuppliers(state.activeStoreId, companyId) as Promise<Supplier[]> : Promise.resolve([]),
        dbAdapter.getSupplierCustomFields ? dbAdapter.getSupplierCustomFields(state.activeStoreId, companyId) as Promise<SupplierCustomField[]> : Promise.resolve([]),
        dbAdapter.getPaymentTerms ? dbAdapter.getPaymentTerms(state.activeStoreId, companyId) as Promise<PaymentTerm[]> : Promise.resolve([]),
        dbAdapter.getReceivings ? dbAdapter.getReceivings(state.activeStoreId, companyId) as Promise<Receiving[]> : Promise.resolve([]),
        dbAdapter.getInvoices ? dbAdapter.getInvoices(state.activeStoreId, companyId) as Promise<Invoice[]> : Promise.resolve([]),
        dbAdapter.getCategories ? dbAdapter.getCategories(state.activeStoreId, companyId) as Promise<Category[]> : Promise.resolve([]),
        dbAdapter.getUsers(companyId) 
          .then(users => Promise.all((users as User[] || []).map(u => dbAdapter.getPermissions(u.id))))
          .then(perms => perms.filter(p => p !== null) as UserPermission[]),
        dbAdapter.getEmployees ? dbAdapter.getEmployees(state.activeStoreId, companyId) as Promise<Employee[]> : Promise.resolve([]),
        dbAdapter.getAttendance ? dbAdapter.getAttendance() as Promise<HRAttendance[]> : Promise.resolve([]),
        dbAdapter.getLeaves ? dbAdapter.getLeaves(state.activeStoreId, companyId) as Promise<HRLeave[]> : Promise.resolve([]),
        dbAdapter.getPayroll ? dbAdapter.getPayroll(state.activeStoreId, companyId) as Promise<HRPayroll[]> : Promise.resolve([]),
        dbAdapter.getCheques ? dbAdapter.getCheques(state.activeStoreId, companyId) as Promise<Cheque[]> : Promise.resolve([]),
      ]);

      console.log(`[Store] Data loaded: ${products?.length || 0} products, ${sales?.length || 0} sales locally.`);

      const updatedUsers = (users && users.length > 0) ? users : (users?.length === 0 ? [] : state.users);

      let updatedCurrentUser = state.currentUser;
      if (state.currentUser && updatedUsers.length > 0) {
        const freshUser = updatedUsers.find(u => u.id === state.currentUser?.id);
        if (freshUser) {
          updatedCurrentUser = {
            ...state.currentUser,
            ...freshUser,
            name: freshUser.name || state.currentUser.name,
            role: freshUser.role || state.currentUser.role,
            employeeId: freshUser.employeeId || state.currentUser.employeeId,
          };
        }
      }

      set({
        products: products || state.products,
        customers: customers || state.customers,
        sales: sales || state.sales,
        quotations: quotations || state.quotations,
        purchases: purchases || state.purchases,
        transactions: transactions || state.transactions,
        accounts: accounts || state.accounts,
        stores: stores || state.stores,
        users: updatedUsers,
        currentUser: updatedCurrentUser,
        stockTransfers: stockTransfers || state.stockTransfers,
        expenseCategories: expenseCategories || state.expenseCategories,
        taxSlabs: taxSlabs || state.taxSlabs,
        purchaseOrders: purchaseOrders || state.purchaseOrders,
        commissions: commissions || state.commissions,
        loyaltyPoints: loyaltyPoints || state.loyaltyPoints,
        itemKits: itemKits || state.itemKits,
        customFields: customFields || state.customFields,
        productCustomValues: productCustomValues || state.productCustomValues,
        customerCustomValues: customerCustomValues || state.customerCustomValues,
        suppliers: suppliers || state.suppliers,
        supplierCustomFields: supplierCustomFields || state.supplierCustomFields,
        paymentTerms: paymentTerms || state.paymentTerms,
        receivings: receivings || state.receivings,
        invoices: invoices || state.invoices,
        categories: categories || state.categories,
        userPermissions: userPermissions || state.userPermissions,
        hrAttendance: hrAttendance || state.hrAttendance,
        hrLeaves: hrLeaves || state.hrLeaves,
        hrPayroll: hrPayroll || state.hrPayroll,
        employees: employees || state.employees,
        cheques: cheques || state.cheques,
      });
    } catch (error) {
      console.error('Failed to load from database:', error);
    }
  },

  clearLocalData: async () => {
    const { activeStoreId, loadFromDatabase } = get();
    if (isElectron()) {
      await dbAdapter.clearLocalData(activeStoreId);
      await loadFromDatabase();
    }
  },
});