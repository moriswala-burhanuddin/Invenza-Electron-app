import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useERPStore } from "@/lib/store-data";
import { TrendingUp, TrendingDown, Target, Zap, Activity, PieChart, ArrowUpRight, ArrowDownRight, Scale, Wallet, Briefcase, BarChart3, ChevronRight, Download, Calendar as CalendarIcon, Filter, Search, MoreVertical, Ghost, ShieldCheck } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ProfitAndLoss = () => {
    const { getStoreSales, getStorePurchases, getStoreTransactions, checkPermission } = useERPStore();
    const sales = getStoreSales();
    const purchases = getStorePurchases();
    const transactions = getStoreTransactions();

    const canSeeProfit = checkPermission('canSeeRevenueMetrics');

    const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

    const financials = useMemo(() => {
        const now = new Date();
        const filterDate = (dateStr: string) => {
            if (!dateStr) return false;
            const itemDate = new Date(dateStr);
            if (period === 'daily') {
                return itemDate.toDateString() === now.toDateString();
            } else if (period === 'monthly') {
                return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
            } else if (period === 'yearly') {
                return itemDate.getFullYear() === now.getFullYear();
            }
            return true;
        };

        const filteredSales = sales.filter(s => filterDate(s.date));
        const filteredPurchases = purchases.filter(p => filterDate(p.date));
        const filteredTransactions = transactions.filter(t => filterDate(t.date));

        const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const grossProfit = filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0);
        const totalExpenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const otherIncome = filteredTransactions
            .filter(t => t.type === 'cash_in' && (t as any).category === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const netProfit = grossProfit + otherIncome - totalExpenses;

        return {
            totalSales,
            totalPurchases,
            grossProfit,
            totalExpenses,
            otherIncome,
            netProfit,
            margin: totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
        };
    }, [sales, purchases, transactions, period]);

    const FormatCurrency = ({ amount, className }: { amount: number, className?: string }) => (
        <span className={cn("font-black tracking-tighter", className)}>{formatCurrency(amount)}</span>
    );

    const exportToExcel = () => {
        const wsData: (string | number)[][] = [
            ['Profit & Loss Report', `Period: ${period.toUpperCase()}`],
            [''],
            ['Metric', 'Amount'],
            ['Total Revenue', financials.totalSales],
            ['Total Purchases', financials.totalPurchases],
            ['Gross Profit', financials.grossProfit],
            ['Efficiency Ratio', `${financials.margin.toFixed(2)}%`],
            ['Total Expenses', financials.totalExpenses],
            ['Other Income', financials.otherIncome],
            ['Net Profit', financials.netProfit]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Profit and Loss");
        
        XLSX.writeFile(wb, `Profit_And_Loss_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-black/10">
                            <Scale className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Profit & Loss Report</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Summary of your income and expenses</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl">
                            <Button variant="ghost" onClick={() => setPeriod('daily')} className={cn("h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", period === 'daily' ? "bg-white shadow-sm text-foreground" : "text-slate-400 hover:text-foreground hover:bg-white hover:shadow-sm")}>Daily</Button>
                            <Button variant="ghost" onClick={() => setPeriod('monthly')} className={cn("h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", period === 'monthly' ? "bg-white shadow-sm text-foreground" : "text-slate-400 hover:text-foreground hover:bg-white hover:shadow-sm")}>Monthly</Button>
                            <Button variant="ghost" onClick={() => setPeriod('yearly')} className={cn("h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all", period === 'yearly' ? "bg-white shadow-sm text-foreground" : "text-slate-400 hover:text-foreground hover:bg-white hover:shadow-sm")}>Yearly</Button>
                        </div>
                        <Button variant="ghost" onClick={exportToExcel} className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-foreground flex items-center justify-center transition-all">
                            <Download className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 px-12">
                {!canSeeProfit ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view Profit & Loss reports or company financial synthesis.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Synthesis Gauges */}
                    <div className="grid md:grid-cols-4 gap-6 mb-12">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-6 text-emerald-500">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Yield</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(financials.grossProfit)}</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6 text-indigo-500">
                                <Target className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency Ratio (GP%)</p>
                            <h3 className="text-2xl font-black text-indigo-600 tracking-tighter">{financials.margin.toFixed(2)}%</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white relative overflow-hidden group">
                            <Activity className="absolute -right-4 -top-4 w-16 h-16 text-slate-50 group-hover:rotate-12 transition-transform" />
                            <div className="p-3 bg-rose-50 rounded-xl w-fit mb-6 text-rose-500">
                                <ArrowDownRight className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Friction (Expenses)</p>
                            <h3 className="text-2xl font-black text-rose-600 tracking-tighter">{formatCurrency(financials.totalExpenses)}</h3>
                        </div>
                        <div className="bg-primary rounded-[2.5rem] p-8 text-white shadow-xl shadow-black/10 overflow-hidden relative group">
                            <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Net Synthesized Profit</p>
                            <h3 className={cn("text-3xl font-black tracking-tighter mb-2", financials.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {formatCurrency(financials.netProfit)}
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-emerald-300">Positive Vector Verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Ledger Synthesis */}
                    <div className="bg-white rounded-[3.5rem] shadow-sm border border-white overflow-hidden p-12">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 shadow-sm border border-slate-100">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Ledger Matrix Partition</h3>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-0 border border-slate-100 rounded-[3rem] overflow-hidden">
                            {/* DEBIT SECTOR */}
                            <div className="border-r border-slate-100 bg-[#FAFAFA]">
                                <div className="p-8 border-b border-slate-100 bg-[#F5F5F7] flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">DRAIN_VECTOR (DR)</h4>
                                    <ArrowDownRight className="w-4 h-4 text-rose-300" />
                                </div>
                                <div className="p-12 space-y-8">
                                    <div className="group space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Cost</p>
                                            <FormatCurrency amount={financials.totalPurchases} className="text-slate-900 text-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: '65%' }} />
                                        </div>
                                    </div>

                                    <div className="group space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Friction</p>
                                            <FormatCurrency amount={financials.totalExpenses} className="text-slate-900 text-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: '25%' }} />
                                        </div>
                                    </div>

                                    <div className="pt-12 mt-12 border-t border-slate-200">
                                        <div className="flex justify-between items-center p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">GROSS_CARRIED_OVER</p>
                                            <FormatCurrency amount={financials.grossProfit} className="text-xl text-slate-900" />
                                        </div>
                                    </div>

                                    <div className="pt-8">
                                        <div className="flex justify-between items-center p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] shadow-xl shadow-emerald-700/5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm border border-emerald-100">
                                                    <TrendingUp className="w-5 h-5" />
                                                </div>
                                                <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">NET_PROFIT_NODE</p>
                                            </div>
                                            <FormatCurrency amount={financials.netProfit} className="text-2xl text-emerald-700 font-black" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CREDIT SECTOR */}
                            <div className="bg-white">
                                <div className="p-8 border-b border-slate-100 bg-[#F5F5F7] flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">SOURCE_VECTOR (CR)</h4>
                                    <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                                </div>
                                <div className="p-12 space-y-8">
                                    <div className="group space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Streams</p>
                                            <FormatCurrency amount={financials.totalSales} className="text-slate-900 text-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: '85%' }} />
                                        </div>
                                    </div>

                                    <div className="group space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inertia Income</p>
                                            <FormatCurrency amount={financials.otherIncome} className="text-slate-900 text-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: '15%' }} />
                                        </div>
                                    </div>

                                    <div className="pt-12 mt-12 border-t border-slate-200">
                                        <div className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">GROSS_BROUGHT_FORWARD</p>
                                            <FormatCurrency amount={financials.grossProfit} className="text-xl text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 p-8 bg-slate-50 rounded-[2.5rem] flex items-center justify-center gap-6 border border-white shadow-inner">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-2xl text-center leading-relaxed">
                                This profitability synthesis is generated via real-time fiscal stream synchronization. Node verification protocol ALPHA-9 is active.
                            </p>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        </div>
                    </div>
                  </>
                )}
            </main>
        </div>
    );
};

export default ProfitAndLoss;
