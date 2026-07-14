import React, { useState, useEffect } from 'react';
import {
    Search, Plus, CheckCircle2, XCircle, AlertCircle, Clock,
    Building2, Calendar, Wallet, ArrowUpRight, ArrowDownLeft,
    MoreVertical, ArrowLeft, FileCheck, Ghost, X, ShieldCheck
} from 'lucide-react';
import { useERPStore, Cheque } from '../../lib/store-data';
import { useStoreConfig } from '../../lib/store-config';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn, formatCurrency, convertToBase } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Cheques = () => {
    const { cheques, fetchCheques, addCheque, updateChequeStatus, deleteCheque, checkPermission, activeStoreId } = useERPStore();
    const { baseCurrency } = useStoreConfig();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Cheque['status']>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'supplier' | 'customer'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
    const [newCheque, setNewCheque] = useState<Omit<Cheque, 'id' | 'updatedAt' | 'storeId' | 'status'>>({
        partyType: 'customer', partyId: '', partyName: '', chequeNumber: '', bankName: '', amount: 0,
        issueDate: new Date().toISOString().split('T')[0],
    });

    const canManageCheques = checkPermission('canManageCheques');

    useEffect(() => { fetchCheques(); }, [fetchCheques]);

    const handleAddCheque = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Convert the display amount (e.g. INR) to the base system amount (UGX)
            const baseAmount = convertToBase(newCheque.amount, baseCurrency);
            
            await addCheque({
                ...newCheque,
                amount: baseAmount,
                originalAmount: newCheque.amount,
                originalCurrency: baseCurrency
            });
            setShowAddModal(false);
            setNewCheque({ partyType: 'customer', partyId: '', partyName: '', chequeNumber: '', bankName: '', amount: 0, issueDate: new Date().toISOString().split('T')[0] });
            toast.success(`Cheque added successfully. Stored as UGX ${baseAmount.toLocaleString()}`);
        } catch { toast.error('Error: Could not add cheque.'); }
    };

    const filteredCheques = cheques.filter(chq => {
        const matchesSearch = chq.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chq.chequeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chq.bankName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || chq.status === statusFilter;
        const matchesType = typeFilter === 'all' || chq.partyType === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode; dotClass: string }> = {
        pending: { label: 'Pending', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dotClass: 'bg-amber-400', icon: <Clock className="w-3.5 h-3.5" /> },
        cleared: { label: 'Cleared', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dotClass: 'bg-emerald-400', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        bounced: { label: 'Bounced', class: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dotClass: 'bg-rose-400', icon: <AlertCircle className="w-3.5 h-3.5" /> },
        cancelled: { label: 'Cancelled', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dotClass: 'bg-slate-400', icon: <XCircle className="w-3.5 h-3.5" /> },
    };

    const totalPending = cheques.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
    const totalCleared = cheques.filter(c => c.status === 'cleared').reduce((s, c) => s + c.amount, 0);
    const totalBounced = cheques.filter(c => c.status === 'bounced').reduce((s, c) => s + c.amount, 0);
    const totalAll = cheques.reduce((s, c) => s + c.amount, 0);

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
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cheque Management</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                Securely track and manage {cheques.length} cheque transactions
                            </p>
                        </div>
                    </div>
                    {canManageCheques && (
                      <Button onClick={() => setShowAddModal(true)} className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                          <Plus className="w-4 h-4 text-white/50" />
                          Add New Cheque
                      </Button>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
                {!canManageCheques ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the Cheque Registry.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Intelligence Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Portfolio', amount: totalAll, color: 'bg-indigo-50 text-indigo-500', icon: <Wallet className="w-5 h-5" /> },
                            { label: 'Pending Clearance', amount: totalPending, color: 'bg-amber-50 text-amber-500', icon: <Clock className="w-5 h-5" /> },
                            { label: 'Cleared Instruments', amount: totalCleared, color: 'bg-emerald-50 text-emerald-500', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                            { label: 'Dishonored Orders', amount: totalBounced, color: 'bg-rose-50 text-rose-500', icon: <AlertCircle className="w-5 h-5" /> },
                        ].map(item => (
                            <div key={item.label} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                                <div className={cn("p-3 rounded-xl w-fit mb-6", item.color)}>
                                    {item.icon}
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(item.amount)}</h3>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-[2rem] p-6 border border-white shadow-sm flex flex-col lg:flex-row gap-6 items-center">
                        <div className="relative group w-full lg:flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name, number or bank..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="h-14 bg-slate-50 border-none rounded-2xl pl-14 pr-6 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary w-full placeholder:text-slate-200"
                            />
                        </div>
                        <div className="flex flex-wrap justify-center gap-3 w-full lg:w-auto">
                            {(['all', 'pending', 'cleared', 'bounced', 'cancelled'] as const).map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={cn("px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                        statusFilter === s ? "bg-primary text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100")}
                                >{s}</button>
                            ))}
                        </div>
                        <div className="flex gap-3 w-full lg:w-auto justify-center">
                            {[{ v: 'all', l: 'ALL' }, { v: 'customer', l: 'INCOMING' }, { v: 'supplier', l: 'OUTGOING' }].map(t => (
                                <button key={t.v} onClick={() => setTypeFilter(t.v as any)}
                                    className={cn("px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                        typeFilter === t.v ? "bg-primary text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100")}
                                >{t.l}</button>
                            ))}
                        </div>
                    </div>

                    {/* Cheque Cards */}
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[400px]">
                        {filteredCheques.length > 0 ? (
                            <div className="space-y-4">
                                {filteredCheques.map(chq => {
                                    const sc = statusConfig[chq.status];
                                    const isIncoming = chq.partyType === 'customer';
                                    return (
                                        <div key={chq.id} 
                                            onClick={() => setSelectedCheque(chq)}
                                            className="bg-primary p-8 rounded-[2.5rem] border border-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-6"
                                        >
                                            <div className="flex items-center gap-8 flex-1">
                                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", isIncoming ? 'bg-white/10 text-emerald-400' : 'bg-white/10 text-rose-400')}>
                                                    {isIncoming ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className={cn("px-4 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5", sc.class)}>
                                                            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", sc.dotClass)} />
                                                            {sc.label}
                                                        </span>
                                                        <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-white/10", isIncoming ? "text-emerald-400" : "text-rose-400")}>
                                                            {isIncoming ? 'Incoming' : 'Outgoing'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xl font-black text-white uppercase tracking-tight mb-1">{chq.partyName}</h4>
                                                    <div className="flex items-center gap-6 text-[10px] font-black text-white/50 uppercase tracking-widest">
                                                        <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 opacity-50" />{chq.bankName}</span>
                                                        <span className="font-mono opacity-50">#{chq.chequeNumber}</span>
                                                        <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 opacity-50" />{format(new Date(chq.issueDate), 'dd MMM yyyy')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-white tracking-tighter">{formatCurrency(chq.amount)}</p>
                                                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Cheque Amount</p>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                    {chq.status === 'pending' && canManageCheques && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); updateChequeStatus(chq.id, 'cleared', new Date().toISOString().split('T')[0]); toast.success("Cheque Cleared successfully."); }}
                                                                className="h-12 w-12 rounded-2xl bg-white/10 text-emerald-400 hover:bg-white/20 flex items-center justify-center transition-all">
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); updateChequeStatus(chq.id, 'bounced'); toast.error("Cheque marked as Bounced."); }}
                                                                className="h-12 w-12 rounded-2xl bg-white/10 text-rose-400 hover:bg-white/20 flex items-center justify-center transition-all">
                                                                <AlertCircle className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {canManageCheques && (
                                                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this cheque record?')) { deleteCheque(chq.id); toast.success('Cheque deleted.'); } }}
                                                          className="h-12 w-12 rounded-2xl bg-white/10 text-white/40 hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-all">
                                                          <MoreVertical className="w-5 h-5" />
                                                      </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-32 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Cheques Found</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-lg mx-auto leading-relaxed">No cheques found matching your criteria. Add a new cheque to get started.</p>
                            </div>
                        )}
                    </div>
                  </>
                )}
            </main>

            {/* Add Cheque Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-primary/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
                    <div className="bg-white rounded-[4rem] shadow-2xl max-w-xl w-full overflow-hidden border border-white animate-in zoom-in-95 duration-500">
                        <form onSubmit={handleAddCheque}>
                            <div className="p-12 pb-8 flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Add New Cheque</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Enter the details to register the cheque</p>
                                </div>
                                <button type="button" onClick={() => setShowAddModal(false)} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-3xl transition-all">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="px-12 pb-12 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Party Name</label>
                                    <input type="text" required value={newCheque.partyName} onChange={e => setNewCheque({ ...newCheque, partyName: e.target.value })} placeholder="e.g. Acme Corp or John Doe" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200 outline-none" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cheque Direction</label>
                                        <select value={newCheque.partyType} onChange={e => setNewCheque({ ...newCheque, partyType: e.target.value as any })} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none">
                                            <option value="customer">Incoming (from Customer)</option>
                                            <option value="supplier">Outgoing (to Supplier)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cheque Number</label>
                                        <input type="text" required value={newCheque.chequeNumber} onChange={e => setNewCheque({ ...newCheque, chequeNumber: e.target.value })} placeholder="123456" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black font-mono focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-200" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                        <input type="text" required value={newCheque.bankName} onChange={e => setNewCheque({ ...newCheque, bankName: e.target.value })} placeholder="e.g. HDFC, SBI..." className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-200" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Face Value ({baseCurrency})*</label>
                                            {baseCurrency !== 'UGX' && newCheque.amount > 0 && (
                                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                                                    ≈ UGX {convertToBase(newCheque.amount, baseCurrency).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        <input 
                                            type="number" 
                                            required 
                                            value={newCheque.amount || ''} 
                                            onChange={e => setNewCheque({ ...newCheque, amount: Number(e.target.value) })} 
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-xl font-black focus:ring-2 focus:ring-primary outline-none" 
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-3 col-span-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Issue Date</label>
                                        <input type="date" required value={newCheque.issueDate} onChange={e => setNewCheque({ ...newCheque, issueDate: e.target.value })} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-10 bg-slate-50 flex gap-4 border-t border-slate-100">
                                <Button type="button" onClick={() => setShowAddModal(false)} variant="ghost" className="flex-1 h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
                                <Button type="submit" className="flex-1 h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20">Add Cheque</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cheque Details Modal */}
            {selectedCheque && (
                <div className="fixed inset-0 bg-primary/80 backdrop-blur-xl flex items-center justify-center z-[110] p-6" onClick={() => setSelectedCheque(null)}>
                    <div className="bg-white rounded-[4rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-white animate-in slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
                        <div className="p-12 pb-8 flex justify-between items-start">
                            <div className="flex-1">
                                <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900">Cheque Details</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Detailed view of cheque instrument</p>
                            </div>
                            <button onClick={() => setSelectedCheque(null)} className="p-4 bg-slate-50 hover:bg-slate-100 rounded-3xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="px-12 pb-12 space-y-10">
                            <div className="bg-primary/5 rounded-[2.5rem] p-10 flex items-center justify-between border border-primary/10">
                                <div className="flex items-center gap-6">
                                    <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center", selectedCheque.partyType === 'customer' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500')}>
                                        {selectedCheque.partyType === 'customer' ? <ArrowDownLeft className="w-10 h-10" /> : <ArrowUpRight className="w-10 h-10" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <div className="flex items-center gap-3">
                                            <span className={cn("px-4 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5", statusConfig[selectedCheque.status].class)}>
                                                {statusConfig[selectedCheque.status].icon} {statusConfig[selectedCheque.status].label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                    <h2 className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(selectedCheque.amount)}</h2>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Party Name</p>
                                        <p className="text-xl font-black text-slate-900 uppercase">{selectedCheque.partyName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direction</p>
                                        <p className="text-xl font-black text-slate-900 uppercase">{selectedCheque.partyType === 'customer' ? 'Incoming' : 'Outgoing'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Issue Date</p>
                                        <p className="text-xl font-black text-slate-900 uppercase">{format(new Date(selectedCheque.issueDate), 'dd MMMM yyyy')}</p>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bank Name</p>
                                        <p className="text-xl font-black text-slate-900 uppercase">{selectedCheque.bankName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cheque Number</p>
                                        <p className="text-xl font-mono font-black text-slate-900 tracking-wider">#{selectedCheque.chequeNumber}</p>
                                    </div>
                                    {selectedCheque.clearingDate && (
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clearing Date</p>
                                            <p className="text-xl font-black text-slate-900 uppercase">{format(new Date(selectedCheque.clearingDate), 'dd MMMM yyyy')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-10 bg-slate-50 flex gap-4 border-t border-slate-100">
                            {selectedCheque.status === 'pending' && canManageCheques && (
                                <>
                                    <Button onClick={() => { updateChequeStatus(selectedCheque.id, 'bounced'); setSelectedCheque(null); toast.error("Cheque marked as Bounced."); }} variant="outline" className="flex-1 h-16 rounded-[1.5rem] border-rose-100 text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50">Mark Bounced</Button>
                                    <Button onClick={() => { updateChequeStatus(selectedCheque.id, 'cleared', new Date().toISOString().split('T')[0]); setSelectedCheque(null); toast.success("Cheque Cleared successfully."); }} className="flex-2 h-16 rounded-[1.5rem] bg-emerald-500 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-500/20">Authorize Clearance</Button>
                                </>
                            )}
                            {selectedCheque.status !== 'pending' && (
                                <Button onClick={() => setSelectedCheque(null)} className="flex-1 h-16 rounded-[1.5rem] bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">Close</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cheques;
