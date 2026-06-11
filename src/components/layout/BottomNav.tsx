import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Plus,
  ArrowUpRight,
  UserPlus,
  Barcode,
  Receipt,
  Truck,
  UserCheck,
  BarChart3,
  Search,
  History,
  Menu,
  Wallet,
  Store as StoreIcon,
  Settings,
  ShoppingBag,
  UserCog,
  FileText,
  LogOut
} from 'lucide-react';
import { Drawer } from 'vaul';
import { useERPStore } from '@/lib/store-data';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dash' },
  { path: '/sales', icon: ShoppingCart, label: 'Trade' },
  { path: null, icon: Plus, label: 'Quick' }, // FAB placeholder
  { path: '/products', icon: Package, label: 'Stock' },
  { path: 'menu', icon: Menu, label: 'Menu' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser, logout, getActiveStore } = useERPStore();
  const activeStore = getActiveStore();

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="erp-bottom-nav px-2 bg-white/90 backdrop-blur-lg border-t border-gray-200 shadow-[0_-1px_10px_#0000000d]">
      {navItems.map((item, idx) => {
        // CASE 1: CENTRAL FAB DRAWER (CREATE ACTIONS)
        if (!item.path) {
          return (
            <Drawer.Root key="fab">
              <Drawer.Trigger asChild>
                <div className="relative -top-5">
                  <button className="w-14 h-14 bg-primary text-white rounded-full border-4 border-white shadow-xl flex items-center justify-center active:scale-95 transition-transform">
                    <Plus className="w-8 h-8" />
                  </button>
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-500 uppercase tracking-tight w-max">Quick</span>
                </div>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[60]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-gray-200 outline-none flex flex-col max-h-[90%] pb-8 px-6 rounded-t-3xl">
                  <div className="mx-auto w-12 h-1.5 flex-shrink-0 bg-gray-300 rounded-full my-4" />
                  <div className="grid gap-4 py-4 overflow-y-auto">
                    <div className="flex flex-col gap-3">
                      <h3 className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-1 px-1">Primary Operations</h3>
                      <div className="grid gap-2">
                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/sales/new')}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-100 text-foreground rounded-2xl active:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                          >
                            <div className="p-2 bg-primary text-white rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>
                            <div className="text-left">
                              <p className="font-semibold text-[15px]">New Invoice</p>
                              <p className="text-[12px] text-gray-500">Cash or Credit Sale</p>
                            </div>
                          </button>
                        </Drawer.Close>

                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/purchases/new')}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-100 text-foreground rounded-2xl active:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                          >
                            <div className="p-2 bg-gray-100 text-foreground rounded-xl"><Truck className="w-5 h-5" /></div>
                            <div className="text-left">
                              <p className="font-semibold text-[15px]">Stock Purchase</p>
                              <p className="text-[12px] text-gray-500">Inventory Inflow</p>
                            </div>
                          </button>
                        </Drawer.Close>

                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/products/new')}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-100 text-foreground rounded-2xl active:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                          >
                            <div className="p-2 bg-gray-100 text-foreground rounded-xl"><Package className="w-5 h-5" /></div>
                            <div className="text-left">
                              <p className="font-semibold text-[15px]">Add Product</p>
                              <p className="text-[12px] text-gray-500">Update Catalog</p>
                            </div>
                          </button>
                        </Drawer.Close>

                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/quotations/new')}
                            className="flex items-center gap-3 p-3 bg-white border border-gray-100 text-foreground rounded-2xl active:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
                          >
                            <div className="p-2 bg-gray-100 text-foreground rounded-xl"><FileText className="w-5 h-5" /></div>
                            <div className="text-left">
                              <p className="font-semibold text-[15px]">New Quotation</p>
                              <p className="text-[12px] text-gray-500">Price Estimate</p>
                            </div>
                          </button>
                        </Drawer.Close>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                      <h3 className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider mb-1 px-1">Management & Logs</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/customers/new')}
                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 text-foreground active:bg-gray-50 transition-all rounded-2xl text-center shadow-sm"
                          >
                            <UserPlus className="w-6 h-6 text-foreground mb-2" />
                            <p className="font-semibold text-[13px]">New Client</p>
                          </button>
                        </Drawer.Close>

                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/transactions/new')}
                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 text-foreground active:bg-gray-50 transition-all rounded-2xl text-center shadow-sm"
                          >
                            <Receipt className="w-6 h-6 text-foreground mb-2" />
                            <p className="font-semibold text-[13px]">Voucher</p>
                          </button>
                        </Drawer.Close>

                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/users/new')}
                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 text-foreground active:bg-gray-50 transition-all rounded-2xl text-center shadow-sm"
                          >
                            <UserCheck className="w-6 h-6 text-foreground mb-2" />
                            <p className="font-semibold text-[13px]">New Staff</p>
                          </button>
                        </Drawer.Close>

                        <Drawer.Close asChild>
                          <button
                            onClick={() => handleQuickAction('/reports')}
                            className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 text-foreground active:bg-gray-50 transition-all rounded-2xl text-center shadow-sm"
                          >
                            <BarChart3 className="w-6 h-6 text-foreground mb-2" />
                            <p className="font-semibold text-[13px]">Analytics</p>
                          </button>
                        </Drawer.Close>
                      </div>
                    </div>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          );
        }

        // CASE 2: GLOBAL MENU DRAWER (SYSTEM NAVIGATION)
        if (item.path === 'menu') {
          return (
            <Drawer.Root key="menu">
              <Drawer.Trigger asChild>
                <button className="erp-nav-item h-full flex flex-col justify-center items-center py-2 min-w-[60px] text-slate-500 active:text-white transition-colors">
                  <Menu className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter mt-1">Menu</span>
                </button>
              </Drawer.Trigger>
              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-[80]" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[90] bg-white border-t border-gray-200 outline-none flex flex-col h-[94%] pb-0 px-0 rounded-t-3xl overflow-hidden shadow-2xl">
                  <div className="mx-auto w-12 h-1.5 flex-shrink-0 bg-gray-300 rounded-full my-4" />

                  <div className="flex-1 overflow-y-auto px-6 pb-20">
                    <h2 className="text-foreground font-bold text-2xl tracking-tight mb-6 mt-2">System Navigation</h2>

                    {/* Finance */}
                    <div className="mb-8">
                      <h3 className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider mb-3">Finance & Ledgers</h3>
                      <div className="grid gap-2">
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/transactions')} className="flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 text-left transition-colors">
                            <div className="p-2 bg-gray-100 rounded-xl"><Receipt className="w-5 h-5 text-foreground" /></div>
                            <span className="font-semibold text-[15px]">Transactions</span>
                          </button>
                        </Drawer.Close>
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/accounts')} className="flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 text-left transition-colors">
                            <div className="p-2 bg-gray-100 rounded-xl"><Wallet className="w-5 h-5 text-foreground" /></div>
                            <span className="font-semibold text-[15px]">Ledger Accounts</span>
                          </button>
                        </Drawer.Close>
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/purchases')} className="flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 text-left transition-colors">
                            <div className="p-2 bg-gray-100 rounded-xl"><ShoppingBag className="w-5 h-5 text-foreground" /></div>
                            <span className="font-semibold text-[15px]">Purchases</span>
                          </button>
                        </Drawer.Close>
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/quotations')} className="flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 text-left transition-colors">
                            <div className="p-2 bg-gray-100 rounded-xl"><FileText className="w-5 h-5 text-foreground" /></div>
                            <span className="font-semibold text-[15px]">Quotations</span>
                          </button>
                        </Drawer.Close>
                      </div>
                    </div>

                    {/* CRM */}
                    <div className="mb-8">
                      <h3 className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider mb-3">Customer Relations</h3>
                      <Drawer.Close asChild>
                        <button onClick={() => navigate('/customers')} className="w-full flex items-center gap-4 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-100 text-left transition-colors">
                          <div className="p-2 bg-gray-100 rounded-xl"><Users className="w-5 h-5 text-foreground" /></div>
                          <span className="font-semibold text-[15px]">Client Database</span>
                        </button>
                      </Drawer.Close>
                    </div>

                    {/* System */}
                    <div className="mb-8">
                      <h3 className="text-gray-500 text-[12px] font-semibold uppercase tracking-wider mb-3">System Administration</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/stores')} className="flex flex-col gap-2 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 transition-colors">
                            <StoreIcon className="w-6 h-6 text-foreground" />
                            <span className="font-semibold text-[13px]">Branches</span>
                          </button>
                        </Drawer.Close>
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/users')} className="flex flex-col gap-2 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 transition-colors">
                            <UserCog className="w-6 h-6 text-foreground" />
                            <span className="font-semibold text-[13px]">User Mgmt</span>
                          </button>
                        </Drawer.Close>
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/reports')} className="flex flex-col gap-2 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 transition-colors">
                            <FileText className="w-6 h-6 text-foreground" />
                            <span className="font-semibold text-[13px]">Reports</span>
                          </button>
                        </Drawer.Close>
                        <Drawer.Close asChild>
                          <button onClick={() => navigate('/more')} className="flex flex-col gap-2 p-4 bg-gray-50/50 border border-gray-100 text-foreground rounded-2xl active:bg-gray-100 transition-colors">
                            <Settings className="w-6 h-6 text-foreground" />
                            <span className="font-semibold text-[13px]">Settings</span>
                          </button>
                        </Drawer.Close>
                      </div>
                    </div>
                  </div>

                  {/* Drawer Footer (User Section) */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/50 pb-12">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white flex items-center justify-center text-foreground text-lg font-bold rounded-full shadow-sm border border-gray-100">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-foreground truncate">{currentUser?.name || 'USER'}</p>
                        <p className="text-[12px] text-gray-500 font-medium capitalize">{activeStore?.name || 'SYSTEM'} • {currentUser?.role || 'user'}</p>
                      </div>
                    </div>
                    <Drawer.Close asChild>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-3 py-3.5 bg-white text-red-500 border border-gray-200 font-semibold text-[15px] rounded-xl active:bg-gray-50 transition-all active:scale-[0.98]"
                      >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                      </button>
                    </Drawer.Close>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          );
        }

        // CASE 3: STANDARD TAB LINKS
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`erp-nav-item h-full flex flex-col justify-center items-center py-2 min-w-[60px] relative ${isActive ? 'text-primary' : 'text-gray-400'}`}
          >
            <item.icon className={`w-[22px] h-[22px] ${isActive ? 'text-primary font-bold' : ''} transition-all`} />
            <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
