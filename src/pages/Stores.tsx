import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Store as StoreIcon, ChevronRight, MapPin, Phone, Check, Plus, Edit, Trash2, X, ArrowLeft, Building2, Package, Wallet, Globe, Zap, Ghost, MoreHorizontal } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StoreFormData {
  name: string;
  branch: string;
  address: string;
  phone: string;
}

export default function Stores() {
  const { stores, activeStoreId, setActiveStore, products, addStore, updateStore, deleteStore } = useERPStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    branch: '',
    address: '',
    phone: ''
  });

  const getStoreStats = (storeId: string) => {
    const storeProducts = products.filter(p => p.storeId === storeId);
    const stockValue = storeProducts.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
    return {
      productCount: storeProducts.length,
      stockValue
    };
  };

  const handleOpenForm = (store?: any) => {
    if (store) {
      setEditingId(store.id);
      setFormData({
        name: store.name,
        branch: store.branch,
        address: store.address,
        phone: store.phone
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        branch: '',
        address: '',
        phone: ''
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      branch: '',
      address: '',
      phone: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateStore(editingId, formData);
        toast.success("Store updated.");
      } else {
        await addStore(formData);
        toast.success("New store added.");
      }
      handleCloseForm();
    } catch (error) {
      toast.error("Failed to save store. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
        if (confirm(`Are you sure you want to delete this store? This cannot be undone.`)) {
      try {
        await deleteStore(id);
        toast.error("Store deleted.");
      } catch (error) {
        toast.error("Could not delete this store.");
      }
    }
  };

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
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Stores</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">All Your Stores • {stores.length} Stores</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-600 border border-indigo-100">
              <Globe className="w-3.5 h-3.5 animate-spin-slow" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">All Stores</span>
            </div>
            <Button
              onClick={() => handleOpenForm()}
              className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4 mr-2 text-indigo-400" />
              Add Store
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {/* Workforce Intelligence */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
            <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6 text-indigo-500">
              <Building2 className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Stores</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{stores.length}</h3>
          </div>
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
            <div className="p-3 bg-amber-50 rounded-xl w-fit mb-6 text-amber-500">
              <Package className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Products</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{products.length}</h3>
          </div>
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
            <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-6 text-emerald-500">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Stock Value</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">
              {formatCurrency(products.reduce((s, p) => s + (p.purchasePrice * p.quantity), 0))}
            </h3>
          </div>
          <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/20 flex flex-col justify-center relative overflow-hidden group">
            <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
            <div className="relative z-10">
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Network Health</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">All Good</span>
              </div>
            </div>
          </div>
        </div>

        {/* Infrastructure Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {stores.map((store) => {
            const stats = getStoreStats(store.id);
            const isActive = store.id === activeStoreId;

            return (
              <div
                key={store.id}
                className={cn(
                  "bg-white rounded-[3rem] p-10 border-2 transition-all duration-500 group relative overflow-hidden",
                  isActive ? "border-primary shadow-2xl shadow-black/5 scale-[1.01]" : "border-white shadow-sm hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
                )}
              >
                <div className="flex items-start justify-between gap-6 mb-10">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all shadow-sm",
                      isActive ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                    )}>
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{store.name}</h3>
                        {isActive && (
                          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 rounded-full px-3 py-1 font-black text-[8px] uppercase tracking-[0.2em]">Active</Badge>
                        )}
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{store.branch}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenForm(store)}
                      className="p-3 bg-slate-50 text-slate-400 hover:bg-primary hover:text-white rounded-xl transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(store.id)}
                      disabled={stores.length <= 1}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        stores.length <= 1 
                          ? "bg-slate-50 text-slate-200 cursor-not-allowed" 
                          : "bg-red-50 text-red-200 hover:text-red-500"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-900">
                      <MapPin className="w-4 h-4 text-slate-300" />
                      <span className="text-[11px] font-black uppercase tracking-widest">{store.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-900">
                      <Phone className="w-4 h-4 text-slate-300" />
                      <span className="text-[11px] font-black uppercase tracking-widest">{store.phone}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-[1.8rem] p-6 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Asset Value</p>
                    <p className="text-xl font-black text-slate-900 leading-none">{formatCurrency(stats.stockValue)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive ? (
                    <Button
                      onClick={() => setActiveStore(store.id)}
                      className="flex-1 bg-slate-900 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest hover:bg-primary transition-all"
                    >
                      Switch To This Store
                      <ChevronRight className="w-4 h-4 ml-2 text-indigo-400" />
                    </Button>
                  ) : (
                    <div className="flex-1 bg-indigo-50 text-indigo-600 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest flex items-center justify-center border border-indigo-100">
                      Currently Operational
                      <Check className="w-4 h-4 ml-2" />
                    </div>
                  )}
                  <button className="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-300 hover:text-foreground border border-slate-50">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}

          {stores.length === 0 && (
            <div className="col-span-full py-40 text-center opacity-30 flex flex-col items-center">
              <Ghost className="w-20 h-20 text-slate-100 mb-8" />
              <h4 className="text-2xl font-black text-slate-900 uppercase">No Stores Found</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center max-w-sm">Click "Add Store" to create your first store.</p>
            </div>
          )}
        </div>
      </main>

      {/* Node Configuration Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {editingId ? 'Edit Store' : 'Add New Store'}
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Store Details</p>
              </div>
              <button
                onClick={handleCloseForm}
                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Store Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl h-14 px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="STORE NAME"
                    maxLength={50}
                    required
                  />
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Branch</label>
                  <input
                    type="text"
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl h-14 px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="BRANCH REFERENCE"
                    maxLength={30}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border-none rounded-2xl h-14 px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="FULL ADDRESS"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-() ]/g, '') })}
                  className="w-full bg-slate-50 border-none rounded-2xl h-14 px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="PHONE IDENTIFIER"
                  maxLength={15}
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest h-16 rounded-2xl hover:bg-slate-100 transition-all"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white font-black uppercase text-[10px] tracking-widest h-16 rounded-2xl shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {editingId ? 'Save Changes' : 'Add Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
