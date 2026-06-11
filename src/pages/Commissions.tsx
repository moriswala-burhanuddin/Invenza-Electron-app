import { useState, useEffect } from 'react';
import { useERPStore, Commission, User } from '@/lib/store-data';
import { Award, TrendingUp, CheckCircle2, Clock, Search, ChevronRight, ArrowLeft, Filter, DollarSign, Wallet, MoreHorizontal, Ghost, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Commissions() {
    const { activeStoreId, users, checkPermission } = useERPStore();
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const canManageCommissions = checkPermission('canManageCommissions');

    useEffect(() => {
        const fetchCommissions = async () => {
            if (window.electronAPI && window.electronAPI.getCommissions) {
                setIsLoading(true);
                try {
                    const data = await window.electronAPI.getCommissions(activeStoreId);
                    setCommissions(data as Commission[]);
                } catch (error) {
                    toast.error('Failed to load commissions');
                } finally {
                    setIsLoading(false);
                }
            }
        };
        if (canManageCommissions) {
          fetchCommissions();
        }
    }, [activeStoreId, canManageCommissions]);

    const getUserName = (userId: string) => {
        return users.find(u => u.id === userId)?.name || 'Unknown Staff';
    };

    const filteredCommissions = commissions.filter(c =>
        getUserName(c.userId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.saleId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Incentive Ledger Matrix</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Staff Performance • Rewards Cluster</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {canManageCommissions && (
                          <Badge className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border-indigo-100">
                              {commissions.length} Entries Detected
                          </Badge>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
                {!canManageCommissions ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage staff commissions.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Performance Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
                            <TrendingUp className="absolute -right-10 -top-10 w-48 h-48 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-white/10 rounded-2xl text-blue-400">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Unpaid Magnitude</p>
                                        <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(totalPending)}</h2>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5">Awaiting Authorization</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white flex items-center justify-between overflow-hidden relative group">
                            <Award className="absolute -right-10 -bottom-10 w-48 h-48 text-indigo-500/5 -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                            <div className="relative z-10 flex-1">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Staff Rewards Nodes</h3>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-[240px]">High-fidelity tracking of performance-based incentives across all sectors.</p>
                            </div>
                            <div className="relative z-10 text-right">
                                <p className="text-5xl font-black text-slate-900 tracking-tighter">{commissions.length}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Records</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter & Search */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                            <Search className="w-6 h-6 text-slate-300 group-focus-within:text-foreground transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="SEARCH BY OPERATIVE IDENTIFIER OR SALE REFERENCE..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-20 bg-white border-none rounded-[2.5rem] pl-20 pr-8 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary shadow-sm"
                        />
                    </div>

                    {/* Ledger Matrix */}
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[500px] overflow-hidden">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-900 rounded-xl text-white">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Transactional Ledger</h3>
                            </div>
                            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                                <Filter className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-6">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synchronizing Incentive Registry...</p>
                            </div>
                        ) : filteredCommissions.length > 0 ? (
                            <div className="overflow-x-auto -mx-12 px-12 pb-8">
                                <table className="w-full text-left border-separate border-spacing-y-4">
                                    <thead>
                                        <tr>
                                            <th className="px-8 pb-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Staff Operative</th>
                                            <th className="px-8 pb-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Sale Node</th>
                                            <th className="px-8 pb-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Coefficient</th>
                                            <th className="px-8 pb-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Magnitude</th>
                                            <th className="px-8 pb-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCommissions.map((comm) => (
                                            <tr key={comm.id} className="group cursor-default">
                                                <td className="bg-slate-50 py-8 px-8 rounded-l-[2rem] group-hover:bg-primary group-hover:text-white transition-all duration-300 border-y border-transparent">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-slate-900 text-[10px] shadow-sm uppercase">
                                                            {getUserName(comm.userId).charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-xs uppercase tracking-tight">{getUserName(comm.userId)}</p>
                                                            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">OP_ID: {comm.userId.substring(0, 6)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="bg-slate-50 py-8 px-8 group-hover:bg-slate-100 transition-all duration-300">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-bold text-slate-500 font-mono">#{comm.saleId}</span>
                                                        <ChevronRight className="w-3 h-3 text-slate-300" />
                                                    </div>
                                                </td>
                                                <td className="bg-slate-50 py-8 px-8 text-right group-hover:bg-slate-100 transition-all duration-300">
                                                    <span className="text-xs font-black text-slate-900">{comm.percentage}%</span>
                                                </td>
                                                <td className="bg-slate-50 py-8 px-8 text-right group-hover:bg-slate-100 transition-all duration-300">
                                                    <span className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(comm.amount)}</span>
                                                </td>
                                                <td className="bg-slate-50 py-8 px-8 rounded-r-[2rem] text-center group-hover:bg-slate-100 transition-all duration-300">
                                                    <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                        comm.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    )}>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", comm.status === 'paid' ? "bg-emerald-500" : "bg-amber-500 animate-pulse")} />
                                                        {comm.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                                <h4 className="text-2xl font-black text-slate-900 uppercase">Ledger Null</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center">No incentive records found. Rewards materialize upon finalized transaction nodes.</p>
                            </div>
                        )}
                    </div>
                  </>
                )}
            </main>
        </div>
    );
}
