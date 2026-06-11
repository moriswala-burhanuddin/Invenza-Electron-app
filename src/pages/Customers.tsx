import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Search, Plus, Mail, Tags, FileText, Download, Trash2, XCircle, ChevronDown, Upload, FileSpreadsheet, Settings, Wrench, Edit, Banknote, Users as UsersIcon, Home, Barcode, Building2, Phone, MapPin, ArrowRight, MoreHorizontal, Globe, DollarSign, Zap, CheckCircle2, ShieldCheck, User, Star, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Customers() {
  const navigate = useNavigate();
  const { getStoreCustomers, deleteCustomer, checkPermission } = useERPStore();

  const canManageCustomers = checkPermission('canManageCustomers');
  const customers = getStoreCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete these ${selectedIds.length} customers?`)) {
      for (const id of selectedIds) {
        await deleteCustomer(id);
      }
      toast.error("Customers deleted.");
      setSelectedIds([]);
    }
  };

  const totalCustomers = customers.length;
  const highValueCustomers = customers.filter(c => (c.creditBalance || 0) > 5000).length;
  const activeDebtors = customers.filter(c => (c.creditBalance || 0) > 0).length;

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Customers</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">All Customers • {totalCustomers}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 border border-slate-50">
              <Download className="w-5 h-5" />
            </button>
            <div className="h-10 w-px bg-slate-100 mx-2" />
            {canManageCustomers && (
              <Button onClick={() => navigate('/customers/new')} className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Plus className="w-4 h-4 mr-2 text-indigo-400" />
                Add New Customer
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
        {!canManageCustomers ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
            <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
              You do not have permission to view or manage the customer registry.
            </p>
          </div>
        ) : (
          <>
            {/* Intelligence Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-8 text-indigo-500">
                  <UsersIcon className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Customers</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{totalCustomers}</h3>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl group-hover:scale-150 transition-all" />
              </div>

              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white relative overflow-hidden group">
                <div className="p-4 bg-amber-50 rounded-2xl w-fit mb-8 text-amber-500">
                  <Star className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High Value</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{highValueCustomers}</h3>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50/50 rounded-full blur-2xl group-hover:scale-150 transition-all" />
              </div>

              <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-8">
                  <div className="p-4 bg-white/10 rounded-2xl text-rose-400">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Credit Owed</span>
                </div>
                <h3 className="text-3xl font-black tracking-tighter mb-1">{activeDebtors} With Balance</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Has Outstanding Balance</span>
                </div>
              </div>
            </div>

            {/* Registry Controls */}
            <div className="bg-white p-6 rounded-[3rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex-1 relative group max-w-2xl">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                <input
                  type="text"
                  placeholder="SEARCH BY NAME, EMAIL, OR PHONE..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-16 bg-slate-50 border-none rounded-[1.5rem] pl-16 pr-8 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className={cn(
                    "h-16 px-8 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedIds.length > 0 ? "bg-emerald-50 text-emerald-600 shadow-sm" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {selectedIds.length === filteredCustomers.length ? "CLEAR SELECTION" : `SELECT ALL (${filteredCustomers.length})`}
                </button>

                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                    <button
                      onClick={handleDeleteSelected}
                      className="h-16 w-16 bg-rose-50 text-rose-600 rounded-[1.5rem] flex items-center justify-center hover:bg-rose-100 shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button className="h-16 px-8 bg-primary text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20">
                      BULK ACTION ({selectedIds.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Entity Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const isSelected = selectedIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelection(c.id)}
                      className={cn(
                        "bg-white rounded-[3rem] p-10 border-2 transition-all duration-500 group relative cursor-pointer",
                        isSelected ? "border-primary shadow-2xl scale-[1.02]" : "border-transparent shadow-sm hover:border-slate-100 hover:shadow-xl"
                      )}
                    >
                      {/* Select Indicator */}
                      <div className={cn(
                        "absolute top-8 right-8 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "bg-primary border-primary text-white" : "border-slate-100 group-hover:border-slate-200"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>

                      <div className="flex flex-col items-center text-center mb-10">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-primary group-hover:text-white transition-all shadow-inner relative mb-6 overflow-hidden">
                          <User className="w-10 h-10 group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent opacity-0 group-hover:opacity-100" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors truncate w-full px-4">{c.name}</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                          ID: {c.id.slice(-6).toUpperCase()}
                        </p>
                      </div>

                      <div className="space-y-6 mb-10">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 p-4 rounded-2xl">
                          <span className="flex items-center gap-3"><Phone className="w-4 h-4 text-emerald-500" /> CONTACT</span>
                          <span className="text-slate-900">{c.phone || 'HIDDEN'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 p-4 rounded-2xl">
                          <span className="flex items-center gap-3"><MapPin className="w-4 h-4 text-rose-500" /> AREA</span>
                          <span className="text-slate-900 truncate max-w-[120px]">{c.area || 'Not Set'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 p-4 rounded-2xl">
                          <span className="flex items-center gap-3"><DollarSign className="w-4 h-4 text-indigo-500" /> BALANCE</span>
                          <span className={cn(
                            "font-black",
                            (c.creditBalance || 0) >= 0 ? "text-rose-600" : "text-emerald-600"
                          )}> {formatCurrency(Math.abs(c.creditBalance || 0))} {(c.creditBalance || 0) >= 0 ? 'Dr' : 'Cr'}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={(e) => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}
                          className="flex-1 bg-slate-50 hover:bg-primary hover:text-white text-slate-900 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest transition-all shadow-none border border-slate-50"
                        >
                          View Profile
                          <ArrowRight className="w-4 h-4 ml-3" />
                        </Button>
                        <button className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 hover:text-foreground transition-all border border-slate-50">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-60 text-center opacity-30 flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
                  <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10">
                    <UsersIcon className="w-16 h-16 text-slate-100" />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">No Customers Found</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 px-20 max-w-2xl leading-loose text-center">No customers match your search. Add a new customer to get started.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
