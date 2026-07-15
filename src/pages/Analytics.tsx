import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { BarChart3, TrendingUp, Package, Users, DollarSign, ArrowLeft, ArrowUpRight, Gauge, Activity, Target, Layers, MoreHorizontal } from 'lucide-react';
import { InventoryForecast } from '@/components/ai/InventoryForecast';
import { useLicense } from '@/contexts/LicenseContext';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Analytics() {
    const { hasFeature } = useLicense();
    const { products, customers, sales } = useERPStore();

    const totalSalesCount = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * p.quantity), 0);
    const totalCustomers = customers.length;

    const stats = [
        { label: 'TOTAL REVENUE', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: '+12.5% vs Last Period' },
        { label: 'TOTAL SALES', value: totalSalesCount, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Sales are active' },
        { label: 'STOCK VALUE', value: formatCurrency(totalInventoryValue), icon: Package, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Check stock levels' },
        { label: 'CUSTOMERS', value: totalCustomers, icon: Users, color: 'text-rose-600', bg: 'bg-rose-50', sub: 'Customer base growing' },
    ];

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Analytics</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Your Business at a Glance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl text-emerald-600 border border-emerald-100">
                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
                {/* Core Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <div key={stat.label} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
                            <div className={cn("absolute -right-4 -top-4 p-8 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity", stat.bg)}>
                                <stat.icon className="w-16 h-16" />
                            </div>

                            <div className={cn(stat.bg, stat.color, "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-black/[0.02]")}>
                                <stat.icon className="w-6 h-6" />
                            </div>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter mb-2">{stat.value}</p>
                            <div className="flex items-center gap-2">
                                <span className={cn("text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                                    stat.sub.includes('+') ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100")}>
                                    {stat.sub}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* AI Forecasting Integration */}
                {hasFeature('Inventory Forecast') && (
                    <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl shadow-black/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-20 opacity-[0.03] pointer-events-none">
                            <Target className="w-96 h-96 text-white" />
                        </div>
                        {/* <InventoryForecast /> */}
                    </div>
                )}

                {/* Visualization Matrix */}
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Revenue Trend - Large */}
                    <div className="lg:col-span-8 bg-white rounded-[3.5rem] p-12 shadow-sm border border-white group">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-lg shadow-indigo-100">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Revenue Over Time</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">How much you earned each month</p>
                                </div>
                            </div>
                            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                                <MoreHorizontal className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="h-64 flex items-end gap-3 border-b border-slate-100 pb-4 relative">
                            {/* Floating Average Line */}
                            <div className="absolute left-0 bottom-[60%] w-full h-[1px] border-t border-dashed border-slate-200 z-0" />

                            {[40, 70, 45, 90, 65, 80, 55, 60, 40, 75, 85, 95].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-slate-100 hover:bg-primary transition-all rounded-xl cursor-crosshair group/bar relative"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white px-2 py-1 rounded-lg text-[8px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity z-10">
                                        {formatCurrency(h * 100)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-6 px-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                            <span>JAN</span>
                            <span>MAR</span>
                            <span>MAY</span>
                            <span>JUL</span>
                            <span>SEP</span>
                            <span>NOV</span>
                        </div>
                    </div>

                    {/* Sector Performance */}
                    <div className="lg:col-span-4 bg-white rounded-[3.5rem] p-12 shadow-sm border border-white">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="p-4 bg-rose-50 rounded-2xl text-rose-600 shadow-lg shadow-rose-100">
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Category Performance</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales by category</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            {[
                                { name: 'Power Tools', value: 85, color: 'bg-primary', icon: <Gauge className="w-3 h-3" /> },
                                { name: 'Hand Tools', value: 62, color: 'bg-indigo-500', icon: <Activity className="w-3 h-3" /> },
                                { name: 'Plumbing', value: 45, color: 'bg-emerald-500', icon: <Target className="w-3 h-3" /> },
                                { name: 'Electrical', value: 30, color: 'bg-rose-500', icon: <Layers className="w-3 h-3" /> },
                            ].map((cat) => (
                                <div key={cat.name} className="group/cat">
                                    <div className="flex justify-between items-end mb-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{cat.name}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">PERFORMANCE</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900">{cat.value}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000 group-hover/cat:scale-x-105 origin-left", cat.color)}
                                            style={{ width: `${cat.value}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="w-full mt-12 bg-slate-900 text-white h-16 rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-[9px] shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                            View More
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
