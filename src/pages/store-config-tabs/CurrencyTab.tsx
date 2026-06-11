import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Coins, Globe, Landmark, LayoutGrid, Hash, DollarSign, ArrowRightLeft, Ghost } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CurrencyTab() {
    const {
        currencySymbol, currencyCode, currencySymbolPosition,
        numberOfDecimals, thousandsSeparator, decimalPoint,
        denominations, exchangeRates, baseCurrency,
        updateConfig, addDenomination, removeDenomination
    } = useStoreConfig();

    const [newDenom, setNewDenom] = useState('');

    return (
        <div className="space-y-12">
            {/* Sector 1: Monetary Topology */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Coins className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Currency Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">General settings for how money is displayed in the system.</p>
                </div>

                <div className="lg:col-span-8 grid md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <DollarSign className="w-3.5 h-3.5" /> Currency Symbol
                        </Label>
                        <Input
                            value={currencySymbol}
                            onChange={e => updateConfig({ currencySymbol: e.target.value })}
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" /> Currency Code
                        </Label>
                        <Input
                            value={currencyCode}
                            onChange={e => updateConfig({ currencyCode: e.target.value })}
                            placeholder="KES"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <LayoutGrid className="w-3.5 h-3.5" /> Symbol Position
                        </Label>
                        <Select
                            value={currencySymbolPosition}
                            onValueChange={(val: 'before' | 'after') => updateConfig({ currencySymbolPosition: val })}
                        >
                            <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="before" className="text-[11px] font-black uppercase">Before Amount (UGX 10)</SelectItem>
                                <SelectItem value="after" className="text-[11px] font-black uppercase">After Amount (10 UGX)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Hash className="w-3.5 h-3.5" /> Decimal Places
                        </Label>
                        <Input
                            type="number"
                            value={numberOfDecimals}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                updateConfig({ numberOfDecimals: isNaN(val) ? 0 : Math.max(0, Math.min(20, val)) });
                            }}
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thousands Separator</Label>
                        <Input
                            value={thousandsSeparator}
                            onChange={e => updateConfig({ thousandsSeparator: e.target.value })}
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Decimal Point</Label>
                        <Input
                            value={decimalPoint}
                            onChange={e => updateConfig({ decimalPoint: e.target.value })}
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Coins className="w-3.5 h-3.5" /> Base Display Currency
                        </Label>
                        <Select
                            value={baseCurrency}
                            onValueChange={(val) => updateConfig({ baseCurrency: val })}
                        >
                            <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="UGX" className="text-[11px] font-black uppercase">UGX (Uganda Shilling)</SelectItem>
                                <SelectItem value="USD" className="text-[11px] font-black uppercase">USD (US Dollar)</SelectItem>
                                <SelectItem value="GBP" className="text-[11px] font-black uppercase">GBP (UK Pound)</SelectItem>
                                <SelectItem value="INR" className="text-[11px] font-black uppercase">INR (Indian Rupee)</SelectItem>
                                <SelectItem value="AED" className="text-[11px] font-black uppercase">AED (UAE Dirham)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[8px] font-black text-primary uppercase tracking-widest mt-2 ml-1">Changes display value only • Raw data remains UGX</p>
                    </div>
                </div>
            </div>

            {/* Sector 2: Value Fragmentation */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Denominations</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">List of bills and coins used for cash counting.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="flex gap-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 items-center justify-between">
                        <div className="relative flex-1 group">
                            <Plus className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <Input
                                placeholder="ENTER VALUE (E.G. 1000)"
                                value={newDenom}
                                onChange={e => setNewDenom(e.target.value)}
                                className="h-14 bg-white border-none rounded-2xl pl-14 pr-8 text-[11px] font-black uppercase"
                            />
                        </div>
                        <Button
                            className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20"
                            onClick={() => {
                                if (newDenom && !denominations.includes(newDenom)) {
                                    addDenomination(newDenom);
                                    setNewDenom('');
                                    toast.success("Value Added");
                                }
                            }}
                        >
                            Add Value
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {denominations.sort((a, b) => Number(b) - Number(a)).map(denom => (
                            <div key={denom} className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-primary transition-all">
                                <span className="text-xs font-black text-slate-900 font-mono tracking-tighter shrink-0">{denom}</span>
                                <button
                                    onClick={() => {
                                        removeDenomination(denom);
                                        toast.info("Value Removed");
                                    }}
                                    className="p-2 bg-slate-50 rounded-lg text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sector 3: Exchange Nexus */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Exchange Rates</h3>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            How much is 1 unit of the foreign currency worth in your business's main currency?
                        </p>
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                            <p className="text-[9px] font-black text-indigo-600 uppercase mb-2">Pro Tip:</p>
                            <p className="text-[10px] font-medium text-slate-600 leading-relaxed italic">
                                "If 1 USD is 3,800 UGX, then set the USD rate to 3800. The system will then show a 38,000 UGX product as $10.00."
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Rates</h4>
                        <Button
                            variant="ghost"
                            className="h-10 px-6 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest hover:scale-[1.02] shadow-xl shadow-black/20"
                            onClick={() => {
                                updateConfig({ exchangeRates: [...exchangeRates, { id: Date.now().toString(), currency: 'EUR', rate: 1.0 }] });
                                toast.success("Currency Added");
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Currency
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {exchangeRates.map((rate, index) => (
                            <div key={rate.id} className="flex items-center gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-slate-200 transition-all group">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-slate-900 border border-slate-100 shadow-sm shrink-0 uppercase text-[10px]">
                                    {rate.currency.slice(0, 3)}
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency Name</Label>
                                        <Input
                                            value={rate.currency}
                                            onChange={e => {
                                                const newRates = [...exchangeRates];
                                                newRates[index].currency = e.target.value;
                                                updateConfig({ exchangeRates: newRates });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Value of 1 {rate.currency} (In {currencyCode})</Label>
                                        <Input
                                            type="number"
                                            step="0.0001"
                                            value={rate.rate}
                                            onChange={e => {
                                                const newRates = [...exchangeRates];
                                                newRates[index].rate = parseFloat(e.target.value);
                                                updateConfig({ exchangeRates: newRates });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black"
                                        />
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0" onClick={() => {
                                    updateConfig({ exchangeRates: exchangeRates.filter(r => r.id !== rate.id) });
                                    toast.info("Currency Removed");
                                }}>
                                    <Trash2 className="h-5 h-5" />
                                </Button>
                            </div>
                        ))}
                        {exchangeRates.length === 0 && (
                            <div className="py-20 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-16 h-16 text-slate-100 mb-6" />
                                <h4 className="text-xl font-black text-slate-900 uppercase">No Rates Set</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase mt-2 px-20 text-center">No other currencies found. Using default settings.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
