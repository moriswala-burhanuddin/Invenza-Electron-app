import { StoreSlice, HRState, HRPayroll } from '../types';
import { dbAdapter } from '../../db-adapter';
import { generateId } from '../../utils';

export const createHRSlice: StoreSlice<HRState> = (set, get) => ({
  employees: [],
  hrAttendance: [],
  hrLeaves: [],
  hrPayroll: [],
  hrPerformance: [],

  checkIn: async () => {
    const { currentUser, activeStoreId, loadFromDatabase } = get();
    if (!currentUser) return { success: false, message: 'USER_NOT_LOGGED_IN' };
    
    let empId = currentUser.employeeId;

    // Deep Lookup Fallback: If session ID is missing, try finding by email
    if (!empId) {
      console.log(`[Attendance] employeeId missing for ${currentUser.email}, attempting fallback lookup...`);
      // Make sure we have the latest employees loaded
      await loadFromDatabase();
      const employees = (get() as any).employees || []; // Assuming employees list exists in store
      const linkedEmployee = employees.find((e: any) => e.email?.toLowerCase() === currentUser.email?.toLowerCase());
      if (linkedEmployee) {
        empId = linkedEmployee.id;
        console.log(`[Attendance] Found matching employeeId: ${empId}`);
      }
    }

    if (!empId) {
      return { 
        success: false, 
        message: `NO_EMPLOYEE_LINK: Your user account is not linked to an employee profile. Please contact HR to link ${currentUser.email}.` 
      };
    }

    try {
      const result = await dbAdapter.checkIn?.(empId, activeStoreId);
      if (result?.success) {
        await (get() as any).fetchAttendance();
        return { success: true };
      }
      // Type-safe message extraction
      const apiMsg = (result as any)?.message || 'CHECK_IN_FAILED_DB';
      return { success: false, message: apiMsg };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_EXCEPTION';
      return { success: false, message };
    }
  },

  checkOut: async () => {
    const { currentUser, loadFromDatabase } = get();
    if (!currentUser) return { success: false, message: 'USER_NOT_LOGGED_IN' };
    
    let empId = currentUser.employeeId;

    // Deep Lookup Fallback
    if (!empId) {
      await loadFromDatabase();
      const employees = get().employees || [];
      const linkedEmployee = employees.find((e: any) => e.email?.toLowerCase() === currentUser.email?.toLowerCase());
      if (linkedEmployee) empId = linkedEmployee.id;
    }

    if (!empId) {
      return { success: false, message: 'NO_EMPLOYEE_LINK' };
    }

    try {
      const result = await dbAdapter.checkOut?.(empId);
      if (result?.success) {
        await (get() as any).fetchAttendance();
        return { success: true };
      }
      const apiMsg = (result as any)?.message || 'CHECK_OUT_FAILED_DB';
      return { success: false, message: apiMsg };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_EXCEPTION';
      return { success: false, message };
    }
  },

  fetchAttendance: async (startDate, endDate) => {
    const { currentUser } = get();
    const isAdmin = ['admin', 'super_admin', 'hr_manager', 'super_admin'].includes(currentUser?.role || '');
    const employeeId = isAdmin ? undefined : currentUser?.employeeId;
    const data = await dbAdapter.getAttendance?.(employeeId, startDate, endDate);
    if (data) set({ hrAttendance: data });
  },

  applyLeave: async (leave) => {
    const { currentUser, activeStoreId } = get();
    if (!currentUser || !currentUser.employeeId) return;
    const result = await dbAdapter.applyLeave?.({
      ...leave,
      companyId: currentUser.companyId,
      employeeId: currentUser.employeeId,
      storeId: activeStoreId
    });
    if (result?.success) {
      await (get() as any).fetchLeaves();
    }
  },

  fetchLeaves: async () => {
    const { currentUser, activeStoreId } = get();
    const isAdmin = ['admin', 'super_admin', 'hr_manager', 'super_admin'].includes(currentUser?.role || '');
    const employeeId = isAdmin ? undefined : currentUser?.employeeId;
    const data = await dbAdapter.getLeaves?.(activeStoreId, currentUser?.companyId, employeeId);
    if (data) set({ hrLeaves: data });
  },

  updateLeaveStatus: async (id, status) => {
    const success = await dbAdapter.updateLeaveStatus?.(id, status);
    if (success) {
      await (get() as any).fetchLeaves();
    }
  },

  fetchPayroll: async () => {
    const { currentUser, activeStoreId } = get();
    if (!currentUser) return;
    const isAdmin = ['admin', 'super_admin', 'hr_manager'].includes(currentUser?.role || '');
    const employeeId = isAdmin ? undefined : currentUser.employeeId;
    const data = await dbAdapter.getPayroll?.(activeStoreId, currentUser.companyId, employeeId);
    if (data) set({ hrPayroll: data });
  },

  addPayroll: async (payrollData) => {
    const { activeStoreId } = get();
    const id = generateId('pay');
    const newPayroll = {
      companyId: get().currentUser?.companyId,
      ...payrollData,
      id,
      storeId: activeStoreId,
    } as HRPayroll;
    await dbAdapter.addPayroll?.(newPayroll);
    await (get() as any).fetchPayroll();
  },

  updatePayrollStatus: async (id: string, status: string) => {
    await dbAdapter.updatePayrollStatus?.(id, status);
    await (get() as any).fetchPayroll();
  },

  getLeaveBalances: async (employeeId: string) => {
    const { currentUser } = get();
    if (!currentUser?.companyId) return [];
    return (await dbAdapter.getLeaveBalances?.(employeeId, currentUser.companyId)) || [];
  },

  setLeaveBalance: async (employeeId: string, leaveType: string, balance: number, year: number) => {
    const { currentUser, activeStoreId } = get();
    if (!currentUser?.companyId) return;
    await dbAdapter.setLeaveBalance?.({
      employeeId,
      companyId: currentUser.companyId,
      storeId: activeStoreId,
      leaveType,
      totalDays: balance,
      year
    });
  },

  addEmployee: async (employeeData) => {
    await dbAdapter.addEmployee?.(employeeData);
    await (get() as any).loadFromDatabase();
  },

  updateEmployee: async (id, updates) => {
    await dbAdapter.updateEmployee?.(id, updates);
    await (get() as any).loadFromDatabase();
  },

  deleteEmployee: async (id) => {
    await dbAdapter.deleteEmployee?.(id);
    await (get() as any).loadFromDatabase();
  },
});
