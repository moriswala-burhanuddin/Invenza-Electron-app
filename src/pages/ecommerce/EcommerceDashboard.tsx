import { useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Users, Package, TrendingUp, ExternalLink, Star, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '@/lib/store-data';

const EcommerceDashboard = () => {
    const navigate = useNavigate();
    const { sales, customers, products } = useERPStore();

    // Calculate stats from central ERP store data
    const stats = useMemo(() => {
        const onlineSales = (sales || []).filter((s: { source?: string }) => s.source === 'Online' || s.source === 'online');
        const totalRevenue = onlineSales.reduce((acc: number, s: { totalAmount?: number; total?: number }) => acc + (s.totalAmount ?? s.total ?? 0), 0);

        return {
            total_revenue: formatCurrency(totalRevenue),
            total_orders: onlineSales.length.toString(),
            total_products: (products || []).length.toString(),
            total_customers: (customers || []).length.toString(),
        };
    }, [sales, customers, products]);

    const StatCard = ({
        title,
        value,
        icon: Icon,
        color,
    }: {
        title: string;
        value: string;
        icon: React.ElementType;
        color: string;
    }) => (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white hover:shadow-md transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-32 h-32 rotate-12" />
            </div>
            <div className="relative z-10">
                <div className={`p-4 ${color} rounded-2xl w-fit mb-6 text-white shadow-xl`}>
                    <Icon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Online Store Overview</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                Synced from your Elegance website
                            </p>
                        </div>
                    </div>
                    <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-black/10">
                        <ExternalLink className="w-4 h-4" />
                        Visit Store
                    </Button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard title="Online Revenue" value={stats.total_revenue} icon={TrendingUp} color="bg-emerald-500" />
                    <StatCard title="Orders" value={stats.total_orders} icon={ShoppingBag} color="bg-blue-600" />
                    <StatCard title="Products" value={stats.total_products} icon={Package} color="bg-purple-600" />
                    <StatCard title="Customers" value={stats.total_customers} icon={Users} color="bg-orange-500" />
                </div>

                {/* Quick Actions */}
                <div className="mt-12 grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Manage Store</h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {[
                                { label: 'Manage Products', desc: 'Update items on your website', icon: Package, path: '/ecommerce/products' },
                                { label: 'View Orders', desc: 'Check new customer purchases', icon: ShoppingBag, path: '/ecommerce/orders' },
                                { label: 'Reviews', desc: 'Manage customer reviews', icon: Star, path: '/ecommerce/reviews' },
                                { label: 'Feedback', desc: 'Check user inquiries', icon: MessageSquare, path: '/ecommerce/feedback' },
                            ].map(({ label, desc, icon: Icon, path }) => (
                                <button
                                    key={path}
                                    onClick={() => navigate(path)}
                                    className="p-8 bg-slate-50 rounded-[2rem] text-left hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 group"
                                >
                                    <div className="p-4 bg-white rounded-2xl w-fit mb-6 text-slate-900 shadow-sm group-hover:shadow-md transition-all">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 uppercase">{label}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-primary rounded-[3rem] p-12 shadow-xl shadow-black/10 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <Users className="w-64 h-64 text-white rotate-12" />
                        </div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-4 relative z-10">Store Community</h3>
                        <p className="text-xs text-white/60 leading-relaxed mb-8 relative z-10">
                            Your website currently has <span className="text-white font-black">{stats.total_customers}</span> registered customers.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full h-14 rounded-2xl bg-white/10 border-white/20 text-white font-black uppercase text-[10px] tracking-widest relative z-10 hover:bg-white/20"
                        >
                            View Customer List
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default EcommerceDashboard;
