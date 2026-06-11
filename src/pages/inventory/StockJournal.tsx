import { StockTransferForm } from "@/components/inventory/StockTransferForm";
import { ArrowLeft, Info, Send, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useERPStore } from "@/lib/store-data";

export default function StockJournal() {
    const { getActiveStore } = useERPStore();
    const store = getActiveStore();

    return (
        <div className="min-h-screen bg-[#12286D] text-white pb-32 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#2156C1] to-transparent opacity-40 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#2156C1] rounded-full blur-[120px] opacity-10 pointer-events-none" />
            
            {/* Superior Header */}
            <div className="relative z-10 px-6 pt-12 pb-12 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={() => window.history.back()} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all active:scale-95">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{store?.name || 'CORE_SYSTEM'}</span>
                    </div>
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">Logistics Command</h1>
                <p className="text-white/50 font-bold text-xs uppercase tracking-widest mt-1">Inter-Store Node Transfer • Data Synchronization Active</p>
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Protocol Info Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white/10 backdrop-blur-2xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Send className="w-24 h-24 text-white" />
                        </div>
                        
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
                                <Info className="w-4 h-4" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 text-amber-400">Transfer Protocol</h3>
                        </div>

                        <div className="space-y-6">
                            <p className="text-sm font-bold text-white/80 leading-relaxed italic">"Initiate a secure reallocation of assets between validated store nodes."</p>
                            
                            <ul className="space-y-4">
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">01</div>
                                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider leading-relaxed">Define <span className="text-white">Source Node</span> (Where stock is currently registered).</p>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">02</div>
                                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider leading-relaxed">Target <span className="text-white">Destination Node</span> (Where stock will be deployed).</p>
                                </li>
                                <li className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">03</div>
                                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider leading-relaxed">System will perform <span className="text-white">Real-time Reconciliation</span> of both ledgers.</p>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#2156C1] to-[#12286D] p-8 rounded-[3.5rem] shadow-xl border border-white/10 flex items-center gap-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                            <Landmark className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Status</p>
                            <p className="text-lg font-black text-white uppercase tracking-tight mt-1">Ready for Dispatch</p>
                        </div>
                    </div>
                </div>

                {/* The Transfer Form Container */}
                <div className="lg:col-span-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[4rem] p-4 md:p-10 shadow-2xl relative">
                    <div className="absolute top-10 right-10 flex items-center gap-2">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                         <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Secure Node Transfer Active</span>
                    </div>
                    <div className="mt-8">
                        <StockTransferForm />
                    </div>
                </div>
            </main>
        </div>
    );
}
