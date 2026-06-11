import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Plus, Search, ShoppingBag, Calendar, ChevronRight, Filter, Download, Zap, TrendingUp, TrendingDown, Clock, ShieldCheck, Box, CreditCard, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

export default function Purchases() {
  const navigate = useNavigate();
  const { getStorePurchases, getStoreAccounts, checkPermission } = useERPStore();
  const [searchQuery, setSearchQuery] = useState('');

  const canSeePurchases = checkPermission('canSeeDetailedPurchases');
  const canSeeSuppliers = checkPermission('canSeeSuppliers');

  const purchases = getStorePurchases();
  const accounts = getStoreAccounts();

  const filteredPurchases = purchases.filter(p =>
    p.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const creditPurchases = purchases.filter(p => p.type === 'credit').length;
  const avgPurchaseValue = totalPurchases / (purchases.length || 1);

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-slate-200">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Purchases</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Purchase History • {filteredPurchases.length} Purchases</p>
            </div>
          </div>

          {(canSeePurchases || canSeeSuppliers) && (
            <div className="flex items-center gap-3">
              <div className="group relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="SEARCH PURCHASES..."
                  className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-6 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary w-64 placeholder:text-slate-200"
                />
              </div>
              <Button variant="ghost" className="rounded-2xl h-12 w-12 p-0 bg-slate-50">
                <Filter className="w-5 h-5 text-slate-400" />
              </Button>
              <Button onClick={() => navigate('/purchases/new')} className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus className="w-4 h-4 mr-2" />
                New Purchase
              </Button>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {!canSeePurchases && !canSeeSuppliers ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
            <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
              You do not have permission to view or manage procurement and purchase records.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6 text-indigo-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Purchases</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalPurchases)}</h3>
              </div>
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                <div className="p-3 bg-amber-50 rounded-xl w-fit mb-6 text-amber-500">
                  <CreditCard className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">On Credit</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{creditPurchases}</h3>
              </div>
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-6 text-emerald-500">
                  <Activity className="w-5 h-5" />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Purchase</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(avgPurchaseValue)}</h3>
              </div>
              <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200 flex flex-col justify-center relative overflow-hidden group">
                <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                <div className="relative z-10">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Supplier Report</p>
                  <Button className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl h-12 font-black uppercase text-[9px] tracking-widest">
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Purchase Stream */}
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white min-h-[600px]">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">All Purchases</h3>
              </div>

              {filteredPurchases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPurchases.map((purchase) => {
                    const account = accounts.find(a => a.id === purchase.accountId);
                    return (
                      <div
                        key={purchase.id}
                        onClick={() => navigate(`/purchases/${purchase.id}`)}
                        className="bg-slate-50 hover:bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className={cn(
                            "px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-2",
                            purchase.type === 'credit' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}>
                            {purchase.type === 'credit' ? <Clock className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                            {purchase.type || 'CASH'}
                          </div>
                          <div className="p-2 bg-white rounded-xl text-slate-200 group-hover:text-foreground transition-colors shadow-sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="space-y-1 mb-8">
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight font-mono">{purchase.invoiceNumber}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{purchase.supplier || 'Unknown Supplier'}</p>
                        </div>

                        <div className="flex items-end justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest">
                                {new Date(purchase.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <Box className="w-3 h-3" />
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                                {purchase.items?.length || 0} Items
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{formatCurrency(purchase.totalAmount)}</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                              {account?.name || 'On Credit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-40 text-center opacity-30">
                  <ShoppingBag className="w-24 h-24 text-slate-100 mx-auto mb-8" />
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Purchases Found</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-20 text-center mx-auto max-w-lg">
                    No purchases yet. Click "New Purchase" to add one.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Elevated FAB */}
      {(canSeePurchases || canSeeSuppliers) && (
        <button
          onClick={() => navigate('/purchases/new')}
          className="fixed bottom-12 right-12 w-20 h-20 bg-primary text-white rounded-full shadow-2xl shadow-black/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-8 h-8 relative z-10" />
        </button>
      )}
    </div>
  );
}

const Activity = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
