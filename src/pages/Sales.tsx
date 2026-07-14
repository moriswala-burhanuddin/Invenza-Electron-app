import { useState } from 'react';
import { isElectron } from '@/lib/electron-helper';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Plus, Search, Filter, Download, ChevronRight, Upload, Trash2, Calendar, CreditCard, DollarSign, Wallet, ArrowUpRight, CheckCircle2, Clock, TrendingUp, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Sales() {
    const navigate = useNavigate();
    const { getStoreSales, getStoreCustomers, addSale, deleteSale, activeStoreId, checkPermission } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterPayment, setFilterPayment] = useState<string>('all');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'seven' | 'month' | 'custom'>('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const canSeeRevenueMetrics = checkPermission('canSeeRevenueMetrics');
    const canSeeDetailedSales = checkPermission('canSeeDetailedSales');
    const canAccessAllInvoices = checkPermission('canAccessAllInvoices');

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
    const [adminCode, setAdminCode] = useState('');

    const sales = getStoreSales();
    const customers = getStoreCustomers();

    const filteredSales = sales.filter(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        const matchesSearch =
            sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

        const matchesType = filterType === 'all' || sale.type === filterType;
        const matchesPayment = filterPayment === 'all' || sale.paymentMode === filterPayment;

        let matchesDate = true;
        const saleDate = new Date(sale.date);
        const now = new Date();

        if (dateRange === 'today') {
            matchesDate = saleDate.toDateString() === now.toDateString();
        } else if (dateRange === 'seven') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            matchesDate = saleDate >= sevenDaysAgo;
        } else if (dateRange === 'month') {
            matchesDate = saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
        } else if (dateRange === 'custom' && customStart && customEnd) {
            matchesDate = saleDate >= new Date(customStart) && saleDate <= new Date(customEnd);
        }

        return matchesSearch && matchesType && matchesPayment && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const exportCSV = () => {
        const headers = ['Invoice', 'Type', 'Amount', 'Profit', 'Payment', 'Date'];
        const rows = filteredSales.map(s => [
            s.invoiceNumber,
            s.type,
            s.totalAmount,
            s.profit,
            s.paymentMode,
            new Date(s.date).toLocaleDateString()
        ]);

        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        toast.success("Sales Exported Successfully");
    };

    const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let successCount = 0;
                const rows = results.data as Record<string, string>[];
                for (const row of rows) {
                    try {
                        await addSale({
                            type: (row.type?.toLowerCase() as 'cash' | 'credit' | 'retail') || (row.Type?.toLowerCase() as 'cash' | 'credit' | 'retail') || 'cash',
                            status: 'completed',
                            items: [],
                            subtotal: parseFloat(row.Amount) || 0,
                            discountAmount: 0,
                            taxAmount: 0,
                            totalAmount: parseFloat(row.Amount) || 0,
                            profit: parseFloat(row.Profit) || 0,
                            paymentMode: (row.paymentMode?.toLowerCase() as 'cash' | 'card' | 'upi' | 'gift_card' | 'store_credit') || (row.Payment?.toLowerCase() as 'cash' | 'card' | 'upi' | 'gift_card' | 'store_credit') || 'cash',
                            accountId: 'account-1',
                            storeId: activeStoreId,
                            date: row.Date ? new Date(row.Date).toISOString() : new Date().toISOString()
                        });
                        successCount++;
                    } catch (err) { console.error("Import error", err); }
                }
                toast.success(`Imported ${successCount} entries`);
            }
        });
    };

    const handleDeleteSale = async () => {
        let isValid = false;
        if (isElectron() && window.electronAPI?.verifySupervisor) {
            isValid = await window.electronAPI.verifySupervisor(adminCode);
        } else {
            isValid = adminCode === '1234';
        }
        if (!isValid) {
            toast.error("Invalid Administrative Code");
            return;
        }
        if (saleToDelete) {
            deleteSale(saleToDelete);
            toast.success("Sale deleted.");
        }
        setShowDeleteDialog(false);
        setSaleToDelete(null);
        setAdminCode('');
    };

    const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Sales</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredSales.length} Records</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl" onClick={exportCSV}>
                            <Download className="w-5 h-5 text-slate-400" />
                        </Button>
                        <label className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer">
                            <Upload className="w-5 h-5 text-slate-400" />
                            <input type="file" accept=".csv" className="hidden" onChange={importCSV} />
                        </label>
                        <Button onClick={() => navigate('/sales/new')} className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            New Transaction
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {!canAccessAllInvoices && !canSeeRevenueMetrics ? (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
            <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
              You do not have permission to view sales history or revenue metrics.
            </p>
          </div>
        ) : (
          <>
            {/* Superior Filter Bar */}
            {canAccessAllInvoices && (
            <div className="bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 mb-8 border border-white shadow-sm">
                    <div className="grid lg:grid-cols-4 gap-4 items-center">
                        <div className="lg:col-span-2 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <input
                                type="text"
                                placeholder="Search invoice numbers or customer profiles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#fdfdfd] border-none rounded-2xl py-5 pl-14 pr-6 text-sm font-bold placeholder:text-slate-200 focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full h-16 bg-[#fdfdfd] border-none rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">ALL TYPES</option>
                                    <option value="cash">CASH</option>
                                    <option value="credit">CREDIT</option>
                                    <option value="retail">RETAIL</option>
                                </select>
                            </div>
                            <div className="flex-1 relative">
                                <select
                                    value={filterPayment}
                                    onChange={(e) => setFilterPayment(e.target.value)}
                                    className="w-full h-16 bg-[#fdfdfd] border-none rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-primary"
                                >
                                    <option value="all">ANY PAY</option>
                                    <option value="cash">CASH</option>
                                    <option value="card">CARD</option>
                                    <option value="upi">UPI</option>
                                    <option value="gift_card">GIFT CARD</option>
                                    <option value="store_credit">STORE CREDIT</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value as 'all' | 'today' | 'seven' | 'month' | 'custom')}
                                className="w-full h-16 bg-[#fdfdfd] border-none rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-2 focus:ring-primary"
                            >
                                <option value="all">ANY TIME</option>
                                <option value="today">TODAY</option>
                                <option value="seven">7 DAYS</option>
                                <option value="month">MONTHLY</option>
                                <option value="custom">CUSTOM</option>
                            </select>
                        </div>
                    </div>

                    {dateRange === 'custom' && (
                        <div className="mt-4 flex gap-4 animate-in slide-in-from-top-1">
                            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-[10px] font-black uppercase" />
                            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="flex-1 bg-slate-50 border-none rounded-2xl py-4 px-6 text-[10px] font-black uppercase" />
                        </div>
                    )}
                    </div>
            )}

            {/* Intelligence Widgets */}
            {canSeeRevenueMetrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/10">
                        <div className="flex justify-between mb-6">
                            <Wallet className="w-6 h-6 text-slate-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Gross Sales</span>
                        </div>
                        <h3 className="text-3xl font-black mb-1">{formatCurrency(totalSales)}</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Transaction Value</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between mb-6">
                            <TrendingUp className="w-6 h-6 text-emerald-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Net Profit</span>
                        </div>
                        <h3 className="text-3xl font-black mb-1 text-slate-900">{formatCurrency(totalProfit)}</h3>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Profit (Filtered)</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between mb-6">
                            <Activity className="w-6 h-6 text-indigo-600" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Avg Sale</span>
                        </div>
                        <h3 className="text-3xl font-black mb-1 text-slate-900">{formatCurrency(totalSales / (filteredSales.length || 1))}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avg Ticket Size</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between mb-6">
                            <Clock className="w-6 h-6 text-slate-400" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Volume</span>
                        </div>
                        <h3 className="text-3xl font-black mb-1 text-slate-900">{filteredSales.length}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Invoices</p>
                    </div>
                    </div>
            )}

            {/* Transaction List */}
            {canAccessAllInvoices && (
            <div className="space-y-4">
              {filteredSales.length > 0 ? (
                        filteredSales.map((sale) => (
                            <div
                                key={sale.id}
                                onClick={() => navigate(`/sales/${sale.id}`)}
                                className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-2xl transition-all duration-300 group cursor-pointer flex items-center justify-between"
                            >
                                <div className="flex items-center gap-8">
                                    <div className={cn(
                                        "w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center transition-all group-hover:scale-110 shadow-sm",
                                        sale.type === 'cash' ? "bg-emerald-50 text-emerald-600" :
                                            sale.type === 'credit' ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                                    )}>
                                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">Inv</span>
                                        <span className="text-lg font-black tracking-tighter">#{sale.invoiceNumber.slice(-3)}</span>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Invoice {sale.invoiceNumber}</h4>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                sale.type === 'cash' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                            )}>
                                                {sale.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(sale.date).toLocaleDateString()}
                                            </div>
                                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard className="w-3.5 h-3.5" />
                                                {sale.paymentMode}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right flex items-center gap-8">
                                    <div>
                    <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{formatCurrency(sale.totalAmount)}</h3>
                    {canSeeDetailedSales && (
                    <div className="flex justify-end items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                      <TrendingUp className="w-3 h-3" />
                      Profit {formatCurrency(sale.profit)}
                    </div>
                    )}
                  </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSaleToDelete(sale.id);
                                                setShowDeleteDialog(true);
                                            }}
                                            className="p-4 bg-red-50 text-red-100 group-hover:text-red-600 rounded-2xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-[3rem] p-20 text-center border border-white flex flex-col items-center justify-center opacity-40">
                            <Search className="w-20 h-20 text-slate-200 mb-6" />
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Sales Found</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Try adjusting your filters or adding a new sale</p>
                        </div>
                        )}
            </div>
            )}
          </>
        )}
      </main>

      {/* Administrative Firewall */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] border-none p-10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase mb-2">Confirm Delete Sale</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-6">
                        <div className="p-6 bg-red-50 rounded-[1.5rem] border border-red-100 flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase text-red-900 leading-none mb-1">Warning</h4>
                                <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">This will permanently delete the sale record.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Admin Password</Label>
                            <div className="relative group">
                                <Input
                                    type="password"
                                    placeholder="Enter administrator password"
                                    className="w-full bg-slate-50 border-none rounded-[1.2rem] h-16 pl-6 font-black tracking-widest focus:ring-2 focus:ring-primary"
                                    value={adminCode}
                                    onChange={(e) => setAdminCode(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleDeleteSale()}
                                    autoFocus
                                />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-2">
                                Administrative privileges required to delete records.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col gap-3">
                        <Button
                            variant="ghost"
                            className="w-full rounded-[1.2rem] h-14 font-black uppercase text-[10px] tracking-widest"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="w-full bg-red-600 text-white rounded-[1.2rem] h-16 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200"
                            onClick={handleDeleteSale}
                        >
                            Confirm Permanent Deletion
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
