import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, Invoice, InvoiceItem, Product } from '@/lib/store-data';
import {
    Plus, Trash2, Save, X, Search, Calculator,
    Calendar, CreditCard, User, Truck, FileText, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStoreConfig } from '@/lib/store-config';
import { cn, formatCurrency, convertToBase } from '@/lib/utils';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


export default function NewInvoice() {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const { toast } = useToast();
    const {
        invoices, products, customers, suppliers,
        createInvoice, updateInvoice, activeStoreId
    } = useERPStore();
    const { baseCurrency } = useStoreConfig();


    const isEdit = !!id;
    const initialType = (location.state as { type?: 'customer' | 'supplier' })?.type || 'customer';

    const [invoice, setInvoice] = useState<Partial<Invoice>>({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        type: initialType,
        status: 'draft',
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        amountPaid: 0,
        amountDue: 0,
        notes: '',
        storeId: activeStoreId,
    });

    const [showPartyPicker, setShowPartyPicker] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isEdit && id) {
            const existing = invoices.find(inv => inv.id === id);
            if (existing) {
                setInvoice({ ...existing });
            }
        }
    }, [isEdit, id, invoices]);

    // Calculations
    useEffect(() => {
        const subtotal = (invoice.items || []).reduce((sum, item) => sum + item.total, 0);
        const total = subtotal - (invoice.discountAmount || 0) + (invoice.taxAmount || 0);
        const due = total - (invoice.amountPaid || 0);

        setInvoice(prev => ({
            ...prev,
            subtotal,
            totalAmount: total,
            amountDue: due
        }));
    }, [invoice.items, invoice.discountAmount, invoice.taxAmount, invoice.amountPaid]);

    const handleAddItem = (product: Product) => {
        const newItem: InvoiceItem = {
            id: `item-${Date.now()}`,
            invoiceId: id || 'new',
            productId: product.id,
            productName: product.name,
            description: product.sku || '',
            quantity: 1,
            unitPrice: invoice.type === 'customer' ? product.sellingPrice : product.purchasePrice,
            discountPct: 0,
            discountAmount: 0,
            taxAmount: 0,
            total: invoice.type === 'customer' ? product.sellingPrice : product.purchasePrice,
            storeId: activeStoreId || '',
        };

        setInvoice(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
        setShowProductPicker(false);
    };

    const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
        const newItems = [...(invoice.items || [])];
        const item = { ...newItems[index], ...updates };

        // Recalculate item total
        item.total = item.quantity * item.unitPrice * (1 - item.discountPct / 100);
        newItems[index] = item;

        setInvoice(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (index: number) => {
        setInvoice(prev => ({
            ...prev,
            items: (prev.items || []).filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!invoice.invoiceNumber) {
            toast({ title: "Validation Error", description: "Invoice number is required.", variant: "destructive" });
            return;
        }

        if (invoice.type === 'customer' && !invoice.customerId) {
            toast({ title: "Validation Error", description: "Please select a customer.", variant: "destructive" });
            return;
        }

        if (invoice.type === 'supplier' && !invoice.supplierId) {
            toast({ title: "Validation Error", description: "Please select a supplier.", variant: "destructive" });
            return;
        }

        if (!invoice.items || invoice.items.length === 0) {
            toast({ title: "Validation Error", description: "Please add at least one item.", variant: "destructive" });
            return;
        }

        try {
            // Prepare invoice for saving (Convert all amounts to base currency UGX)
            const invoiceToSave = {
                ...invoice,
                subtotal: convertToBase(invoice.subtotal || 0, baseCurrency),
                discountAmount: convertToBase(invoice.discountAmount || 0, baseCurrency),
                taxAmount: convertToBase(invoice.taxAmount || 0, baseCurrency),
                totalAmount: convertToBase(invoice.totalAmount || 0, baseCurrency),
                amountPaid: convertToBase(invoice.amountPaid || 0, baseCurrency),
                amountDue: convertToBase(invoice.amountDue || 0, baseCurrency),
                originalAmount: invoice.totalAmount, // Header audit
                originalCurrency: baseCurrency,      // Header audit
                items: (invoice.items || []).map(item => ({
                    ...item,
                    unitPrice: convertToBase(item.unitPrice || 0, baseCurrency),
                    discountAmount: convertToBase(item.discountAmount || 0, baseCurrency),
                    taxAmount: convertToBase(item.taxAmount || 0, baseCurrency),
                    total: convertToBase(item.total || 0, baseCurrency),
                    // Keep track of original currency for audit trail
                    original_currency: baseCurrency,
                    original_amount: item.total
                }))
            };

            if (isEdit && id) {
                await updateInvoice(id, invoiceToSave);
                toast({ title: "Invoice Updated", description: "Changes saved successfully." });
            } else {
                await createInvoice(invoiceToSave as Invoice);
                toast({ title: "Invoice Created", description: "New invoice has been generated." });
            }

            navigate('/invoices');
        } catch (err) {
            toast({ title: "Error", description: "Failed to save invoice.", variant: "destructive" });
        }
    };

    const filteredParties = useMemo(() => {
        if (invoice.type === 'customer') {
            return customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        } else {
            return suppliers.filter(s => s.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
        }
    }, [invoice.type, customers, suppliers, searchQuery]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);

    return (
        <div className="min-h-screen pb-20 lg:pb-0 font-sans bg-slate-50">
            <PageHeader
                title={isEdit ? "Edit Invoice" : `New ${invoice.type === 'customer' ? 'Customer' : 'Supplier'} Invoice`}
                subtitle={isEdit ? `Modifying #${invoice.invoiceNumber}` : "Standalone billing document"}
                showBack
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            className="erp-button erp-button-ghost"
                            onClick={() => navigate('/invoices')}
                        >
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button
                            className="erp-button erp-button-primary"
                            onClick={handleSave}
                        >
                            <Save className="w-4 h-4 mr-2" /> Save Invoice
                        </Button>
                    </div>
                }
            />

            <div className="erp-page-content grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Party Section */}
                    <div className="erp-card bg-white">
                        <div className="flex items-center justify-between mb-5 border-b border-gray-50 pb-3">
                            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 uppercase text-gray-400">
                                {invoice.type === 'customer' ? <User className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                                {invoice.type === 'customer' ? 'Customer' : 'Supplier'}
                            </h3>
                            <Button
                                variant="link"
                                className="text-xs font-bold p-0 h-auto text-blue-500"
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowPartyPicker(true);
                                }}
                            >
                                Change {invoice.type === 'customer' ? 'Customer' : 'Supplier'}
                            </Button>
                        </div>

                        {((invoice.type === 'customer' && invoice.customerId) || (invoice.type === 'supplier' && invoice.supplierId)) ? (
                            <div className="flex items-center gap-4 animate-in fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-foreground font-bold text-xl">
                                    {(invoice.customerName || invoice.supplierName || '?')[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-lg tracking-tight leading-none text-foreground">
                                        {invoice.customerName || invoice.supplierName}
                                    </p>
                                    <p className="text-xs font-medium text-gray-400 mt-1.5 uppercase">
                                        ID: {invoice.customerId || invoice.supplierId}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="w-full border-2 border-dashed border-gray-100 rounded-2xl py-8 flex flex-col items-center justify-center text-gray-400 hover:border-gray-200 hover:text-foreground transition-all group"
                                onClick={() => setShowPartyPicker(true)}
                            >
                                <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-xs">Select {invoice.type === 'customer' ? 'Customer' : 'Supplier'}</span>
                            </button>
                        )}
                    </div>

                    {/* Items Section */}
                    <div className="erp-card bg-white">
                        <div className="flex items-center justify-between mb-5 border-b border-gray-50 pb-3">
                            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 uppercase text-gray-400">
                                <FileText className="w-4 h-4" /> Line Items
                            </h3>
                            <Button
                                variant="ghost"
                                className="erp-button erp-button-secondary h-9 text-xs"
                                onClick={() => {
                                    setSearchQuery('');
                                    setShowProductPicker(true);
                                }}
                            >
                                <Plus className="w-4 h-4" /> Add Product
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {(invoice.items || []).length > 0 ? (
                                (invoice.items || []).map((item, idx) => (
                                    <div key={idx} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0 group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <p className="font-bold text-foreground text-[15px]">{item.productName}</p>
                                                <Input
                                                    value={item.description}
                                                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                                                    className="h-7 text-xs border-none shadow-none p-0 focus-visible:ring-0 text-gray-400 font-medium placeholder:italic placeholder:font-normal bg-transparent"
                                                    placeholder="Add line note..."
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="p-1 px-2 text-gray-200 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4">
                                            <div>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Quantity</Label>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                                    className="erp-input h-10 bg-gray-50"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Price</Label>
                                                <Input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                                    className="erp-input h-10 bg-gray-50"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Disc %</Label>
                                                <Input
                                                    type="number"
                                                    value={item.discountPct}
                                                    onChange={(e) => updateItem(idx, { discountPct: parseFloat(e.target.value) || 0 })}
                                                    className="erp-input h-10 bg-gray-50"
                                                />
                                            </div>
                                            <div className="text-right">
                                                <p className="h-10 flex items-center justify-end font-bold text-foreground text-base border-b border-gray-100">
                                                    {formatCurrency(item.total)}
                                                </p>

                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-gray-300">
                                    <p className="font-bold text-sm italic">Invoice is empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar / Summary */}
                <div className="space-y-6">
                    <div className="erp-card bg-primary text-white p-6">
                        <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 uppercase mb-6 border-b border-gray-800 pb-3">
                            <Calculator className="w-4 h-4 text-gray-500" /> Summary
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-semibold uppercase">Subtotal</span>
                                <span className="font-bold text-gray-300">{formatCurrency(invoice.subtotal || 0)}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-semibold uppercase">Discount</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">-</span>
                                    <input
                                        type="number"
                                        value={invoice.discountAmount}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                                        className="w-20 bg-gray-900 border-none text-right px-2 py-1.5 text-white text-sm font-bold rounded-lg outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-semibold uppercase">Tax Total</span>
                                <input
                                    type="number"
                                    value={invoice.taxAmount}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }))}
                                    className="w-20 bg-gray-900 border-none text-right px-2 py-1.5 text-white text-sm font-bold rounded-lg outline-none"
                                />
                            </div>
                             <div className="border-t border-gray-800 pt-5 flex justify-between items-center">
                                <span className="font-bold uppercase tracking-tight text-white">Grand Total</span>
                                <span className="text-3xl font-bold text-white tracking-tighter">{formatCurrency(invoice.totalAmount || 0)}</span>
                            </div>


                            <div className="pt-5 space-y-4 border-t border-gray-900 mt-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 font-semibold uppercase">Amount Paid</span>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-lg">
                                        <CreditCard className="w-3.5 h-3.5 text-gray-600" />
                                        <input
                                            type="number"
                                            value={invoice.amountPaid}
                                            onChange={(e) => setInvoice(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
                                            className="w-20 bg-transparent border-none text-right text-white text-sm font-bold outline-none"
                                        />
                                    </div>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-red-400 font-semibold uppercase">Balance Due</span>
                                    <span className="font-bold text-red-400">{formatCurrency(invoice.amountDue || 0)}</span>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="erp-card bg-white">
                        <h3 className="font-bold text-sm tracking-tight flex items-center gap-2 uppercase mb-5 border-b border-gray-50 pb-3">
                            <Settings className="w-4 h-4 text-gray-400" /> Details
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Invoice #</Label>
                                <Input
                                    value={invoice.invoiceNumber}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                                    className="erp-input bg-gray-50"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Status</Label>
                                <select
                                    value={invoice.status}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, status: e.target.value as any }))}
                                    className="erp-input bg-gray-50 h-11 text-xs font-bold uppercase"
                                >
                                    <option value="draft">DRAFT</option>
                                    <option value="sent">SENT / ISSUED</option>
                                    <option value="paid">FULLY PAID</option>
                                    <option value="cancelled">VOID / CANCELLED</option>
                                </select>
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Due Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        type="date"
                                        value={invoice.dueDate?.split('T')[0]}
                                        onChange={(e) => setInvoice(prev => ({ ...prev, dueDate: e.target.value }))}
                                        className="erp-input pl-10 bg-gray-50"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Notes</Label>
                                <textarea
                                    value={invoice.notes}
                                    onChange={(e) => setInvoice(prev => ({ ...prev, notes: e.target.value }))}
                                    className="erp-input bg-gray-50 min-h-[120px] resize-none"
                                    placeholder="Payment instructions, bank terms, etc..."
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Party Picker Dialog */}
            <Dialog open={showPartyPicker} onOpenChange={setShowPartyPicker}>
                <DialogContent className="max-w-md rounded-2xl border-none font-sans p-0 overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-bold text-xl tracking-tight text-foreground mb-4 capitalize">
                            Select {invoice.type === 'customer' ? 'Customer' : 'Supplier'}
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name..."
                                className="erp-input pl-10 h-11 bg-white border-gray-200"
                            />
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {filteredParties.length > 0 ? (
                            filteredParties.map((party) => (
                                <button
                                    key={party.id}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left transition-colors"
                                    onClick={() => {
                                        if (invoice.type === 'customer') {
                                            setInvoice(prev => ({ ...prev, customerId: party.id, customerName: party.name }));
                                        } else {
                                            setInvoice(prev => ({ ...prev, supplierId: party.id, supplierName: party.companyName }));
                                        }
                                        setShowPartyPicker(false);
                                    }}
                                >
                                    <div className="w-10 h-10 bg-slate-100 text-slate-600 flex items-center justify-center font-black">
                                        {(party.name || party.companyName || '?')[0]}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{party.name || party.companyName}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{party.phone || party.email || party.id}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="py-12 text-center opacity-30">
                                <p className="font-black text-[10px] uppercase tracking-widest leading-none">Record not found</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Product Picker Dialog */}
            <Dialog open={showProductPicker} onOpenChange={setShowProductPicker}>
                <DialogContent className="max-w-md rounded-2xl border-none font-sans p-0 overflow-hidden">
                    <div className="p-6 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-bold text-xl tracking-tight text-foreground mb-4">Add Product</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or SKU..."
                                className="erp-input pl-10 h-11 bg-white border-gray-200"
                            />
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((p) => (
                                <button
                                    key={p.id}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left transition-colors"
                                    onClick={() => handleAddItem(p)}
                                >
                                    <div>
                                        <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{p.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">SKU: {p.sku} | STOCK: {p.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono font-black text-slate-900">{formatCurrency(invoice.type === 'customer' ? (p.sellingPrice || 0) : (p.purchasePrice || 0))}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase">PER {p.unit || 'UNIT'}</p>
                                    </div>

                                </button>
                            ))
                        ) : (
                            <div className="py-12 text-center opacity-30">
                                <p className="font-black text-[10px] uppercase tracking-widest leading-none">Product not found</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
