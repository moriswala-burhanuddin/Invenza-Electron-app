import { useState } from 'react';
import { useERPStore, GiftCard } from '@/lib/store-data';
import { Search, Gift, Plus, CreditCard, User, History, MoreVertical, ArrowLeft, Zap, Smartphone, Ghost, CheckCircle2, XCircle, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function GiftCards() {
    const { giftCards, getStoreCustomers, activeStoreId, updateGiftCard, addGiftCard } = useERPStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCardNumber, setNewCardNumber] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newCustomerId, setNewCustomerId] = useState('');

    const customers = getStoreCustomers();

    const filteredCards = giftCards
        .filter(gc => gc.storeId === activeStoreId)
        .filter(gc => {
            const customer = gc.customerId ? customers.find(c => c.id === gc.customerId) : null;
            const searchStr = searchQuery.toLowerCase();
            return (
                gc.cardNumber.toLowerCase().includes(searchStr) ||
                (customer?.name.toLowerCase().includes(searchStr))
            );
        });

    const handleToggleStatus = (id: string, current: boolean) => {
        updateGiftCard(id, { isActive: !current });
        toast.info(`Gift Card ${!current ? 'ACTIVATED' : 'DEACTIVATED'}.`);
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCardNumber || !newValue) return;
        
        await addGiftCard({
            cardNumber: newCardNumber,
            value: parseFloat(newValue),
            balance: parseFloat(newValue),
            isActive: true,
            customerId: newCustomerId || undefined,
            storeId: activeStoreId
        });
        
        toast.success("Gift Card created successfully!");
        setIsAddModalOpen(false);
        setNewCardNumber('');
        setNewValue('');
        setNewCustomerId('');
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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gift Cards</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Manage Gift Cards • {giftCards.length} Active Cards</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl text-purple-600 border border-purple-100">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Cloud Synced</span>
                        </div>
                        <Button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Plus className="w-4 h-4 mr-2 text-purple-400" />
                            Add Gift Card
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
                {/* Search Matrix */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
                        <Search className="w-6 h-6 text-slate-300 group-focus-within:text-foreground transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="SEARCH BY CARD NUMBER OR CUSTOMER NAME..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-20 bg-white border-none rounded-[2.5rem] pl-20 pr-8 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary shadow-sm"
                    />
                </div>

                {/* Voucher Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredCards.map((gc) => {
                        const customer = customers.find(c => c.id === gc.customerId);
                        return (
                            <div key={gc.id} className="bg-white rounded-[3rem] p-0 shadow-sm border border-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden flex flex-col">
                                <div className={cn("h-2 w-full", gc.isActive ? "bg-purple-500" : "bg-slate-200")} />

                                <div className="p-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className={cn("w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all",
                                            gc.isActive ? "bg-purple-50 text-purple-600 shadow-inner" : "bg-slate-50 text-slate-300"
                                        )}>
                                            <Gift className="w-8 h-8" />
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-300 hover:text-foreground">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-[1.5rem] border-none shadow-2xl p-2 min-w-[160px]">
                                                <DropdownMenuItem
                                                    onClick={() => handleToggleStatus(gc.id, gc.isActive)}
                                                    className="rounded-xl h-10 font-black uppercase text-[9px] tracking-widest focus:bg-slate-50"
                                                >
                                                    {gc.isActive ? <XCircle className="w-3.5 h-3.5 mr-2 text-red-500" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />}
                                                    {gc.isActive ? 'Suspend' : 'Activate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl h-10 font-black uppercase text-[9px] tracking-widest text-red-600 focus:bg-red-50">
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-6">
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter group-hover:text-purple-600 transition-colors">{gc.cardNumber}</h3>
                                            <Badge className={cn("rounded-full px-3 py-1 font-black text-[8px] uppercase tracking-widest",
                                                gc.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                {gc.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 mt-10">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Balance</p>
                                                <p className="text-3xl font-black text-slate-900 leading-none">{formatCurrency(gc.balance)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 opacity-50">Original Value</p>
                                                <p className="text-xl font-black text-slate-300 leading-none italic">{formatCurrency(gc.value)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-50">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-purple-600">Customer</p>
                                                <p className="text-[11px] font-black text-slate-900 uppercase truncate">{customer?.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-end">
                                                <History className="w-3 h-3" />
                                                SYNC: {format(new Date(gc.updatedAt), 'dd MMM')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredCards.length === 0 && (
                    <div className="py-40 text-center opacity-30 flex flex-col items-center">
                        <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                        <h4 className="text-2xl font-black text-slate-900 uppercase">NO GIFT CARDS FOUND</h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center max-w-sm">ADD A NEW GIFT CARD TO GET STARTED.</p>
                    </div>
                )}
            </main>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="rounded-[3rem] border-none shadow-2xl p-12 max-w-md">
                    <DialogHeader className="mb-8">
                        <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tighter">New Gift Card</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleAddCard} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Card Number</label>
                            <input
                                type="text"
                                required
                                value={newCardNumber}
                                onChange={(e) => setNewCardNumber(e.target.value)}
                                className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black text-slate-900 focus:ring-2 focus:ring-primary"
                                placeholder="e.g. GC-1001"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Value Amount</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black text-slate-900 focus:ring-2 focus:ring-primary"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer (Optional)</label>
                            <select
                                value={newCustomerId}
                                onChange={(e) => setNewCustomerId(e.target.value)}
                                className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black text-slate-900 focus:ring-2 focus:ring-primary appearance-none"
                            >
                                <option value="">No Customer</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <DialogFooter className="mt-10">
                            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase text-[10px] tracking-widest">
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-primary text-white rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20">
                                Create Card
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
