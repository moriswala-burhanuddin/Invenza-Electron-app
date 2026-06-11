import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Wallet, Banknote, Landmark, Smartphone, Target, Percent, ShieldCheck, Zap, MoreHorizontal, Settings2, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PaymentsTab() {
    const {
        paymentMethods, paymentAdjustments,
        defaultPaymentType, defaultPaymentTypeReceivings, showSellingPriceOnReceivingReceipt,
        enableEBT, enableWIC, promptCCV,
        updateConfig, updatePaymentMethod, updatePaymentAdjustment
    } = useStoreConfig();

    const methods = [
        { key: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
        { key: 'check', label: 'Cheque', icon: <Landmark className="w-4 h-4" /> },
        { key: 'giftCard', label: 'Gift Card', icon: <Target className="w-4 h-4" /> },
        { key: 'debitCard', label: 'Debit Card', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'creditCard', label: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
        { key: 'airtelMoney', label: 'Mobile Money', icon: <Smartphone className="w-4 h-4" /> },
        { key: 'storeAccount', label: 'Store Account', icon: <Wallet className="w-4 h-4" /> },
        { key: 'pointsSystem', label: 'Loyalty Points', icon: <Zap className="w-4 h-4" /> },
    ] as const;

    return (
        <div className="space-y-12">
            {/* Sector 1: Settlement Matrix */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Payment Methods</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Turn on or off different ways to pay and set any extra fees.</p>
                </div>

                <div className="lg:col-span-8 grid md:grid-cols-2 gap-6">
                    {methods.map(({ key, label, icon }) => (
                        <div key={key} className={cn("p-6 rounded-[2rem] border transition-all group flex flex-col gap-6",
                            paymentMethods[key] ? "bg-white border-slate-200 shadow-xl shadow-slate-200/50" : "bg-slate-50 border-slate-100 opacity-60")}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                        paymentMethods[key] ? "bg-primary text-white" : "bg-white text-slate-200")}>
                                        {icon}
                                    </div>
                                    <Label className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{label}</Label>
                                </div>
                                <Switch
                                    checked={paymentMethods[key]}
                                    onCheckedChange={v => {
                                    updatePaymentMethod(key, v);
                                    toast.info(`Turning ${v ? 'On' : 'Off'} ${label}`);
                                }}
                                    className="data-[state=checked]:bg-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Percent className="w-3 h-3" /> Extra Fee (%)
                                </Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    disabled={!paymentMethods[key]}
                                    value={paymentAdjustments[key]}
                                    onChange={e => updatePaymentAdjustment(key, parseFloat(e.target.value) || 0)}
                                    className="h-12 bg-slate-50 border-none rounded-xl px-4 text-[10px] font-black group-hover:bg-white transition-colors"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sector 2: Terminal Protocols */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Settings2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">General Payment Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Set default payment methods, security checks, and other rules.</p>
                </div>

                <div className="lg:col-span-8 space-y-12">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Payment for Sales</Label>
                            <Select
                                value={defaultPaymentType}
                                onValueChange={val => updateConfig({ defaultPaymentType: val })}
                            >
                                <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {methods.map(m => (
                                        <SelectItem key={`def-${m.key}`} value={m.key} className="text-[11px] font-black uppercase">{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Payment for Purchases</Label>
                            <Select
                                value={defaultPaymentTypeReceivings}
                                onValueChange={val => updateConfig({ defaultPaymentTypeReceivings: val })}
                            >
                                <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    {methods.map(m => (
                                        <SelectItem key={`def-rec-${m.key}`} value={m.key} className="text-[11px] font-black uppercase">{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { id: 'showSellingPriceOnReceivingReceipt', label: 'Show Price on Purchase Receipt', sub: 'Show prices when receiving stock', state: showSellingPriceOnReceivingReceipt, action: (v: boolean) => updateConfig({ showSellingPriceOnReceivingReceipt: v }) },
                            { id: 'enableEBT', label: 'EBT Card Payments', sub: 'Enable food stamps (EBT)', state: enableEBT, action: (v: boolean) => updateConfig({ enableEBT: v }) },
                            { id: 'enableWIC', label: 'WIC Program Payments', sub: 'Enable WIC benefit cards', state: enableWIC, action: (v: boolean) => updateConfig({ enableWIC: v }) },
                            { id: 'promptCCV', label: 'Ask for Card Code (CCV)', sub: 'Ask for 3-digit security code', state: promptCCV, action: (v: boolean) => updateConfig({ promptCCV: v }) },
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
                </div>
            </div>
        </div>
    );
}
