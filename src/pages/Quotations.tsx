import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Search, Plus, FileText, Send, CheckCircle2, Clock, XCircle, ChevronRight, Filter, Calendar, Wallet, ArrowRight, User, ShieldCheck, Trash2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Quotations() {
    const navigate = useNavigate();
    const { getStoreQuotations, getTrashQuotations, deleteQuotation, restoreQuotation, checkPermission } = useERPStore();
    const canSeeQuotations = checkPermission('canAccessAllInvoices');
    const [showTrash, setShowTrash] = useState(false);
    
    const quotations = (showTrash ? getTrashQuotations() : getStoreQuotations())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredQuotations = quotations.filter(q => {
        const matchesSearch = q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { color: 'text-amber-500 bg-amber-50', icon: <Clock className="w-3 h-3" />, label: 'Awaiting Action' };
            case 'converted': return { color: 'text-emerald-500 bg-emerald-50', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Converted to Sale' };
            case 'expired': return { color: 'text-red-500 bg-red-50', icon: <XCircle className="w-3 h-3" />, label: 'Validity Expired' };
            case 'cancelled': return { color: 'text-slate-400 bg-slate-50', icon: <XCircle className="w-3 h-3" />, label: 'Voided' };
            default: return { color: 'text-slate-400 bg-slate-50', icon: null, label: 'Unknown' };
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Move this quotation to trash?')) {
            deleteQuotation(id);
            toast.success('Quotation moved to trash');
        }
    };

    const handleRestore = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await restoreQuotation(id);
        toast.success('Quotation restored successfully');
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                            {showTrash ? 'Quotation Archive' : 'Quotations Portal'}
                        </h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {filteredQuotations.length} {showTrash ? 'Trashed' : 'Active'} Estimates
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            onClick={() => setShowTrash(!showTrash)}
                            className={cn(
                                "p-3 rounded-2xl transition-all",
                                showTrash ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-slate-50 hover:bg-slate-100 text-slate-400"
                            )}
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl">
                            <Filter className="w-5 h-5 text-slate-400" />
                        </Button>
                        {canSeeQuotations && !showTrash && (
                            <Button onClick={() => navigate('/quotations/new')} className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                <Plus className="w-4 h-4 mr-2" />
                                Draft Proposal
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 h-full">
                {!canSeeQuotations ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage sales quotations and estimates.
                    </p>
                  </div>
                ) : (
                  <>
                    {!showTrash && (
                        /* Visual Intelligence Widgets */
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Pool</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{quotations.filter(q => q.status === 'active').length}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Conversion</p>
                            </div>

                            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pipeline Value</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">
                                    {formatCurrency(quotations.filter(q => q.status === 'active').reduce((sum, q) => sum + q.totalAmount, 0))}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Commitment</p>
                            </div>

                            <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-white/10 rounded-2xl text-white">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Success Rate</span>
                                </div>
                                <h2 className="text-3xl font-black leading-none mb-1">
                                    {quotations.length > 0 ? ((quotations.filter(q => q.status === 'converted').length / quotations.length) * 100).toFixed(0) : 0}%
                                </h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conversion Efficiency</p>
                            </div>
                        </div>
                    )}

                    {/* Performance Search Bar */}
                    <div className="bg-white rounded-[2rem] p-6 mb-8 border border-white shadow-sm flex items-center gap-6">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="Scan Quote # or Search Customer Entity..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-16 bg-[#fdfdfd] border-none rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all uppercase"
                            />
                        </div>

                        {!showTrash && (
                            <div className="flex gap-2">
                                {['all', 'pending', 'converted', 'expired'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={cn(
                                            "px-6 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            statusFilter === status ? "bg-[#1c1c1e] text-white shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                        )}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quotation Ledger */}
                    <div className="space-y-4">
                        {filteredQuotations.map((q) => {
                            const config = getStatusConfig(q.status);
                            return (
                                <div
                                    key={q.id}
                                    onClick={() => !showTrash && navigate(`/quotations/${q.id}`)}
                                    className={cn(
                                        "bg-white rounded-[2.5rem] p-8 border border-white shadow-sm transition-all duration-500 group flex items-center justify-between",
                                        !showTrash ? "hover:shadow-2xl cursor-pointer" : "opacity-90 grayscale-[0.5]"
                                    )}
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex flex-col items-center justify-center transition-all group-hover:scale-110 shadow-sm border border-slate-50 group-hover:border-slate-100">
                                            <span className="text-[9px] font-black uppercase text-slate-300">Ref</span>
                                            <span className="text-sm font-black text-slate-900 tracking-tighter">#{q.quotationNumber.slice(-3)}</span>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Estimate {q.quotationNumber}</h4>
                                                {!showTrash && (
                                                    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", config.color)}>
                                                        {config.icon}
                                                        {config.label}
                                                    </div>
                                                )}
                                                {showTrash && q.deletedAt && (
                                                    <div className="bg-red-50 text-red-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                        <Trash2 className="w-3 h-3" />
                                                        Deleted {new Date(q.deletedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(q.date).toLocaleDateString()}
                                                </div>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5" />
                                                    {q.customerName}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex items-center gap-10">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{formatCurrency(q.totalAmount)}</h3>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Provisioned Value</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {showTrash ? (
                                                <Button 
                                                    onClick={(e) => handleRestore(e, q.id)}
                                                    className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all group/restore"
                                                >
                                                    <RotateCcw className="w-5 h-5 transition-transform group-hover/restore:-rotate-45" />
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button 
                                                        onClick={(e) => handleDelete(e, q.id)}
                                                        variant="ghost" 
                                                        className="p-4 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                    <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredQuotations.length === 0 && (
                            <div className="bg-white rounded-[3rem] p-20 text-center border border-white flex flex-col items-center justify-center opacity-40">
                                <FileText className="w-20 h-20 text-slate-100 mb-6" strokeWidth={1} />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight font-mono">
                                    {showTrash ? 'Trash Empty' : 'Ledger Entry Null'}
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-10">
                                    {showTrash ? 'No trashed estimates identified.' : 'No estimates matching your parameters were identified in the registry.'}
                                </p>
                            </div>
                        )}
                    </div>
                  </>
                )}
            </main>
        </div>
    );
}
