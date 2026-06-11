import { useState } from 'react';
import { useERPStore, Delivery } from '@/lib/store-data';
import { Search, Truck, CheckCircle2, AlertCircle, MapPin, User, ArrowRight, XCircle, Download, Calendar as CalendarIcon, List, Zap, TrendingUp, Clock, PackageCheck, MoreHorizontal, Filter, ShieldCheck, Box, Navigation, CreditCard, ChevronRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function Deliveries() {
    const { sales, deliveries, users, updateDelivery, getStoreCustomers, activeStoreId } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<Delivery['status'] | 'all'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    const customers = getStoreCustomers();

    const filteredDeliveries = deliveries
        .filter(d => d.storeId === activeStoreId)
        .filter(d => statusFilter === 'all' || d.status === statusFilter)
        .filter(d => {
            const sale = sales.find(s => s.id === d.saleId);
            const customer = sale?.customerId ? customers.find(c => c.id === sale.customerId) : null;
            const searchStr = searchQuery.toLowerCase();
            return (
                (sale?.invoiceNumber.toLowerCase().includes(searchStr)) ||
                (customer?.name.toLowerCase().includes(searchStr)) ||
                (d.address.toLowerCase().includes(searchStr))
            );
        });

    const pendingCount = deliveries.filter(d => d.status === 'pending').length;
    const transitCount = deliveries.filter(d => ['shipped', 'out_for_delivery'].includes(d.status)).length;
    const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;

    const getStatusConfig = (status: Delivery['status']) => {
        switch (status) {
            case 'pending': return { icon: <Clock className="w-3.5 h-3.5" />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'PENDING' };
            case 'processing': return { icon: <Zap className="w-3.5 h-3.5" />, class: 'bg-blue-50 text-blue-600 border-blue-100', label: 'PROCESSING' };
            case 'shipped': return { icon: <Truck className="w-3.5 h-3.5" />, class: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'SHIPPED' };
            case 'out_for_delivery': return { icon: <Navigation className="w-3.5 h-3.5" />, class: 'bg-purple-50 text-purple-600 border-purple-100', label: 'OUT FOR DELIVERY' };
            case 'delivered': return { icon: <CheckCircle2 className="w-3.5 h-3.5" />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'DELIVERED' };
            case 'cancelled': return { icon: <XCircle className="w-3.5 h-3.5" />, class: 'bg-rose-50 text-rose-600 border-rose-100', label: 'CANCELLED' };
            case 'failed': return { icon: <AlertCircle className="w-3.5 h-3.5" />, class: 'bg-red-50 text-red-600 border-red-100', label: 'FAILED' };
            default: return { icon: <AlertCircle className="w-3.5 h-3.5" />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: (status as string).toUpperCase() };
        }
    };

    const getNextStatus = (status: Delivery['status']): Delivery['status'] | null => {
        if (status === 'pending') return 'processing';
        if (status === 'processing') return 'shipped';
        if (status === 'shipped') return 'out_for_delivery';
        if (status === 'out_for_delivery') return 'delivered';
        return null;
    };

    const handleExport = () => {
        toast.info("Exporting deliveries...");
        const csvContent = "data:text/csv;charset=utf-8,"
            + "ID,Invoice,Status,Address,Assigned To,Date\n"
            + filteredDeliveries.map(d => {
                const sale = sales.find(s => s.id === d.saleId);
                return `${d.id},${sale?.invoiceNumber},${d.status},"${d.address}",${d.assignedTo || ''},${d.deliveryDate || ''}`
            }).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `dispatch_manifest_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Delivery Management</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Logistics & Shipping • {filteredDeliveries.length} Shipments</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="h-12 rounded-2xl bg-slate-50 font-black uppercase text-[10px] tracking-widest text-slate-400 px-6 gap-2" onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}>
                            {viewMode === 'list' ? <CalendarIcon className="w-4 h-4" /> : <List className="w-4 h-4" />}
                            {viewMode === 'list' ? 'Calendar' : 'List'}
                        </Button>
                        <Button onClick={handleExport} variant="ghost" className="h-12 w-12 p-0 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 border border-slate-50">
                            <Download className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
                {/* Logistics Intelligence */}
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                        <div className="p-4 bg-amber-50 rounded-2xl w-fit mb-8 text-amber-500">
                            <Clock className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{pendingCount}</h3>
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-50/50 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                        <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-8 text-indigo-500">
                            <Navigation className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Transit</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{transitCount} Deliveries</h3>
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-50/50 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                        <div className="p-4 bg-emerald-50 rounded-2xl w-fit mb-8 text-emerald-500">
                            <PackageCheck className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivered</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{deliveredCount} Orders</h3>
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-50/50 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                    </div>
                    <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 flex flex-col justify-center relative overflow-hidden group">
                        <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Status</p>
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">All Good</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dispatch Controls */}
                <div className="bg-white p-6 rounded-[3rem] flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10 border border-white shadow-sm">
                    <div className="flex gap-3 overflow-x-auto p-2 scrollbar-none">
                        {['all', 'pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'failed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as typeof statusFilter)}
                                className={cn(
                                    "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    statusFilter === status
                                        ? 'bg-primary text-white shadow-2xl shadow-black/20'
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900'
                                )}
                            >
                                {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-[400px] shrink-0 group">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                        </div>
                        <input
                            className="w-full h-16 pl-16 pr-8 bg-slate-50 border-none rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all"
                            placeholder="SEARCH BY INVOICE, CUSTOMER, AREA..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {viewMode === 'calendar' ? (
                    <div className="bg-white rounded-[4rem] p-40 text-center border-4 border-dashed border-slate-50 min-h-[600px] flex flex-col items-center justify-center opacity-40">
                        <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10">
                            <CalendarIcon className="w-16 h-16 text-slate-200" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Calendar View Coming Soon</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 px-20 max-w-2xl leading-loose">The calendar view is being built. Please use the list view for now.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {filteredDeliveries.length > 0 ? (
                            filteredDeliveries.map((d) => {
                                const sale = sales.find(s => s.id === d.saleId);
                                const customer = sale?.customerId ? customers.find(c => c.id === sale.customerId) : null;
                                const nextStatus = getNextStatus(d.status);
                                const statusConfig = getStatusConfig(d.status);

                                return (
                                    <div key={d.id} className="bg-white rounded-[3.5rem] p-10 border-2 border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                                        <div className="flex items-center gap-10 flex-1 min-w-0">
                                            <div className={cn(
                                                "w-24 h-24 rounded-[2.5rem] flex flex-col items-center justify-center transition-all group-hover:scale-105 shadow-sm shrink-0",
                                                d.status === 'delivered' ? "bg-emerald-50 text-emerald-600" :
                                                    ['shipped', 'out_for_delivery'].includes(d.status) ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
                                            )}>
                                                <Box className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter mt-2 opacity-50">#{sale?.invoiceNumber.slice(-3) || 'N/A'}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-4 mb-4 flex-wrap">
                                                    <Badge className={cn("px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border", statusConfig.class)}>
                                                        <span className="mr-2">{statusConfig.icon}</span>
                                                        {statusConfig.label}
                                                    </Badge>
                                                    {d.isCod && (
                                                        <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                                            <CreditCard className="w-3.5 h-3.5" /> COD: {formatCurrency(d.deliveryCharge || 0)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors mb-4">{customer?.name || 'Walk-in Guest'}</h4>
                                                <div className="flex flex-wrap gap-x-10 gap-y-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                                        <MapPin className="w-4 h-4 text-indigo-500" /> {d.address || customer?.area || 'Address not set'}
                                                    </p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                                        <User className="w-4 h-4 text-indigo-500" /> {d.assignedTo || 'Not assigned'}
                                                    </p>
                                                    {d.deliveryDate && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                                        <CalendarIcon className="w-4 h-4 text-indigo-500" /> {d.deliveryDate}
                                                    </p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-6 self-end lg:self-center shrink-0">
                                            {/* Delivery Type & Assignment */}
                                            {d.status !== 'delivered' && d.status !== 'cancelled' && (
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant={d.deliveryType === 'internal' ? 'default' : 'outline'}
                                                            className="h-10 rounded-xl text-[9px] font-black uppercase tracking-widest px-4"
                                                            onClick={() => updateDelivery(d.id, { deliveryType: 'internal' })}
                                                        >
                                                            Internal
                                                        </Button>
                                                        <Button
                                                            variant={d.deliveryType === 'external' ? 'default' : 'outline'}
                                                            className="h-10 rounded-xl text-[9px] font-black uppercase tracking-widest px-4"
                                                            onClick={() => updateDelivery(d.id, { deliveryType: 'external' })}
                                                        >
                                                            External
                                                        </Button>
                                                    </div>

                                                    {d.deliveryType === 'internal' ? (
                                                        <div className="relative group/select">
                                                            <select
                                                                className="h-12 bg-slate-50 text-[10px] font-black uppercase tracking-widest border-none rounded-2xl px-10 focus:ring-2 focus:ring-primary appearance-none min-w-[200px] cursor-pointer"
                                                                value={d.assignedTo || ''}
                                                                onChange={(e) => {
                                                                    updateDelivery(d.id, { assignedTo: e.target.value });
                                                                    toast.success(`Assigned to ${e.target.value}.`);
                                                                }}
                                                            >
                                                                <option value="">SELECT EMPLOYEE...</option>
                                                                {users.filter(u => u.storeId === activeStoreId).map(u => (
                                                                    <option key={u.id} value={u.name}>{u.name.toUpperCase()}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none group-hover/select:text-foreground transition-colors rotate-90" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2">
                                                            <input
                                                                className="h-10 bg-slate-50 text-[10px] font-black uppercase tracking-widest border-none rounded-xl px-4 focus:ring-2 focus:ring-primary"
                                                                placeholder="COURIER NAME (e.g. DHL)"
                                                                value={d.deliveryProvider || ''}
                                                                onChange={(e) => updateDelivery(d.id, { deliveryProvider: e.target.value })}
                                                            />
                                                            <input
                                                                className="h-10 bg-slate-50 text-[10px] font-black uppercase tracking-widest border-none rounded-xl px-4 focus:ring-2 focus:ring-primary"
                                                                placeholder="TRACKING NUMBER"
                                                                value={d.trackingNumber || ''}
                                                                onChange={(e) => updateDelivery(d.id, { trackingNumber: e.target.value })}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {nextStatus && (
                                                <Button
                                                    onClick={() => {
                                                        updateDelivery(d.id, { status: nextStatus });
                                                        toast.info(`Status updated to ${nextStatus.replace(/_/g, ' ')}.`);
                                                    }}
                                                    className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-black/20 flex items-center gap-3 hover:scale-[1.05] active:scale-[0.95] transition-all"
                                                >
                                                    Advance to {nextStatus}
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {d.status === 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Are you sure you want to cancel this delivery?')) {
                                                            updateDelivery(d.id, { status: 'cancelled' });
                                                            toast.error("Delivery cancelled.");
                                                        }
                                                    }}
                                                    className="p-4 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all border border-slate-50"
                                                >
                                                    <XCircle className="w-6 h-6" />
                                                </button>
                                            )}
                                            {d.status === 'delivered' && (
                                                <div className="px-10 py-4 rounded-[1.5rem] bg-emerald-50 text-emerald-600 border-2 border-emerald-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-sm shadow-emerald-100">
                                                    <ShieldCheck className="w-4 h-4" />
                                                    DELIVERED
                                                </div>
                                            )}
                                            <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-300 hover:text-foreground border border-slate-50 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-60 text-center opacity-30 flex flex-col items-center justify-center">
                                <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10">
                                    <Truck className="w-16 h-16 text-slate-100" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">No Deliveries Found</h3>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 px-20 max-w-2xl leading-loose">No deliveries match your search. Create a sale with delivery to get started.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
