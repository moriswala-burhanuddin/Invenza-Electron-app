import { useState, useMemo, useEffect } from 'react';
import { useERPStore, ItemKit, Product } from '@/lib/store-data';
import { 
    Plus, Search, Package, Trash2, Edit2, ChevronRight, X, Layers, 
    LayoutGrid, Box, Zap, MoreHorizontal, ArrowLeft, ArrowRight, 
    ShieldCheck, TrendingUp, Info, Calculator, Settings, Eye, 
    EyeOff, ShoppingCart, AlertCircle, CheckCircle2, DollarSign
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function ItemKits() {
    const { itemKits, products, addItemKit, updateItemKit, deleteItemKit, activeStoreId, currentUser } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingKit, setEditingKit] = useState<ItemKit | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [category, setCategory] = useState('');
    const [sellingPrice, setSellingPrice] = useState(0);
    const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
    
    // New Feature Flags
    const [priceMode, setPriceMode] = useState<'auto' | 'manual'>('manual');
    const [displayMode, setDisplayMode] = useState<'single' | 'expanded'>('single');

    const filteredKits = itemKits.filter(kit =>
        kit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kit.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Smart Calculations
    const bundleCost = useMemo(() => {
        return selectedItems.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + ((product?.purchasePrice || 0) * item.quantity);
        }, 0);
    }, [selectedItems, products]);

    const autoPrice = useMemo(() => {
        return selectedItems.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + ((product?.sellingPrice || 0) * item.quantity);
        }, 0);
    }, [selectedItems, products]);

    const availableBundles = useMemo(() => {
        if (selectedItems.length === 0) return 0;
        const availabilities = selectedItems.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return 0;
            return Math.floor((product.quantity || 0) / item.quantity);
        });
        return Math.min(...availabilities);
    }, [selectedItems, products]);

    const profitMargin = useMemo(() => {
        if (sellingPrice === 0) return 0;
        return ((sellingPrice - bundleCost) / sellingPrice) * 100;
    }, [sellingPrice, bundleCost]);

    // Effects
    useEffect(() => {
        if (priceMode === 'auto') {
            setSellingPrice(autoPrice);
        }
    }, [autoPrice, priceMode]);

    const handleAddItem = (productId: string) => {
        if (selectedItems.find(i => i.productId === productId)) {
            toast.error('Product already in bundle');
            return;
        }
        setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
    };

    const handleRemoveItem = (productId: string) => {
        setSelectedItems(selectedItems.filter(i => i.productId !== productId));
    };

    const handleUpdateQuantity = (productId: string, quantity: number) => {
        setSelectedItems(selectedItems.map(i => i.productId === productId ? { ...i, quantity: Math.max(1, Number(quantity)) } : i));
    };

    const resetForm = () => {
        setName('');
        setSku('');
        setCategory('');
        setSellingPrice(0);
        setSelectedItems([]);
        setPriceMode('manual');
        setDisplayMode('single');
        setEditingKit(null);
    };

    const handleSubmit = async () => {
        if (!name || !sku || selectedItems.length === 0) {
            toast.error('Please fill in all required fields and add at least one product.');
            return;
        }

        const kitData = {
            name,
            sku,
            category,
            sellingPrice,
            storeId: activeStoreId,
            isActive: true,
            items: selectedItems,
            priceMode,
            displayMode,
            updatedAt: new Date().toISOString()
        };

        try {
            if (editingKit) {
                await updateItemKit(editingKit.id, kitData);
                toast.success('Bundle Updated Successfully');
            } else {
                await addItemKit(kitData);
                toast.success('Bundle Created Successfully');
            }
            setIsAddOpen(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to save item kit.');
        }
    };

    const handleEdit = (kit: ItemKit) => {
        setEditingKit(kit);
        setName(kit.name);
        setSku(kit.sku);
        setCategory(kit.category || '');
        setSellingPrice(kit.sellingPrice);
        setSelectedItems(kit.items || []);
        setPriceMode(kit.priceMode || 'manual');
        setDisplayMode(kit.displayMode || 'single');
        setIsAddOpen(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this bundle? This action cannot be undone.')) return;
        try {
            await deleteItemKit(id);
            toast.success('Bundle Deleted.');
        } catch (error) {
            toast.error('Failed to delete bundle.');
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0 backdrop-blur-md bg-white/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">ITEM KITS</h1>
                                <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px] px-3">PRO BUNDLES</Badge>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Manage bundle products & stock • {itemKits.length} Available</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Dialog open={isAddOpen} onOpenChange={(val) => { setIsAddOpen(val); if (!val) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all group">
                                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" />
                                    Create New Bundle
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] p-0 max-w-4xl border-none shadow-2xl max-h-[95vh] overflow-hidden flex flex-col">
                                <div className="p-10 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
                                    <div>
                                        <DialogTitle className="text-3xl font-black uppercase tracking-tighter text-slate-900">Bundle Details</DialogTitle>
                                        <DialogDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Create and manage professional product bundles</DialogDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Available</p>
                                                <p className="text-lg font-black text-slate-900 leading-none">{availableBundles} Units</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-10 scrollbar-none">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                        <div className="lg:col-span-2 space-y-10">
                                            {/* Basic Info */}
                                            <section className="space-y-6">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Basic Information</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Bundle Name</Label>
                                                        <Input value={name} onChange={e => setName(e.target.value)} className="h-16 bg-white border-slate-100 rounded-[1.2rem] px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary shadow-sm" placeholder="e.g. GAMING STARTER PACK" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">SKU Code</Label>
                                                        <Input value={sku} onChange={e => setSku(e.target.value)} className="h-16 bg-white border-slate-100 rounded-[1.2rem] px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary font-mono shadow-sm" placeholder="BN-XXXX" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Category</Label>
                                                        <Input value={category} onChange={e => setCategory(e.target.value)} className="h-16 bg-white border-slate-100 rounded-[1.2rem] px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary shadow-sm" placeholder="BUNDLES" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Selling Price (₹)</Label>
                                                        <div className="relative">
                                                            <Input 
                                                                type="number" 
                                                                value={sellingPrice} 
                                                                onChange={e => setSellingPrice(Number(e.target.value))} 
                                                                disabled={priceMode === 'auto'}
                                                                className={cn(
                                                                    "h-16 bg-white border-slate-100 rounded-[1.2rem] pl-6 pr-12 text-xl font-black focus:ring-2 focus:ring-primary shadow-sm",
                                                                    priceMode === 'auto' && "bg-slate-50 text-slate-400 cursor-not-allowed"
                                                                )} 
                                                            />
                                                            {priceMode === 'auto' && <Zap className="w-5 h-5 text-amber-400 absolute right-4 top-1/2 -translate-y-1/2" />}
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Pricing Strategy */}
                                            <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <Calculator className="w-5 h-5 text-indigo-500" />
                                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Pricing Strategy</h3>
                                                    </div>
                                                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-100">
                                                        <button 
                                                            onClick={() => setPriceMode('auto')}
                                                            className={cn(
                                                                "px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                priceMode === 'auto' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400"
                                                            )}
                                                        >
                                                            Auto Calc
                                                        </button>
                                                        <button 
                                                            onClick={() => setPriceMode('manual')}
                                                            className={cn(
                                                                "px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all",
                                                                priceMode === 'manual' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400"
                                                            )}
                                                        >
                                                            Manual Override
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase leading-relaxed max-w-md">
                                                    {priceMode === 'auto' 
                                                        ? "The selling price will be automatically updated based on the sum of all individual product prices in the bundle." 
                                                        : "You can manually set a custom bundle price regardless of the individual item prices."}
                                                </p>
                                            </section>

                                            {/* Bundle Items */}
                                            <section className="space-y-6">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Products in Bundle</h3>
                                                    </div>
                                                    <Badge className="bg-slate-900 text-white border-none font-black text-[9px]">{selectedItems.length} Products Added</Badge>
                                                </div>

                                                <div className="space-y-3 min-h-[100px]">
                                                    {selectedItems.map((item, idx) => {
                                                        const product = products.find(p => p.id === item.productId);
                                                        return (
                                                            <div key={idx} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex items-center justify-between group/item hover:border-indigo-100 transition-all shadow-sm">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover/item:text-indigo-400 transition-colors">
                                                                        <Box className="w-6 h-6" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[11px] font-black uppercase text-slate-900 leading-none mb-1">{product?.name || 'Product Missing'}</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#{product?.sku}</p>
                                                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                                            <p className="text-[9px] font-black text-indigo-500 uppercase">{formatCurrency(product?.sellingPrice || 0)} each</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-6">
                                                                    <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                                        <button onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all">-</button>
                                                                        <input 
                                                                            type="number" 
                                                                            value={item.quantity} 
                                                                            onChange={(e) => handleUpdateQuantity(item.productId, Number(e.target.value))}
                                                                            className="w-10 h-8 bg-transparent text-center text-xs font-black focus:outline-none"
                                                                        />
                                                                        <button onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all">+</button>
                                                                    </div>
                                                                    <button onClick={() => handleRemoveItem(item.productId)} className="p-3 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {selectedItems.length === 0 && (
                                                        <div className="py-16 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 group hover:border-slate-200 transition-all">
                                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform">
                                                                <ShoppingCart className="w-8 h-8 opacity-20" />
                                                            </div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Start by adding products...</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative group pt-4">
                                                    <Search className="absolute left-6 top-[calc(50%+8px)] -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        placeholder="SEARCH CATALOG TO ADD ITEMS..."
                                                        className="w-full h-16 bg-slate-50 border border-slate-100 rounded-[1.2rem] pl-16 pr-8 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-inner"
                                                        onChange={(e) => {
                                                            // Optional: inline filtering if list is too long
                                                        }}
                                                    />
                                                    
                                                    <div className="mt-4 grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-none pb-4">
                                                        {products.filter(p => !selectedItems.find(si => si.productId === p.id)).slice(0, 10).map(product => (
                                                            <button
                                                                key={product.id}
                                                                onClick={() => handleAddItem(product.id)}
                                                                className="text-left p-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center transition-all group/node shadow-sm"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover/node:text-indigo-400 group-hover/node:bg-white transition-all">
                                                                        <Box className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1 truncate">{product.name}</p>
                                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{product.sku}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-[9px] font-black text-slate-900">{formatCurrency(product.sellingPrice)}</p>
                                                                    <Plus className="w-4 h-4 text-slate-300 group-hover/node:text-primary transition-colors" />
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        {/* Smart Side Panel */}
                                        <div className="space-y-6">
                                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 sticky top-0">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-2">
                                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                    Economic Summary
                                                </h4>

                                                <div className="space-y-8">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Cost Basis</p>
                                                        <div className="flex items-baseline gap-2">
                                                            <h3 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(bundleCost)}</h3>
                                                        </div>
                                                    </div>

                                                    <Separator className="bg-slate-800" />

                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Profit Margin</p>
                                                        <div className="flex items-center gap-3">
                                                            <h3 className={cn(
                                                                "text-3xl font-black tracking-tighter",
                                                                profitMargin > 20 ? "text-emerald-400" : profitMargin > 0 ? "text-amber-400" : "text-rose-400"
                                                            )}>
                                                                {profitMargin.toFixed(1)}%
                                                            </h3>
                                                            {profitMargin > 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                                                        </div>
                                                        <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn(
                                                                    "h-full transition-all duration-1000",
                                                                    profitMargin > 20 ? "bg-emerald-500" : profitMargin > 0 ? "bg-amber-500" : "bg-rose-500"
                                                                )} 
                                                                style={{ width: `${Math.min(100, Math.max(0, profitMargin))}%` }} 
                                                            />
                                                        </div>
                                                    </div>

                                                    <Separator className="bg-slate-800" />

                                                    <div className="space-y-6 pt-2">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                                            <Settings className="w-4 h-4" />
                                                            Display Options
                                                        </h4>
                                                        
                                                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setDisplayMode(displayMode === 'single' ? 'expanded' : 'single')}>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-black uppercase text-slate-200">Expand on Invoice</p>
                                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Show individual parts</p>
                                                            </div>
                                                            <Switch checked={displayMode === 'expanded'} onCheckedChange={(val) => setDisplayMode(val ? 'expanded' : 'single')} />
                                                        </div>
                                                        
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                                                                <p className="text-[8px] font-black text-slate-400 uppercase leading-relaxed">
                                                                    {displayMode === 'single' 
                                                                        ? "INVOICE WILL SHOW BUNDLE AS A SINGLE LINE ITEM." 
                                                                        : "INVOICE WILL SHOW ALL COMPONENTS INDIVIDUALLY."}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <AlertCircle className="w-5 h-5 text-indigo-500" />
                                                    <p className="text-[10px] font-black text-indigo-900 uppercase">Stock Insights</p>
                                                </div>
                                                <p className="text-[9px] font-black text-indigo-700/60 uppercase leading-relaxed">
                                                    YOU CAN FULFILL <span className="text-indigo-900">{availableBundles}</span> BUNDLES WITH CURRENT STOCK. 
                                                    {availableBundles < 5 && availableBundles > 0 && " CONSIDER RESTOCKING CHILD ITEMS SOON."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 bg-white border-t border-slate-100 flex justify-end items-center gap-6">
                                    <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-slate-400 px-8 hover:bg-slate-50">Discard Changes</Button>
                                    <Button 
                                        onClick={handleSubmit} 
                                        className="h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-primary/40 px-12 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        {editingKit ? 'Update Bundle' : 'Create Bundle Product'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-12">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[
                        { label: 'Total Bundles', value: itemKits.length, icon: Layers, color: 'indigo' },
                        { label: 'Market Value', value: formatCurrency(itemKits.reduce((sum, k) => sum + (k.sellingPrice || 0), 0)), icon: DollarSign, color: 'emerald' },
                        { label: 'Components', value: itemKits.reduce((sum, k) => sum + (k.items?.length || 0), 0), icon: Box, color: 'amber' },
                        { label: 'System Health', value: 'Operational', icon: ShieldCheck, color: 'blue' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                            <div className={cn("p-4 rounded-2xl w-fit mb-10 transition-transform group-hover:scale-110", `bg-${stat.color}-50 text-${stat.color}-500`)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH BUNDLES BY NAME OR SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-16 bg-transparent border-none rounded-[1.5rem] pl-16 pr-8 text-[11px] font-black uppercase tracking-widest focus:ring-0 placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Kit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                    {filteredKits.length > 0 ? (
                        filteredKits.map((kit) => (
                            <div
                                key={kit.id}
                                onClick={() => handleEdit(kit)}
                                className="bg-white rounded-[3rem] p-10 border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group cursor-pointer relative flex flex-col h-full overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 -mr-16 -mt-16 rounded-full group-hover:bg-primary/5 transition-colors" />
                                
                                <div className="flex justify-between items-start mb-8 relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                        <Layers className="w-7 h-7 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className="flex gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-white transition-all">
                                                        {kit.displayMode === 'expanded' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 opacity-30" />}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-slate-900 text-white border-none text-[9px] font-black uppercase">
                                                    {kit.displayMode === 'expanded' ? "Expanded Display" : "Single Item Display"}
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <button 
                                            onClick={(e) => handleDelete(kit.id, e)} 
                                            className="p-3 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 mb-10 relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[8px] uppercase tracking-tighter">
                                            {kit.items?.length || 0} ITEMS
                                        </Badge>
                                        {kit.priceMode === 'auto' && (
                                            <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[8px] uppercase tracking-tighter flex items-center gap-1">
                                                <Zap className="w-2.5 h-2.5" /> AUTO
                                            </Badge>
                                        )}
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors mb-2 truncate">{kit.name}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded font-mono">#{kit.sku}</span>
                                        <span className="opacity-50">/</span>
                                        {kit.category || 'GENERAL'}
                                    </p>
                                </div>

                                <div className="pt-8 border-t border-slate-50 flex items-end justify-between relative z-10">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 opacity-50">Selling Price</p>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">{formatCurrency(kit.sellingPrice || 0)}</h3>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-[1.2rem] group-hover:bg-primary group-hover:text-white transition-all shadow-sm group-hover:shadow-lg group-hover:shadow-primary/30">
                                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-60 text-center flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100 group">
                            <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-700">
                                <LayoutGrid className="w-20 h-20 text-slate-200" />
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Vault Empty</h3>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-6 px-20 max-w-2xl leading-loose text-center">No bundle products discovered. Start engineering your first bundle kit to boost sales.</p>
                            <Button onClick={() => setIsAddOpen(true)} className="mt-12 bg-primary text-white rounded-2xl h-16 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                                Build First Bundle
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
