import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useERPStore } from "@/lib/store-data";
import { Search, Package, TrendingUp, Wallet, ArrowLeft, Filter, Sparkles, Box, Info } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export default function StockSummary() {
    const { products, checkPermission, getActiveStore } = useERPStore();
    const [searchQuery, setSearchQuery] = useState("");
    const store = getActiveStore();

    const canSeeBuyingPrice = checkPermission('canSeeBuyingPrice');
    const canSeeExpectedSales = checkPermission('canSeeExpectedSales');
    const canSeeProfit = checkPermission('canSeeProfit');

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalValue = filteredProducts.reduce((sum, p) => sum + (p.quantity * (p.purchasePrice || 0)), 0);
    const potentialValue = filteredProducts.reduce((sum, p) => sum + (p.quantity * (p.sellingPrice || 0)), 0);
    const totalMargin = potentialValue - totalValue;

    return (
        <div className="min-h-screen bg-[#12286D] text-white pb-32 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#2156C1] to-transparent opacity-40 pointer-events-none" />
            <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#2156C1] rounded-full blur-[150px] opacity-20 pointer-events-none" />
            
            {/* Superior Header */}
            <div className="relative z-10 px-6 pt-12 pb-8 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => window.history.back()} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl transition-all active:scale-95">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">{store?.name || 'CORE_SYSTEM'}</span>
                        </div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-white uppercase">Stock Intelligence</h1>
                    <p className="text-white/50 font-bold text-xs uppercase tracking-widest">Global Inventory Synthesis • Data Node 01</p>
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-2xl">
                    <div className="p-4 bg-[#2156C1] rounded-2xl shadow-lg">
                        <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Total Inventory Value</p>
                        <p className="text-3xl font-black text-white tracking-tighter">
                            {canSeeBuyingPrice ? formatCurrency(totalValue) : '***'}
                        </p>
                    </div>
                </div>
            </div>

            <main className="relative z-10 max-w-7xl mx-auto px-6 space-y-10">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="group relative bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-[3rem] shadow-xl hover:bg-white/[0.15] transition-all duration-500">
                        <div className="absolute top-6 right-8 text-white/10 group-hover:text-white/20 transition-colors">
                            <Box className="w-12 h-12" />
                        </div>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-4">Unit Magnitude</p>
                        <div className="flex items-end gap-3">
                            <p className="text-5xl font-black text-white tracking-tighter">{filteredProducts.length}</p>
                            <p className="text-[10px] font-black text-white/30 uppercase mb-2">Unique SKUs</p>
                        </div>
                    </div>

                    {canSeeExpectedSales && (
                        <div className="group relative bg-[#2156C1]/30 backdrop-blur-lg border border-white/10 p-8 rounded-[3rem] shadow-xl hover:bg-[#2156C1]/40 transition-all duration-500">
                            <div className="absolute top-6 right-8 text-white/10 group-hover:text-white/20 transition-colors">
                                <TrendingUp className="w-12 h-12" />
                            </div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-4">Revenue Potential</p>
                            <p className="text-4xl font-black text-white tracking-tighter">{formatCurrency(potentialValue)}</p>
                        </div>
                    )}

                    {canSeeProfit && (
                        <div className="group relative bg-emerald-500/20 backdrop-blur-lg border border-emerald-500/20 p-8 rounded-[3rem] shadow-xl hover:bg-emerald-500/30 transition-all duration-500">
                            <div className="absolute top-6 right-8 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
                                <Sparkles className="w-12 h-12" />
                            </div>
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">Expected Margin</p>
                            <p className="text-4xl font-black text-emerald-400 tracking-tighter">{formatCurrency(totalMargin)}</p>
                        </div>
                    )}
                </div>

                {/* Main Data Synthesis Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[4rem] shadow-2xl overflow-hidden">
                    <div className="p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/[0.02] border-b border-white/5">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-[#2156C1] rounded-3xl flex items-center justify-center text-white shadow-xl">
                                <Package className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Active Inventory Matrix</h3>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Found {filteredProducts.length} responsive items</p>
                            </div>
                        </div>

                        <div className="relative group max-w-sm w-full">
                            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-white/30 group-focus-within:text-white transition-colors" />
                            </div>
                            <input
                                placeholder="SCAN OR SEARCH DATA..."
                                className="w-full bg-white/10 border-none rounded-full h-16 pl-14 pr-6 text-[11px] font-black text-white placeholder:text-white/20 focus:ring-2 focus:ring-[#2156C1] outline-none transition-all uppercase tracking-widest backdrop-blur-md"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5">
                                    <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Sector Node (Item)</th>
                                    <th className="px-12 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Category</th>
                                    <th className="px-12 py-8 text-right text-[10px] font-black uppercase tracking-[0.4em] text-white/30 bg-white/[0.01]">Magnitude</th>
                                    <th className="px-12 py-8 text-right text-[10px] font-black uppercase tracking-[0.4em] text-white/30 bg-white/[0.01]">Buying Price</th>
                                    <th className="px-12 py-8 text-right text-[10px] font-black uppercase tracking-[0.4em] text-[#2156C1] bg-white/[0.02]">Synthesis Value</th>
                                    {canSeeProfit && <th className="px-12 py-8 text-right text-[10px] font-black uppercase tracking-[0.4em] text-white/30 font-mono">Margin %</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.05]">
                                {filteredProducts.length > 0 ? (
                                    filteredProducts.map((p) => {
                                        const margin = p.sellingPrice - p.purchasePrice;
                                        const marginPercent = p.purchasePrice > 0 ? (margin / p.purchasePrice) * 100 : 100;

                                        return (
                                            <tr key={p.id} className="group hover:bg-white/[0.03] transition-all duration-300">
                                                <td className="px-12 py-8">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-black text-white text-lg tracking-tight group-hover:translate-x-1 transition-transform">{p.name}</span>
                                                        <span className="text-[10px] font-black text-white/20 font-mono tracking-widest uppercase">{p.sku}</span>
                                                    </div>
                                                </td>
                                                <td className="px-12 py-8">
                                                    <div className="inline-block px-3 py-1 bg-white/5 rounded-lg text-white/50 text-[9px] font-black uppercase tracking-widest">
                                                        {p.categoryName || 'GENERAL'}
                                                    </div>
                                                </td>
                                                <td className="px-12 py-8 text-right bg-white/[0.01]">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn(
                                                            "text-xl font-black tabular-nums",
                                                            p.quantity < 10 ? "text-orange-500 font-black animate-pulse" : "text-white"
                                                        )}>
                                                            {p.quantity.toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-1">{p.unit || 'UNITS'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-12 py-8 text-right font-black text-white/70 bg-white/[0.01]">
                                                    {canSeeBuyingPrice ? formatCurrency(p.purchasePrice || 0) : '***'}
                                                </td>
                                                <td className="px-12 py-8 text-right font-black text-white text-xl tracking-tighter bg-white/[0.02]">
                                                    {canSeeBuyingPrice ? formatCurrency(p.quantity * (p.purchasePrice || 0)) : '***'}
                                                </td>
                                                {canSeeProfit && (
                                                    <td className="px-12 py-8 text-right">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[11px] tabular-nums transition-all group-hover:scale-110",
                                                            margin > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                                                        )}>
                                                            <div className={cn("w-2 h-2 rounded-full", margin > 0 ? "bg-emerald-400" : "bg-rose-400")} />
                                                            {canSeeBuyingPrice ? `${Math.round(marginPercent)}%` : '***'}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-40 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <Info className="w-16 h-16" />
                                                <h4 className="text-2xl font-black uppercase tracking-widest">Data Stream Void</h4>
                                                <p className="text-[10px] font-black uppercase tracking-widest">No matching nodes detected in system registry</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
