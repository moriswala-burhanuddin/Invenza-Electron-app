import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Wallet,
  Receipt,
  ReceiptText,
  Store,
  UserCog,
  FileText,
  ShoppingBag,
  LogOut,
  Hexagon,
  Settings,
  BarChart3,
  ShieldCheck,
  FolderTree,
  Award,
  BookOpen,
  PieChart,
  ClipboardList,
  ArrowRightLeft,
  Percent,
  Shield,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useERPStore } from '@/lib/store-data';
import { useStoreConfig } from '@/lib/store-config';
import { SyncStatus } from '../sync/SyncStatus';
import logo from '../../assets/invenza-bg.png';
import { cn } from '@/lib/utils';

import { ROLE_SIDEBARS, NavItem } from '@/config/navigation';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, getActiveStore, checkPermission } = useERPStore();
  const { ecommerceEnabled, disabledModules } = useStoreConfig();
  const activeStore = getActiveStore();

  const [appVersion, setAppVersion] = useState('v1.0.1');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userRole = currentUser?.role || 'user';

  useEffect(() => {
    const fetchVersion = async () => {
      console.log('[Sidebar] Fetching app version...');
      const api = window.electronAPI;
      if (api?.getVersion) {
        const v = await api.getVersion();
        console.log('[Sidebar] Main process reported version:', v);
        setAppVersion(`v${v}`);
      } else {
        console.warn('[Sidebar] electronAPI.getVersion not found!');
      }
    };
    fetchVersion();
  }, []);

  // --- REFACTORED PERMISSION-FIRST NAVIGATION ---
  
  // 1. Start with the default items for the user's role
  const roleBaseItems = ROLE_SIDEBARS[userRole] || ROLE_SIDEBARS['user'];
  let navItems = [...roleBaseItems];

  // 2. Scan the Master List (Super Admin items) for authorized additions
  // If a user has a specific permission, we inject the corresponding module
  ROLE_SIDEBARS.super_admin.forEach(masterItem => {
    if (masterItem.requiredPermission) {
      const perms = Array.isArray(masterItem.requiredPermission) 
        ? masterItem.requiredPermission 
        : [masterItem.requiredPermission];
      
      const hasPermission = perms.some(p => checkPermission(p as any));
      const alreadyInList = navItems.some(item => item.href === masterItem.href);
      
      if (hasPermission && !alreadyInList) {
        // Find a logical insertion point (e.g. after Dashboard)
        const dashboardIndex = navItems.findIndex(i => i.href === '/' || i.href === '/employee/dashboard');
        if (dashboardIndex !== -1) {
          navItems.splice(dashboardIndex + 1, 0, masterItem);
        } else {
          navItems.push(masterItem);
        }
      }
    }
  });

  // 3. Filter out Online Store if not enabled globally
  if (!ecommerceEnabled) {
    navItems = navItems.filter(item => item.href !== '/ecommerce');
  }

  // 4. Global Module Disabling (from Store Config)
  let filteredMenuItems = navItems.filter(item => {
    const moduleKey = item.moduleKey || item.title.toLowerCase().replace(/\s+(.)/g, (match, group1) => group1.toUpperCase());
    return !disabledModules.includes(moduleKey);
  });

  // 5. Hard Permission Checks (Items must have ALL required permissions if multiple logic applied)
  // This handles specific sub-paths or detailed requirements
  const canSeeSuppliers = checkPermission('canSeeSuppliers');
  if (!canSeeSuppliers) {
    filteredMenuItems = filteredMenuItems.filter(item => 
      !['/suppliers', '/purchase-orders', '/receivings', '/purchases'].includes(item.href)
    );
  }

  const canAccessAllInvoices = checkPermission('canAccessAllInvoices');
  if (!canAccessAllInvoices) {
    filteredMenuItems = filteredMenuItems.filter(item => 
      !['/invoices', '/quotations', '/sales/quotations'].includes(item.href)
    );
  }

  const canManageCustomers = checkPermission('canManageCustomers');
  if (!canManageCustomers) {
    filteredMenuItems = filteredMenuItems.filter(item => item.href !== '/customers');
  }

  const canSeeDetailedSales = checkPermission('canSeeDetailedSales');
  if (!canSeeDetailedSales) {
    filteredMenuItems = filteredMenuItems.filter(item => 
      !['/day-book', '/party-ledger', '/profit-loss'].includes(item.href)
    );
  }

  const canManageEmployees = checkPermission('canManageEmployees');
  if (!canManageEmployees) {
    filteredMenuItems = filteredMenuItems.filter(item => 
      !['/hr', '/hr/employees', '/hr/attendance', '/hr/leaves', '/hr/performance'].some(path => item.href.startsWith(path))
    );
  }

  const canManagePayroll = checkPermission('canManagePayroll');
  if (!canManagePayroll) {
    filteredMenuItems = filteredMenuItems.filter(item => item.href !== '/hr/payroll');
  }

  const canManageLedger = checkPermission('canManageLedger');
  if (!canManageLedger) {
    filteredMenuItems = filteredMenuItems.filter(item => 
      !['/accounts', '/transactions'].includes(item.href)
    );
  }

  const canManageCommissions = checkPermission('canManageCommissions');
  if (!canManageCommissions) {
    filteredMenuItems = filteredMenuItems.filter(item => item.href !== '/commissions');
  }

  const canManageCheques = checkPermission('canManageCheques');
  if (!canManageCheques) {
    filteredMenuItems = filteredMenuItems.filter(item => item.href !== '/finance/cheques');
  }

  const canManageTaxes = checkPermission('canManageTaxes');
  if (!canManageTaxes) {
    filteredMenuItems = filteredMenuItems.filter(item => item.href !== '/tax-settings');
  }

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen bg-white text-slate-600 border-r border-slate-200 sticky top-0 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* ISO Styled Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-7 h-7 bg-primary border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:bg-slate-50 transition-all z-50 text-white"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Clean Header */}
      <div className={`p-5 border-b border-slate-100 bg-white transition-all ${isCollapsed ? 'items-center px-2' : ''}`}>
        <div className={`flex items-center mb-1 ${isCollapsed ? 'flex-col gap-2' : 'gap-4'}`}>
          <div className={`flex items-center justify-center transition-all ${isCollapsed ? 'w-12 h-12' : 'w-20 h-20'}`}>
            <img src={logo} alt="Invenza Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">Invenza</h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold bg-orange-900/50 px-2 py-0.5 rounded-full text-orange-400 border border-orange-800">
                  SaaS DEV {appVersion}
                </span>
                <button
                  onClick={async () => {
                    alert('Checking for updates...');
                    const api = window.electronAPI;
                    if (api?.checkForUpdates) {
                      console.log('[Sidebar] Manual update check started...');
                      const res = await api.checkForUpdates();
                      console.log('[Sidebar] Check result:', res);
                      if (!res.success) alert('Update check failed: ' + res.error);
                      else if (!res.info) alert('No updates available.');
                    }
                  }}
                  className="text-[10px] text-gray-500 hover:text-primary transition-colors underline"
                >
                  Check
                </button>
              </div>
            </div>
          )}
        </div>
        {!isCollapsed && activeStore && (
          <p className="text-xs text-gray-400 mt-2 font-medium truncate">{activeStore.name} [{activeStore.branch}]</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-none">
        {filteredMenuItems.map((item) => {
          try {
            const isActive = item.href === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`w-full flex items-center rounded-xl transition-all ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                  } ${isActive
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                  }`}
                title={isCollapsed ? item.title : ''}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'text-white' : 'text-slate-400'} ${!isActive && !isCollapsed ? 'group-hover:scale-110' : ''}`} />
                {!isCollapsed && <span className="text-[15px] font-semibold">{item.title}</span>}
              </button>
            );
          } catch (err) {
            console.error("Sidebar item render error:", err, item);
            return null;
          }
        })}
      </nav>

      {/* Sync Status */}
      <div className={`px-4 py-3 transition-all ${isCollapsed ? 'flex justify-center' : ''}`}>
        <SyncStatus compact={isCollapsed} />
      </div>

      {/* User Section (Docked to bottom) */}
      <div className={`p-4 border-t border-slate-200 bg-slate-50 transition-all ${isCollapsed ? 'items-center px-2' : ''}`}>
        <div className={`flex items-center mb-3 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-primary flex items-center justify-center text-white text-sm font-bold rounded-xl shadow-inner border border-white/10 group-hover:rotate-3 transition-transform">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate tracking-tight">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{currentUser?.role || 'user'}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center justify-center bg-primary hover:bg-rose-600 text-white transition-all border border-blue-800/10 rounded-xl ${isCollapsed ? 'w-10 h-10 p-0' : 'w-full px-3 py-2.5 gap-2 text-xs font-bold'
            }`}
          title={isCollapsed ? 'Sign Out' : ''}
        >
          <LogOut className={isCollapsed ? "w-5 h-5" : "w-4 h-4"} />
          {!isCollapsed && <span>SIGN OUT</span>}
        </button>
      </div>
    </aside>
  );
}