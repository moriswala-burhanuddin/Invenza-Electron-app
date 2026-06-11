import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, Receiving } from '@/lib/store-data';
import {
    Printer,
    Trash2,
    ArrowLeft,
    Truck,
    Calendar,
    FileText,
    CreditCard,
    Package,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreHorizontal,
    MoreVertical,
    Zap,
    History,
    Activity,
    ShieldCheck,
    Box,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fmt = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

export default function ReceivingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getReceivingById, suppliers, accounts, deleteReceiving } = useERPStore();
    const [receiving, setReceiving] = useState<Receiving | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReceiving = async () => {
            if (!id) return;
            try {
                const data = await getReceivingById(id);
                setReceiving(data);
            } catch (error) {
                toast.error("IDENTIFICATION ERROR: Delivery node not identified.");
            } finally {
                setLoading(false);
            }
        };
        fetchReceiving();
    }, [id, getReceivingById]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-6" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Receiving...</p>
                </div>
            </div>
        );
    }

    if (!receiving) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl max-w-md w-full border border-white">
                    <AlertCircle className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Receiving Not Found</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">The requested delivery record does not exist in the current sector.</p>
                    <Button onClick={() => navigate('/receivings')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Return to Hub
                    </Button>
                </div>
            </div>
        );
    }

    const supplier = suppliers.find(s => s.id === receiving.supplierId);
    const account = accounts.find(a => a.id === receiving.accountId);

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this receiving record?")) {
            await deleteReceiving(receiving.id);
            toast.success('Receiving Record Deleted');
            navigate('/receivings');
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed': return { icon: <CheckCircle2 className="w-3 h-3" />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Verified' };
            case 'suspended': return { icon: <Clock className="w-3 h-3" />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Restricted' };
            case 'returned': return { icon: <AlertTriangle className="w-3 h-3" />, class: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Rejected' };
            default: return { icon: <FileText className="w-3 h-3" />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: status };
        }
    };

    const statusConfig = getStatusConfig(receiving.status);

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-40">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/receivings')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{receiving.receivingNumber}</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Inbound Payload Index • Node: {supplier?.companyName || 'UNIDENTIFIED'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="rounded-2xl h-12 bg-slate-50 font-black uppercase text-[10px] tracking-widest text-slate-400 px-6">
                            <Printer className="w-4 h-4 mr-2" />
                            Print Payload
                        </Button>
                        <Button onClick={handleDelete} variant="ghost" className="rounded-2xl h-12 w-12 p-0 bg-red-50 text-red-600 hover:bg-red-100">
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Acquisition Profile */}
                    <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-lg shadow-emerald-100">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Receiving Summary</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Payload verification and settlement index</p>
                                </div>
                            </div>
                            <div className={cn("px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2", statusConfig.class)}>
                                {statusConfig.icon}
                                {statusConfig.label}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Truck className="w-3.5 h-3.5" /> Provider Node
                                </p>
                                <p className="text-base font-black text-slate-900">{supplier?.companyName || 'IDENTIFICATION_NULL'}</p>
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">{supplier?.phone || '+00 000 000 0000'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <History className="w-3.5 h-3.5" /> Purchase Order
                                </p>
                                <p className="text-base font-black text-slate-900">{receiving.purchaseOrderId || 'DIRECT_ACQUISITION'}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Hashed Reference ID</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <CreditCard className="w-3.5 h-3.5" /> Liquidity Account
                                </p>
                                <p className="text-base font-black text-slate-900 tracking-tight">{account?.name || 'CREDIT_ENTRY'}</p>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Settled: {fmt(receiving.amountPaid)}</p>
                            </div>
                        </div>

                        <hr className="my-12 border-slate-50" />

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Payload Manifest</h3>
                            <div className="space-y-4">
                                {receiving.items?.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] group hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-8">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-foreground transition-colors shadow-sm">
                                                <Box className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-tight mb-2">{item.productName}</h4>
                                                <div className="flex gap-4">
                                                    {item.batchNumber && <span className="text-[8px] font-black bg-white px-3 py-1 rounded-full text-slate-400 uppercase tracking-widest border border-slate-100 font-mono">B:{item.batchNumber}</span>}
                                                    {item.expiryDate && <span className="text-[8px] font-black bg-rose-50 px-3 py-1 rounded-full text-rose-500 uppercase tracking-widest border border-rose-100 font-mono">E:{item.expiryDate}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-12 text-right">
                                            <div>
                                                <p className="text-xl font-black text-slate-900 tracking-tighter mb-1 font-mono">{item.quantity}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units Payload</p>
                                            </div>
                                            <div className="w-28 pl-12 border-l border-slate-100">
                                                <p className="text-xl font-black text-slate-900 tracking-tighter mb-1">{fmt(item.total)}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Value Index</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Financial Reconciliation Summary */}
                    <div className="bg-primary rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
                        <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                        <div className="relative z-10 font-mono">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-10">Financial Synthesis</h4>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-slate-400 text-xs">
                                    <span className="uppercase tracking-widest">Gross Payload</span>
                                    <span>{fmt(receiving.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-emerald-500 text-xs">
                                    <span className="uppercase tracking-widest">Settled Funds</span>
                                    <span>-{fmt(receiving.amountPaid)}</span>
                                </div>
                                <hr className="border-white/10" />
                                <div className="flex justify-between items-end">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pb-1">Total Amount</p>
                                    <h3 className="text-4xl font-black tracking-tighter">{fmt(receiving.totalAmount)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-6 text-indigo-600">
                                <Activity className="w-5 h-5" />
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Deployment Directives</h3>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-6 min-h-[120px] border border-slate-50">
                                <p className="text-xs font-bold leading-relaxed opacity-80 italic text-slate-600">
                                    {receiving.notes || "No restricted directives attached to this payload node."}
                                </p>
                            </div>
                        </div>

                        <hr className="border-slate-50" />

                        <div className="space-y-4">
                            <div className={cn("p-6 rounded-[2rem] flex flex-col gap-4 relative overflow-hidden", receiving.amountDue > 0 ? "bg-rose-50 border border-rose-100" : "bg-emerald-50 border border-emerald-100")}>
                                {receiving.amountDue > 0 ? (
                                    <>
                                        <TrendingUp className="absolute -right-4 -bottom-4 w-16 h-16 text-rose-500/10 rotate-12" />
                                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest relative z-10">Pending Exposure</p>
                                        <div className="flex items-end justify-between relative z-10">
                                            <h4 className="text-2xl font-black text-rose-600 tracking-tighter">{fmt(receiving.amountDue)}</h4>
                                            <Button className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase text-[8px] tracking-widest">Settle Node</Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="absolute -right-4 -bottom-4 w-16 h-16 text-emerald-500/10 rotate-12" />
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest relative z-10">Liability Reconciled</p>
                                        <h4 className="text-2xl font-black text-emerald-600 tracking-tighter relative z-10">NODE_SETTLED_0x0</h4>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
