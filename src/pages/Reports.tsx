import { useState, useEffect, useCallback, ElementType } from 'react';
import { useERPStore } from '@/lib/store-data';
import { dbAdapter } from '@/lib/db-adapter';
import {
  FileText, Download, Calendar, BarChart2, PieChart, TrendingUp,
  Package, Wallet, Truck, Users, Activity, Filter,
  ChevronRight, ArrowRight, Eye, ArrowLeft, MoreHorizontal, Database, Target, Layers, Sparkles, Ghost
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCurrency, getExchangeRate } from '@/lib/utils';
import { useStoreConfig } from '@/lib/store-config';
import { Badge } from '@/components/ui/badge';

type ReportCategory = 'sales' | 'inventory' | 'finance' | 'purchases' | 'hr';

interface ReportType {
  id: string;
  label: string;
  icon: ElementType;
  category: ReportCategory;
  description: string;
}

const REPORT_TYPES: ReportType[] = [
  // Sales
  { id: 'sales_summary', label: 'Sales Summary', icon: BarChart2, category: 'sales', description: 'Daily sales volume and revenue totals.' },
  { id: 'sales_by_product', label: 'Top Products', icon: TrendingUp, category: 'sales', description: 'Most sold products by quantity and value.' },

  // Inventory
  { id: 'inventory_status', label: 'Stock Status', icon: Package, category: 'inventory', description: 'Current stock levels and valuation.' },

  // Finance
  { id: 'profit_loss', label: 'Profit & Loss', icon: Wallet, category: 'finance', description: 'Revenue vs expenses and purchase costs.' },
  { id: 'tax_report', label: 'VAT Tax Report', icon: FileText, category: 'finance', description: 'Sales and estimated tax summary.' },
  { id: 'cheque_report', label: 'Cheque History', icon: Activity, category: 'finance', description: 'All cheques issued and received.' },

  // Purchases
  { id: 'purchases_summary', label: 'Purchase Summary', icon: Truck, category: 'purchases', description: 'Supplier-wise purchase totals.' },

  // HR
  { id: 'hr_attendance', label: 'Attendance Log', icon: Users, category: 'hr', description: 'Staff check-in/out records.' },
];

