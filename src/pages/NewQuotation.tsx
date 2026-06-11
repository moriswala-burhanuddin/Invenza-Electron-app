import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Plus, Minus, Trash2, Search, ShoppingBag, Calendar, User, Truck, ClipboardList, Tag, Smartphone, Check, ChevronsUpDown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from 'vaul';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn, formatCurrency, generateId, convertFromBase } from '@/lib/utils';
import { toast } from 'sonner';
import { useStoreConfig } from '@/lib/store-config';

interface CartItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
}

export default function NewQuotation() {
    const navigate = useNavigate();
    const { getStoreProducts, getStoreCustomers, addQuotation, activeStoreId, stores, currentUser } = useERPStore();
    const { baseCurrency } = useStoreConfig();

    const products = getStoreProducts();
    const customers = getStoreCustomers();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerId, setCustomerId] = useState<string>('');
    const [customerName, setCustomerName] = useState<string>('');
    const [customerPhone, setCustomerPhone] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [storeId, setStoreId] = useState<string>(activeStoreId);
    const [searchQuery, setSearchQuery] = useState('');
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

    const addToCart = (product: typeof products[0]) => {
        const existing = cart.find(item => item.productId === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: product.sellingPrice,
            }]);
            toast.info(`${product.name} added to proposal`);
        }
        setSearchQuery('');
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.productId === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
        toast.info("Item removed.");
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmit = () => {
        if (cart.length === 0) return;
        const selectedCustomer = customers.find(c => c.id === customerId);
        addQuotation({
            items: cart.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price
            })),
            totalAmount,
            originalAmount: convertFromBase(totalAmount, baseCurrency),
            originalCurrency: baseCurrency,
            customerId: customerId || undefined,
            customerName: selectedCustomer?.name || customerName || 'Walk-in Guest',
            customerPhone: selectedCustomer?.phone || customerPhone,
            storeId: storeId || activeStoreId,
            companyId: currentUser?.companyId,
            date: new Date().toISOString(),
            expiryDate: new Date(expiryDate).toISOString(),
            status: 'active',
            notes
        });
        toast.success("Quotation saved.");
        navigate('/quotations');
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-40">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Proposal Builder</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Quotation</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" onClick={() => navigate('/quotations')} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] text-slate-400">
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={cart.length === 0} className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Save Quotation
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
                {/* 1. Client & Entity Intelligence */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Customer Info</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer details for this quotation</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Store</Label>
                                <select
                                    value={storeId}
                                    onChange={(e) => setStoreId(e.target.value)}
                                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary appearance-none"
                                >
                                    {stores.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name} - {s.branch}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Customer</Label>
                                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <button className={cn(
                                            "w-full h-14 rounded-2xl px-6 font-black text-xs uppercase flex items-center justify-between border-2 transition-all group",
                                            customerId ? "border-slate-100 bg-slate-50 text-slate-900" : "border-dashed border-slate-200 hover:border-primary text-slate-400"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <Smartphone className="w-4 h-4 opacity-30" />
                                                {customerId ? customers.find(c => c.id === customerId)?.name : "SELECT CUSTOMER"}
                                            </div>
                                            <ChevronsUpDown className="w-4 h-4 opacity-30" />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 rounded-[2rem] overflow-hidden border-none shadow-2xl z-[100]" align="start">
                                        <Command className="font-black uppercase">
                                            <CommandInput placeholder="Search customers..." className="h-14 pl-12" />
                                            <CommandList>
                                                <CommandEmpty className="py-10 text-center text-slate-400 text-[10px]">Client Not Found</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem className="py-4 px-6 gap-4" onSelect={() => { setCustomerId(""); setCustomerSearchOpen(false); }}>
                                                        <Check className={cn("h-4 w-4", !customerId ? "opacity-100" : "opacity-0")} />
                                                        WALK-IN CUSTOMER
                                                    </CommandItem>
                                                    {customers.map(c => (
                                                        <CommandItem key={c.id} onSelect={() => { setCustomerId(c.id); setCustomerSearchOpen(false); }} className="py-4 px-6 gap-4">
                                                            <Check className={cn("h-4 w-4", customerId === c.id ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex-1">
                                                                <p className="font-black text-xs">{c.name}</p>
                                                                <p className="text-[9px] text-slate-400 lowercase">{c.phone} • {c.area}</p>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {!customerId && (
                            <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6">
                                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest text-center">Walk-in Customer</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</Label>
                                        <Input className="h-12 bg-white border-none rounded-xl px-4 font-bold uppercase transition-all focus:ring-1 focus:ring-primary" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</Label>
                                        <Input className="h-12 bg-white border-none rounded-xl px-4 font-bold transition-all focus:ring-1 focus:ring-primary" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Temporal & Narrative Parameters */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Dates & Notes</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validity and additional details</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                <Input
                                    type="date"
                                    value={expiryDate}
                                    onChange={(e) => setExpiryDate(e.target.value)}
                                    className="h-16 bg-slate-50 border-none rounded-2xl pl-16 px-6 font-bold focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notes</Label>
                            <Input
                                placeholder="E.g. special discount, delivery terms..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-16 bg-slate-50 border-none rounded-2xl px-6 font-bold uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Asset Registry (Cart) */}
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                <Tag className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Items</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cart.length} Items Added</p>
                            </div>
                        </div>

                        <Drawer.Root>
                            <Drawer.Trigger asChild>
                                <Button className="bg-indigo-600 text-white rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Inject Assets
                                </Button>
                            </Drawer.Trigger>
                            <Drawer.Portal>
                                <Drawer.Overlay className="fixed inset-0 bg-primary/40 z-[100]" />
                                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-[3rem] outline-none flex flex-col max-h-[85vh] p-4 shadow-2xl">
                                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-100 mb-8 mt-2" />
                                    <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col overflow-hidden px-8">
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Search Products</h2>
                                            <div className="relative group">
                                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                                                <input
                                                    className="w-full h-16 bg-slate-50 border-none rounded-[1.5rem] pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 uppercase"
                                                    placeholder="Search by name or SKU..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto space-y-3 pb-8 custom-scrollbar">
                                            {filteredProducts.map(product => (
                                                <button
                                                    key={product.id}
                                                    onClick={() => addToCart(product)}
                                                    className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[1.8rem] border border-slate-50 hover:bg-white hover:border-slate-100 hover:shadow-xl transition-all group"
                                                >
                                                    <div className="text-left">
                                                        <p className="font-black text-sm text-slate-900 uppercase mb-1">{product.name}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU: {product.sku} • {product.quantity} AVAILABLE</p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-6">
                                                        <p className="text-lg font-black text-slate-900 tracking-tighter">{formatCurrency(product.sellingPrice)}</p>
                                                        <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                                            <Plus className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </Drawer.Content>
                            </Drawer.Portal>
                        </Drawer.Root>
                    </div>

                    <div className="space-y-6">
                        {cart.map((item) => (
                            <div key={item.productId} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] group hover:bg-slate-100 transition-all">
                                <div className="flex items-center gap-8 flex-1 min-w-0">
                                    <div className="w-16 h-16 bg-white rounded-[1.5rem] flex items-center justify-center font-black text-slate-200 shadow-sm">
                                        <Tag className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-lg text-slate-900 uppercase truncate mb-1">{item.productName}</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatCurrency(item.price)} per unit</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-10">
                                    <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100">
                                        <button onClick={() => updateQuantity(item.productId, -1)} className="p-3 bg-slate-50 rounded-xl hover:scale-110 active:scale-95 transition-all text-slate-400">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setCart(cart.map(i => i.productId === item.productId ? { ...i, quantity: val } : i));
                                            }}
                                            className="w-16 bg-transparent border-none text-center font-black text-lg text-slate-900 focus:ring-0 p-0"
                                        />
                                        <button onClick={() => updateQuantity(item.productId, 1)} className="p-3 bg-slate-50 rounded-xl hover:scale-110 active:scale-95 transition-all text-slate-400">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="w-32 text-right">
                                        <h3 className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(item.price * item.quantity)}</h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                    </div>

                                    <button onClick={() => removeFromCart(item.productId)} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {cart.length === 0 && (
                            <div className="py-24 flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-slate-100 rounded-[3rem]">
                                <ShoppingBag className="w-16 h-16 text-slate-200 mb-6" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Items Yet</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Click "Add Items" to start building this quotation</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Finality Ledger */}
                <div className="bg-primary rounded-[3rem] p-12 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-6">
                            <div className="p-6 bg-white/10 rounded-[2rem] text-emerald-400">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tighter mb-1 uppercase">Proposal Ready</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ready to save</p>
                            </div>
                        </div>

                        <div className="text-center md:text-right">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Total Amount</span>
                            <div className="flex items-center gap-4">
                                <h2 className="text-6xl font-black tracking-tighter">{formatCurrency(totalAmount)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function CheckCircle2(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
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
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
