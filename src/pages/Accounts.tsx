import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Wallet, CreditCard, Smartphone, TrendingUp, TrendingDown, ArrowLeft, Landmark, Activity, MoreHorizontal, ArrowUpRight, DollarSign, Plus, X, ShieldCheck } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useStoreConfig } from '@/lib/store-config';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Account } from '@/lib/types';

export default function Accounts() {
  const navigate = useNavigate();
  const { getStoreAccounts, getStoreTransactions, getStoreSales, addAccount, updateAccount, deleteAccount, activeStoreId, checkPermission } = useERPStore();
  const { baseCurrency } = useStoreConfig();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'cash' as Account['type'], balance: 0 });
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const accounts = getStoreAccounts();
  const transactions = getStoreTransactions();
  const sales = getStoreSales();

  const canManageLedger = checkPermission('canManageLedger');

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name) {
      toast.error('Account name is required');
      return;
    }

    try {
      await addAccount({
        ...newAccount,
        id: '', // Will be generated
        storeId: activeStoreId,
      });
      setIsAddModalOpen(false);
      setNewAccount({ name: '', type: 'cash', balance: 0 });
      toast.success('Account added successfully');
    } catch (error) {
      toast.error('Failed to add account');
    }
  };

  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editingAccount.name) {
      toast.error('Account name is required');
      return;
    }

    try {
      await updateAccount(editingAccount.id, {
        name: editingAccount.name,
        type: editingAccount.type,
        balance: editingAccount.balance
      });
      setIsEditModalOpen(false);
      setEditingAccount(null);
      toast.success('Account updated successfully');
    } catch (error) {
      toast.error('Failed to update account');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? All associated records will be detached.')) return;
    
    try {
      await deleteAccount(id);
      toast.success('Account deleted successfully');
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Wallet className="w-6 h-6" />;
      case 'card': return <CreditCard className="w-6 h-6" />;
      case 'wallet': return <Smartphone className="w-6 h-6" />;
      case 'bank': return <Landmark className="w-6 h-6" />;
      case 'savings': return <TrendingUp className="w-6 h-6" />;
      case 'credit': return <ArrowUpRight className="w-6 h-6" />;
      default: return <Landmark className="w-6 h-6" />;
    }
  };

  const getAccountActivity = (accountId: string) => {
    const accountTransactions = transactions.filter(t => t.accountId === accountId);
    const accountSales = sales.filter(s => s.accountId === accountId);

    const cashIn = accountTransactions.filter(t => t.type === 'cash_in').reduce((s, t) => s + t.amount, 0);
    const cashOut = accountTransactions.filter(t => t.type !== 'cash_in').reduce((s, t) => s + t.amount, 0);
    const salesTotal = accountSales.reduce((s, sale) => s + sale.totalAmount, 0);

    return { cashIn, cashOut, salesTotal };
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
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Accounts</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Your Money Accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canManageLedger && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary hover:bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-2xl shadow-black/10 h-14"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            )}
            <Badge className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border-emerald-100">
              All Accounts Active
            </Badge>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 h-full">
        {!canManageLedger ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
            <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
              You do not have permission to view or manage the Ledger Accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Aggregate Liquidity Card */}
            <div className=" rounded-[3.5rem] p-12 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-4 bg-white/10 rounded-2xl text-blue-400">
                      <Landmark className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">TOTAL BALANCE</h4>
                      <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-black tracking-tighter text-[#2156C1]">
                          {formatCurrency(totalBalance)}
                        </span>
                        <span className="text-xl font-bold text-[#2156C1] uppercase">{baseCurrency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-white/5 text-slate-400 border-white/10 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest">
                      {accounts.length} ACCOUNTS
                    </Badge>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      UP TO DATE
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Account Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {accounts.map((account) => {
                const activity = getAccountActivity(account.id);

                return (
                  <div key={account.id} className="bg-white rounded-[3rem] p-10 shadow-sm border border-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group overflow-hidden relative">
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <DollarSign className="w-32 h-32" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                            {getAccountIcon(account.type)}
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{account.name}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{account.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingAccount(account);
                              setIsEditModalOpen(true);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">BALANCE</span>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">
                          {formatCurrency(account.balance)}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">SALES</span>
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-black tracking-tight">{formatCurrency(activity.salesTotal)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">MONEY IN</span>
                          <div className="flex items-center gap-1.5 text-indigo-600">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-[10px] font-black tracking-tight">{formatCurrency(activity.cashIn)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">MONEY OUT</span>
                          <div className="flex items-center gap-1.5 text-rose-600">
                            <TrendingDown className="w-3 h-3" />
                            <span className="text-[10px] font-black tracking-tight">{formatCurrency(activity.cashOut)}</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => navigate(`/accounts/${account.id}`)}
                        className="w-full mt-8 h-14 bg-slate-50 hover:bg-primary hover:text-white rounded-2xl flex items-center justify-center gap-3 transition-all group/btn"
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">View Details</span>
                        <ArrowUpRight className="w-4 h-4 opacity-40 group-hover/btn:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md transition-all duration-500 animate-in fade-in">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[3.5rem] p-8 md:p-12 shadow-2xl shadow-black/30 relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-8 right-8 p-3 hover:bg-slate-50 rounded-2xl transition-all"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">New Account</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Create a financial sub-ledger</p>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Account Name</label>
                  <Input
                    placeholder="e.g. Stanbic Business"
                    value={newAccount.name}
                    onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="h-16 rounded-2xl bg-slate-50 border-transparent focus:border-primary focus:ring-0 transition-all font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block text-center">Account Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(['cash', 'card', 'wallet', 'bank', 'savings', 'credit'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewAccount(prev => ({ ...prev, type }))}
                        className={cn(
                          "flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 group",
                          newAccount.type === type
                            ? "bg-primary border-primary text-white shadow-xl shadow-black/20"
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                          newAccount.type === type ? "bg-white/10" : "bg-slate-50 group-hover:bg-slate-100"
                        )}>
                          {getAccountIcon(type)}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Opening Balance</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newAccount.balance || ''}
                      onChange={e => setNewAccount(prev => ({ ...prev, balance: Number(e.target.value) }))}
                      className="h-16 pl-14 rounded-2xl bg-slate-50 border-transparent focus:border-primary focus:ring-0 transition-all font-bold text-slate-900"
                    />
                    <span className="w-5 h-5 text-slate-300 absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-[10px]">{baseCurrency}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-16 bg-primary hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10"
                >
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {isEditModalOpen && editingAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-500 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] p-12 shadow-2xl shadow-black/30 relative animate-in zoom-in-95 duration-300">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingAccount(null);
              }}
              className="absolute top-8 right-8 p-3 hover:bg-slate-50 rounded-2xl transition-all"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="mb-10 flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Edit Account</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{editingAccount.name}</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => {
                  handleDeleteAccount(editingAccount.id);
                  setIsEditModalOpen(false);
                }}
                className="bg-rose-50 text-rose-600 hover:bg-rose-100 border-none rounded-2xl px-6 h-12 font-black text-[9px] uppercase tracking-widest"
              >
                Delete
              </Button>
            </div>

            <form onSubmit={handleEditAccount} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Account Name</label>
                  <Input
                    placeholder="e.g. Stanbic Business"
                    value={editingAccount.name}
                    onChange={e => setEditingAccount(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="h-16 rounded-2xl bg-slate-50 border-transparent focus:border-primary focus:ring-0 transition-all font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block text-center">Account Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(['cash', 'card', 'wallet', 'bank', 'savings', 'credit'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditingAccount(prev => prev ? ({ ...prev, type }) : null)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all duration-300 group",
                          editingAccount.type === type
                            ? "bg-primary border-primary text-white shadow-xl shadow-black/20"
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                          editingAccount.type === type ? "bg-white/10" : "bg-slate-50 group-hover:bg-slate-100"
                        )}>
                          {getAccountIcon(type)}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Adjust Balance</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={editingAccount.balance}
                      onChange={e => setEditingAccount(prev => prev ? ({ ...prev, balance: Number(e.target.value) }) : null)}
                      className="h-16 pl-14 rounded-2xl bg-slate-50 border-transparent focus:border-primary focus:ring-0 transition-all font-bold text-slate-900"
                    />
                    <span className="w-5 h-5 text-slate-300 absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-[10px]">{baseCurrency}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-16 rounded-2xl font-black text-[10px] uppercase tracking-widest border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-16 bg-primary hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-black/10"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
