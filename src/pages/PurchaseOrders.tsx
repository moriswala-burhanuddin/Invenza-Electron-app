import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, PurchaseOrder, Supplier, Product, SaleItem } from '@/lib/store-data';
import { 
    Plus, Search, FileText, Calendar, ChevronRight, Filter, Download, Zap, 
    TrendingUp, TrendingDown, Clock, ShieldCheck, Box, CreditCard, 
    MoreHorizontal, ArrowLeft, Truck, PackageCheck, AlertCircle, 
    CheckCircle2, X, Trash2, Edit3, ShoppingCart, User, 
    ArrowUpRight, Receipt, Ban, RotateCcw, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { generateId } from '@/lib/utils';

const fmt = (amount: number) => formatCurrency(amount);

export default function PurchaseOrders() {
    const navigate = useNavigate();
    const { 
        purchaseOrders, activeStoreId, products, suppliers, currentUser,
        addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, receivePurchaseOrder 
    } = useERPStore();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);

    // Form State
    const [formPO, setFormPO] = useState<{
        supplierId: string;
        items: Array<SaleItem & { id?: string }>;
        notes: string;
        expectedDeliveryDate: string;
    }>({
        supplierId: '',
        items: [],
        notes: '',
        expectedDeliveryDate: ''
    });

    const [itemSearch, setItemSearch] = useState('');

    const filteredPOs = purchaseOrders.filter(p =>
        p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.poNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const stats = useMemo(() => {
        const total = purchaseOrders.reduce((sum, p) => sum + p.totalAmount, 0);
        const pending = purchaseOrders.filter(p => p.status === 'sent' || p.status === 'draft').length;
        const received = purchaseOrders.filter(p => p.status === 'received').length;
        const cancelled = purchaseOrders.filter(p => p.status === 'cancelled').length;
        return { total, pending, received, cancelled };
    }, [purchaseOrders]);

    const availableProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
            p.sku.toLowerCase().includes(itemSearch.toLowerCase())
        ).slice(0, 5);
    }, [products, itemSearch]);

    const handleAddItem = (product: Product) => {
        const existing = formPO.items.find(i => i.productId === product.id);
        if (existing) {
            setFormPO({
                ...formPO,
                items: formPO.items.map(i => 
                    i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
                )
            });
        } else {
            setFormPO({
                ...formPO,
                items: [...formPO.items, {
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    price: product.purchasePrice || 0
                }]
            });
        }
        setItemSearch('');
    };

    const handleRemoveItem = (productId: string) => {
        setFormPO({
            ...formPO,
            items: formPO.items.filter(i => i.productId !== productId)
        });
    };

    const handleUpdateItem = (productId: string, field: keyof SaleItem, value: any) => {
        setFormPO({
            ...formPO,
            items: formPO.items.map(i => 
                i.productId === productId ? { ...i, [field]: value } : i
            )
        });
    };

    const totals = useMemo(() => {
        const subtotal = formPO.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const tax = subtotal * 0.05; // Mock 5% tax
        const total = subtotal + tax;
        return { subtotal, tax, total };
    }, [formPO.items]);

    const handleCreatePO = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validations
        if (!formPO.supplierId) return toast.error('Please select a supplier');
        if (formPO.items.length === 0) return toast.error('Please add at least one product');
        if (formPO.items.some(i => i.quantity <= 0)) return toast.error('All quantities must be greater than zero');
        if (formPO.items.some(i => i.price < 0)) return toast.error('Price cannot be negative');

        const supplier = suppliers.find(s => s.id === formPO.supplierId);
        
        try {
            await addPurchaseOrder({
                supplier: supplier?.companyName || 'Unknown',
                supplierId: formPO.supplierId,
                items: formPO.items,
                subtotal: totals.subtotal,
                taxAmount: totals.tax,
                totalAmount: totals.total,
                status: 'draft',
                storeId: activeStoreId,
                date: new Date().toISOString(),
                expectedDeliveryDate: formPO.expectedDeliveryDate,
                notes: formPO.notes,
                poNumber: `PO-${Date.now().toString().slice(-6)}`
            });
            
            toast.success('Purchase Order created successfully');
            setIsAddOpen(false);
            setFormPO({ supplierId: '', items: [], notes: '', expectedDeliveryDate: '' });
        } catch (error: any) {
            toast.error(error.message || 'Failed to create Purchase Order');
        }
    };

    const handleTransition = async (po: PurchaseOrder, nextStatus: PurchaseOrder['status']) => {
        try {
            if (nextStatus === 'received') {
                await receivePurchaseOrder(po.id);
                toast.success('Order marked as received. Inventory updated.');
            } else if (nextStatus === 'cancelled') {
                await deletePurchaseOrder(po.id); // deletePurchaseOrder is soft-delete to 'cancelled' in db.cjs
                toast.success('Order cancelled.');
            } else {
                await updatePurchaseOrder(po.id, { status: nextStatus });
                toast.success(`Order status updated to ${nextStatus.toUpperCase()}`);
            }
            if (viewingPO?.id === po.id) setViewingPO(null);
        } catch (error: any) {
            toast.error(error.message || 'Transition failed');
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'received': return { icon: <CheckCircle2 className="w-4 h-4" />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Received' };
            case 'sent': return { icon: <Truck className="w-4 h-4" />, class: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Sent' };
            case 'draft': return { icon: <Clock className="w-4 h-4" />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Draft' };
            case 'cancelled': return { icon: <Ban className="w-4 h-4" />, class: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Cancelled' };
            default: return { icon: <AlertCircle className="w-4 h-4" />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: status };
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                            <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Procurement</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Purchase Order Pipeline • {filteredPOs.length} Total</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="group relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search orders..."
                                className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-6 text-[10px] font-black uppercase focus:ring-2 focus:ring-indigo-500 w-64 placeholder:text-slate-300"
                            />
                        </div>

                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-200 transition-all active:scale-95">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Order
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] p-0 max-w-4xl border-none shadow-2xl overflow-hidden bg-white animate-in fade-in zoom-in duration-300">
                                <form onSubmit={handleCreatePO} className="flex flex-col h-[85vh]">
                                    <div className="p-10 border-b border-slate-50 bg-slate-50/50">
                                        <DialogHeader>
                                            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">New Purchase Order</DialogTitle>
                                            <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generate a formal procurement request to a supplier.</DialogDescription>
                                        </DialogHeader>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-10 space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supplier</Label>
                                                <Select value={formPO.supplierId} onValueChange={(v) => setFormPO({...formPO, supplierId: v})}>
                                                    <SelectTrigger className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-indigo-500">
                                                        <SelectValue placeholder="SELECT SUPPLIER" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-none shadow-2xl bg-white z-[100]">
                                                        {suppliers.length > 0 ? (
                                                            suppliers.map(s => (
                                                                <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase tracking-wider py-4">
                                                                    {s.companyName} ({s.supplierCode || s.id.slice(-6)})
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="p-8 text-center space-y-2">
                                                                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto opacity-50" />
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Suppliers Found</p>
                                                                <Button 
                                                                    variant="link" 
                                                                    className="text-[8px] font-black uppercase text-indigo-600 p-0"
                                                                    onClick={() => navigate('/suppliers')}
                                                                >
                                                                    Create a Supplier first
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Expected Delivery</Label>
                                                <Input
                                                    type="date"
                                                    value={formPO.expectedDeliveryDate}
                                                    onChange={e => setFormPO({ ...formPO, expectedDeliveryDate: e.target.value })}
                                                    className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Order Items</Label>
                                                <div className="relative w-64">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                    <Input
                                                        placeholder="SEARCH PRODUCT..."
                                                        value={itemSearch}
                                                        onChange={e => setItemSearch(e.target.value)}
                                                        className="h-10 bg-slate-100 border-none rounded-xl pl-10 text-[9px] font-black uppercase"
                                                    />
                                                    {itemSearch && availableProducts.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-50 z-50 overflow-hidden">
                                                            {availableProducts.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onClick={() => handleAddItem(p)}
                                                                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                                                                >
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-900 uppercase">{p.name}</p>
                                                                        <p className="text-[8px] font-bold text-slate-400 uppercase">{p.sku}</p>
                                                                    </div>
                                                                    <p className="text-[10px] font-black text-indigo-600">{fmt(p.purchasePrice)}</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-slate-50/50 rounded-[2rem] p-4 min-h-[200px]">
                                                {formPO.items.length === 0 ? (
                                                    <div className="h-48 flex flex-col items-center justify-center text-slate-300 space-y-4">
                                                        <Box className="w-10 h-10 opacity-20" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No items added to order</p>
                                                    </div>
                                                ) : (
                                                    <table className="w-full">
                                                        <thead>
                                                            <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                                                <th className="pb-4 text-left px-4">Item Details</th>
                                                                <th className="pb-4 text-center w-32">Qty</th>
                                                                <th className="pb-4 text-center w-40">Unit Price</th>
                                                                <th className="pb-4 text-right px-4 w-40">Subtotal</th>
                                                                <th className="pb-4 w-12"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {formPO.items.map((item, idx) => (
                                                                <tr key={item.productId} className="group">
                                                                    <td className="py-5 px-4">
                                                                        <p className="text-[10px] font-black text-slate-900 uppercase">{item.productName}</p>
                                                                        <p className="text-[8px] font-bold text-slate-400 uppercase opacity-60">ID: {item.productId.slice(-6)}</p>
                                                                    </td>
                                                                    <td className="py-5 px-4 text-center">
                                                                        <Input
                                                                            type="number"
                                                                            value={item.quantity}
                                                                            onChange={e => handleUpdateItem(item.productId, 'quantity', Number(e.target.value))}
                                                                            className="h-10 w-24 mx-auto bg-white border-slate-100 rounded-xl text-center text-[11px] font-black"
                                                                        />
                                                                    </td>
                                                                    <td className="py-5 px-4 text-center">
                                                                        <Input
                                                                            type="number"
                                                                            value={item.price}
                                                                            onChange={e => handleUpdateItem(item.productId, 'price', Number(e.target.value))}
                                                                            className="h-10 w-32 mx-auto bg-white border-slate-100 rounded-xl text-center text-[11px] font-black"
                                                                        />
                                                                    </td>
                                                                    <td className="py-5 px-4 text-right">
                                                                        <p className="text-[11px] font-black text-slate-900 tracking-tight">{fmt(item.price * item.quantity)}</p>
                                                                    </td>
                                                                    <td className="py-5 px-4 text-center">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => handleRemoveItem(item.productId)}
                                                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-12">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Internal Notes</Label>
                                                <textarea
                                                    value={formPO.notes}
                                                    onChange={e => setFormPO({...formPO, notes: e.target.value})}
                                                    className="w-full h-32 bg-slate-50 border-none rounded-2xl p-6 text-[11px] font-bold uppercase resize-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="ORDER SPECIFICATIONS, SHIPPING INSTRUCTIONS..."
                                                />
                                            </div>
                                            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col justify-center space-y-6">
                                                <div className="flex justify-between items-center opacity-40">
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Subtotal</span>
                                                    <span className="text-[11px] font-black tracking-tight">{fmt(totals.subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between items-center opacity-40">
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Estimated Tax (5%)</span>
                                                    <span className="text-[11px] font-black tracking-tight">{fmt(totals.tax)}</span>
                                                </div>
                                                <div className="h-px bg-white/10 my-2" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Total Payable</span>
                                                    <span className="text-3xl font-black tracking-tighter text-white">{fmt(totals.total)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 border-t border-slate-50 flex gap-4 bg-slate-50/30">
                                        <Button 
                                            variant="ghost" 
                                            type="button"
                                            onClick={() => setIsAddOpen(false)} 
                                            className="h-16 px-10 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-100"
                                        >
                                            Discard
                                        </Button>
                                        <Button 
                                            type="submit" 
                                            className="flex-1 h-16 rounded-[1.2rem] bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-black/20 transition-all active:scale-95"
                                        >
                                            Save as Draft Order
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {/* Analytics Snapshot */}
                <div className="grid md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                            <TrendingUp className="w-32 h-32 text-indigo-600" />
                        </div>
                        <div className="p-3.5 bg-indigo-50 rounded-2xl w-fit mb-6 text-indigo-600 shadow-sm shadow-indigo-100">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pipeline Value</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{fmt(stats.total)}</h3>
                    </div>
                    
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="p-3.5 bg-amber-50 rounded-2xl w-fit mb-6 text-amber-600 shadow-sm shadow-amber-100">
                            <Clock className="w-5 h-5" />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Processing</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{stats.pending} <span className="text-[10px] text-slate-300 font-bold ml-1 uppercase">Orders</span></h3>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group">
                        <div className="p-3.5 bg-emerald-50 rounded-2xl w-fit mb-6 text-emerald-600 shadow-sm shadow-emerald-100">
                            <PackageCheck className="w-5 h-5" />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Successfully Received</p>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{stats.received} <span className="text-[10px] text-slate-300 font-bold ml-1 uppercase">Orders</span></h3>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200/20 flex flex-col justify-center group cursor-pointer hover:bg-slate-950 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Inventory Health</p>
                            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[78%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-white/70">78% Stock Optimization</p>
                        </div>
                    </div>
                </div>

                {/* Pipeline Stream */}
                <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-slate-100 min-h-[600px]">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Procurement Registry</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time order tracking and status management</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                <Filter className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                <Download className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {filteredPOs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredPOs.map((po) => {
                                const status = getStatusConfig(po.status);
                                return (
                                    <div
                                        key={po.id}
                                        onClick={() => setViewingPO(po)}
                                        className="bg-[#F8FAFC]/50 hover:bg-white p-10 rounded-[3rem] border border-transparent hover:border-slate-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 group cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-8">
                                            <div className={cn("px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-2", status.class)}>
                                                {status.icon}
                                                {status.label}
                                            </div>
                                            <div className="p-3 bg-white rounded-2xl text-slate-300 group-hover:text-indigo-600 transition-colors shadow-sm border border-slate-50">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-10">
                                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{po.supplier}</h4>
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                                < Receipt className="w-3.5 h-3.5 opacity-40" />
                                                {po.poNumber || po.id.slice(0, 8).toUpperCase()}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 mb-10 border-t border-slate-100 pt-8">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Created Date</p>
                                                <div className="flex items-center gap-2 text-slate-600 font-bold text-[10px]">
                                                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                                                    {new Date(po.date).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Order Volume</p>
                                                <div className="flex items-center gap-2 text-slate-600 font-bold text-[10px]">
                                                    <Box className="w-3.5 h-3.5 opacity-40" />
                                                    {po.items?.length || 0} Products
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payable</p>
                                                <p className="text-2xl font-black text-slate-900 tracking-tighter">{fmt(po.totalAmount)}</p>
                                            </div>
                                            
                                            {po.status === 'draft' && (
                                                <Button 
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleTransition(po, 'sent'); }}
                                                    className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                                                >
                                                    Process Order
                                                </Button>
                                            )}
                                            
                                            {po.status === 'sent' && (
                                                <Button 
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleTransition(po, 'received'); }}
                                                    className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                                                >
                                                    Mark Received
                                                </Button>
                                            )}

                                            {po.status === 'received' && (
                                                <div className="h-12 flex items-center gap-2 text-emerald-500">
                                                    <ShieldCheck className="w-5 h-5" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Inventory Sync</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-40 text-center">
                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-slate-100">
                                <FileText className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Active Procurement</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-4 px-20 text-center mx-auto max-w-lg leading-relaxed">
                                Ready to restock? Start by generating your first purchase order to formalize supplier requests.
                            </p>
                            <Button 
                                onClick={() => setIsAddOpen(true)}
                                variant="outline" 
                                className="mt-10 h-14 px-10 rounded-2xl border-2 border-slate-100 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                            >
                                Get Started
                            </Button>
                        </div>
                    )}
                </div>
            </main>

            {/* PO Detail Viewer */}
            <Dialog open={!!viewingPO} onOpenChange={(o) => !o && setViewingPO(null)}>
                <DialogContent className="rounded-[3rem] p-0 max-w-3xl border-none shadow-2xl overflow-hidden bg-white animate-in slide-in-from-bottom duration-500">
                    {viewingPO && (
                        <div className="flex flex-col max-h-[90vh]">
                            <div className="p-12 pb-8 flex justify-between items-start">
                                <div>
                                    <div className={cn("w-fit px-4 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest mb-6", getStatusConfig(viewingPO.status).class)}>
                                        {getStatusConfig(viewingPO.status).label}
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{viewingPO.supplier}</h2>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 font-mono">{viewingPO.poNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">Order Date</p>
                                    <p className="text-sm font-black text-slate-900">{new Date(viewingPO.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-12 space-y-10">
                                <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100/50">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Line Item Specifications</h4>
                                    <div className="space-y-4">
                                        {viewingPO.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm text-slate-400 text-[10px] font-black">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-900 uppercase">{item.productName}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.quantity} units @ {fmt(item.price)}</p>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] font-black text-slate-900 tracking-tight">{fmt(item.price * item.quantity)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    {viewingPO.notes && (
                                        <div>
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ordering Directives</h4>
                                            <p className="text-[11px] font-bold text-slate-600 leading-relaxed bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                                                {viewingPO.notes}
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center opacity-50">
                                            <span className="text-[9px] font-black uppercase tracking-widest">Subtotal</span>
                                            <span className="text-[11px] font-black">{fmt(viewingPO.subtotal || viewingPO.totalAmount * 0.95)}</span>
                                        </div>
                                        <div className="flex justify-between items-center opacity-50">
                                            <span className="text-[9px] font-black uppercase tracking-widest">Tax Provision</span>
                                            <span className="text-[11px] font-black">{fmt(viewingPO.taxAmount || viewingPO.totalAmount * 0.05)}</span>
                                        </div>
                                        <div className="h-px bg-slate-100 my-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Total Valuation</span>
                                            <span className="text-2xl font-black tracking-tighter text-slate-900">{fmt(viewingPO.totalAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 border-t border-slate-50 flex gap-4 bg-slate-50/30">
                                {viewingPO.status === 'draft' && (
                                    <>
                                        <Button 
                                            onClick={() => handleTransition(viewingPO, 'sent')}
                                            className="flex-1 h-16 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-indigo-100"
                                        >
                                            <Truck className="w-4 h-4 mr-2" />
                                            Release to Supplier
                                        </Button>
                                        <Button 
                                            variant="ghost"
                                            onClick={() => handleTransition(viewingPO, 'cancelled')}
                                            className="h-16 px-10 rounded-[1.5rem] text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black uppercase text-[10px] tracking-widest"
                                        >
                                            <Ban className="w-4 h-4 mr-2" />
                                            Abort Order
                                        </Button>
                                    </>
                                )}
                                
                                {viewingPO.status === 'sent' && (
                                    <>
                                        <Button 
                                            onClick={() => handleTransition(viewingPO, 'received')}
                                            className="flex-1 h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-emerald-100"
                                        >
                                            <PackageCheck className="w-4 h-4 mr-2" />
                                            Verify & Receive Stock
                                        </Button>
                                        <Button 
                                            variant="ghost"
                                            onClick={() => handleTransition(viewingPO, 'cancelled')}
                                            className="h-16 px-10 rounded-[1.5rem] text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black uppercase text-[10px] tracking-widest"
                                        >
                                            <Ban className="w-4 h-4 mr-2" />
                                            Void Pipeline
                                        </Button>
                                    </>
                                )}

                                {viewingPO.status === 'received' && (
                                    <div className="w-full flex items-center justify-between p-6 bg-emerald-50 rounded-[1.5rem] border border-emerald-100">
                                        <div className="flex items-center gap-4 text-emerald-600">
                                            <ShieldCheck className="w-8 h-8" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest">Inventory Secured</p>
                                                <p className="text-[8px] font-bold opacity-70 uppercase tracking-widest">All items successfully committed to local stock</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="h-10 px-6 rounded-xl text-emerald-600 font-black uppercase text-[9px] tracking-widest hover:bg-emerald-100">
                                            View Stock Logs
                                        </Button>
                                    </div>
                                )}

                                {viewingPO.status === 'cancelled' && (
                                    <div className="w-full flex items-center justify-center p-6 bg-slate-100 rounded-[1.5rem] border border-slate-200">
                                        <div className="flex items-center gap-4 text-slate-400">
                                            <RotateCcw className="w-6 h-6" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Order Voided • Non-actionable State</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Elevated FAB */}
            <button
                onClick={() => setIsAddOpen(true)}
                className="fixed bottom-12 right-12 w-20 h-20 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group overflow-hidden border-4 border-white"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus className="w-8 h-8 relative z-10" />
            </button>
        </div>
    );
}
