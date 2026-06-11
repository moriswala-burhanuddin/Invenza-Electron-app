import { useState, useMemo } from 'react';
import { useERPStore } from "@/lib/store-data";
import { Search, FileText, Users2, TrendingUp, TrendingDown, ArrowLeft, Ghost, ChevronRight, ShieldCheck } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function PartyLedger() {
    const { getStoreCustomers, getStoreSales, getStoreTransactions, checkPermission } = useERPStore();
    const customers = getStoreCustomers();
    const sales = getStoreSales();
    const transactions = getStoreTransactions();
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const canSeeDetailedSales = checkPermission('canSeeDetailedSales');

    const selectedParty = useMemo(() =>
        customers.find(c => c.id === selectedPartyId),
        [customers, selectedPartyId]);

    const ledgerEntries = useMemo(() => {
        if (!selectedPartyId) return [];
        const partySales = sales
            .filter(s => s.customerId === selectedPartyId)
            .map(s => ({ id: s.id, date: s.date, type: 'Sale', voucherNo: s.invoiceNumber, debit: s.totalAmount, credit: 0 }));
        const partyTransactions = transactions
            .filter(t => t.customerId === selectedPartyId)
            .map(t => ({ 
                id: t.id, 
                date: t.date, 
                type: t.type === 'cash_in' ? 'Receipt' : 'Payment', 
                voucherNo: t.id.slice(0, 8).toUpperCase(), 
                debit: t.type === 'cash_out' ? t.amount : 0, 
                credit: t.type === 'cash_in' ? t.amount : 0 
            }));
        const allEntries = [...partySales, ...partyTransactions]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let runningBalance = 0;
        return allEntries.map(entry => {
            runningBalance = runningBalance + entry.debit - entry.credit;
            return { ...entry, balance: runningBalance };
        });
    }, [sales, transactions, selectedPartyId]);

    const filteredParties = customers.filter(c =>
        (c.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    const closingBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;
    const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32 flex flex-col">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Customer & Supplier Ledger</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                Track payments and balances for everyone you deal with.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 w-full flex-1">
                {!canSeeDetailedSales ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view party ledgers or detailed financial records.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-6 pb-10 w-full h-full">
                    {/* Party Sidebar */}
                    <div className="w-80 shrink-0 space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                placeholder="SEARCH CUSTOMER..."
                                className="h-14 bg-white border-none rounded-2xl pl-12 pr-6 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary w-full placeholder:text-slate-200 shadow-sm"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-white overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                                    <Users2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity Registry</h3>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto py-3 px-3 space-y-2 scrollbar-none">
                                {filteredParties.map(party => (
                                    <button
                                        key={party.id}
                                        onClick={() => setSelectedPartyId(party.id)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-6 py-5 rounded-2xl transition-all text-left",
                                            selectedPartyId === party.id
                                                ? "bg-primary text-white shadow-xl shadow-black/20"
                                                : "bg-slate-50 hover:bg-slate-100 text-slate-900"
                                        )}
                                    >
                                        <div>
                                            <p className={cn("text-[11px] font-black uppercase tracking-tight", selectedPartyId === party.id ? "text-white" : "text-slate-900")}>{party.name}</p>
                                            <p className={cn("text-[9px] font-black uppercase tracking-widest mt-0.5", selectedPartyId === party.id ? "text-slate-400" : "text-slate-400")}>{party.area || 'General_Zone'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-xs font-black font-mono tracking-tighter", selectedPartyId === party.id ? "text-indigo-300" : "text-slate-900")}>
                                                {formatCurrency(party.creditBalance || 0)}
                                            </p>
                                            <span className={cn("text-[8px] font-black uppercase", selectedPartyId === party.id ? "text-rose-300" : "text-rose-500")}>Dr</span>
                                        </div>
                                    </button>
                                ))}
                                {filteredParties.length === 0 && (
                                    <div className="py-16 text-center opacity-30">
                                        <Ghost className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Entities Found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ledger View */}
                    <div className="flex-1 space-y-6">
                        {selectedParty ? (
                            <>
                                {/* Party Header */}
                                <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedParty.name}</h2>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                                                {selectedParty.phone} • {selectedParty.email || 'NO_CONTACT'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Closing Balance</p>
                                            <h3 className={cn("text-3xl font-black tracking-tighter", closingBalance >= 0 ? "text-rose-600" : "text-emerald-600")}>
                                                {formatCurrency(Math.abs(closingBalance))}
                                            </h3>
                                            <span className={cn("text-[10px] font-black uppercase tracking-widest", closingBalance >= 0 ? "text-rose-400" : "text-emerald-400")}>
                                                {closingBalance >= 0 ? "Dr (Amount Owed)" : "Cr (Advance Payment)"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 mt-8">
                                        <div className="bg-rose-50 rounded-2xl p-6">
                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Debit</p>
                                            <h4 className="text-2xl font-black text-rose-600 tracking-tighter">{formatCurrency(totalDebit)}</h4>
                                        </div>
                                        <div className="bg-emerald-50 rounded-2xl p-6">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Credit</p>
                                            <h4 className="text-2xl font-black text-emerald-600 tracking-tighter">{formatCurrency(totalCredit)}</h4>
                                        </div>
                                    </div>
                                </div>

                                {/* Ledger Table */}
                                <div className="bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden">
                                    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-0.5 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest p-6">
                                        <div className="px-4">Date</div>
                                        <div className="px-4">Particulars</div>
                                        <div className="px-4">Vch Type</div>
                                        <div className="px-4">Vch No.</div>
                                        <div className="px-4 text-right">Debit</div>
                                        <div className="px-4 text-right">Credit</div>
                                        <div className="px-4 text-right">Balance</div>
                                    </div>
                                    <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto scrollbar-none">
                                        {ledgerEntries.map(entry => (
                                            <div key={entry.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-0.5 px-6 py-5 hover:bg-slate-50 transition-colors">
                                                <div className="px-4 text-[10px] font-black text-slate-400 font-mono">{new Date(entry.date).toLocaleDateString()}</div>
                                                <div className="px-4 text-[11px] font-black text-slate-900 uppercase">
                                                    {entry.type === 'Sale' ? 'To Sales A/c' : 'By Cash/Bank A/c'}
                                                </div>
                                                <div className="px-4 text-[10px] font-black text-slate-400 uppercase">{entry.type}</div>
                                                <div className="px-4 text-[10px] font-black text-slate-300 font-mono tracking-widest">{entry.voucherNo}</div>
                                                <div className="px-4 text-right text-[11px] font-black text-rose-600 font-mono">
                                                    {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                                                </div>
                                                <div className="px-4 text-right text-[11px] font-black text-emerald-600 font-mono">
                                                    {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                                                </div>
                                                <div className={cn("px-4 text-right text-[11px] font-black font-mono", entry.balance >= 0 ? "text-rose-600" : "text-emerald-600")}>
                                                    {formatCurrency(Math.abs(entry.balance))} {entry.balance >= 0 ? 'Dr' : 'Cr'}
                                                </div>
                                            </div>
                                        ))}
                                        {ledgerEntries.length === 0 && (
                                            <div className="py-24 text-center opacity-30 flex flex-col items-center">
                                                <Ghost className="w-16 h-16 text-slate-100 mb-6" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Transaction Records Found</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-30">
                                <FileText className="w-24 h-24 text-slate-100 mb-8" />
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Entity Selected</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Select a party from the registry to view their ledger.</p>
                            </div>
                        )}
                    </div>
                  </div>
                )}
            </main>
        </div>
    );
}
