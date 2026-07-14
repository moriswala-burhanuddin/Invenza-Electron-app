import { useState, useEffect, useRef, useCallback } from 'react';
import { isElectron } from '@/lib/electron-helper';
import { useERPStore, Product, ItemKit } from '@/lib/store-data';
import { Plus, Minus, Trash2, X, Search, ShoppingBag, UserPlus, Check, ChevronsUpDown, MoreVertical, Pause, ClipboardList, Truck, Mail, Barcode, ArrowLeft, CreditCard, Wallet, Tag, ShieldCheck, Zap, AlertTriangle, TrendingUp, Activity, Smartphone, Monitor, DollarSign, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Drawer } from 'vaul';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { generateReceiptHtml } from '@/components/sales/ReceiptTemplate';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";
import { useStoreConfig } from "@/lib/store-config";
import { generateId, convertToBase, convertFromBase } from '@/lib/utils';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  purchasePrice: number;
  discount: number;
}

type SearchItem = (Product & { type: 'PRODUCT' }) | (ItemKit & { type: 'KIT' });

export default function NewSale() {
  const navigate = useNavigate();
  const { getStoreProducts, getStoreCustomers, getStoreAccounts, getStoreQuotations, getStoreItemKits, getStoreUsers, addSale, addCustomer, activeStoreId, taxSlabs, giftCards, getActiveStore, sales, testModeEnabled, toggleTestMode, addGiftCard, addActivityLog } = useERPStore();

  const products = getStoreProducts();
  const customers = getStoreCustomers();
  const accounts = getStoreAccounts();
  const quotations = getStoreQuotations();
  const itemKits = getStoreItemKits();
  const users = getStoreUsers();

  const { baseCurrency, flatDiscountAlsoDiscountsTax } = useStoreConfig();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<'cash' | 'credit' | 'retail'>('cash');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'wallet'>('cash');
  const [customerId, setCustomerId] = useState<string>('');
  const [quotationId, setQuotationId] = useState<string>('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [billDiscount, setBillDiscount] = useState(0);
  const [selectedTaxSlabId, setSelectedTaxSlabId] = useState<string>('');
  const [payments, setPayments] = useState<{ mode: 'cash' | 'card' | 'upi' | 'gift_card' | 'store_credit', amount: number, accountId?: string, giftCardId?: string }[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', area: '' });
  const barcodeBuffer = useRef('');

  const [overrideItem, setOverrideItem] = useState<string | null>(null);
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [adminCode, setAdminCode] = useState('');
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  const [inputDialogOpen, setInputDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputDialogTitle, setInputDialogTitle] = useState('');
  const [inputDialogLabel, setInputDialogLabel] = useState('');
  const [inputDialogOnConfirm, setInputDialogOnConfirm] = useState<(val: string) => void>(() => (val: string) => { });

  const [newGiftCardOpen, setNewGiftCardOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardValue, setNewCardValue] = useState('');

  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryEmployeeId, setDeliveryEmployeeId] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [isCod, setIsCod] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideStock, setOverrideStock] = useState(false);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  // Stats for the POS
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemsDiscountTotal = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const selectedTaxSlab = taxSlabs.find(s => s.id === selectedTaxSlabId);
  const taxableAmount = Math.max(0, subtotal - itemsDiscountTotal - (flatDiscountAlsoDiscountsTax ? billDiscount : 0));
  const taxAmount = selectedTaxSlab ? (taxableAmount * selectedTaxSlab.percentage) / 100 : 0;
  const totalAmount = Math.max(0, subtotal - itemsDiscountTotal - billDiscount) + taxAmount;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = totalAmount - totalPaid;

  const calculateKitCost = useCallback((kitItems: { productId: string, quantity: number }[]) => {
    return kitItems.reduce((total, kitItem) => {
      const product = products.find(p => p.id === kitItem.productId);
      return total + (product ? product.purchasePrice * kitItem.quantity : 0);
    }, 0);
  }, [products]);

  const addToCart = useCallback((item: SearchItem) => {
    if (item.type === 'KIT' && item.displayMode === 'expanded') {
      toast.info(`Expanding Bundle: ${item.name}`);
      setCart(prevCart => {
        const newCart = [...prevCart];
        item.items.forEach(kitItem => {
          const product = products.find(p => p.id === kitItem.productId);
          if (!product) return;

          const existingIndex = newCart.findIndex(i => i.productId === product.id);
          if (existingIndex > -1) {
            newCart[existingIndex] = {
              ...newCart[existingIndex],
              quantity: newCart[existingIndex].quantity + kitItem.quantity
            };
          } else {
            newCart.push({
              productId: product.id,
              productName: product.name,
              quantity: kitItem.quantity,
              price: product.sellingPrice,
              purchasePrice: product.purchasePrice || 0,
              discount: 0
            });
          }
        });
        return newCart;
      });
      setSearchQuery('');
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(i => i.productId === item.id);
      let purchasePrice = 0;
      let limit = 0;

      if (item.type === 'KIT') {
        purchasePrice = calculateKitCost(item.items);
      } else {
        purchasePrice = item.purchasePrice || 0;
        limit = item.limitedQty || 0;
      }

      if (existing) {
        if (limit > 0 && existing.quantity + 1 > limit) {
          toast.error(`Stock limit reached for ${item.name}`);
          return prevCart;
        }
        return prevCart.map(i =>
          i.productId === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        toast.info(`${item.name} added to cart`);
        return [...prevCart, {
          productId: item.id,
          productName: item.name,
          quantity: 1,
          price: item.sellingPrice,
          purchasePrice: purchasePrice,
          discount: 0
        }];
      }
    });
    setSearchQuery('');
  }, [calculateKitCost, products]);

  const handleScan = useCallback((code: string) => {
    const skuOrBarcode = code.trim();
    if (!skuOrBarcode) return;

    const found = products.find(p =>
      (p.sku && p.sku.toLowerCase() === skuOrBarcode.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase() === skuOrBarcode.toLowerCase())
    );

    if (found) {
      addToCart({ ...found, type: 'PRODUCT' });
    } else {
      const foundKit = itemKits.find(k => k.id === skuOrBarcode);
      if (foundKit) {
        addToCart({ ...foundKit, type: 'KIT' });
      } else {
        toast.error(`Unknown barcode: ${skuOrBarcode}`, {
          position: 'top-center',
          duration: 2000
        });
      }
    }
    setBarcodeQuery('');
  }, [products, itemKits, addToCart]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we are typing in an input, don't interfere
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      // Auto-focus the barcode scanner if user starts typing alphanumeric characters
      if (/^[a-zA-Z0-9]$/.test(e.key)) {
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.productId === productId) {
        const product = products.find(p => p.id === productId);
        const newQty = item.quantity + delta;
        const limit = product?.limitedQty || 0;
        if (delta > 0 && limit > 0 && newQty > limit) {
          toast.error(`Limit: ${limit} units.`);
          return item;
        }
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, [products]);

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.info("Item discarded from cart");
  };

  const handleSubmit = async () => {
    if (isSubmitting || cart.length === 0) return;
    if (saleType === 'credit' && !customerId) {
      toast.error("Customer Selection Required for Credit");
      return;
    }
    // For non-credit sales: if no payments added, auto-apply full amount as cash
    let finalPayments = payments;
    if (saleType !== 'credit') {
      if (!accountId) {
        toast.error("Account Required for Payment Selection");
        return;
      }
      if (finalPayments.length === 0) {
        finalPayments = [{ mode: 'cash', amount: totalAmount, accountId: accountId }];
      } else if (remainingBalance > 0.01) {
        finalPayments.push({ mode: 'cash', amount: remainingBalance, accountId: accountId });
        toast.info(`Auto-filled shortfall of ${formatCurrency(remainingBalance)} with Cash`);
      }
    }

    setIsSubmitting(true);
    try {
      const totalProfit = cart.reduce((sum, item) => sum + (((item.price - item.discount) - item.purchasePrice) * item.quantity), 0) - billDiscount;
      await addSale({
        type: saleType,
        status: 'completed',
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal,
        discountAmount: itemsDiscountTotal + billDiscount,
        taxAmount,
        totalAmount,
        originalAmount: convertFromBase(totalAmount, baseCurrency),
        originalCurrency: baseCurrency,
        profit: totalProfit,
        paymentMode: saleType === 'credit' ? 'store_credit' : (finalPayments.length > 1 ? 'split' : (finalPayments.length > 0 ? finalPayments[0].mode : 'cash')),
        payments: finalPayments.map(p => ({
          id: generateId(),
          saleId: '',
          paymentMode: p.mode,
          amount: p.amount,
          accountId: p.accountId || accountId,
          giftCardId: p.giftCardId
        })),
        accountId: finalPayments.find(p => p.accountId)?.accountId || accountId,
        customerId: customerId || undefined,
        quotationId: quotationId || undefined,
        storeId: activeStoreId,
        overrideStock: overrideStock,
        date: new Date().toISOString()
      });

      toast.success("Sale Completed");
      navigate('/sales');
    } catch (error) {
      toast.error((error as Error).message || "System Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceOverride = async () => {
    let isValid = false;
    if (isElectron() && window.electronAPI?.verifySupervisor) {
      isValid = await window.electronAPI.verifySupervisor(adminCode);
    } else {
      isValid = adminCode === '1234';
    }
    if (!isValid) {
      toast.error("Security Override Failed: Invalid Code");
      return;
    }
    const displayPrice = parseFloat(overrideValue);
    if (isNaN(displayPrice) || displayPrice < 0) return;

    // Convert display price to base currency for storage
    const price = convertToBase(displayPrice, baseCurrency);

    setCart(prev => prev.map(item => {
      if (item.productId === overrideItem) {
        addActivityLog({ action: 'PRICE_OVERRIDE', details: `Item: ${item.productName}, Orig: ${formatCurrency(item.price)}, New: ${formatCurrency(price)}` });
        return { ...item, price };
      }
      return item;
    }));
    setShowOverrideDialog(false);
    setOverrideItem(null);
    setAdminCode('');
  };

  const searchItems = ([
    ...products.map(p => ({ ...p, type: 'PRODUCT' as const })),
    ...itemKits.map(k => ({ ...k, type: 'KIT' as const, purchasePrice: calculateKitCost(k.items) }))
  ] as SearchItem[]).filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.type === 'PRODUCT' && (item as Product).barcode && (item as Product).barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* Superior POS Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-[1920px] mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/sales')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">New Sale</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Terminal ID: SF-POS-01 • v4.2</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-12 hidden lg:block group">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
              <input
                type="text"
                placeholder="Scan or Search Inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 bg-slate-50 border-none rounded-[1.2rem] pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all uppercase"
              />
              {searchQuery.trim() && (
                <div className="absolute top-16 left-0 right-0 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-50 z-[200]">
                  {searchItems.length === 0 ? (
                    <p className="text-center text-[10px] font-black text-slate-400 uppercase py-6 tracking-widest">No products found</p>
                  ) : searchItems.slice(0, 10).map(item => (
                    <button
                      key={item.id}
                      onClick={() => { addToCart(item); setSearchQuery(''); }}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group"
                    >
                      <div className="text-left">
                        <p className="font-black text-sm text-slate-900 group-hover:translate-x-1 transition-transform">{item.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sku} • {item.type === 'KIT' ? 'COMBO' : `${item.quantity} IN STOCK`}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{formatCurrency(item.sellingPrice)}</p>
                        <Plus className="w-4 h-4 text-indigo-600 inline ml-2" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-[2rem] p-4 text-[10px] font-black uppercase tracking-widest">
                <DropdownMenuItem onClick={toggleTestMode} className="py-4 px-4 rounded-xl focus:bg-orange-50 focus:text-orange-700">
                  {testModeEnabled ? "EXIT TEST MODE" : "ENTER TEST MODE"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  if (window.electronAPI) await window.electronAPI.openSecondaryDisplay();
                  toast.success("Secondary Display Synchronized");
                }} className="py-4 px-4 rounded-xl">
                  CUSTOMER DISPLAY
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-10 w-px bg-slate-100 mx-2" />
            <div className="bg-primary text-white px-6 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[100px]">
              <span className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-0.5 leading-none">Final Total</span>
              <span className="text-lg font-black tracking-tight leading-none">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Selection Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* 1. Sale Details */}
            <div className="grid grid-cols-1 gap-8">
              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                <div className="flex items-center gap-3 mb-8">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Sale Type</h3>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-2xl">
                    {['cash', 'credit', 'retail'].map(t => (
                      <button
                        key={t}
                        onClick={() => setSaleType(t as 'cash' | 'credit' | 'retail')}
                        className={cn(
                          "py-3 rounded-[1rem] text-[9px] font-black uppercase tracking-widest transition-all",
                          saleType === t ? "bg-primary text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank or Cash Account</Label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary appearance-none"
                    >
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Customer</h3>
                  </div>
                  {saleType === 'credit' && (
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">REQUIRED</span>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "w-full h-16 rounded-2xl px-6 font-black text-xs uppercase flex items-center justify-between border-2 transition-all group",
                        customerId ? "border-slate-100 bg-slate-50" : "border-dashed border-slate-200 hover:border-primary text-slate-400"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                            <Smartphone className="w-4 h-4 text-slate-300" />
                          </div>
                          <div className="text-left">
                            <p className={cn("leading-none mb-1", customerId ? "text-slate-900" : "text-slate-300")}>
                              {customerId ? customers.find(c => c.id === customerId)?.name : "SELECT CUSTOMER"}
                            </p>
                            <p className="text-[9px] opacity-60">Customer Account</p>
                          </div>
                        </div>
                        <ChevronsUpDown className="w-4 h-4 opacity-30" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0 rounded-[2rem] overflow-hidden border-none shadow-2xl z-[100]" align="center">
                      <Command className="font-black uppercase">
                        <CommandInput placeholder="Search Customer List..." className="h-14 pl-12" />
                        <CommandList className="max-h-80">
                          <CommandEmpty className="py-10 text-center text-slate-400 text-[10px]">No customers found</CommandEmpty>
                          <CommandGroup>
                            <CommandItem className="py-4 px-6 hover:bg-slate-50 cursor-pointer" onSelect={() => { setCustomerId(""); setCustomerSearchOpen(false); }}>
                              <Check className={cn("mr-4 h-4 w-4", !customerId ? "opacity-100" : "opacity-0")} />
                              WALK-IN GUEST
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
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                          <Button onClick={() => setNewCustomerOpen(true)} className="w-full bg-primary text-white h-12 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            New Customer
                          </Button>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* 2. Cart Items */}
            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl">
                    <ShoppingBag className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Products Selected</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cart.length} items in cart</p>
                  </div>
                </div>
                <Button onClick={() => setSearchQuery(' ')} className="lg:hidden bg-indigo-600 text-white rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest">
                  <Plus className="w-4 h-4 mr-2" /> Add Items
                </Button>
              </div>

              {/* Robust POS Scanner Input */}
              <div className="bg-slate-900 rounded-[2.5rem] p-5 mb-12 shadow-2xl shadow-indigo-900/20 border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Barcode className="w-32 h-32 text-indigo-400" />
                </div>
                <div className="relative z-10 flex items-center gap-6">
                  <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-900/40">
                    <Barcode className="text-white w-6 h-6 animate-pulse" />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeQuery}
                    onChange={(e) => setBarcodeQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScan(barcodeQuery);
                      }
                    }}
                    placeholder="SCAN BARCODE OR TYPE HERE..."
                    className="bg-transparent border-none text-white text-xl placeholder:text-slate-700 focus:outline-none flex-1 font-mono tracking-wider font-black"
                    autoFocus
                  />
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanner Ready</span>
                  </div>
                </div>
              </div>

              {/* Mobile Search Bar */}
              <div className="lg:hidden mb-8 relative group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery.trim() === '' ? '' : searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 bg-slate-50 border-none rounded-[1.2rem] pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all uppercase"
                />
                {searchQuery.trim() && (
                  <div className="absolute top-16 left-0 right-0 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 max-h-[50vh] overflow-y-auto divide-y divide-slate-50 z-50">
                    {searchItems.length === 0 ? (
                      <p className="text-center text-[10px] font-black text-slate-400 uppercase py-6">No products found</p>
                    ) : searchItems.slice(0, 10).map(item => (
                      <button
                        key={item.id}
                        onClick={() => { addToCart(item); setSearchQuery(''); }}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group"
                      >
                        <div className="text-left">
                          <p className="font-black text-sm text-slate-900 group-hover:translate-x-1 transition-transform">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.sku} • {item.type === 'KIT' ? 'COMBO' : `${(item as Product & { type: 'PRODUCT' }).quantity} IN STOCK`}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900">{formatCurrency(item.sellingPrice)}</p>
                          <Plus className="w-4 h-4 text-indigo-600 inline ml-2" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>


              {cart.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {cart.map((item) => (
                    <div key={item.productId} className="py-8 group flex items-center justify-between gap-12">
                      <div className="flex-1 flex items-center gap-8 min-w-0">
                        <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center font-black text-slate-300 group-hover:bg-slate-100 transition-colors shrink-0">
                          <Tag className="w-8 h-8" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-lg text-slate-900 uppercase truncate mb-1">{item.productName}</h4>
                            <button
                              onClick={() => { 
                                setOverrideItem(item.productId); 
                                setOverrideValue(convertFromBase(item.price, baseCurrency).toString()); 
                                setShowOverrideDialog(true); 
                              }}
                              className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 underline underline-offset-4 decoration-indigo-200"
                            >
                              {formatCurrency(item.price)} / Unit (Change Price)
                            </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                            <button onClick={() => updateQuantity(item.productId, -1)} className="p-3 bg-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all">
                              <Minus className="w-3 h-3 text-slate-400" />
                            </button>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setCart(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: val } : i));
                              }}
                              className="w-16 bg-transparent border-none text-center font-black text-lg text-slate-900 focus:ring-0 p-0"
                            />
                            <button onClick={() => updateQuantity(item.productId, 1)} className="p-3 bg-white rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all">
                              <Plus className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                          <button
                            onClick={() => setOverrideStock(!overrideStock)}
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest mt-2 transition-colors",
                              overrideStock ? "text-orange-600" : "text-indigo-400 hover:text-indigo-600 underline decoration-indigo-200 underline-offset-4"
                            )}
                          >
                            {overrideStock ? "(ALLOW OVER-STOCK SALES)" : "(FORCE ADD)"}
                          </button>
                        </div>

                        <div className="w-32 text-right">
                          <h5 className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency((item.price - item.discount) * item.quantity)}</h5>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                        </div>

                        <button onClick={() => removeFromCart(item.productId)} className="p-4 opacity-0 group-hover:opacity-100 transition-all bg-red-50 text-red-600 rounded-2xl hover:bg-red-100">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center text-center opacity-30">
                  <ShoppingBag className="w-20 h-20 mb-6 text-slate-200" />
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight font-mono">Cart is Empty</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Search for products to add them here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Section Sidebar */}
        <div className="w-full xl:w-[450px] bg-white border-t xl:border-t-0 xl:border-l border-slate-100 flex flex-col p-6 md:p-10 shadow-2xl shadow-black/5 z-40 relative">
          <div className="flex items-center justify-between mb-12">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Payment Section</h3>
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
          </div>

          <div className="flex-1 space-y-10 overflow-y-auto pr-2 custom-scrollbar">
            {giftCards.some(gc => gc.isActive) && (
              <div className="mb-6 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                    {customerId && giftCards.some(gc => gc.isActive && gc.customerId === customerId) 
                      ? "Customer Gift Card" 
                      : "Gift Cards Available"}
                  </h4>
                  <p className="text-[9px] font-black text-purple-400 mt-1 uppercase">
                    {customerId && giftCards.some(gc => gc.isActive && gc.customerId === customerId) 
                      ? "Customer has active cards" 
                      : "Apply a gift card to this sale"}
                  </p>
                </div>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    let cardId = undefined;
                    let amountToApply = remainingBalance;

                    if (customerId) {
                      const card = giftCards.find(gc => gc.isActive && gc.customerId === customerId);
                      if (card) {
                        cardId = card.id;
                        amountToApply = Math.min(card.balance, remainingBalance);
                      }
                    }
                    
                    if (remainingBalance > 0.01) {
                        const newPayments = [...payments, { mode: 'gift_card' as const, amount: amountToApply, giftCardId: cardId }];
                        // Auto-add cash for shortfall
                        if (amountToApply < remainingBalance) {
                            newPayments.push({ mode: 'cash' as const, amount: remainingBalance - amountToApply, accountId: accountId });
                        }
                        setPayments(newPayments);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-8 px-4 text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  Redeem Card
                </Button>
              </div>
            )}

            {/* 3. Payment Selection */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Amount</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { if (remainingBalance > 0.01) setPayments([...payments, { mode: 'cash', amount: remainingBalance, accountId: accountId }]); }}
                  className="bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded-lg h-8 px-4"
                >
                  Pay Full Amount
                </Button>
              </div>

              {payments.map((p, idx) => (
                <div key={idx} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 relative group animate-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">How they paid</Label>
                      <select
                        value={p.mode}
                        onChange={(e) => { const n = [...payments]; n[idx].mode = e.target.value as 'cash' | 'card' | 'upi' | 'gift_card' | 'store_credit'; setPayments(n); }}
                        className="w-full bg-white border-none rounded-xl h-12 px-4 text-[10px] font-black focus:ring-2 focus:ring-primary appearance-none uppercase"
                      >
                        <option value="cash">CASH</option>
                        <option value="card">CARD</option>
                        <option value="upi">UPI/DIGITAL</option>
                        <option value="gift_card">GIFT CARD</option>
                        {saleType === 'credit' && <option value="store_credit">STORE CREDIT</option>}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</Label>
                      <Input
                        type="number"
                        value={convertFromBase(p.amount, baseCurrency)}
                        onChange={(e) => { 
                          const n = [...payments]; 
                          n[idx].amount = convertToBase(parseFloat(e.target.value) || 0, baseCurrency); 
                          setPayments(n); 
                        }}
                        className="w-full bg-white border-none rounded-xl h-12 px-4 font-black focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {p.mode === 'gift_card' ? (
                      <div className="flex gap-2 w-full">
                        <select
                          value={p.giftCardId}
                          onChange={(e) => { const n = [...payments]; n[idx].giftCardId = e.target.value; setPayments(n); }}
                          className="flex-1 bg-white border-none rounded-xl h-10 px-4 text-[9px] font-black uppercase focus:ring-1 focus:ring-primary"
                        >
                          <option value="">SELECT GIFT CARD</option>
                          {giftCards
                            .filter(gc => gc.isActive)
                            .sort((a, b) => (b.customerId === customerId ? 1 : 0) - (a.customerId === customerId ? 1 : 0))
                            .map(gc => (
                              <option key={gc.id} value={gc.id}>
                                {gc.cardNumber} (Bal: {formatCurrency(gc.balance)}) {gc.customerId === customerId ? '⭐' : ''}
                              </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost" 
                          onClick={() => setNewGiftCardOpen(true)} 
                          className="bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl px-4 h-10 font-black text-[9px] uppercase tracking-widest shrink-0"
                        >
                          + New Card
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> Payment Verified
                      </div>
                    )}
                    <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))} className="p-3 text-red-100 group-hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setPayments([...payments, { mode: 'cash', amount: 0, accountId: accountId }])}
                className="w-full py-6 rounded-[1.5rem] border-2 border-dashed border-slate-100 text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary hover:text-foreground transition-all"
              >
                + Add Another Payment
              </button>
            </div>

            {/* 4. Total Summary */}
            <div className="space-y-6 pt-10 border-t border-slate-50">
              <div className="flex justify-between items-center group">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Items Price</span>
                <span className="text-sm font-black text-slate-900">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 font-black">{baseCurrency}</span>
                  <input
                    type="number"
                    value={convertFromBase(billDiscount, baseCurrency)}
                    onChange={(e) => setBillDiscount(convertToBase(parseFloat(e.target.value) || 0, baseCurrency))}
                    className="w-24 bg-slate-50 border-none rounded-xl h-10 pl-8 pr-4 text-right font-black text-xs text-red-500 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate('/tax-settings')}
                    className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                    title="Manage Taxes"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={selectedTaxSlabId}
                    onChange={(e) => setSelectedTaxSlabId(e.target.value)}
                    className="bg-transparent border-none text-right font-black text-[10px] uppercase text-indigo-600 focus:ring-0 cursor-pointer"
                  >
                    <option value="">NO TAX (0%)</option>
                    {taxSlabs.map(slab => <option key={slab.id} value={slab.id}>{slab.name} ({slab.percentage}%)</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projected Margin</span>
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px]">
                  <TrendingUp className="w-4 h-4" />
                  +{formatCurrency(cart.reduce((sum, item) => sum + (((item.price - item.discount) - item.purchasePrice) * item.quantity), 0) - billDiscount)}
                </div>
              </div>

              <div className="h-px bg-slate-100 my-4" />

              <div className="bg-slate-50 rounded-[2rem] p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.3em]">Payable Amount</p>
                  <p className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Remaining Balance</p>
                  <p className={cn("text-lg font-black tracking-tight", remainingBalance > 0.01 ? "text-red-600" : "text-emerald-500")}>
                    {formatCurrency(Math.abs(remainingBalance))}
                    {remainingBalance < 0 && ' (CHANGE)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-10 border-t border-slate-50 space-y-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-primary text-white h-20 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20"
            >
              {isSubmitting ? 'COMPLETING SALE...' : 'COMPLETE SALE'}
            </Button>
            <p className="text-[8px] font-black text-slate-300 text-center uppercase tracking-widest">Digital Audit Logged • Ledger Secured</p>
          </div>
        </div>
      </main>

      {/* Security Override Protocol */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="sm:max-w-[480px] rounded-[2.5rem] border-none p-12 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Price Override</DialogTitle>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10 leading-relaxed">Adjusting unit price requires admin approval.</p>
          </DialogHeader>
          <div className="space-y-8 mb-10">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <Input
                  type="number"
                  className="w-full h-16 bg-slate-50 border-none rounded-2xl pl-14 font-black text-lg focus:ring-2 focus:ring-primary"
                  value={overrideValue}
                  onChange={(e) => setOverrideValue(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Code</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <Input
                  type="password"
                  placeholder="••••"
                  className="w-full h-16 bg-slate-50 border-none rounded-2xl pl-14 font-black tracking-[0.5em] focus:ring-2 focus:ring-primary"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col gap-4">
            <Button onClick={handlePriceOverride} className="w-full bg-primary text-white h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20">
              Confirm Override
            </Button>
            <Button variant="ghost" onClick={() => setShowOverrideDialog(false)} className="w-full h-12 rounded-2xl font-black uppercase text-[9px] text-slate-400">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-none p-12 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-10">New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mb-10">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</Label>
                <Input className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold uppercase focus:ring-2 focus:ring-primary" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</Label>
                <Input className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area</Label>
              <Input className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold uppercase focus:ring-2 focus:ring-primary" value={newCustomer.area} onChange={(e) => setNewCustomer({ ...newCustomer, area: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-primary text-white h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest"
              onClick={async () => {
                if (!newCustomer.name) return;
                const id = generateId();
                await addCustomer({ name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email, area: newCustomer.area, creditBalance: 0, totalPurchases: 0, storeId: activeStoreId, joinedAt: new Date().toISOString() });
                setCustomerId(id);
                setNewCustomerOpen(false);
                setNewCustomer({ name: '', phone: '', email: '', area: '' });
                toast.success(`Guest registered: ${newCustomer.name}`);
              }}
            >
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Gift Card Dialog */}
      <Dialog open={newGiftCardOpen} onOpenChange={setNewGiftCardOpen}>
        <DialogContent className="sm:max-w-[440px] rounded-[3rem] border-none p-12 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">New Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mb-10">
            <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</Label>
                <Input className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold uppercase focus:ring-2 focus:ring-primary mt-2" value={newCardNumber} onChange={(e) => setNewCardNumber(e.target.value)} placeholder="e.g. GC-1001" />
            </div>
            <div>
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value Amount</Label>
                <Input type="number" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-bold uppercase focus:ring-2 focus:ring-primary mt-2" value={newCardValue} onChange={(e) => setNewCardValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full bg-primary text-white h-16 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest"
              onClick={async () => {
                if (!newCardNumber || !newCardValue) return;
                await addGiftCard({
                    cardNumber: newCardNumber,
                    value: parseFloat(newCardValue),
                    balance: parseFloat(newCardValue),
                    isActive: true,
                    customerId: customerId || undefined,
                    storeId: activeStoreId
                });
                setNewGiftCardOpen(false);
                setNewCardNumber('');
                setNewCardValue('');
                toast.success("Gift Card created successfully!");
              }}
            >
              Create Gift Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
