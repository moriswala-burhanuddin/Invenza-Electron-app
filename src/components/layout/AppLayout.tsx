import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useERPStore } from '@/lib/store-data';
import saifeeLogo from '@/assets/saifee.png';
import sysfotechLogo from '@/assets/sysfotech-logo.png';
import { AIChat } from '../ai/AIChat';
import { OnboardingTour } from '../onboarding/OnboardingTour';
import { SubscriptionGuard } from './SubscriptionGuard';
import { CustomTitleBar } from './CustomTitleBar';
import { VideoTransition } from './VideoTransition';

export function AppLayout() {
  const { isAuthenticated, currentUser } = useERPStore();
  const location = useLocation();

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

  // Role-based Redirects for Root Path
  const isRoot = location.pathname === '/';
  if (isRoot) {
    const activeStore = useERPStore.getState().getActiveStore();
    if (!activeStore) {
      return <Navigate to="/stores" replace />;
    }

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
    <SubscriptionGuard>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background transition-colors duration-300">
        <CustomTitleBar />
        <div className="flex flex-1 min-h-0 w-full relative">
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-auto bg-gray-50/30 dark:bg-transparent">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <BottomNav />
        {/* <AIChat /> */}
        <OnboardingTour />
        <VideoTransition />

      </div>
    </SubscriptionGuard>
  );
}
