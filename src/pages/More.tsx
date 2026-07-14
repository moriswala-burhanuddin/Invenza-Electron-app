import { useNavigate } from 'react-router-dom';
import { useERPStore } from '@/lib/store-data';
import {
  ShoppingBag,
  Receipt,
  Wallet,
  Store,
  UserCog,
  FileText,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Database,
  BarChart3,
  Download,
  ReceiptText,
  FolderTree,
  Award,
  Layers,
  Settings2,
  ScanBarcode,
  Shield,
  LayoutGrid,
  Zap,
  Box,
  Cpu,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  ClipboardList,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStoreConfig } from '@/lib/store-config';

const menuItems = [
  { path: '/purchases', label: 'Purchases', icon: ShoppingBag, description: 'TRACK_VENDOR_BILLS' },
  { path: '/item-kits', label: 'Item Kits', icon: Layers, description: 'BUNDLE_PRODUCTS', moduleKey: 'itemKitBundles' },
  { path: '/custom-fields', label: 'Custom Fields', icon: Settings2, description: 'ADD_EXTRA_DATA', moduleKey: 'customFields' },
  { path: '/price-check', label: 'Price Check', icon: ScanBarcode, description: 'CHECK_PRODUCT_PRICES', moduleKey: 'priceCheck' },
  { path: '/transactions', label: 'Transactions', icon: Receipt, description: 'VIEW_ALL_CASH_FLOW' },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: ReceiptText, description: 'MANAGE_STOCK_ORDERS', moduleKey: 'purchaseOrders' },
  { path: '/expense-categories', label: 'Expense Categories', icon: FolderTree, description: 'ORGANIZE_SPENDING', moduleKey: 'expenseCategories' },
  { path: '/commissions', label: 'Sales Commissions', icon: Award, description: 'STAFF_INCENTIVES', moduleKey: 'salesCommissions' },
  { path: '/accounts', label: 'Accounts', icon: Wallet, description: 'BANK_AND_CASH', moduleKey: 'storeAccount' },
  { path: '/tax-settings', label: 'Tax Settings', icon: ShieldCheck, description: 'GOVERNMENT_TAX_CONFIG' },
  { path: '/analytics', label: 'Reports & Analytics', icon: BarChart3, description: 'BUSINESS_INSIGHTS', moduleKey: 'analytics' },
  { path: '/activity-logs', label: 'Activity History', icon: Shield, description: 'SYSTEM_AUDIT_LOGS', moduleKey: 'securityAudit' },
  { path: '/gift-cards', label: 'Gift Cards', icon: CreditCard, description: 'MANAGE_STORE_CREDIT', moduleKey: 'giftCards' },
  { path: '/work-orders', label: 'Work Orders', icon: ClipboardList, description: 'TRACK_TASKS', moduleKey: 'workOrders' },
  { path: '/stock-journal', label: 'Stock Journal', icon: Layers, description: 'INVENTORY_ADJUSTMENTS', moduleKey: 'stockJournal' },
  { path: '/ecommerce/returns', label: 'Returns', icon: RefreshCcw, description: 'ONLINE_ORDER_REVERSALS' },
  { path: '/stores', label: 'Stores', icon: Store, description: 'BRANCH_MANAGEMENT' },
  { path: '/users', label: 'Users', icon: UserCog, description: 'MANAGE_TEAM_ACCESS' },
  { path: '/reports', label: 'Detailed Reports', icon: FileText, description: 'DOWNLOAD_DATA' },
];

export default function More() {
  const navigate = useNavigate();
  const { logout, currentUser } = useERPStore();
  const { disabledModules } = useStoreConfig();

  // Filter menu items based on disabled modules
  const filteredMenuItems = menuItems.filter(item => {
    const moduleKey = item.label.toLowerCase().replace(/\s+(.)/g, (match, group1) => group1.toUpperCase());
    return !disabledModules.includes(moduleKey);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.info("Session Terminated: Secure exit complete.");
  };

  const handleManualBackup = async () => {
    if (window.electronAPI && window.electronAPI.manualBackup) {
      toast.info('Initiating Data Backup...');
      const result = await window.electronAPI.manualBackup();
      if (result) {
        toast.success('Data Backup Complete: All system state persisted.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:h-24 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-slate-200">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Tools & Settings</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{filteredMenuItems.length} Active Modules Available</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="h-12 px-6 rounded-2xl bg-rose-50 text-rose-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-rose-100 transition-all border border-rose-100"
            >
              <LogOut className="w-4 h-4" />
              SECURE_EXIT
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
        {/* Personnel Status */}
        <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 flex flex-col md:flex-row md:items-center justify-between gap-10 relative overflow-hidden group">
          <Cpu className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 group-hover:rotate-45 transition-transform duration-1000" />
          <div className="flex items-center gap-6 relative z-10 min-w-0 w-full md:w-auto">
            <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-[2rem] bg-indigo-500 flex items-center justify-center text-3xl md:text-4xl font-black shadow-2xl shadow-indigo-500/20">
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight truncate">{currentUser?.name}</h2>
              <p className="text-[9px] md:text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 truncate">{currentUser?.email}</p>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border",
                  currentUser?.role === 'admin' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-white/10 text-slate-400 border-white/10"
                )}>
                  {currentUser?.role === 'admin' ? 'CLEARANCE_LVL_0' : 'OPERATOR_LOCAL'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
            <Button
              onClick={handleManualBackup}
              className="h-14 px-8 rounded-2xl bg-white text-foreground font-black uppercase text-[10px] tracking-widest hover:scale-[1.05] active:scale-[0.95] transition-all flex items-center gap-3"
            >
              <Database className="w-4 h-4 text-indigo-500" />
              MANUAL_BACKUP
            </Button>
          </div>
        </div>

        {/* Control Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-2xl hover:border-slate-100 transition-all duration-500 group flex items-center gap-6 text-left"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.label}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{item.description}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          ))}
        </div>

        {/* Terminal Alert */}
        <div className="bg-rose-50 rounded-[3rem] p-10 border border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-rose-900 uppercase tracking-tight">Security Core Integrity</h3>
              <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-1">All protocols operational • No leaks detected</p>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <div className="text-right hidden md:block">
              <p className="text-[9px] font-black text-rose-300 uppercase tracking-widest leading-none mb-2">Protocol Version</p>
              <p className="text-xl font-black text-rose-900 leading-none">v4.0.ALPHA</p>
            </div>
            <div className="w-1.5 h-16 bg-rose-200/50 rounded-full hidden md:block" />
            <Button
              onClick={handleLogout}
              className="h-14 px-10 rounded-2xl bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-rose-700 transition-colors shadow-xl shadow-rose-200"
            >
              System Shutdown
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
