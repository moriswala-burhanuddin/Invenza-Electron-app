import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import {
  Wallet,
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  ChevronRight,
  Activity,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  CreditCard,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { dbAdapter } from '@/lib/db-adapter';
import { eleganceApi } from '@/lib/elegance-api';
import { DashboardMetrics } from '@/lib/store-data';
import { cn, formatCurrency } from '@/lib/utils';
import { isElectron } from '@/lib/electron-helper';

const DEMO_METRICS: DashboardMetrics = {
  revenue: 15240500,
  posRevenue: 15240500,
  onlineRevenue: 4250000,
  profit: 3840000,
  inventoryValue: 84200150,
  todayRevenue: 850000,
  todayProfit: 210000,
  totalSales: 450,
  totalItems: 12050,
  lowStockCount: 15,
  customerCount: 842,
  lowStockItems: [
    { id: '1', name: 'Power Drill XT', sku: 'PD-XT-01', quantity: 2, minStock: 5 },
    { id: '2', name: 'Hammer Drill', sku: 'HD-05', quantity: 1, minStock: 3 },
    { id: '3', name: 'Welding Mask', sku: 'WM-Pro', quantity: 0, minStock: 10 }
  ],
  recentSales: []
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { getStoreCustomers, getActiveStore, checkPermission } = useERPStore();
  const [dateRange, setDateRange] = useState('today');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [onlineStats, setOnlineStats] = useState<any>(null);
  const activeStore = getActiveStore();

  useEffect(() => {
    if (isElectron() && activeStore) {
      dbAdapter.getDashboardMetrics(activeStore.id).then(setMetrics);
    } else if (!isElectron()) {
      // Provide high-quality mock data for the web demo
      setMetrics(DEMO_METRICS);
      setOnlineStats({ revenue: 4250000, orders: 12 });
    }
    
    if (activeStore) {
      // Still attempt to fetch live store stats if URL is configured
      eleganceApi.getStoreSummary().then(setOnlineStats).catch(() => {
        if (!isElectron()) setOnlineStats({ revenue: 4250000, orders: 12 });
      });
    }
  }, [activeStore]);

  const canSeeRevenue = checkPermission('canSeeRevenueMetrics');
  const canSeeProfit = checkPermission('canSeeProfit');
  const canSeeBuyingPrice = checkPermission('canSeeBuyingPrice');

  const stats = [
    ...(canSeeRevenue ? [{
      label: 'POS Revenue',
      value: metrics?.posRevenue || 0,
      icon: Wallet,
      color: 'bg-indigo-600',
      trend: 'Physical',
      isCurrency: true
    },
    {
      label: 'Online Revenue',
      value: onlineStats ? onlineStats.revenue : (metrics?.onlineRevenue || 0),
      icon: ShoppingCart,
      color: 'bg-amber-500',
      trend: onlineStats ? `${onlineStats.orders} Orders` : 'Website',
      isCurrency: true
    }] : []),
    ...(canSeeProfit ? [{
      label: 'Net Profit',
      value: metrics?.profit || 0,
      icon: TrendingUp,
      color: 'bg-emerald-600',
      trend: metrics ? `${((metrics.todayProfit / (metrics.profit || 1)) * 100).toFixed(1)}%` : '0%',
      isCurrency: true
    }] : []),
    ...(canSeeBuyingPrice ? [{
      label: 'Inventory Value',
      value: metrics?.inventoryValue || 0,
      icon: Package,
      color: 'bg-slate-900',
      trend: 'In Stock',
      isCurrency: true
    }] : []),
  ];

  const salesData = [
    { name: 'Mon', total: 4000, profit: 2400 },
    { name: 'Tue', total: 3000, profit: 1398 },
    { name: 'Wed', total: 2000, profit: 9800 },
    { name: 'Thu', total: 2780, profit: 3908 },
    { name: 'Fri', total: 1890, profit: 4800 },
    { name: 'Sat', total: 2390, profit: 3800 },
    { name: 'Sun', total: 3490, profit: 4300 },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      <PageHeader
        title="Dashboard"
        subtitle={activeStore ? `${activeStore.name} • Live Overview` : 'Quick Summary'}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* View Options */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-[1.5rem] shadow-sm border border-white">
            {['today', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all",
                  dateRange === range ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 bg-white p-4 rounded-[1.2rem] shadow-sm border border-white hover:shadow-md transition-all active:scale-95">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Custom Range</span>
          </button>
        </div>

        {/* Stats Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <div key={stat.label} className="group bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
              <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700", stat.color)} />

              <div className="flex justify-between items-start mb-6">
                <div className={cn("p-4 rounded-2xl text-white shadow-lg", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</span>
                  <div className="flex items-center gap-1.5 text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-[10px] font-black">{stat.trend}</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">
                  {stat.isCurrency ? formatCurrency(stat.value || 0) : (stat.value || 0).toLocaleString()}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latest Update</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-10">
          {/* Main Analytical Card */}
          {(canSeeRevenue || canSeeProfit) && (
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-white/50 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Revenue Performance</h3>
                <p className="text-xs font-bold text-slate-400">Weekly sales and profit report</p>
              </div>
              <div className="flex gap-2">
                {canSeeRevenue && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Revenue</span>
                </div>
                )}
                {canSeeProfit && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Profit</span>
                </div>
                )}
              </div>
            </div>

            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#000" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                    tickFormatter={(val) => formatCurrency(val)}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  {canSeeRevenue && <Area type="monotone" dataKey="total" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />}
                  {canSeeProfit && <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          {/* Stats Summary */}
          <div className={cn("space-y-6", (!canSeeRevenue && !canSeeProfit) ? "lg:col-span-3" : "")}>
            <div className="bg-primary rounded-[2.5rem] p-8 text-white relative overflow-hidden">
              <Target className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Target</h4>
              <div className="relative">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-4xl font-black">78%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(42000)} / {formatCurrency(55000)}</span>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[78%] rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white/50">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center justify-between">
                Recent Activity
                <Activity className="w-3 h-3" />
              </h4>
              <div className="space-y-6">
                {[
                  { title: 'New Sale #4912', time: '2m ago', icon: Wallet, color: 'text-indigo-600' },
                  { title: 'Restocked Item', time: '1h ago', icon: Package, color: 'text-amber-500' },
                  { title: 'New Customer', time: '3h ago', icon: Users, color: 'text-slate-900' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer">
                    <div className={cn("p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform", item.color)}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h5 className="text-[11px] font-black text-slate-900 uppercase">{item.title}</h5>
                      <p className="text-[9px] font-bold text-slate-400">{item.time}</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'New Sale', icon: Plus, path: '/sales/new', color: 'bg-primary text-white' },
            { label: 'Inventory', icon: Package, path: '/products', color: 'bg-white text-foreground' },
            { label: 'Customers', icon: Users, path: '/customers', color: 'bg-white text-foreground' },
            { label: 'Reports', icon: Activity, path: '/reports', color: 'bg-white text-foreground' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={cn(
                "group p-6 rounded-[2rem] flex items-center justify-between transition-all active:scale-95 shadow-sm border border-white",
                action.color
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl transition-all group-hover:bg-slate-800", action.color === 'bg-primary text-white' ? 'bg-white/10' : 'bg-slate-50')}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest">{action.label}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          ))}
        </div>

        {/* Stock and Payment Tables */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Stock Alerts</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items that need to be restocked</p>
              </div>
              <div className="bg-red-50 text-red-500 px-4 py-2 rounded-2xl font-black text-[10px]">
                {metrics?.lowStockItems?.length || 0} ITEMS
              </div>
            </div>
            <div className="space-y-4">
              {metrics?.lowStockItems?.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] group hover:bg-slate-100 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-red-500 shadow-sm">
                      !
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 text-sm uppercase">{p.name}</h5>
                      <p className="text-[10px] font-bold text-slate-400">{p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-red-600 leading-none">{p.quantity}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stock</div>
                  </div>
                </div>
              ))}
              {!metrics?.lowStockItems?.length && (
                <div className="py-10 text-center">
                  <Package className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All stock levels healthy</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Unpaid Sales</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Money to be collected from customers</p>
              </div>
              <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl font-black text-[10px]">
                CRITICAL
              </div>
            </div>
            <div className="space-y-4">
              {(getStoreCustomers().filter(c => c.creditBalance > 0)).slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] group hover:bg-slate-100 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h5 className="font-black text-slate-900 text-sm uppercase">{c.name}</h5>
                      <p className="text-[10px] font-bold text-slate-400">Pending Amount</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-indigo-600 leading-none">{formatCurrency(c.creditBalance || 0)}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Owed</div>
                  </div>
                </div>
              ))}
              {!(getStoreCustomers().some(c => c.creditBalance > 0)) && (
                <div className="py-10 text-center">
                  <CreditCard className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No outstanding credit</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
