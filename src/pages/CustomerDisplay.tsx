import { useEffect, useState } from 'react';
import { ShoppingBag, ChevronRight, Package, Tag, Wallet, Ghost, Activity, Sparkles, Receipt } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';


interface DisplayData {
    items: Array<{ productName: string; quantity: number; price: number }>;
    total: number;
    subtotal: number;
    tax: number;
    discount: number;
    customerName?: string;
}

export default function CustomerDisplay() {
    const [data, setData] = useState<DisplayData>({
        items: [],
        total: 0,
        subtotal: 0,
        tax: 0,
        discount: 0
    });

    useEffect(() => {
        if (window.electronAPI && window.electronAPI.onCustomerDisplayData) {
            window.electronAPI.onCustomerDisplayData((update: DisplayData) => {
                setData(update);
            });
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white p-12 lg:p-20 flex flex-col font-sans overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[160px]" />
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-12 relative z-10 border-b border-white/5 pb-12">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-[2rem] bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                            <ShoppingBag className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic">INVENZA<span className="text-indigo-500">.</span></h1>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Customer Display</span>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">Customer</p>
                    <div className="flex items-center justify-end gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-3xl font-black uppercase tracking-tight">{data.customerName || 'WALK-IN GUEST'}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-16 overflow-hidden relative z-10">
                {/* Items List */}
                <div className="col-span-8 flex flex-col gap-6 overflow-y-auto pr-8 custom-scrollbar">
                    {data.items.length > 0 ? (
                        data.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/[0.03] group hover:bg-white/[0.08] transition-all duration-500">
                                <div className="flex items-center gap-8 flex-1">
                                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-xl">
                                        <Package className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <p className="text-3xl font-black uppercase tracking-tight mb-2">{item.productName}</p>
                                        <div className="flex items-center gap-4 opacity-40">
                                            <span className="text-sm font-black uppercase tracking-widest">{item.quantity} UNIT(S)</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            <span className="text-sm font-black tracking-widest font-mono text-indigo-400">@ {formatCurrency(item.price)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-black font-mono tracking-tighter text-white">
                                        {formatCurrency(item.price * item.quantity)}
                                    </p>
                                </div>

                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <div className="w-40 h-40 bg-white/5 rounded-full flex items-center justify-center mb-10">
                                <Activity className="w-20 h-20 text-white animate-pulse" />
                            </div>
                            <h2 className="text-4xl font-black tracking-[0.6em] text-center max-w-lg uppercase">Waiting for Items</h2>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mt-6">Scan items to begin</p>
                        </div>
                    )}
                </div>

                {/* Payment Summary */}
                <div className="col-span-4 flex flex-col gap-8">
                    <div className="bg-white/5 backdrop-blur-3xl rounded-[4rem] p-12 flex flex-col gap-10 border border-white/[0.03] shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
                            <Tag className="w-48 h-48" />
                        </div>

                        <div className="space-y-6 relative z-10">
                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Subtotal</span>
                                <span className="text-2xl font-black font-mono tracking-tighter">{formatCurrency(data.subtotal)}</span>
                            </div>

                             <div className="flex justify-between items-center group/dis">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Discount</span>
                                <span className="text-2xl font-black font-mono tracking-tighter text-rose-500">-{formatCurrency(data.discount)}</span>
                            </div>

                             <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tax</span>
                                <span className="text-2xl font-black font-mono tracking-tighter">{formatCurrency(data.tax)}</span>
                            </div>

                        </div>

                        <div className="pt-10 border-t border-white/10 relative z-10">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-md bg-indigo-500 flex items-center justify-center">
                                        <Wallet className="w-2 h-2 text-white" />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Total to Pay</span>
                                </div>
                                 <div className="text-8xl font-black font-mono tracking-tighter text-white drop-shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                                    {formatCurrency(data.total)}
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="mt-auto bg-gradient-to-br from-indigo-500/10 to-transparent p-12 rounded-[3.5rem] border border-indigo-500/20 flex flex-col items-center text-center gap-6 group">
                        <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Receipt className="w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-black uppercase tracking-widest leading-none">Thank you for Choosing Invenza<span className="text-indigo-500">.</span></h4>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-relaxed">Have a great day!</p>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
