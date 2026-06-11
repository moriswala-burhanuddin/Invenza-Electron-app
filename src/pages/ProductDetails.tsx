import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Package, TrendingUp, DollarSign, History, AlertTriangle, Sparkles, Loader2, ArrowLeft, Trash2, Edit3, Tag, Layers, Activity, Calendar, ShieldCheck } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const { getStoreProducts, getStoreSales, updateProduct, deleteProduct, customFields, productCustomValues, checkPermission, currentUser } = useERPStore();

    const canSeeBuyingPrice = checkPermission('canSeeBuyingPrice');
    const canEditProduct = checkPermission('canEditProduct');
    const canAddProduct = checkPermission('canAddProduct');
    const isSuperAdmin = currentUser?.role === 'super_admin';

    const product = getStoreProducts().find(p => p.id === id);
    const sales = getStoreSales();

    if (!product) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
                <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl border border-white max-w-md w-full">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10 text-slate-200" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Item Missing</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">This product may have been archived or deleted.</p>
                    <Button onClick={() => navigate('/products')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Return to Catalog
                    </Button>
                </div>
            </div>
        );
    }

    const handleMagicSuggest = async () => {
        if (!window.electronAPI || !product) return;
        setIsOptimizing(true);
        try {
            const suggestions = await window.electronAPI.optimizeReorder([product], sales);
            const suggestion = suggestions[id!];
            if (suggestion) {
                updateProduct(id!, {
                    minStock: suggestion.minStock,
                    reorderQuantity: suggestion.reorderQuantity
                });
                toast.success("AI Strategy Applied");
            }
        } catch (error) {
            toast.error("AI Optimization failed.");
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this product? This cannot be undone.')) {
            deleteProduct(id!);
            toast.success("Product deleted.");
            navigate('/products');
        }
    };

    const productSales = sales.filter(s =>
        s.items.some(item => item.productId === id)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stockValue = product.quantity * product.purchasePrice;
    const margin = ((product.sellingPrice - product.purchasePrice) / product.sellingPrice) * 100;
    const isLowStock = product.quantity < (product.minStock || 20);

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* High-Impact Header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/products')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{product.name}</h1>
                                <span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-widest">{product.sku}</span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {canAddProduct && (
                        <button onClick={handleDelete} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all group">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        )}
                        {(canEditProduct || checkPermission('canChangeStock')) && (
                        <Button onClick={() => navigate(`/products/edit/${id}`)} className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            <Edit3 className="w-4 h-4 mr-2" />
                            {canEditProduct ? 'Edit Product' : 'Update Stock'}
                        </Button>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {/* Metrics Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-indigo-50 rounded-2xl">
                                <Package className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Stock</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{product.quantity}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.unit || 'Units'} Available</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-emerald-50 rounded-2xl">
                                <DollarSign className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Selling Value</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{formatCurrency(product.sellingPrice)}</h2>
                        <div className="flex items-center gap-1.5 text-emerald-500 font-black text-[10px] uppercase">
                            <TrendingUp className="w-3 h-3" />
                            {canSeeBuyingPrice ? `${margin.toFixed(1)}% Margin` : '*** Margin'}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-slate-100 rounded-2xl">
                                <Layers className="w-6 h-6 text-slate-600" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock Value</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{canSeeBuyingPrice ? formatCurrency(stockValue) : '***'}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">At Purchase Price</p>
                    </div>

                    <div className={cn(
                        "rounded-[2.5rem] p-8 shadow-sm border transition-all duration-500",
                        isLowStock ? "bg-red-600 text-white border-red-600 shadow-2xl shadow-red-200" : "bg-white border-white"
                    )}>
                        <div className="flex justify-between items-start mb-6">
                            <div className={cn("p-4 rounded-2xl", isLowStock ? "bg-white/20" : "bg-orange-50")}>
                                <AlertTriangle className={cn("w-6 h-6", isLowStock ? "text-white" : "text-orange-600")} />
                            </div>
                            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isLowStock ? "text-white/60" : "text-slate-400")}>Stock Health</span>
                        </div>
                        <h2 className="text-2xl font-black leading-none mb-1 uppercase">{isLowStock ? 'Critical' : 'Healthy'}</h2>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isLowStock ? "text-white/80" : "text-slate-400")}>
                            {isLowStock ? `BELOW MIN (${product.minStock})` : 'LEVELS OPTIMAL'}
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Specifications Card */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-8">
                                <Tag className="w-5 h-5 text-slate-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Specifications</h3>
                            </div>
                            <div className="space-y-5">
                                {[
                                    { label: 'Category', value: product.categoryName || product.categoryId || 'Uncategorized' },
                                    { label: 'Brand', value: product.brand || 'No Brand' },
                                    { label: 'Cost Price', value: canSeeBuyingPrice ? formatCurrency(product.purchasePrice) : '***', highlight: true },
                                    { label: 'Selling Price', value: formatCurrency(product.sellingPrice), highlight: true },
                                    { label: 'Unit', value: product.unit || 'Standard' },
                                    { label: 'Last Updated', value: new Date(product.updatedAt).toLocaleDateString() },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center group">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                                        <span className={cn("text-[11px] font-black uppercase", row.highlight ? "text-slate-900" : "text-slate-600")}>{row.value}</span>
                                    </div>
                                ))}

                                {customFields.filter(f => f.targetType === 'product').map(field => {
                                    const val = productCustomValues.find(v => v.productId === id && v.fieldId === field.id)?.value;
                                    return (
                                        <div key={field.id} className="flex justify-between items-center group">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</span>
                                            <span className="text-[11px] font-black text-slate-600 uppercase">{val || '—'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Inventory Strategy</h3>
                                <button onClick={handleMagicSuggest} disabled={isOptimizing} className="hover:scale-110 transition-all text-indigo-400">
                                    {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-4xl font-black mb-1">{product.minStock || 0}</p>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Safety Stock</p>
                                </div>
                                <div>
                                    <p className="text-4xl font-black mb-1">{product.reorderQuantity || 0}</p>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Reorder Qty</p>
                                </div>
                            </div>
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">
                                    AI-powered reorder suggestions based on your sales history.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History Card */}
                    <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-white relative overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Movement History</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent sales of this product</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl">
                                <Activity className="w-5 h-5 text-indigo-600" />
                            </div>
                        </div>

                        {productSales.length > 0 ? (
                            <div className="space-y-4">
                                {productSales.slice(0, 8).map(sale => {
                                    const item = sale.items.find(i => i.productId === id);
                                    return (
                                        <div key={sale.id} onClick={() => navigate(`/sales/${sale.id}`)} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] group hover:bg-slate-900 hover:text-white transition-all duration-300 cursor-pointer">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-[10px] text-slate-900 group-hover:bg-white/10 group-hover:text-white shadow-sm border border-slate-100 transition-colors">
                                                    #{sale.invoiceNumber.slice(-3)}
                                                </div>
                                                <div>
                                                    <h5 className="font-black text-[11px] uppercase">Invoice #{sale.invoiceNumber}</h5>
                                                    <p className="text-[9px] font-black text-slate-400 flex items-center gap-2">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(sale.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-red-600 group-hover:text-red-400 transition-colors">-{item?.quantity}</div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatCurrency((item?.quantity || 0) * (item?.price || 0))}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                                <History className="w-16 h-16 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No transaction records found</p>
                            </div>
                        )}

                        <div className="mt-10 p-6 bg-indigo-50/50 rounded-[2rem] flex items-center justify-between border border-indigo-50">
                            <div className="flex items-center gap-4">
                                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                                <div>
                                    <h4 className="text-[11px] font-black uppercase text-indigo-900">Data Security</h4>
                                    <p className="text-[9px] font-bold text-indigo-400 uppercase">Your product data is safely stored</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
