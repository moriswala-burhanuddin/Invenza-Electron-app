import { useState, useRef, useEffect } from 'react';
import { useERPStore } from '@/lib/store-data';
import {
    Search, Plus, Mail, Tags, FileText, Download,
    Trash2, XCircle, ChevronDown, Upload, FileSpreadsheet,
    Settings, Wrench, Edit, Banknote, Users as UsersIcon, Home, Barcode, Building2, Star,
    Filter, Activity, Truck, ShieldCheck, ArrowRight, MoreHorizontal, Globe, DollarSign,
    Zap, CheckCircle2, Phone, Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

export default function Suppliers() {
    const navigate = useNavigate();
    const { suppliers, deleteSupplier, checkPermission } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');

    const canSeeSuppliers = checkPermission('canSeeSuppliers');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filterStatus, setFilterStatus] = useState('all');
    
    // Email Modal State
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const filteredSuppliers = suppliers.filter(supplier => {
        const matchesSearch = supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            supplier.phone?.includes(searchQuery);
        const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredSuppliers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredSuppliers.map(s => s.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} supplier(s)?`)) {
            for (const id of selectedIds) {
                await deleteSupplier(id);
            }
            toast.success('Suppliers deleted.');
            setSelectedIds([]);
        }
    };
    const handleSendEmail = async () => {
        if (selectedIds.length === 0) return;
        setIsSending(true);
        try {
            for (const id of selectedIds) {
                const supplier = suppliers.find(s => s.id === id);
                if (!supplier || !supplier.email) continue;

                // @ts-expect-error - window.electronAPI is injected via preload
                const result = await window.electronAPI.sendSupplierEmail({
                    supplierEmail: supplier.email,
                    subject: emailSubject,
                    message: emailMessage
                });

                if (!result.success) throw new Error(result.error);
            }
            toast.success(`Correspondence dispatched to ${selectedIds.length} recipient(s).`);
            setIsEmailModalOpen(false);
            setEmailSubject('');
            setEmailMessage('');
            setSelectedIds([]);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send emails';
            toast.error(errorMessage);
        } finally {
            setIsSending(false);
        }
    };

    const totalExposure = suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
    const preferredCount = suppliers.filter(s => s.isPreferred).length;

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-40 text-slate-900">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Suppliers</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{suppliers.length} Suppliers</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <Download className="w-5 h-5 text-slate-400" />
                        </button>
                        <div className="h-10 w-px bg-slate-100 mx-2" />
                        <Button onClick={() => navigate('/suppliers/new')} className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Supplier
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {!canSeeSuppliers ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the supplier registry.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Visual Intelligence Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                            </div>
                            <h2 className="text-3xl font-black leading-none mb-1">{suppliers.length}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Suppliers</p>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                                    <Star className="w-6 h-6" />
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Preferred</span>
                            </div>
                            <h2 className="text-3xl font-black leading-none mb-1">{preferredCount}</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preferred Suppliers</p>
                        </div>

                        <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-white/10 rounded-2xl text-rose-400">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Amount Owed</span>
                            </div>
                            <h2 className="text-3xl font-black leading-none mb-1">{formatCurrency(totalExposure)}</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outstanding Payables</p>
                        </div>
                    </div>

                    {/* Registry Controls */}
                    <div className="bg-white rounded-[2.5rem] p-6 mb-8 border border-white shadow-sm flex items-center justify-between gap-6">
                        <div className="flex-1 relative group max-w-xl">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH BY NAME, EMAIL OR PHONE..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-16 bg-[#F8F8FA] border-none rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all uppercase"
                            />
                        </div>

                        <div className="flex gap-2">
                            {['all', 'active', 'inactive'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={cn(
                                        "px-6 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        filterStatus === s ? "bg-primary text-white shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div className="h-10 w-px bg-slate-100" />

                        <div className="flex items-center gap-3">
                            <button onClick={handleSelectAll} className={cn("px-6 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", selectedIds.length > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                                {selectedIds.length === filteredSuppliers.length ? "Deselect All" : `Select ${filteredSuppliers.length}`}
                            </button>
                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-2 animate-in slide-in-from-right duration-500">
                                    <Button onClick={() => setIsEmailModalOpen(true)} variant="outline" className="h-16 rounded-2xl border-none bg-emerald-50/50 hover:bg-emerald-100 text-emerald-600 font-black uppercase text-[9px] px-6">Email ({selectedIds.length})</Button>
                                    <Button onClick={handleDeleteSelected} variant="ghost" className="h-16 w-16 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 p-0"><Trash2 className="w-5 h-5" /></Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Provider Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSuppliers.map((s) => {
                            const isSelected = selectedIds.includes(s.id);
                            return (
                                <div
                                    key={s.id}
                                    className={cn(
                                        "bg-white rounded-[2.5rem] p-8 border hover:shadow-2xl transition-all duration-500 group relative overflow-hidden cursor-pointer",
                                        isSelected ? "border-primary shadow-xl" : "border-white shadow-sm"
                                    )}
                                    onClick={() => toggleSelection(s.id)}
                                >
                                    {/* Selection Indicator */}
                                    <div className={cn("absolute top-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary text-white" : "border-slate-100 group-hover:border-slate-200")}>
                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </div>

                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-300 font-black text-xl group-hover:bg-primary group-hover:text-white transition-all overflow-hidden relative shadow-inner">
                                            <Building2 className="w-8 h-8" />
                                            <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-10 scale-150" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-lg text-slate-900 uppercase tracking-tight truncate leading-tight group-hover:text-foreground transition-colors">{s.companyName}</h4>
                                                {s.isPreferred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                                <ShieldCheck className="w-3 h-3" />
                                                Code: {s.supplierCode || 'Unassigned'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> City</span>
                                            <span className="text-slate-900">{s.city || 'Not Set'}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-2"><DollarSign className="w-3.5 h-3.5" /> Balance</span>
                                            <span className={cn(s.currentBalance > 0 ? "text-red-500" : "text-emerald-500")}>
                                                {formatCurrency(s.currentBalance || 0)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Reliability</span>
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star key={star} className={cn("w-2.5 h-2.5", star <= (s.rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-100 fill-slate-100")} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/suppliers/${s.id}`); }}
                                            className="flex-1 bg-slate-50 hover:bg-primary hover:text-white text-slate-900 rounded-[1.2rem] h-14 font-black uppercase text-[9px] tracking-widest transition-all shadow-none"
                                        >
                                            View Profile
                                            <ArrowRight className="w-3 h-3 ml-2" />
                                        </Button>
                                        <button onClick={(e) => e.stopPropagation()} className="w-14 h-14 rounded-[1.2rem] bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all text-slate-300 hover:text-foreground">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredSuppliers.length === 0 && (
                            <div className="col-span-full bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-40">
                                <Building2 className="w-20 h-20 text-slate-100 mb-6" strokeWidth={1} />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Suppler Registry Null</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-10">No supply entities matching your parameters were identified in the registry.</p>
                            </div>
                        )}
                    </div>
                  </>
                )}
            </main>

            {/* Professional Correspondence Modal */}
            {isEmailModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-primary/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">Send Correspondence</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Recipient: {selectedIds.length === 1 ? suppliers.find(s => s.id === selectedIds[0])?.companyName : `${selectedIds.length} Suppliers`}</p>
                            </div>
                            <button onClick={() => setIsEmailModalOpen(false)} className="p-4 bg-white hover:bg-slate-100 rounded-2xl transition-all">
                                <XCircle className="w-6 h-6 text-slate-300" />
                            </button>
                        </div>
                        
                        <div className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. INQUIRY REGARDING PENDING ORDER"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="w-full h-16 bg-[#F8F8FA] border-none rounded-2xl px-8 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all uppercase"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
                                <textarea 
                                    placeholder="TYPE YOUR CORRESPONDENCE HERE..."
                                    rows={8}
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    className="w-full bg-[#F8F8FA] border-none rounded-[2rem] p-8 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all uppercase resize-none"
                                />
                            </div>

                            <div className="bg-amber-50 rounded-2xl p-6 flex items-start gap-4">
                                <Zap className="w-5 h-5 text-amber-500 mt-0.5" />
                                <p className="text-[9px] font-black text-amber-600/80 uppercase tracking-widest leading-relaxed">
                                    THIS EMAIL WILL BE SENT THROUGH THE ENTERPRISE CLOUD GATEWAY. YOUR ERP PROFILE EMAIL WILL BE USED AS THE REPLY-TO ADDRESS TO ENSURE TRUST.
                                </p>
                            </div>
                        </div>

                        <div className="p-10 bg-slate-50/50 flex gap-4">
                            <Button 
                                onClick={() => setIsEmailModalOpen(false)}
                                variant="ghost" 
                                className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSendEmail}
                                disabled={isSending || !emailSubject || !emailMessage}
                                className="flex-[2] bg-primary text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20"
                            >
                                {isSending ? "Dispatching..." : "Send Email"}
                                <Mail className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Finalized Supplier Registry component
