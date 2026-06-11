import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useERPStore } from "@/lib/store-data";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Search, Filter, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, CreditCard, Receipt, ShoppingBag, Wallet, Activity, Ghost, MoreHorizontal, Download, ChevronRight, PieChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatCurrency } from "@/lib/utils";

const DayBook = () => {
    const { getStoreSales, getStoreCustomers, getStorePurchases, getStoreTransactions, checkPermission } = useERPStore();
    const sales = getStoreSales();
    const customers = getStoreCustomers();
    const purchases = getStorePurchases();
    const transactions = getStoreTransactions();
    const [date, setDate] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState("");

    const canSeeDetailedSales = checkPermission('canSeeDetailedSales');

    const dayBookEntries = useMemo(() => {
        const selectedDateStr = format(date, 'yyyy-MM-dd');

        const saleEntries = sales
            .filter(s => s.date.startsWith(selectedDateStr))
            .map(s => {
                const customer = customers.find(c => c.id === s.customerId);
                return {
                    id: s.id,
                    date: s.date,
                    type: 'Sale',
                    voucherNo: s.invoiceNumber,
                    particulars: customer ? customer.name : 'Cash Sale',
                    amount: s.totalAmount,
                    credit: s.totalAmount,
                    debit: 0,
                    icon: <ShoppingBag className="w-5 h-5" />,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-50'
                };
            });

        const purchaseEntries = purchases
            .filter(p => p.date.startsWith(selectedDateStr))
            .map(p => ({
                id: p.id,
                date: p.date,
                type: 'Purchase',
                voucherNo: p.invoiceNumber,
                particulars: p.supplier,
                amount: p.totalAmount,
                credit: 0,
                debit: p.totalAmount,
                icon: <ArrowRight className="w-5 h-5" />,
                color: 'text-amber-500',
                bg: 'bg-amber-50'
            }));

        const transactionEntries = transactions
            .filter(t => t.date.startsWith(selectedDateStr))
            .map(t => {
                let type = 'Journal';
                let debit = 0;
                let credit = 0;
                let icon = <Activity className="w-5 h-5" />;
                let color = 'text-slate-500';
                let bg = 'bg-slate-50';

                switch (t.type) {
                    case 'expense':
                        type = 'Payment';
                        debit = t.amount;
                        icon = <TrendingDown className="w-5 h-5" />;
                        color = 'text-rose-500';
                        bg = 'bg-rose-50';
                        break;
                    case 'cash_in':
                        type = 'Receipt';
                        credit = t.amount;
                        icon = <TrendingUp className="w-5 h-5" />;
                        color = 'text-blue-500';
                        bg = 'bg-blue-50';
                        break;
                    case 'cash_out':
                        type = 'Payment';
                        debit = t.amount;
                        icon = <ArrowLeft className="w-5 h-5" />;
                        color = 'text-rose-500';
                        bg = 'bg-rose-50';
                        break;
                }

                return {
                    id: t.id,
                    date: t.date,
                    type: type,
                    voucherNo: t.id.slice(0, 8).toUpperCase(),
                    particulars: t.description || (t as any).category || 'Transaction',
                    amount: t.amount,
                    debit,
                    credit,
                    icon,
                    color,
                    bg
                };
            });

        return [...saleEntries, ...purchaseEntries, ...transactionEntries]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    }, [sales, purchases, transactions, date, customers]);

    const filteredEntries = dayBookEntries.filter(e =>
        (e.particulars || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (e.voucherNo || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    const totalDebit = filteredEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = filteredEntries.reduce((sum, e) => sum + e.credit, 0);

    const exportToExcel = () => {
        const wsData: (string | number)[][] = [
            ['Day Book', `Date: ${format(date, "yyyy-MM-dd")}`],
            [''],
            ['Date/Time', 'Type', 'Voucher No', 'Particulars', 'Debit', 'Credit']
        ];
        
        filteredEntries.forEach(entry => {
            wsData.push([
                format(new Date(entry.date), "yyyy-MM-dd hh:mm a"),
                entry.type,
                entry.voucherNo,
                entry.particulars,
                entry.debit > 0 ? entry.debit : '',
                entry.credit > 0 ? entry.credit : ''
            ]);
        });
        
        wsData.push(['']);
        wsData.push(['Total', '', '', '', totalDebit, totalCredit]);
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Day Book");
        
        XLSX.writeFile(wb, `Day_Book_${format(date, "yyyy-MM-dd")}.xlsx`);
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-black/10">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Daily Cash Book</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Daily record of sales and payments • {format(date, "MMMM do, yyyy").toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-14 bg-slate-50 border-none rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-100 group transition-all">
                                    <CalendarIcon className="w-4 h-4 text-slate-300 group-hover:text-foreground" />
                                    {format(date, "PPP").toUpperCase()}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-[2rem] border-none shadow-2xl" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {canSeeDetailedSales && (
                            <Button variant="ghost" onClick={exportToExcel} className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-foreground flex items-center justify-center transition-all">
                                <Download className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {!canSeeDetailedSales ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view the Day Book or detailed sales metrics.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Liquidity Gauges */}
                    <div className="grid md:grid-cols-4 gap-6 mb-12">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-blue-50 rounded-xl w-fit mb-6 text-blue-500">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Voucher Density</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{filteredEntries.length} Units</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-6 text-emerald-500">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Velocity (Credit)</p>
                            <h3 className="text-2xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalCredit)}</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                            <div className="p-3 bg-rose-50 rounded-xl w-fit mb-6 text-rose-500">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Drain (Debit)</p>
                            <h3 className="text-2xl font-black text-rose-600 tracking-tighter">{formatCurrency(totalDebit)}</h3>
                        </div>
                        <div className="bg-primary rounded-[2.5rem] p-8 text-white shadow-xl shadow-black/10 overflow-hidden group">
                            <PieChart className="absolute -right-6 -top-6 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Net Variance</p>
                            <h3 className={cn("text-2xl font-black tracking-tighter", (totalCredit - totalDebit) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {formatCurrency(totalCredit - totalDebit)}
                            </h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-[3.5rem] shadow-sm border border-white overflow-hidden">
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                            <div className="relative w-96 group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="IDENTIFY VOUCHER..."
                                    className="h-14 bg-slate-50 border-none rounded-2xl pl-14 pr-8 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary w-full"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" className="h-12 rounded-xl bg-slate-50 font-black uppercase text-[10px] tracking-widest text-slate-400 px-8 hover:bg-slate-100 hover:text-foreground">
                                    <Filter className="w-4 h-4 mr-3" />
                                    Matrix Filter
                                </Button>
                            </div>
                        </div>

                        <div className="p-10">
                            {filteredEntries.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredEntries.map((entry) => (
                                        <div key={entry.id} className="bg-white hover:bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group flex items-center justify-between">
                                            <div className="flex items-center gap-8 flex-1">
                                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-sm shrink-0", entry.bg, entry.color)}>
                                                    {entry.icon}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest opacity-60 uppercase">{format(new Date(entry.date), "hh:mm a")}</span>
                                                        <div className={cn("px-4 py-1 rounded-full border text-[7px] font-black uppercase tracking-widest", entry.bg, entry.color)}>
                                                            {entry.type}
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-300 font-mono tracking-widest">{entry.voucherNo}</span>
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate group-hover:translate-x-1 transition-transform">{entry.particulars}</h4>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12">
                                                <div className="text-right flex flex-col items-end min-w-[120px]">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantum</p>
                                                    <div className="flex items-center gap-4">
                                                        {entry.debit > 0 && (
                                                            <div className="text-rose-600 font-black tracking-tight flex flex-col items-end">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">Debit</span>
                                                                <span className="text-lg">{formatCurrency(entry.debit)}</span>
                                                            </div>
                                                        )}
                                                        {entry.credit > 0 && (
                                                            <div className="text-emerald-600 font-black tracking-tight flex flex-col items-end">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Credit</span>
                                                                <span className="text-lg">{formatCurrency(entry.credit)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" className="h-12 w-12 rounded-xl bg-slate-50 text-slate-200 hover:text-foreground hover:bg-slate-100 transition-all">
                                                    <ChevronRight className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="mt-12 p-10 bg-primary rounded-[3rem] text-white flex items-center justify-between">
                                        <h4 className="text-sm font-black uppercase tracking-[0.3em]">Ledger Termination Summary</h4>
                                        <div className="flex gap-12">
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Debit</p>
                                                <p className="text-2xl font-black tracking-tighter">{formatCurrency(totalDebit)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Credit</p>
                                                <p className="text-2xl font-black tracking-tighter">{formatCurrency(totalCredit)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                    <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Ledger Stagnation</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-20">No fiscal activities recorded for the selected temporal slice. Transaction streams are currently dormant.</p>
                                </div>
                            )}
                        </div>
                    </div>
                  </>
                )}
            </main>
        </div>
    );
};

export default DayBook;
