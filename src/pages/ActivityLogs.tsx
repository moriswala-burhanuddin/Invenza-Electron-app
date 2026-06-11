import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Shield, Search, Clock, User, Info, AlertTriangle, ArrowLeft, Terminal, Filter, Ghost } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ActivityLogs() {
    const { activityLogs } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLogs = activityLogs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Activity Logs</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">All Actions & Changes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-black/10">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">System Secure</span>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
                {/* Search & Statistics */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-center">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="SEARCH LOGS OR USER NAMES..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-16 bg-white border-none rounded-3xl pl-16 pr-8 text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-primary shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-16 px-8 bg-white rounded-3xl flex flex-col justify-center border border-white shadow-sm">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Events</span>
                            <span className="text-xl font-black text-slate-900 leading-none">{activityLogs.length}</span>
                        </div>
                        <button className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center text-slate-400 hover:text-foreground transition-all border border-white shadow-sm">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tactical Logs Stream */}
                <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[600px]">
                    <div className="space-y-6">
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <div key={log.id} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:bg-white transition-all duration-500 group">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                        <div className="flex items-center gap-6">
                                            <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border",
                                                log.action.includes('DELETED') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                    log.action.includes('OVERRIDE') ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-indigo-50 text-indigo-600 border-indigo-100'
                                            )}>
                                                {log.action}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{format(new Date(log.timestamp), 'dd MMM yyyy • HH:mm:ss')}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-50 self-start lg:self-center">
                                            <User className="w-4 h-4 text-slate-900" />
                                            <span className="text-[10px] font-black uppercase text-slate-900 tracking-tight">{log.userName}</span>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-slate-200/50 rounded-full" />
                                        <div className="pl-14 pt-1">
                                            <div className="bg-slate-900 rounded-[2rem] p-8 relative overflow-hidden group/term">
                                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                                    <Terminal className="w-20 h-20 text-white" />
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-300 leading-relaxed font-mono opacity-80 group-hover/term:opacity-100 transition-opacity">
                                                    <span className="text-emerald-400 mr-2">$</span>
                                                    {log.details}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                                <h4 className="text-2xl font-black text-slate-900 uppercase">No Logs Found</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center">No logs match your search.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
