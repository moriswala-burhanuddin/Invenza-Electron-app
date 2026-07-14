import { StoreSlice, CoreState, Role, User, Store } from '../types';
import { dbAdapter } from '../../db-adapter';
import { isElectron } from '../../electron-helper';
import { generateId } from '../../utils';
import { initialStores, initialUsers, initialCustomers } from '../initial-data';
import { API_URL } from '../../config';

export const createCoreSlice: StoreSlice<CoreState> = (set, get) => ({
  currentUser: null,
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  deviceId: null,
  activeStoreId: localStorage.getItem('invenza_active_store') || 'store-1',
  isInitialLoading: true,
  users: initialUsers,
  stores: initialStores,
  customers: initialCustomers,
  userPermissions: [],

  login: async (email, password) => {
    const isDemoUser = (email.toLowerCase() === 'demo@invenza.app' || email.toLowerCase() === 'demo@storeflow.ai') && password === 'demo123';
    const isWebTesting = !isElectron() || window.location.hostname === 'localhost' || window.location.hostname.includes('netlify') || window.location.hostname.includes('vercel');
    
    if (isWebTesting && isDemoUser) {
      console.log('[Auth] Web Demo Bypass: Hardcoded Authentication');
      const demoUser: User = { 
        id: 'user-demo', 
        name: 'Professional Demo', 
        email: 'demo@invenza.app', 
        role: 'super_admin', 
        storeId: 'store-1' 
      };
      
      set({
        currentUser: demoUser,
        isAuthenticated: true,
        accessToken: 'demo-token',
        refreshToken: 'demo-refresh',
        activeStoreId: 'store-1'
      });
      return { success: true };
    }

    try {
      const { authApi } = await import('../../auth-api');
      
      // DISAMBIGUATION: Find local company_id if available to help backend scope the login
      let companyId: string | undefined;
      const localStores = get().stores as any[];
      if (localStores && localStores.length > 0) {
        const rawId = localStores.find(s => s.companyId || s.company_id)?.companyId || 
                    localStores.find(s => s.companyId || s.company_id)?.company_id || 
                    localStores[0].companyId || 
                    localStores[0].company_id;
        
        // Safety: ensure it's a string and remove float decimals if present (e.g., "3.0" -> "3")
        if (rawId) {
          companyId = String(rawId).split('.')[0];
        }
      }
      
      // First attempt: Try with local companyId hint (to disambiguate)
      let result = await authApi.login(email, password, companyId);
      
      // If the login fails but we passed a hint, it's highly likely the user is trying 
      // to log into a DIFFERENT company. Retry WITHOUT the hint to let Smart Discovery work.
      if (!result.success && companyId && result.status !== 401 && result.status !== 500) {
        console.log(`[Auth] Disambiguation hint (${companyId}) rejected. Retrying without hint for Smart Discovery...`);
        result = await authApi.login(email, password);
      }

      if (result.success && result.data) {
        const { access, refresh, user } = result.data;

        if (isElectron()) {
          // CRITICAL: Push any pending local changes (e.g. deletions) to VPS BEFORE purging.
          // Without this, soft-deleted records that weren't synced yet would be lost locally,
          // and then re-downloaded as "active" from the VPS on the subsequent pull.
          try {
            console.log('[Auth] Flushing pending local changes to cloud before purge...');
            const dirtyData = await window.electronAPI.getDirtyData() as {
              totalCount: number;
              deviceId: string;
              payload: Record<string, any[]>;
            } | null;
            if (dirtyData && dirtyData.totalCount > 0) {
              const pushResponse = await fetch(`${API_URL}/sync/push/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${access}`,
                },
                body: JSON.stringify({
                  deviceId: dirtyData.deviceId,
                  payload: dirtyData.payload
                })
              });
              if (pushResponse.ok) {
                const pushResult = await pushResponse.json();
                if (pushResult.synced_ids) {
                  await window.electronAPI.markAsSynced(pushResult.synced_ids);
                }
                console.log('[Auth] Pre-purge push completed successfully.');
              }
            }
          } catch (prePushErr) {
            console.warn('[Auth] Pre-purge push failed (non-fatal):', prePushErr);
          }

          console.log('[Auth] New cloud session detected. HARD PURGING local tenant data...');
          await window.electronAPI.clearTenantData(true);
        }

        console.log('[Auth] Triggering initial cloud sync for new tenant...');
        set({ accessToken: access, refreshToken: refresh });
        // NOTE: Uses get() to access system slice function syncData!
        // We will assert get() to any logic to avoid TS circular dependencies, or use the unified ERPState
        await (get() as any).syncData();

        const rawRole = (user.role || 'user').toLowerCase();
        const validRoles: Role[] = ['admin', 'staff', 'user', 'hr_manager', 'super_admin', 'sales_manager', 'inventory_manager', 'accountant', 'employee'];
        const normalizedRole = validRoles.includes(rawRole as Role) ? (rawRole as Role) : 'user';

        let employeeId = user.employee_id || user.employeeId;
        // Ensure we don't treat 'user-...' as a valid employeeId (common sync quirk)
        if (employeeId?.startsWith('user-')) {
          employeeId = undefined;
        }
        
        // Final fallback: if employee record exists but ID wasn't in top level, check nested profile if available
        if (!employeeId && user.employee_profile?.id) {
           employeeId = user.employee_profile.id;
        }

        const mappedUser: User = {
          id: user.id || user.uid || `user-${Date.now()}`,
          name: user.name || user.firstName || 'User',
          email: user.email,
          phone: user.phone || '',
          role: normalizedRole,
          storeId: user.store_id || user.storeId || 'store-1',
          companyId: user.company_id || user.companyId,
          avatar: user.avatar || user.profilePicture || null,
          employeeId: employeeId
        };

        const lastStore = localStorage.getItem('invenza_active_store');
        const finalStoreId = lastStore || user.store_id || user.storeId || 'store-1';

        set({
          currentUser: mappedUser,
          isAuthenticated: true,
          accessToken: access,
          refreshToken: refresh,
          activeStoreId: finalStoreId
        });
        
        if (finalStoreId && finalStoreId !== 'store-1') {
            localStorage.setItem('invenza_active_store', finalStoreId);
        }
        
        await get().loadFromDatabase();
        
        return { success: true };
      }

      if (!result.isNetworkError) {
        console.log(`[Auth] Cloud login failed: ${result.message}. Trying local fallback...`);
      }
    } catch (error) {
      console.log("[Auth] Cloud login error, attempting local fallback...");
    }

    const localUsers = get().users;
    const localUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (localUser) {
      let isValid = false;
      if (isElectron() && window.electronAPI.verifyPassword) {
        isValid = await window.electronAPI.verifyPassword(localUser.id, password);
      } else {
        isValid = localUser.password === password || (localUser.email === 'demo@invenza.app' && password === 'demo123');
      }

      if (isValid) {
        const lastStore = localStorage.getItem('invenza_active_store');
        const finalStoreId = lastStore || localUser.storeId || 'store-1';

        set({
          currentUser: localUser,
          isAuthenticated: true,
          accessToken: 'mock-local-token',
          refreshToken: 'mock-local-refresh',
          activeStoreId: finalStoreId
        });
        
        if (finalStoreId && finalStoreId !== 'store-1') {
            localStorage.setItem('invenza_active_store', finalStoreId);
        }
        await get().loadFromDatabase();
        
        return { success: true };
      }
    }

    return { success: false, message: "AUTHENTICATION_FAILURE: Invalid identifier or security key." };
  },

  logout: async () => {
    if (isElectron()) {
      // Push any pending changes (e.g. soft-deletes) to VPS before clearing local data
      try {
        const accessToken = get().accessToken;
        if (accessToken && accessToken !== 'mock-local-token' && accessToken !== 'bypass-token-offline') {
          const dirtyData = await window.electronAPI.getDirtyData() as {
            totalCount: number;
            deviceId: string;
            payload: Record<string, any[]>;
          } | null;
          if (dirtyData && dirtyData.totalCount > 0) {
            console.log(`[Auth] Flushing ${dirtyData.totalCount} pending changes before logout...`);
            const pushResponse = await fetch(`${API_URL}/sync/push/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                deviceId: dirtyData.deviceId,
                payload: dirtyData.payload
              })
            });
            if (pushResponse.ok) {
              console.log('[Auth] Pre-logout push completed successfully.');
            }
          }
        }
      } catch (prePushErr) {
        console.warn('[Auth] Pre-logout push failed (non-fatal):', prePushErr);
      }

      console.log('[Auth] Logging out. Clearing local tenant data...');
      await window.electronAPI.clearTenantData();
    }
    set({ currentUser: null, isAuthenticated: false, accessToken: null, refreshToken: null });
  },

  setActiveStore: async (storeId) => {
    set({ activeStoreId: storeId });
    if (storeId) {
        localStorage.setItem('invenza_active_store', storeId);
        // FORCE RELOAD of all data slices from database for the new store context
        await get().loadFromDatabase();
    }
  },

  addStore: async (storeData) => {
    if (!isElectron()) return;
    
    // Derive companyId: prefer currentUser, fallback to existing stores' companyId
    let companyId = get().currentUser?.companyId;
    if (!companyId) {
      const existingStores = get().stores;
      for (const s of existingStores) {
        const cid = (s as unknown as Record<string, string>).companyId 
                  || (s as unknown as Record<string, string>).company_id;
        if (cid) { companyId = cid; break; }
      }
    }
    if (!companyId) {
      companyId = 1;
    }
    
    const newStore = {
      companyId,
      ...storeData,
      id: `store-${Date.now()}`,
      deviceId: get().deviceId || 'dev-unknown',
      updatedAt: new Date().toISOString()
    } as Store;

    await dbAdapter.addStore(newStore);
    
    const user = get().currentUser;
    if (user) {
      await dbAdapter.addUserStore(user.id, newStore.id);
    }

    const stores = await dbAdapter.getStores(companyId) as Store[];
    set({ stores });
    
    (get() as any).syncData();
  },

  updateStore: async (id, updates) => {
    if (!isElectron()) return;
    await dbAdapter.updateStore(id, updates);
    const stores = await dbAdapter.getStores(get().currentUser?.companyId) as Store[];
    set({ stores });
  },

  deleteStore: async (id) => {
    if (!isElectron()) return;
    await dbAdapter.deleteStore(id);
    const stores = await dbAdapter.getStores(get().currentUser?.companyId) as Store[];
    set({ stores });
  },

  addUser: async (user) => {
    const newUser = { 
      ...user, 
      id: user.id || generateId(),
      companyId: get().currentUser?.companyId 
    };
    set((state) => ({
      users: [...state.users, newUser]
    }));
    await dbAdapter.addUser(newUser);
  },

  deleteUser: async (id) => {
    if (!isElectron()) return;
    await dbAdapter.deleteUser(id);
    const users = await dbAdapter.getUsers(get().currentUser?.companyId) as User[];
    set({ users });
  },

  updateUser: async (id, updates) => {
    if (!isElectron()) return;
    await dbAdapter.updateUser(id, updates);
    const users = await dbAdapter.getUsers(get().currentUser?.companyId) as User[];
    set({ users });
  },

  addCustomer: async (customer) => {
    const newCustomer = { 
      ...customer, 
      id: generateId(), 
      companyId: get().currentUser?.companyId,
      updatedAt: new Date().toISOString() 
    };
    set((state) => ({
      customers: [...state.customers, newCustomer]
    }));
    await dbAdapter.addCustomer(newCustomer);
    (get() as any).syncData();
  },

  updateCustomer: async (id, customer) => {
    set((state) => ({
      customers: state.customers.map(c => c.id === id ? { ...c, ...customer, updatedAt: new Date().toISOString() } : c)
    }));
    await dbAdapter.updateCustomer(id, customer);
    (get() as any).syncData();
  },

  deleteCustomer: async (id) => {
    const customer = get().customers.find(c => c.id === id);
    if (customer) {
      (get() as any).addActivityLog({
        action: 'CUSTOMER_DELETED',
        details: `Customer ${customer.name} (Phone: ${customer.phone}) deleted.`
      });
    }
    set((state) => ({
      customers: state.customers.filter(c => c.id !== id)
    }));
    if (dbAdapter.deleteCustomer) {
      await dbAdapter.deleteCustomer(id);
      (get() as any).syncData(); 
    }
  },

  bulkDeleteCustomers: async (ids) => {
    set((state) => ({
      customers: state.customers.filter(c => !ids.includes(c.id))
    }));

    if (isElectron()) {
      if (window.electronAPI.bulkDeleteCustomers) {
        await window.electronAPI.bulkDeleteCustomers(ids);
      } else {
        for (const id of ids) {
          await dbAdapter.deleteCustomer?.(id);
        }
      }
    }
  },

  mergeCustomers: async (masterId, slaveIds) => {
    const state = get();
    const master = state.customers.find(c => c.id === masterId);
    if (!master) return;

    const slaves = state.customers.filter(c => slaveIds.includes(c.id));
    const totalPurchases = slaves.reduce((acc, c) => acc + c.totalPurchases, master.totalPurchases);
    const creditBalance = slaves.reduce((acc, c) => acc + c.creditBalance, master.creditBalance);

    set((state) => ({
      customers: state.customers
        .map(c => c.id === masterId ? { ...c, totalPurchases, creditBalance, updatedAt: new Date().toISOString() } : c)
        .filter(c => !slaveIds.includes(c.id)),
      sales: state.sales.map(s => slaveIds.includes(s.customerId || '') ? { ...s, customerId: masterId } : s),
      quotations: state.quotations.map(q => slaveIds.includes(q.customerId || '') ? { ...q, customerId: masterId } : q)
    }));

    if (isElectron()) {
      for (const id of slaveIds) {
        await dbAdapter.deleteCustomer?.(id);
      }
      await dbAdapter.updateCustomer(masterId, { totalPurchases, creditBalance });
    }
  },

  fetchPermissions: async (userId) => {
    const targetId = userId || get().currentUser?.id;
    if (!targetId) return;
    const perms = await dbAdapter.getPermissions(targetId);
    if (perms) {
      set(state => ({
        userPermissions: [
          ...state.userPermissions.filter(p => p.userId !== targetId),
          perms
        ]
      }));
    }
  },

  updateUserPermissions: async (userId, permissions) => {
    const updated = await dbAdapter.updatePermissions(userId, permissions);
    if (updated) {
      set(state => ({
        userPermissions: [
          ...state.userPermissions.filter(p => p.userId !== userId),
          updated
        ]
      }));
    }
  },

  checkPermission: (permKey) => {
    const user = get().currentUser;
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'admin') return true;

    const userPerms = get().userPermissions.find(p => p.userId === user.id);
    if (!userPerms) {
      const defaults: Record<string, any> = {
        'admin': { canSeeProfit: true, canEditProduct: true, canAddProduct: true },
        'super_admin': { all: true },
        'employee': { 
            canViewAttendance: true, 
            canMarkAttendance: true, 
            canApplyLeave: true, 
            canViewPayroll: true 
        },
        'staff': { canMarkAttendance: true, canApplyLeave: true },
        'hr_manager': { 
            canManageEmployees: true, 
            canManagePayroll: true, 
            canManageAttendance: true,
            canViewAttendance: true,
            canViewPayroll: true
        },
        'inventory_manager': {
            canAddProduct: true,
            canEditProduct: true,
            canChangeStock: true,
            canTransferStock: true
        },
        'sales_manager': {
            canSeeDetailedSales: true,
            canApplyDiscounts: true,
            canManageCustomers: true,
            canSeeExpectedSales: true
        },
        'accountant': {
            canManageLedger: true,
            canManageCommissions: true,
            canManageCheques: true,
            canManageTaxes: true
        }
      };
      
      const roleDefaults = defaults[user.role] || {};
      return !!roleDefaults[permKey as string] || !!roleDefaults['all'];
    }
    return !!(userPerms.permissions as any)[permKey] || !!(userPerms.permissions as any)['all'];
  },
  
  getActiveStore: () => get().stores.find(s => s.id === get().activeStoreId),
  getStoreUsers: () => get().users.filter(u => u.storeId === get().activeStoreId),
  getStoreCustomers: () => get().customers.filter(c => c.storeId === get().activeStoreId),

});
