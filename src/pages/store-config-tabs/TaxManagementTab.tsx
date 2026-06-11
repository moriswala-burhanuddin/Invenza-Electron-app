import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Calculator, ShieldCheck, Zap, Activity, Info, Percent, Layers, Landmark, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TaxManagementTab() {
    const {
        taxJarApiKey, locationBasedTax, useTaxValuesAcrossLocations,
        flatDiscountAlsoDiscountsTax, pricesIncludeTax, chargeTaxOnReceivings,
        taxRates, cumulativeTax, defaultTaxGroup,
        updateConfig, addTaxRate, removeTaxRate
    } = useStoreConfig();

    return (
        <div className="space-y-12">
            {/* Tax Rates */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tax Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for automatic tax calculations and location-based taxes.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TaxJar Synthesis Key (API)</Label>
                        <Input
                            type="password"
                            value={taxJarApiKey}
                            onChange={e => updateConfig({ taxJarApiKey: e.target.value })}
                            placeholder="TXJ_U_N_CORE_9921"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-foreground transition-colors">
                                    <Landmark className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">Location-Aware Sync</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Geo-spatial fiscal calc</p>
                                </div>
                            </div>
                            <Switch
                                checked={locationBasedTax}
                                onCheckedChange={v => updateConfig({ locationBasedTax: v })}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-foreground transition-colors">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">Universal Topology</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cross-node tax parity</p>
                                </div>
                            </div>
                            <Switch
                                checked={useTaxValuesAcrossLocations}
                                onCheckedChange={v => updateConfig({ useTaxValuesAcrossLocations: v })}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 2: Regulatory Protocols */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">General Tax Rules</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Basic rules for how discounts, prices, and purchases are taxed.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { id: 'flatDiscountTax', label: 'Discount Affects Tax', sub: 'Flat discount affects tax', state: flatDiscountAlsoDiscountsTax, action: (v: boolean) => updateConfig({ flatDiscountAlsoDiscountsTax: v }) },
                            { id: 'pricesIncludeTax', label: 'Prices Include Tax', sub: 'Unit prices include tax', state: pricesIncludeTax, action: (v: boolean) => updateConfig({ pricesIncludeTax: v }) },
                            { id: 'chargeTaxOnReceivings', label: 'Tax on Receivings', sub: 'Tax active on receivings', state: chargeTaxOnReceivings, action: (v: boolean) => updateConfig({ chargeTaxOnReceivings: v }) },
                            { id: 'cumulativeTax', label: 'Cumulative Tax', sub: 'Enable cumulative tax', state: cumulativeTax, action: (v: boolean) => updateConfig({ cumulativeTax: v }) },
                        ].map((item) => (
                            <div key={item.id} className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                <div>
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.sub}</p>
                                </div>
                                <Switch
                                    checked={item.state}
                                    onCheckedChange={item.action}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 max-w-sm">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Tax Group</Label>
                        <Input
                            value={defaultTaxGroup}
                            onChange={e => updateConfig({ defaultTaxGroup: e.target.value })}
                            placeholder="CORE_TAX_CLUSTER"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Sector 3: Rate Registry */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <Percent className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tax Rates</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Set the different tax percentages for your items.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Vectors</h4>
                        <Button
                            variant="ghost"
                            className="h-10 px-6 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest hover:scale-[1.02] shadow-xl shadow-black/20"
                            onClick={() => {
                                addTaxRate({ id: Date.now().toString(), name: 'NEW_VECTOR', percentage: 0 });
                                toast.success("New Tax Rate Added");
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Initialize Vector
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {taxRates.map((rate, index) => (
                            <div key={rate.id} className="flex items-center gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-slate-200 transition-all group">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-slate-900 border border-slate-100 shadow-sm shrink-0">
                                    {(index + 1).toString().padStart(2, '0')}
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Vector Identity</Label>
                                        <Input
                                            value={rate.name}
                                            onChange={e => {
                                                const newRates = [...taxRates];
                                                newRates[index].name = e.target.value;
                                                updateConfig({ taxRates: newRates });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Rate (%)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={rate.percentage}
                                                onChange={e => {
                                                    const newRates = [...taxRates];
                                                    newRates[index].percentage = parseFloat(e.target.value);
                                                    updateConfig({ taxRates: newRates });
                                                }}
                                                className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black w-full"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[10px]">%</div>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all shrink-0" onClick={() => removeTaxRate(rate.id)}>
                                    <Trash2 className="h-5 h-5" />
                                </Button>
                            </div>
                        ))}
                        {taxRates.length === 0 && (
                            <div className="py-20 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-16 h-16 text-slate-100 mb-6" />
                                <h4 className="text-xl font-black text-slate-900 uppercase">Vector Vacuum</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase mt-2">No fiscal magnitudes detected. Initialize vectors to enable computation.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
