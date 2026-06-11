import { useState, useEffect, useRef } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Search, Barcode, TrendingUp, Package, AlertCircle, ArrowLeft, ScanLine, Smartphone, Target, Ghost, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function PriceCheck() {
    const { products } = useERPStore();
    const [barcode, setBarcode] = useState('');
    const [foundProduct, setFoundProduct] = useState<typeof products[0] | null>(null);
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Keep input focused for scanner
        const focusInput = () => inputRef.current?.focus();
        focusInput();
        window.addEventListener('click', focusInput);
        return () => window.removeEventListener('click', focusInput);
    }, []);

    const handleScan = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcode) return;

        const product = products.find(p => p.barcode === barcode || p.sku === barcode);
        if (product) {
            setFoundProduct(product);
            setError(false);
        } else {
            setFoundProduct(null);
            setError(true);
        }
        setBarcode('');
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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Optical Validation Hub</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Pricing Integrity • Stock Audit</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-black/10">
                        <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Scanner Ready</span>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">
                {/* Scanner Interface */}
                <div className="bg-slate-900 rounded-[3.5rem] p-4 shadow-2xl shadow-black/30 overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent animate-scan" />

                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-white/5 rounded-xl text-emerald-400">
                                <Barcode className="w-5 h-5" />
                            </div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Initialize Optical Scan</h4>
                        </div>

                        <form onSubmit={handleScan} className="relative group/form">
                            <div className="absolute left-8 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-500 group-focus-within/form:text-emerald-400 transition-colors">
                                <ScanLine className="w-8 h-8" />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                className="w-full bg-[#0A0A0B] border border-white/5 rounded-[2.5rem] h-28 pl-24 pr-10 text-4xl font-black text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-800 tracking-tighter"
                                placeholder="WAITING_FOR_LASER_INPUT..."
                                autoComplete="off"
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest">
                                    Laser Active
                                </Badge>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Feedback Node */}
                <div className="relative">
                    {foundProduct ? (
                        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-white rounded-[4rem] shadow-sm border border-white overflow-hidden group">
                                <div className="bg-indigo-600 p-12 text-white relative overflow-hidden group">
                                    <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
                                        <Package className="w-64 h-64" />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                                        <div>
                                            <Badge className="bg-white/20 text-white border-transparent px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-[0.3em] mb-4">
                                                {foundProduct.category}
                                            </Badge>
                                            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{foundProduct.name}</h2>
                                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] mt-4">ENTITY_ID: {foundProduct.id?.substring(0, 12).toUpperCase()}</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-primary/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 self-start">
                                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Verified Record</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                                    {/* Magnitude Display */}
                                    <div className="p-16 flex flex-col items-center justify-center bg-white group/item transition-colors hover:bg-slate-50/50">
                                        <div className="flex items-center gap-4 text-slate-400 mb-6">
                                            <TrendingUp className="w-5 h-5" />
                                            <span className="text-[10px] font-black tracking-[0.3em] uppercase">FISCAL_MAGNITUDE</span>
                                        </div>
                                        <div className="relative">
                                            <span className="absolute -left-12 top-0 text-3xl font-black text-slate-300">$</span>
                                            <div className="text-9xl font-black text-slate-900 tracking-tighter drop-shadow-sm group-hover/item:scale-105 transition-transform duration-500">
                                                {foundProduct.sellingPrice.toFixed(0)}
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 mt-6 uppercase tracking-[0.4em] px-6 py-2 bg-slate-100 rounded-full">
                                            RETAIL_UNIT_COST
                                        </div>
                                    </div>

                                    {/* Inventory Status */}
                                    <div className="p-16 flex flex-col items-center justify-center bg-slate-50/50 group/inv transition-colors hover:bg-white">
                                        <div className="flex items-center gap-4 text-slate-400 mb-6">
                                            <Package className="w-5 h-5" />
                                            <span className="text-[10px] font-black tracking-[0.3em] uppercase">SYSTEM_QUANTITY</span>
                                        </div>
                                        <div className={cn("text-9xl font-black tracking-tighter drop-shadow-sm group-hover/inv:scale-105 transition-transform duration-500",
                                            foundProduct.quantity <= (foundProduct.minStock || 5) ? 'text-rose-600' : 'text-slate-900')}>
                                            {foundProduct.quantity}
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 mt-6 uppercase tracking-[0.4em] px-6 py-2 bg-slate-100 rounded-full">
                                            {foundProduct.unit || 'UNITS'}_IN_INVENTORY
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-slate-100/50 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Manufacturer Node</span>
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{foundProduct.brand || 'GENERIC_SOURCE'}</span>
                                        </div>
                                        <div className="w-[1px] h-8 bg-slate-200" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SKU_VECTOR</span>
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{foundProduct.sku}</span>
                                        </div>
                                    </div>
                                    <button className="h-14 px-8 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.05] transition-all flex items-center gap-3">
                                        Detailed Metrics
                                        <Zap className="w-4 h-4 text-amber-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-rose-50 rounded-[4rem] border-2 border-rose-100 p-20 text-center animate-shake relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                            <AlertCircle className="w-24 h-24 text-rose-500 mx-auto mb-8 animate-pulse" />
                            <h3 className="text-3xl font-black text-rose-900 uppercase tracking-tight">Node Not Identified</h3>
                            <p className="text-rose-600 font-bold mt-4 text-[10px] uppercase tracking-[0.4em] leading-relaxed max-w-sm mx-auto">The optical input did not match any active entity nodes within the global registry.</p>
                            <button onClick={() => setError(false)} className="mt-10 px-8 py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all">Retry Scan</button>
                        </div>
                    ) : (
                        <div className="py-40 text-center opacity-30 flex flex-col items-center">
                            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 mb-8 shadow-sm">
                                <Search className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Ready for Validation</h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-4 px-20 tracking-[0.5em]">Input barcode via optical sensor or manual override</p>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(0); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(400px); opacity: 0; }
                }
                .animate-scan {
                    animation: scan 4s linear infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
}
