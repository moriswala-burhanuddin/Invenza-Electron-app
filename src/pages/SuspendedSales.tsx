import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Search, Play, Trash2, Clock, User, DollarSign, Pause, ArrowLeft, ArrowRight, ShieldCheck, Zap, Info, MoreHorizontal, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function SuspendedSales() {
    const navigate = useNavigate();
    const { sales, deleteSale, resumeSale, getStoreCustomers, activeStoreId } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');

    const suspendedSales = sales.filter(s =>
        s.status === 'suspended' &&
        s.storeId === activeStoreId &&
        (s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.customerId && getStoreCustomers().find(c => c.id === s.customerId)?.name.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    const customers = getStoreCustomers();

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this paused sale?')) {
            await deleteSale(id);
            toast.error("Sale Deleted.");
        }
    };

    const handleResume = async (id: string, invoice: string) => {
        await resumeSale(id);
        navigate('/sales/new');
        toast.success(`Sale Resumed: #${invoice}.`);
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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">State Persistence Hub</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Halted Matrix • {suspendedSales.length} Persistence Nodes</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/sales')}
                            className="h-12 px-6 rounded-2xl bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            <History className="w-4 h-4" />
                            TX_HISTORY
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
                {/* Visual Intelligence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white flex flex-col justify-center">
                        <div className="p-4 bg-amber-50 rounded-2xl w-fit mb-8 text-amber-500">
                            <Pause className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Suspension Population</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{suspendedSales.length} Nodes</h3>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white flex flex-col justify-center">
                        <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-8 text-indigo-500">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Locked Capital</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(suspendedSales.reduce((sum, s) => sum + s.totalAmount, 0))}</h3>
                    </div>

                    <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 flex flex-col justify-center relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-white/10 rounded-2xl text-amber-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sale Status</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">Persistence Active</span>
                        </div>
                    </div>
                </div>

                {/* Control Matrix */}
                <div className="bg-white p-6 rounded-[3rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex-1 relative group w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                        <input
                            type="text"
                            placeholder="IDENTIFY NODE BY INVOICE_HASH OR ENTITY..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-16 bg-slate-50 border-none rounded-[1.5rem] pl-16 pr-8 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all"
                        />
                    </div>
                </div>

                {/* Halted Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {suspendedSales.length > 0 ? (
                        suspendedSales.map((sale) => {
                            const customer = customers.find(c => c.id === sale.customerId);
                            return (
                                <div
                                    key={sale.id}
                                    className="bg-white rounded-[3rem] p-10 border-2 border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative flex flex-col h-full"
                                >
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner relative overflow-hidden">
                                            <Pause className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge className="bg-amber-50 text-amber-600 border-amber-100 rounded-full px-4 py-1 font-black text-[9px] uppercase tracking-widest shadow-sm">
                                                STATE_HALTED
                                            </Badge>
                                            <span className="text-[10px] font-mono font-black text-slate-300 tracking-tighter">#{sale.invoiceNumber}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0 mb-10">
                                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-amber-600 transition-colors mb-2 truncate">{customer?.name || 'WALK-IN_GUEST'}</h4>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                                            <Clock className="w-3.5 h-3.5" />
                                            {format(new Date(sale.date), 'dd MMM yyyy • HH:mm')}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Payload Units</p>
                                                <p className="text-sm font-black text-slate-900">{sale.items.length} Modules</p>
                                            </div>
                                            <div className="bg-slate-50 p-4 rounded-2xl">
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Vector Mode</p>
                                                <p className="text-sm font-black text-slate-900 uppercase">{sale.paymentMode || 'PENDING'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-50 space-y-6">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 opacity-50">Halted Value</p>
                                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(sale.totalAmount)}</h3>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(sale.id, e)}
                                                className="p-4 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-2xl transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <Button
                                            onClick={() => handleResume(sale.id, sale.invoiceNumber)}
                                            className="w-full bg-primary text-white rounded-2xl h-16 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:bg-amber-500 transition-all flex items-center justify-center gap-3 group/btn"
                                        >
                                            <Play className="w-4 h-4 text-amber-400 group-hover/btn:text-white" />
                                            Resume Sale
                                            <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover/btn:opacity-100 transition-all" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full py-60 text-center opacity-30 flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
                            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10">
                                <Pause className="w-16 h-16 text-slate-100" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Halt Matrix Clear</h3>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 px-20 max-w-2xl leading-loose text-center">No persistent sales nodes identified in the current sector. All transaction pipelines are either completed or uninitialized.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