export default function Reports() {
  const { getActiveStore, activeStoreId, currentUser } = useERPStore();
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('sales');
  const [selectedReport, setSelectedReport] = useState<string>('sales_summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([]);
  const store = getActiveStore();
  const config = useStoreConfig();
  const companyId = currentUser?.companyId;

  const categories: { id: ReportCategory; label: string; icon: ElementType, accent: string }[] = [
    { id: 'sales', label: 'Sales', icon: BarChart2, accent: 'bg-indigo-50 text-indigo-600' },
    { id: 'inventory', label: 'Inventory', icon: Package, accent: 'bg-amber-50 text-amber-600' },
    { id: 'finance', label: 'Finance', icon: Wallet, accent: 'bg-emerald-50 text-emerald-600' },
    { id: 'purchases', label: 'Purchases', icon: Truck, accent: 'bg-rose-50 text-rose-600' },
    { id: 'hr', label: 'HR', icon: Users, accent: 'bg-blue-50 text-blue-600' },
  ];

  const filteredReports = REPORT_TYPES.filter(r => r.category === selectedCategory);

  const fetchPreview = useCallback(async () => {
    if (!activeStoreId || !companyId) return;
    setLoading(true);
    try {
      console.log(`[Diagnostic] Fetching report: ${selectedReport} for Store: ${activeStoreId}, Company: ${companyId}`);
      const data = await dbAdapter.getReport(selectedReport, activeStoreId, dateFrom, dateTo, companyId);
      setReportData(data || []);
    } catch (error) {
      toast.error('Failed to load report data.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [activeStoreId, companyId, selectedReport, dateFrom, dateTo]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const exportCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const currency = config.currencyCode || config.baseCurrency || 'UGX';
    
    const csvContent = [
      headers.join(','),
      ...reportData.map(row =>
        headers.map(header => {
          const val = row[header];
          
          // Detect financial columns and format them with currency for CSV
          const isFinancial = ['total', 'revenue', 'profit', 'value', 'amount', 'taxAmount', 'taxableValue', 'purchasePrice', 'cost'].some(k => header.toLowerCase().includes(k.toLowerCase()));
          
          if (isFinancial && typeof val === 'number') {
            return `"${formatCurrency(val, currency)}"`;
          }

          return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileName = `${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully.');
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
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Business Reports</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{store?.name || 'STORE'} • View and Export report data</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl text-indigo-600 border border-indigo-100">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">Database Connected</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Control Sidebar */}
        <div className="lg:col-span-4 space-y-10">
          {/* Category Matrix */}
          <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-slate-900 rounded-xl text-white">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Categories</h3>
            </div>

            <div className="space-y-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    const firstInCat = REPORT_TYPES.find(r => r.category === cat.id);
                    if (firstInCat) setSelectedReport(firstInCat.id);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-[1.8rem] transition-all duration-500 group",
                    selectedCategory === cat.id
                      ? "bg-primary text-white shadow-2xl shadow-black/20 translate-x-2"
                      : "bg-slate-50 text-slate-600 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      selectedCategory === cat.id ? "bg-white/10 text-white" : cat.accent)}>
                      <cat.icon className="w-5 h-5" />
                    </div>
                    <span className="font-black text-[11px] uppercase tracking-widest">{cat.label}</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-all duration-500",
                    selectedCategory === cat.id ? "opacity-100 rotate-90" : "opacity-10 group-hover:opacity-100 group-hover:translate-x-1")} />
                </button>
              ))}
            </div>
          </div>

          {/* Temporal Filter */}
          <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Date Range</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl h-16 px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl h-16 px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Synthesis Core */}
        <div className="lg:col-span-8 space-y-10">
          {/* Node Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredReports.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={cn(
                  "flex flex-col items-start p-8 rounded-[3rem] transition-all duration-500 border-2 text-left relative overflow-hidden group/node",
                  selectedReport === report.id
                    ? "bg-white border-primary shadow-2xl shadow-black/5 scale-[1.02]"
                    : "bg-white border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl mb-6 transition-all group-hover/node:scale-110",
                  selectedReport === report.id ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
                )}>
                  <report.icon className="w-6 h-6" />
                </div>
                <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-2">{report.label}</h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed max-w-[200px]">{report.description}</p>

                <div className={cn("absolute top-8 right-8 transition-all duration-500",
                  selectedReport === report.id ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4")}>
                  <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Preview Matrix */}
          <div className="bg-white rounded-[4rem] shadow-sm border border-white overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-50/30">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Report Preview</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge className="bg-indigo-50 text-indigo-600 px-3 py-0.5 rounded-md font-black text-[9px] uppercase">
                      {reportData.length} records detected
                    </Badge>
                  </div>
                </div>
              </div>
              <button
                onClick={exportCSV}
                disabled={reportData.length === 0}
                className="flex items-center gap-3 bg-primary text-white h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.05] disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-black/20 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download CSV Report
              </button>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-8">
                  <div className="w-16 h-16 border-[6px] border-slate-50 border-t-black rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.5em] animate-pulse">Loading Report Data...</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Please wait a moment</p>
                  </div>
                </div>
              ) : reportData.length > 0 ? (
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {Object.keys(reportData[0]).map((key) => (
                        <th key={key} className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-50 bg-white">
                          {key.replace(/([A-Z])/g, ' $1')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="group hover:bg-slate-50 transition-all duration-300">
                        {Object.entries(row).map(([key, val], j) => (
                          <td key={j} className="px-10 py-6 text-[11px] font-bold text-slate-600 group-hover:text-foreground transition-colors">
                            {typeof val === 'number' && ['total', 'revenue', 'profit', 'value', 'amount', 'taxAmount', 'taxableValue', 'purchasePrice', 'cost'].some(k => key.toLowerCase().includes(k.toLowerCase())) 
                               ? formatCurrency(val) 
                               : (String(val ?? '—'))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center opacity-30">
                  <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                  <h4 className="text-2xl font-black text-slate-900 uppercase">No Data Found</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 max-w-sm">No records match the current selection. Adjust the date range or choose a different report.</p>
                </div>
              )}
              {reportData.length > 50 && (
                <div className="p-10 text-center bg-slate-50/50 border-t border-slate-50">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    Showing first 50 of {reportData.length} records. Download CSV for full report.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
