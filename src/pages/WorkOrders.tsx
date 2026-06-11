import { useState } from 'react';
import { useERPStore, WorkOrder } from '@/lib/store-data';
import { Search, ClipboardList, Clock, CheckCircle2, AlertCircle, User, ArrowRight, ArrowLeft, MoreHorizontal, RotateCcw, Zap, Ghost, Smartphone, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function WorkOrders() {
    const navigate = useNavigate();
    const { sales, workOrders, users, updateWorkOrder, resumeSale, getStoreCustomers, activeStoreId } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');

    const customers = getStoreCustomers();

    const filteredWorkOrders = workOrders
        .filter(wo => wo.storeId === activeStoreId)
        .filter(wo => {
            const sale = sales.find(s => s.id === wo.saleId);
            const customer = sale?.customerId ? customers.find(c => c.id === sale.customerId) : null;
            const searchStr = searchQuery.toLowerCase();
            return (
                (sale?.invoiceNumber.toLowerCase().includes(searchStr)) ||
                (customer?.name.toLowerCase().includes(searchStr)) ||
                (wo.status.toLowerCase().includes(searchStr))
            );
        });

    const getStatusBadge = (status: WorkOrder['status']) => {
        switch (status) {
            case 'pending': return <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest">PENDING_QUEUE</Badge>;
            case 'in_progress': return <Badge className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest">ACTIVE_PHASE</Badge>;
            case 'completed': return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest">FINALIZED_NODE</Badge>;
            default: return null;
        }
    };

    const getNextStatus = (status: WorkOrder['status']): WorkOrder['status'] | null => {
        if (status === 'pending') return 'in_progress';
        if (status === 'in_progress') return 'completed';
        return null;
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Logistics Workflow Nexus</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Operational Queue • Service Tracking</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl text-blue-600 border border-blue-100">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">{workOrders.length} Passive Orders Detected</span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
                {/* Search Matrix */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                        <Search className="w-6 h-6 text-slate-300 group-focus-within:text-foreground transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="IDENTIFY BY INVOICE_REF, ENTITY NAME, OR STATUS NODE..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-20 bg-white border-none rounded-[2.5rem] pl-20 pr-8 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary shadow-sm"
                    />
                </div>

                {/* Workflow Queue */}
                <div className="space-y-6">
                    {filteredWorkOrders.map((wo) => {
                        const sale = sales.find(s => s.id === wo.saleId);
                        const customer = sale?.customerId ? customers.find(c => c.id === sale.customerId) : null;
                        const nextStatus = getNextStatus(wo.status);

                        return (
                            <div key={wo.id} className="bg-white rounded-[3rem] p-8 shadow-sm border border-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
                                <div className={cn("absolute left-0 top-0 bottom-0 w-2",
                                    wo.status === 'pending' ? 'bg-amber-400' :
                                        wo.status === 'in_progress' ? 'bg-blue-500' :
                                            'bg-emerald-500'
                                )} />

                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pl-6">
                                    <div className="flex items-start gap-8 flex-1">
                                        <div className={cn("w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all shadow-sm",
                                            wo.status === 'pending' ? 'bg-amber-50 text-amber-500' :
                                                wo.status === 'in_progress' ? 'bg-blue-50 text-blue-500' :
                                                    'bg-emerald-50 text-emerald-500'
                                        )}>
                                            <ClipboardList className="w-7 h-7" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <Badge className="bg-slate-900 text-white rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                                                    #{sale?.invoiceNumber || 'INV_UNKNOWN'}
                                                </Badge>
                                                {getStatusBadge(wo.status)}
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 truncate group-hover:text-blue-600 transition-colors">
                                                {customer?.name || 'WALK-IN_ENTITY'}
                                            </h3>
                                            <div className="flex flex-wrap gap-x-8 gap-y-2">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <Clock className="w-4 h-4" />
                                                    TEMPORAL MARK: {format(new Date(wo.updatedAt), 'dd MMM HH:mm')}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <User className="w-4 h-4" />
                                                    OPERATIVE: {wo.assignedTo || 'UNASSIGNED'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 self-end lg:self-center bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                                        <div className="group/select relative">
                                            <select
                                                className="h-12 w-48 bg-white border-none rounded-xl px-5 text-[9px] font-black uppercase tracking-widest appearance-none focus:ring-2 focus:ring-primary shadow-sm"
                                                value={wo.assignedTo || ''}
                                                onChange={(e) => updateWorkOrder(wo.id, { assignedTo: e.target.value })}
                                            >
                                                <option value="">ASSIGN_OPERATIVE</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.name}>{u.name}</option>
                                                ))}
                                            </select>
                                            <LayoutGrid className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
                                        </div>

                                        <button
                                            onClick={async () => {
                                                await resumeSale(wo.saleId);
                                                navigate('/sales/new');
                                            }}
                                            className="h-12 px-6 bg-white border border-slate-200 text-foreground rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-3"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Resume Protocol
                                        </button>

                                        {nextStatus && (
                                            <button
                                                onClick={() => updateWorkOrder(wo.id, { status: nextStatus })}
                                                className="h-12 px-6 bg-primary text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-[1.05] transition-all shadow-xl shadow-black/10 flex items-center gap-3"
                                            >
                                                SHIFT TO {nextStatus.replace('_', ' ')}
                                                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                            </button>
                                        )}

                                        {wo.status === 'completed' && (
                                            <div className="flex items-center gap-4 px-6 py-3 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span className="font-black text-[9px] uppercase tracking-[0.2em]">NODE_FINALIZED</span>
                                            </div>
                                        )}

                                        <button className="p-3 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-sm border border-slate-50">
                                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredWorkOrders.length === 0 && (
                    <div className="py-40 text-center opacity-30 flex flex-col items-center">
                        <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                        <h4 className="text-2xl font-black text-slate-900 uppercase">Queue Synchronized</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center">No active work orders identified within this sector. Operational flow is optimal.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
