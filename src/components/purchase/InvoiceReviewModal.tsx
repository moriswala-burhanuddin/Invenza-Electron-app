import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Check, AlertCircle, ShoppingCart, Search } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Product } from '@/lib/store-data';

export interface ScannedItem {
    name: string;
    quantity: number;
    price: number;
    productId?: string | null;
}

export interface ExtractedData {
    supplier: string;
    date: string;
    totalAmount: number;
    items: ScannedItem[];
}

interface InvoiceReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    extractedData: ExtractedData | null;
    onConfirm: (data: ExtractedData) => void;
    availableProducts: Product[];
}

export function InvoiceReviewModal({
    isOpen,
    onClose,
    extractedData,
    onConfirm,
    availableProducts
}: InvoiceReviewModalProps) {
    const [data, setData] = useState<ExtractedData | null>(null);

    useEffect(() => {
        if (extractedData) {
            setData({ ...extractedData });
        }
    }, [extractedData]);

    if (!data) return null;

    const handleUpdateItem = (index: number, updates: Partial<ScannedItem>) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], ...updates };

        // If name changes, try to re-match productId (unless productId was manually set)
        if (updates.name && !updates.productId) {
            const match = availableProducts.find(p => p.name.toLowerCase() === updates.name?.toLowerCase());
            newItems[index].productId = match ? match.id : null;
        }

        setData({ ...data, items: newItems });
    };

    const handleLinkProduct = (index: number, product: Product) => {
        const newItems = [...data.items];
        newItems[index] = {
            ...newItems[index],
            name: product.name,
            productId: product.id,
            price: product.purchasePrice || newItems[index].price
        };
        setData({ ...data, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        setData({
            ...data,
            items: data.items.filter((_, i) => i !== index)
        });
    };

    const handleAddItem = () => {
        setData({
            ...data,
            items: [...data.items, { name: '', quantity: 1, price: 0 }]
        });
    };

    const calculateTotal = () => {
        return data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const fmt = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-3xl border-none shadow-2xl rounded-[3rem] p-0 overflow-hidden">
                <DialogHeader className="p-10 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Review Extraction</DialogTitle>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">AI-Intercepted Acquisition Payload</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reconstructed Total</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter font-mono">{fmt(calculateTotal())}</h3>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-10 max-h-[60vh] overflow-y-auto space-y-10">
                    {/* Header Data */}
                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Supplier Node</Label>
                            <Input
                                value={data.supplier}
                                onChange={(e) => setData({ ...data, supplier: e.target.value })}
                                className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                                placeholder="Supplier Name..."
                            />
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Timestamp</Label>
                            <Input
                                type="date"
                                value={data.date || ''}
                                onChange={(e) => setData({ ...data, date: e.target.value })}
                                className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Items Stream */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acquisition Stream Mapping</h4>
                            <Button
                                onClick={handleAddItem}
                                variant="ghost"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest h-10 px-4 rounded-xl"
                            >
                                <Plus className="w-3.5 h-3.5 mr-2" />
                                Add Entry
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {data.items.map((item, idx) => {
                                const isMatched = !!item.productId;
                                return (
                                    <div key={idx} className={cn(
                                        "group flex items-center gap-4 p-6 rounded-[2rem] transition-all duration-300 border",
                                        isMatched ? "bg-emerald-50/30 border-emerald-100" : "bg-slate-50/50 border-transparent hover:border-slate-200"
                                    )}>
                                        <div className="flex-1 space-y-2">
                                            <Label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 ml-1 flex items-center gap-2">
                                                Item Designation
                                                {isMatched ? (
                                                    <span className="flex items-center gap-1 text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full text-[8px]">
                                                        <Check className="w-2.5 h-2.5" /> Matched
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full text-[8px]">
                                                        <AlertCircle className="w-2.5 h-2.5" /> Manual Injection
                                                    </span>
                                                )}
                                            </Label>
                                            <Input
                                                value={item.name}
                                                onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                                                className="h-12 bg-white border-none rounded-xl px-4 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary shadow-sm"
                                                placeholder="Item name..."
                                            />
                                        </div>

                                        <div className="w-24 space-y-2">
                                            <Label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 ml-1">Qty</Label>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                                                className="h-12 bg-white border-none rounded-xl px-4 text-[10px] font-black focus:ring-2 focus:ring-primary shadow-sm"
                                            />
                                        </div>

                                        <div className="w-32 space-y-2">
                                            <Label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1 ml-1">Price</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black">$</span>
                                                <Input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleUpdateItem(idx, { price: parseFloat(e.target.value) || 0 })}
                                                    className="h-12 bg-white border-none rounded-xl pl-7 pr-4 text-[10px] font-black focus:ring-2 focus:ring-primary shadow-sm text-right font-mono"
                                                />
                                            </div>
                                        </div>

                                        <div className="w-32 space-y-2 text-right px-4">
                                            <Label className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Subtotal</Label>
                                            <p className="h-12 flex items-center justify-end font-black text-xs text-slate-900 font-mono">
                                                {fmt(item.quantity * item.price)}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-6">
                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-3 text-slate-200 hover:text-rose-500 transition-colors"
                                                title="Remove Junk Row"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>

                                            {!isMatched && (
                                                <div className="relative">
                                                    <select
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                        onChange={(e) => {
                                                            const p = availableProducts.find(ap => ap.id === e.target.value);
                                                            if (p) handleLinkProduct(idx, p);
                                                        }}
                                                    >
                                                        <option value="">Link to Existing...</option>
                                                        {availableProducts.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <button className="p-3 text-slate-200 hover:text-indigo-600 transition-colors" title="Link to Inventory">
                                                        <Search className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-10 bg-slate-50/50 border-t border-slate-100 mt-0">
                    <div className="flex items-center justify-between w-full">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                            Verify all nodes before final injection into acquisition stream.
                        </p>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    // Safety Filter: Remove items with empty names or obvious junk keywords
                                    const junkKeywords = ['total', 'tax', 'subtotal', 'vat', 'cash', 'change', 'balance'];
                                    const filteredItems = data.items.filter(item =>
                                        item.name.trim().length > 0 &&
                                        !junkKeywords.some(kw => item.name.toLowerCase().includes(kw))
                                    );
                                    onConfirm({ ...data, items: filteredItems });
                                }}
                                className="h-14 px-12 bg-primary text-white hover:bg-slate-900 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] transition-all flex items-center gap-3"
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Inject into Cart
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
