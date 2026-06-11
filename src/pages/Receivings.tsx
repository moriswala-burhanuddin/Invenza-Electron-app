import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Plus, Search, Truck, Calendar, ChevronRight, PackageCheck, PackageSearch, ArrowLeft, MoreHorizontal, Filter, Download, Zap, Clock, AlertCircle, CheckCircle2, PackageX, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

export default function Receivings() {
    const navigate = useNavigate();
    const { receivings, accounts, suppliers, checkPermission } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');

    const canSeePurchases = checkPermission('canSeeDetailedPurchases');

    const filteredReceivings = (receivings || []).filter(r =>
        r.receivingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suppliers.find(s => s.id === r.supplierId)?.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const totalReceived = filteredReceivings.reduce((sum, r) => sum + r.totalAmount, 0);
    const amountDue = filteredReceivings.reduce((sum, r) => sum + (r.amountDue || 0), 0);
    const pendingShipments = (receivings || []).filter(r => r.status === 'suspended' || r.status === 'draft').length;

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed': return { icon: <CheckCircle2 className="w-3 h-3" />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Received' };
            case 'suspended': return { icon: <Clock className="w-3 h-3" />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Delayed' };
            case 'draft': return { icon: <AlertCircle className="w-3 h-3" />, class: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Processing' };
            case 'returned': return { icon: <PackageX className="w-3 h-3" />, class: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Rejected' };
            default: return { icon: <Clock className="w-3 h-3" />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: status };
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Logistics Hub</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Acquisitions Registry • {filteredReceivings.length} Inbound Nodes</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="group relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="TRACK SHIPMENT..."
                                className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-6 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary w-64 placeholder:text-slate-200"
                            />
                        </div>
                        <Button variant="ghost" className="rounded-2xl h-12 w-12 p-0 bg-slate-50">
                            <Filter className="w-5 h-5 text-slate-400" />
                        </Button>
                        <Button onClick={() => navigate('/receivings/new')} className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            New Receiving
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 h-full">
                {!canSeePurchases ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the receiving and logistics records.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Logistics Performance Indices */}
                    <div className="grid md:grid-cols-4 gap-6 mb-12">
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-6 text-emerald-500">
                                <PackageCheck className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Settled Value</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalReceived)}</h3>
                        </div>
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-rose-50 rounded-xl w-fit mb-6 text-rose-500">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Exposure Payable</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(amountDue)}</h3>
                        </div>
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6 text-indigo-500">
                                <Clock className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transit Nodes</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{pendingShipments} Active</h3>
                        </div>
                        <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/10 flex flex-col justify-center relative overflow-hidden group">
                            <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                            <div className="relative z-10">
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Automated Report</p>
                                <Button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl h-12 font-black uppercase text-[9px] tracking-widest">
                                    <Download className="w-3.5 h-3.5 mr-2" />
                                    Export Ledger
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Logistics Registry */}
                    <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white min-h-[600px]">
                        <div className="flex items-center justify-between mb-12">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Incoming Stock</h3>
                        </div>

                        {filteredReceivings.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredReceivings.map((r, idx) => {
                                    const supplier = suppliers.find(s => s.id === r.supplierId);
                                    const status = getStatusConfig(r.status);
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => navigate(`/receivings/${r.id}`)}
                                            className="bg-slate-50 hover:bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={cn("px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-2", status.class)}>
                                                    {status.icon}
                                                    {status.label}
                                                </div>
                                                <div className="p-2 bg-white rounded-xl text-slate-200 group-hover:text-foreground transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </div>
                                            </div>

                                            <div className="space-y-1 mb-8">
                                                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight font-mono">{r.receivingNumber}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{supplier?.companyName || 'UNIDENTIFIED_SOURCE'}</p>
                                            </div>

                                            <div className="flex items-end justify-between">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Calendar className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {new Date(r.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <PackageSearch className="w-3 h-3" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                                                            {r.purchaseOrderId ? 'Hashed Link' : 'Direct Node'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{formatCurrency(r.totalAmount)}</p>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", r.amountDue > 0 ? "bg-rose-500" : "bg-emerald-500")} />
                                                        <span className={cn("text-[9px] font-black uppercase tracking-widest", r.amountDue > 0 ? "text-rose-500" : "text-emerald-500")}>
                                                            {r.amountDue > 0 ? `Payable: ${formatCurrency(r.amountDue)}` : 'Node Settled'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-40 text-center opacity-30">
                                <Truck className="w-24 h-24 text-slate-100 mx-auto mb-8" />
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Logistics Null</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-20 text-center mx-auto max-w-lg">
                                    No inbound acquisitions detected in the current sector. Initialize a new receiving node to begin logistics flow.
                                </p>
                            </div>
                        )}
                    </div>
                  </>
                )}
            </main>

            {/* Elevated FAB */}
            <button
                onClick={() => navigate('/receivings/new')}
                className="fixed bottom-12 right-12 w-20 h-20 bg-primary text-white rounded-full shadow-2xl shadow-black/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus className="w-8 h-8 relative z-10" />
            </button>
        </div>
    );
}
