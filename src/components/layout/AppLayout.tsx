import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useERPStore } from '@/lib/store-data';
import saifeeLogo from '@/assets/saifee.png';
import sysfotechLogo from '@/assets/sysfotech-logo.png';
import { AIChat } from '../ai/AIChat';

export function AppLayout() {
  const { isAuthenticated, currentUser } = useERPStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-semibold uppercase tracking-wide text-[10px] animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  // Role-based Redirects for Root Path (Handles both #/ and /)
  const isRoot = window.location.hash === '#/' || window.location.hash === '';
  if (isRoot) {
    const canSeeRevenue = useERPStore.getState().checkPermission('canSeeRevenueMetrics');
    
    // Admins and high-level managers stay on the Dashboard (/)
    if (canSeeRevenue || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') {
      // Proceed to render kids (Dashboard)
    } else {
      const canManageHR = useERPStore.getState().checkPermission('canManageEmployees');
      const canManageInventory = useERPStore.getState().checkPermission('canAddProduct');
      const canManageSales = useERPStore.getState().checkPermission('canSeeDetailedSales');
      const canManageAccounts = useERPStore.getState().checkPermission('canManageLedger');

      if (canManageInventory) return <Navigate to="/products" replace />;
      if (canManageSales) return <Navigate to="/sales" replace />;
      if (canManageHR || currentUser?.role === 'hr_manager') return <Navigate to="/hr" replace />;
      if (canManageAccounts) return <Navigate to="/accounts" replace />;
      if (currentUser?.role === 'sales_manager') return <Navigate to="/sales" replace />;
      if (currentUser?.role === 'inventory_manager') return <Navigate to="/products" replace />;
      if (currentUser?.role === 'accountant') return <Navigate to="/transactions" replace />;
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <BottomNav />
      <AIChat />

      {/* Multi-Partner Watermarks */}
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 opacity-30 pointer-events-none z-50 mix-blend-multiply">
        <img
          src={saifeeLogo}
          alt="Saifee"
          className="w-20"
        />
        <img
          src={sysfotechLogo}
          alt="Sysfotech"
          className="w-24"
        />
      </div>
    </div>
  );
}
