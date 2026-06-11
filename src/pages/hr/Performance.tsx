import { useLicense } from "@/contexts/LicenseContext";
import { ArrowLeft, BarChart2, Lock } from "lucide-react";

const Performance = () => {
    const { hasFeature } = useLicense();

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Performance</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Staff Performance Overview</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="bg-white rounded-[3.5rem] p-16 shadow-sm border border-white flex flex-col items-center justify-center min-h-[500px] text-center">
                    <BarChart2 className="w-24 h-24 text-slate-100 mb-8" />
                    <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tight">No Performance Reviews Yet</h3>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 max-w-lg mx-auto leading-relaxed">
                        Add performance records manually to get started.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Performance;
