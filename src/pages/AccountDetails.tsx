import { useParams, useNavigate } from 'react-router-dom';
import { useERPStore } from '@/lib/store-data';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Landmark, 
  Activity, 
  Calendar, 
  DollarSign,
  Plus,
  ArrowUpRight,
  Filter,
  Download,
  MoreHorizontal,
  Search
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useStoreConfig } from '@/lib/store-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function AccountDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accounts, getAccountTransactions, getStoreCustomers } = useERPStore();
  const { baseCurrency } = useStoreConfig();
  const [searchQuery, setSearchQuery] = useState('');

  const account = accounts.find(a => a.id === id);
  const transactions = getAccountTransactions(id || '');
  const customers = getStoreCustomers();

  if (!account) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4">
        <Landmark className="w-20 h-20 text-slate-200 mb-6" />
        <h3 className="text-xl font-black text-slate-900 uppercase">Account Not Found</h3>
        <Button onClick={() => navigate('/accounts')} className="mt-6 bg-primary text-white">
          Back to Accounts
        </Button>
      </div>
    );
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Wallet className="w-8 h-8" />;
      case 'card': return <CreditCard className="w-8 h-8" />;
      case 'wallet': return <Smartphone className="w-8 h-8" />;
      case 'bank': return <Landmark className="w-8 h-8" />;
      case 'savings': return <TrendingUp className="w-8 h-8" />;
      case 'credit': return <ArrowUpRight className="w-8 h-8" />;
      default: return <Landmark className="w-8 h-8" />;
    }
  };

  const totalIn = transactions
    .filter(t => t.type === 'cash_in' || t.type === 'sale')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = transactions
    .filter(t => t.type === 'cash_out' || t.type === 'expense' || t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/accounts')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{account.name}</h1>
                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest">
                  {account.type}
                </Badge>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Detailed Financial Activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest h-14 px-8 shadow-xl shadow-black/10 flex items-center gap-3">
              <Plus className="w-4 h-4" />
              New Transaction
            </Button>
            <Button variant="ghost" className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center p-0">
              <Download className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Balance Highlight Card */}
            <div className="bg-[#2156C1] rounded-[3.5rem] p-12 text-white shadow-2xl shadow-blue-900/40 relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-12">
                  <div className="p-5 bg-white/10 rounded-[2rem] text-white">
                    {getAccountIcon(account.type)}
                  </div>
                  <div className="text-right">
                    <Badge className="bg-white/10 text-white border-white/20 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">
                      SYSTEM ACCOUNT
                    </Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-[0.4em] mb-4">CURRENT LIQUIDITY</h4>
                  <div className="flex items-baseline gap-4">
                    <span className="text-7xl font-black tracking-tighter">
                      {formatCurrency(account.balance)}
                    </span>
                    <span className="text-2xl font-bold text-blue-200 uppercase">{baseCurrency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Activity Matrix */}
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-white overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Financial Ledger</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time money flow history</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                    <Input 
                      placeholder="SEARCH LEDGER..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-50 border-none rounded-2xl pl-12 h-12 text-[10px] font-black tracking-widest w-64 uppercase"
                    />
                  </div>
                  <Button variant="ghost" className="w-12 h-12 rounded-xl bg-slate-50 p-0">
                    <Filter className="w-4 h-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="text-left py-6 px-10 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="text-left py-6 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Transaction Item</th>
                      <th className="text-left py-6 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Category</th>
                      <th className="text-right py-6 px-10 text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-32 text-center">
                          <Activity className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No transactions found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const isCredit = tx.type === 'cash_in' || tx.type === 'sale';
                        const customer = customers.find(c => c.id === tx.customerId);

                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-8 px-10">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                isCredit ? "bg-emerald-50 text-emerald-500 shadow-emerald-500/10" : "bg-rose-50 text-rose-500 shadow-rose-500/10"
                              )}>
                                {isCredit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              </div>
                            </td>
                            <td className="py-8 px-4">
                              <div>
                                <h4 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">{tx.description || tx.type}</h4>
                                <div className="flex items-center gap-2 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {new Date(tx.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  {customer && (
                                    <>
                                      <div className="w-1 h-1 rounded-full bg-slate-200 mx-1" />
                                      <span className="text-[9px] font-black text-primary uppercase tracking-widest">{customer.name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-8 px-4">
                              <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-[0.1em]">
                                {tx.type}
                              </Badge>
                            </td>
                            <td className="py-8 px-10 text-right">
                              <div className={cn(
                                "text-base font-black tracking-tight",
                                isCredit ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side Performance Column */}
          <div className="space-y-8">
            {/* Quick Stats Matrix */}
            <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-white space-y-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-6">Account Performance</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">TOTAL INFLOW</span>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(totalIn)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">TOTAL OUTFLOW</span>
                    <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(totalOut)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">NET CASH FLOW</span>
                    <p className={cn(
                      "text-xl font-black tracking-tight",
                      totalIn - totalOut >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {formatCurrency(totalIn - totalOut)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Widget */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative">
              <div className="absolute right-[-20%] bottom-[-20%] opacity-10">
                <Shield className="w-40 h-40 text-white" />
              </div>
              <div className="relative z-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Security & Auditing</h4>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
                    <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase tracking-wider">
                      This account is synchronized with the central financial ledger.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
                    <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase tracking-wider">
                      Multi-tenant isolation strictly enforced for this sub-ledger.
                    </p>
                  </div>
                </div>
                <Button className="w-full mt-10 h-14 bg-white/10 hover:bg-white/20 text-white border-white/10 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all">
                  Request Full Audit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}
