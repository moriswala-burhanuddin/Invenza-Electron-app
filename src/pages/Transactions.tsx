import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Plus, ArrowUpCircle, ArrowDownCircle, Receipt, RotateCcw, Search, Filter, Download as DownloadIcon, ChevronRight, Zap, ArrowLeft, MoreHorizontal, ShieldCheck, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const fmt = (amount: number) => formatCurrency(amount);

export default function Transactions() {
  const navigate = useNavigate();
  const { getStoreTransactions, getStoreAccounts, checkPermission } = useERPStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const transactions = getStoreTransactions();
  const accounts = getStoreAccounts();

  const canManageLedger = checkPermission('canManageLedger');

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash_in': return <ArrowDownLeft className="w-6 h-6 text-emerald-500" />;
      case 'cash_out': return <ArrowUpRight className="w-6 h-6 text-rose-500" />;
      case 'expense': return <Receipt className="w-6 h-6 text-amber-500" />;
      case 'sale_return': return <RotateCcw className="w-6 h-6 text-slate-400" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const totalCashIn = transactions.filter(t => t.type === 'cash_in').reduce((sum, t) => sum + t.amount, 0);
  const totalCashOut = transactions.filter(t => t.type === 'cash_out' || t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Transactions</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Transaction History • {filteredTransactions.length} Transactions</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {canManageLedger && (
              <Button
                onClick={() => navigate('/transactions/new')}
                className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4 mr-2 text-indigo-400" />
                New Transaction
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
        {!canManageLedger ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
            <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
              You do not have permission to view or manage the finance ledger and transactions.
            </p>
          </div>
        ) : (
          <>
            {/* Fiscal Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                <div className="p-4 bg-emerald-50 rounded-2xl w-fit mb-8 text-emerald-500">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Money In</p>
                <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">{fmt(totalCashIn)}</h3>
              </div>

              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                <div className="p-4 bg-rose-50 rounded-2xl w-fit mb-8 text-rose-500">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-rose-600">Money Out</p>
                <h3 className="text-3xl font-black text-rose-600 tracking-tighter">{fmt(totalCashOut)}</h3>
              </div>

              <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 flex flex-col justify-center relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-white/10 rounded-2xl text-white">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Up to Date</span>
                </div>
                <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 opacity-0 group-hover:opacity-100 transition-all rotate-12" />
              </div>
            </div>

            {/* Stream Controls */}
            <div className="bg-white p-6 rounded-[3rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex gap-3 overflow-x-auto p-2 scrollbar-none shrink-0">
                {['all', 'cash_in', 'cash_out', 'expense', 'sale_return'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      filterType === type
                        ? 'bg-primary text-white shadow-2xl shadow-black/20'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {type === 'all' ? 'All' : getTypeLabel(type)}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-[400px] shrink-0 group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="SEARCH BY DESCRIPTION OR CUSTOMER..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-16 bg-slate-50 border-none rounded-[1.5rem] pl-16 pr-8 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all"
                />
              </div>
            </div>

            {/* Transaction Matrix */}
            <div className="space-y-6">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => {
                  const account = accounts.find(a => a.id === t.accountId);
                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/transactions/${t.id}`)}
                      className="bg-white rounded-[3rem] p-10 border-2 border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-10"
                    >
                      <div className="flex items-center gap-10 flex-1 min-w-0">
                        <div className={cn(
                          "w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all group-hover:scale-110 shadow-inner shrink-0",
                          t.type === 'cash_in' ? "bg-emerald-50" : t.type === 'cash_out' ? "bg-rose-50" : "bg-slate-50"
                        )}>
                          {getTypeIcon(t.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors truncate">{t.description}</h4>
                            <Badge className={cn(
                              "px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest border",
                              t.type === 'cash_in' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                t.type === 'cash_out' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-slate-50 text-slate-400"
                            )}>
                              {getTypeLabel(t.type)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-8 gap-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="text-slate-300">DATE:</span> {new Date(t.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="text-slate-300">ACCOUNT:</span> {account?.name || 'N/A'}
                            </div>
                            {t.customerName && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span className="text-slate-300">CUSTOMER:</span> {t.customerName}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10 self-end lg:self-center shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2 opacity-50">Amount</p>
                          <p className={cn(
                            "text-3xl font-black leading-none",
                            t.type === 'cash_in' ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {t.type === 'cash_in' ? '+' : '-'}{fmt(t.amount)}
                          </p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-60 text-center opacity-30 flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
                  <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10">
                    <Receipt className="w-16 h-16 text-slate-100" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">No Transactions Found</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 px-20 max-w-2xl leading-loose text-center">No transactions match your search. Add a new transaction to get started.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
