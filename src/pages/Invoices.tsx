import { useState, useEffect } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Plus, Search, Filter, Download, ChevronRight, FileText, Trash2, ArrowUpRight, ArrowDownLeft, ArrowLeft, Zap, Smartphone, Ghost, CreditCard, Calendar, BarChart3, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Invoices() {
    const navigate = useNavigate();
    const { invoices, fetchInvoices, deleteInvoice, activeStoreId, checkPermission } = useERPStore();
    
    const canAccessInvoices = checkPermission('canAccessAllInvoices');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [adminCode, setAdminCode] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const filteredInvoices = invoices.filter(inv => {
        const matchesTab = inv.type === activeTab;
        const partyName = activeTab === 'customer' ? (inv.customerName || '') : (inv.supplierName || '');
        const matchesSearch =
            inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            partyName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;

        return matchesTab && matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalDue = filteredInvoices.reduce((sum, inv) => sum + inv.amountDue, 0);

    const handleDelete = async () => {
        if (adminCode !== '1234') {
            toast.error("Wrong code. Please try again.");
            return;
        }

        if (invoiceToDelete) {
            await deleteInvoice(invoiceToDelete);
            toast.success("Invoice deleted.");
        }
        setShowDeleteDialog(false);
        setInvoiceToDelete(null);
        setAdminCode('');
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'paid': return { class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'PAID' };
            case 'draft': return { class: 'bg-slate-50 text-slate-400 border-slate-100', label: 'DRAFT' };
            case 'sent': return { class: 'bg-blue-50 text-blue-600 border-blue-100', label: 'SENT' };
            case 'overdue': return { class: 'bg-rose-50 text-rose-600 border-rose-100', label: 'OVERDUE' };
            case 'cancelled': return { class: 'bg-red-50 text-red-600 border-red-100', label: 'CANCELLED' };
            default: return { class: 'bg-slate-50 text-slate-400', label: status.toUpperCase() };
        }
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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Invoices</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">All Invoices • {filteredInvoices.length} Records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {canAccessInvoices && (
                            <Button
                                onClick={() => navigate('/invoices/new', { state: { type: activeTab } })}
                                className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                <Plus className="w-4 h-4 mr-2 text-indigo-400" />
                                New {activeTab.toUpperCase()} Invoice
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
                {!canAccessInvoices ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the invoice registry.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Sector Tabs */}
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'customer' | 'supplier')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-md p-2 rounded-[2rem] border border-white h-20 shadow-sm">
                            <TabsTrigger
                                value="customer"
                                className="rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-2xl transition-all h-full"
                            >
                                <ArrowDownLeft className="w-3.5 h-3.5 mr-3" />
                                Customer Invoices
                            </TabsTrigger>
                            <TabsTrigger
                                value="supplier"
                                className="rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-2xl transition-all h-full"
                            >
                                <ArrowUpRight className="w-3.5 h-3.5 mr-3" />
                                Supplier Invoices
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Intelligence Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                            <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-8 text-indigo-500">
                                <BarChart3 className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalAmount)}</h3>
                            <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 opacity-0 group-hover:opacity-100 transition-all rotate-12" />
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                            <div className="p-4 bg-rose-50 rounded-2xl w-fit mb-8 text-rose-500">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-rose-600">Exposure / Due</p>
                            <h3 className="text-3xl font-black text-rose-600 tracking-tighter">{formatCurrency(totalDue)}</h3>
                        </div>

                        <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 flex flex-col justify-center relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-white/10 rounded-2xl text-white">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Up to Date</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter Matrix */}
                    <div className="bg-white rounded-[3rem] p-8 shadow-sm border border-white flex flex-col md:flex-row gap-6">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH BY INVOICE NUMBER OR NAME..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-16 bg-slate-50 border-none rounded-2xl pl-16 pr-6 text-[10px] font-black uppercase tracking-[0.2em] focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="flex gap-4">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="h-16 bg-slate-50 border-none rounded-2xl px-10 text-[10px] font-black uppercase tracking-[0.2em] focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                            >
                                <option value="all">ALL STATUS</option>
                                <option value="draft">DRAFT</option>
                                <option value="sent">SENT</option>
                                <option value="paid">PAID</option>
                                <option value="overdue">OVERDUE</option>
                                <option value="cancelled">CANCELLED</option>
                            </select>
                            <button className="h-16 w-16 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center transition-all border border-slate-50">
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Ledger Grid */}
                    <div className="space-y-6">
                        {filteredInvoices.length > 0 ? (
                            filteredInvoices.map((inv) => {
                                const status = getStatusConfig(inv.status);
                                return (
                                    <div
                                        key={inv.id}
                                        onClick={() => navigate(`/invoices/${inv.id}`)}
                                        className="bg-white rounded-[3rem] p-10 border-2 border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-10"
                                    >
                                        <div className="flex items-center gap-10 flex-1">
                                            <div className={cn(
                                                "w-20 h-20 rounded-[2rem] flex flex-col items-center justify-center transition-all group-hover:scale-110 shadow-sm",
                                                inv.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                                                    inv.status === 'overdue' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                                            )}>
                                                <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 leading-none mb-1">INV</span>
                                                <span className="text-xl font-black tracking-tighter">#{inv.invoiceNumber.slice(-3)}</span>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-4 mb-3">
                                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                                                        {activeTab === 'customer' ? inv.customerName : inv.supplierName}
                                                    </h4>
                                                    <Badge className={cn("rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest border", status.class)}>
                                                        {status.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-x-8 gap-y-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <Calendar className="w-4 h-4" />
                                                        DATE: {new Date(inv.date).toLocaleDateString()}
                                                    </div>
                                                    {inv.dueDate && (
                                                        <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest",
                                                            new Date(inv.dueDate) < new Date() && inv.status !== 'paid' ? 'text-rose-500' : 'text-slate-400'
                                                        )}>
                                                            <Clock className="w-4 h-4" />
                                                            DUE DATE: {new Date(inv.dueDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10 self-end lg:self-center">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2 opacity-50">Total</p>
                                                <p className="text-3xl font-black text-slate-900 leading-none mb-3">{formatCurrency(inv.totalAmount)}</p>
                                                <div className={cn("flex items-center gap-2 justify-end text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest w-fit ml-auto",
                                                    inv.amountDue > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {inv.amountDue > 0 ? `DUE: ${formatCurrency(inv.amountDue)}` : 'PAID'}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setInvoiceToDelete(inv.id);
                                                        setShowDeleteDialog(true);
                                                    }}
                                                    className="p-4 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-all border border-slate-50 opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                                <h4 className="text-2xl font-black text-slate-900 uppercase">No Invoices Found</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center max-w-sm">No invoices match your search.</p>
                            </div>
                        )}
                    </div>
                  </>
                )}
            </main>

            {/* Delete Confirmation */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="rounded-[3rem] border-none p-12 shadow-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase mb-4">Confirm Delete</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-8 py-6">
                        <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center gap-6">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <AlertTriangle className="w-6 h-6 text-rose-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[11px] font-black uppercase text-rose-900 leading-none mb-2 tracking-widest">Warning</h4>
                                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-relaxed">This action will permanently delete the invoice.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Admin Code</Label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                    <ShieldCheck className="w-6 h-6 text-slate-300 group-focus-within:text-foreground transition-colors" />
                                </div>
                                <Input
                                    type="password"
                                    placeholder="••••"
                                    className="w-full bg-slate-50 border-none rounded-[1.5rem] h-16 pl-16 font-black tracking-[0.5em] focus:ring-2 focus:ring-primary"
                                    value={adminCode}
                                    onChange={(e) => setAdminCode(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-4">
                        <Button
                            className="w-full bg-rose-600 text-white rounded-2xl h-16 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700"
                            onClick={handleDelete}
                        >
                            Delete Invoice
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full rounded-2xl h-16 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-foreground"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
