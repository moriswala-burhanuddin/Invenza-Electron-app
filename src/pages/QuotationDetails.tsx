import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, Account } from '@/lib/store-data';
import { Printer, Download, MessageCircle, ArrowRightCircle, Clock, CheckCircle2, XCircle, Trash2, ArrowLeft, Calendar, User, Wallet, Activity, ClipboardList, ChevronRight, Zap, ShieldCheck, Tag } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function QuotationDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getStoreQuotations, getStoreCustomers, getStoreAccounts, convertQuotationToSale, activeStoreId, deleteQuotation } = useERPStore();

    const quotations = getStoreQuotations();
    const customers = getStoreCustomers();
    const accounts = getStoreAccounts();

    const quotation = quotations.find(q => q.id === id);
    const customer = quotation?.customerId ? customers.find(c => c.id === quotation.customerId) : null;

    const [isConverting, setIsConverting] = useState(false);
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');
    const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'wallet'>('cash');
    const [saleType, setSaleType] = useState<'cash' | 'credit' | 'retail'>('cash');

    if (!quotation) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl max-w-md w-full border border-white">
                    <ClipboardList className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Estimate Expired</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">This quotation hash could not be retrieved from the active registry.</p>
                    <Button onClick={() => navigate('/quotations')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Return to Registry
                    </Button>
                </div>
            </div>
        );
    }

    const handleWhatsAppShare = () => {
        const phone = quotation.customerPhone || '';
        const itemsList = quotation.items.map(item => `- ${item.productName} (x${item.quantity}): ${formatCurrency(item.price * item.quantity)}`).join('\n');
        const message = `Proposal ${quotation.quotationNumber}\n---\n${itemsList}\n---\nTotal: ${formatCurrency(quotation.totalAmount)}\nValid Until: ${new Date(quotation.expiryDate).toLocaleDateString()}`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
        toast.info("WhatsApp Dispatch Layer Initialized");
    };

    const handleConvert = () => {
        if (!accountId) return;
        convertQuotationToSale(quotation.id, {
            status: 'completed',
            type: saleType,
            items: quotation.items,
            subtotal: quotation.totalAmount,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: quotation.totalAmount,
            profit: 0,
            paymentMode,
            accountId,
            customerId: quotation.customerId,
            storeId: activeStoreId,
            date: new Date().toISOString()
        });
        toast.success("Proposal Converted to Live Transaction");
        setIsConverting(false);
        navigate('/sales');
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'active': return { color: 'text-amber-500 bg-amber-50', icon: <Clock className="w-5 h-5" />, label: 'Draft Estimate' };
            case 'converted': return { color: 'text-emerald-500 bg-emerald-50', icon: <CheckCircle2 className="w-5 h-5" />, label: 'Sale Committed' };
            case 'expired': return { color: 'text-red-500 bg-red-50', icon: <XCircle className="w-5 h-5" />, label: 'Validity Expired' };
            default: return { color: 'text-slate-400 bg-slate-50', icon: <XCircle className="w-5 h-5" />, label: 'Unknown' };
        }
    };

    const config = getStatusConfig(quotation.status);

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/quotations')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Proposal #{quotation.quotationNumber}</h1>
                                <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", config.color)}>
                                    {quotation.status}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Quotation Details • Verified</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => { if (window.confirm('IRREVERSIBLE: DELETE QUOTE?')) { deleteQuotation(id!); navigate('/quotations'); } }} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="h-10 w-px bg-slate-100 mx-2" />
                        <Button onClick={handleWhatsAppShare} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-none">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                        </Button>
                        <Button className="bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl h-12 w-12 p-0 shadow-none">
                            <Printer className="w-5 h-5" />
                        </Button>
                        <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-2">
                            <Download className="w-4 h-4 mr-2" />
                            Secure PDF
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {/* Visual Intelligence Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-indigo-50 rounded-2xl">
                                <Wallet className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Provision</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{formatCurrency(quotation.totalAmount)}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estimated Value</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Horizon</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 leading-none mb-2 uppercase">{new Date(quotation.expiryDate).toLocaleDateString()}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validity Expiry</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <User className="w-6 h-6 text-slate-400" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Entity</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 leading-none mb-2 uppercase truncate">{quotation.customerName}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{quotation.customerPhone || 'Identity Masked'}</p>
                    </div>

                    <div className={cn("rounded-[2rem] p-8 shadow-xl border overflow-hidden relative", quotation.status === 'active' ? "bg-amber-500 text-white border-amber-400" : "bg-primary text-white border-primary")}>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-white/20 rounded-2xl">
                                    {config.icon}
                                </div>
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Protocol</span>
                            </div>
                            <h2 className="text-xl font-black leading-none mb-2 uppercase tracking-tight">{config.label}</h2>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none">Authentication Index: SF-QT-L{quotation.id.slice(0, 4)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Items Ledger */}
                        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white relative overflow-hidden">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Technical Breakdown</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Provisioned asset quantities and unit valuations</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <Tag className="w-6 h-6 text-indigo-600" />
                                </div>
                            </div>

                            <div className="space-y-6">
                                {quotation.items.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2rem] group hover:bg-slate-900 hover:text-white transition-all duration-500">
                                        <div className="flex items-center gap-8">
                                            <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center font-black text-slate-900 shadow-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-tight mb-1">{item.productName}</h4>
                                                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span>Qty: {item.quantity}</span>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                    <span>Draft Rate: {formatCurrency(item.price)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-black tracking-tighter">{formatCurrency(item.quantity * item.price)}</div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Draft Value</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {quotation.notes && (
                            <div className="bg-indigo-50/50 rounded-[2.5rem] p-10 border border-indigo-100 flex gap-8">
                                <div className="p-4 bg-white rounded-2xl h-fit text-indigo-600 shadow-sm">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-indigo-900 tracking-widest mb-3">Provision Remarks</h4>
                                    <p className="text-xs font-bold text-indigo-900/60 uppercase leading-relaxed tracking-tight">{quotation.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6 sticky top-28">
                        {/* conversion widget */}
                        {quotation.status === 'active' && (
                            <div className="bg-primary rounded-[2.5rem] p-10 shadow-2xl shadow-black/20 text-white relative overflow-hidden group">
                                <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Initialize Sale</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Execute proposal into live transaction</p>

                                    <Drawer.Root open={isConverting} onOpenChange={setIsConverting}>
                                        <Drawer.Trigger asChild>
                                            <Button className="w-full bg-white text-foreground rounded-[1.2rem] h-16 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                                                AUTHORIZE & CONVERT
                                            </Button>
                                        </Drawer.Trigger>
                                        <Drawer.Portal>
                                            <Drawer.Overlay className="fixed inset-0 bg-primary/60 z-[100]" />
                                            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[3rem] outline-none flex flex-col p-12 max-h-[85vh] shadow-2xl">
                                                <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-100 mb-12" />
                                                <div className="max-w-2xl mx-auto w-full">
                                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2 text-center">Convert to Sale</h2>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12 text-center">Settlement parameters and inventory deduction audit</p>

                                                    <div className="space-y-10">
                                                        <div className="space-y-4">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrument Category</Label>
                                                            <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-50 rounded-2xl">
                                                                {['cash', 'credit', 'retail'].map(t => (
                                                                    <button key={t} onClick={() => setSaleType(t as 'cash' | 'credit' | 'retail')} className={cn("py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", saleType === t ? "bg-primary text-white shadow-xl" : "text-slate-400 hover:text-slate-600")}>{t}</button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Settlement Method</Label>
                                                            <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-50 rounded-2xl">
                                                                {['cash', 'card', 'wallet'].map(m => (
                                                                    <button key={m} onClick={() => setPaymentMode(m as 'cash' | 'card' | 'wallet')} className={cn("py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", paymentMode === m ? "bg-indigo-600 text-white shadow-xl" : "text-slate-400 hover:text-slate-600")}>{m}</button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Escrow Sink Account</Label>
                                                            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary appearance-none">
                                                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}
                                                            </select>
                                                        </div>

                                                        <Button onClick={handleConvert} className="w-full bg-primary text-white h-20 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-black/20 hover:scale-[1.02] transition-all">
                                                            EXECUTE SETTLEMENT • {formatCurrency(quotation.totalAmount)}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Drawer.Content>
                                        </Drawer.Portal>
                                    </Drawer.Root>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-10">
                                <ReceiptText className="w-5 h-5 text-slate-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 text-[10px]">Financial Summary</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estimate Sub</span>
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(quotation.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tax Provision</span>
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(0)}</span>
                                </div>

                                <div className="h-px bg-slate-100 my-6" />

                                <div className="bg-slate-50 rounded-[2rem] p-8">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em]">Grand Net</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(quotation.totalAmount)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ReceiptText(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M14 8H8" />
            <path d="M16 12H8" />
            <path d="M13 16H8" />
        </svg>
    )
}
