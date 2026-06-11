import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, PauseCircle, ShieldCheck, UserCheck, Calendar, Receipt, Hash, Tag, MessageSquare, Ghost, MoreHorizontal, LayoutGrid, Zap, Activity } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function SuspendedSalesTab() {
    const {
        suspendedSaleTypes, ecommerceSuspendedType,
        removeQuantityWhenSuspending, requireCustomerSuspendedSale, lockSuspendedSale,
        doNotRecalculateCostOnUnsuspend, changeDateWhenSuspending, changeDateWhenCompletingSuspended,
        showReceiptAfterSuspending, overrideLayawayName, overrideEstimateName, layawayStatementMessage,
        updateConfig
    } = useStoreConfig();

    const [newType, setNewType] = useState('');

    return (
        <div className="space-y-12">
            {/* Sector 1: Persistence Protocols */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <PauseCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Held Sales Types</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Create types for sales that are not finished yet, like Quotes or Layaways.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="flex gap-4 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 items-center justify-between">
                        <div className="relative flex-1 group">
                            <Plus className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                            <Input
                                placeholder="INITIALIZE PERSISTENCE TYPE (E.G. QUOTATION)"
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                                className="h-14 bg-white border-none rounded-2xl pl-14 pr-8 text-[11px] font-black uppercase"
                            />
                        </div>
                        <Button
                            className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20"
                            onClick={() => {
                                if (newType && !suspendedSaleTypes.includes(newType)) {
                                    updateConfig({ suspendedSaleTypes: [...suspendedSaleTypes, newType] });
                                    setNewType('');
                                    toast.success("Persistence Node Authorized");
                                }
                            }}
                        >
                            Authorize
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {suspendedSaleTypes.map(type => (
                            <div key={type} className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-primary transition-all">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest shrink-0">{type}</span>
                                <button
                                    onClick={() => {
                                        updateConfig({ suspendedSaleTypes: suspendedSaleTypes.filter(t => t !== type) });
                                        toast.info("Persistence Node Dissolved");
                                    }}
                                    className="p-2 bg-slate-50 rounded-lg text-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        {suspendedSaleTypes.length === 0 && (
                            <div className="py-20 text-center opacity-30 flex flex-col items-center w-full">
                                <Ghost className="w-16 h-16 text-slate-100 mb-6" />
                                <h4 className="text-xl font-black text-slate-900 uppercase">State Vacuum</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase mt-2 px-20 text-center">No persistence types authorized. Real-time finalization protocol only.</p>
                            </div>
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-Commerce Sync Node</Label>
                            <Input
                                value={ecommerceSuspendedType}
                                onChange={e => updateConfig({ ecommerceSuspendedType: e.target.value })}
                                placeholder="WEB_ORDER_PROTOCOL"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex items-center justify-between group hover:bg-white transition-all">
                            <div>
                                <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">Inventory Lock-in</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Remove qty when suspending</p>
                            </div>
                            <Switch
                                checked={removeQuantityWhenSuspending}
                                onCheckedChange={v => updateConfig({ removeQuantityWhenSuspending: v })}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 2: Stability Controls */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Holding Sales Rules</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Rules to prevent mistakes and keep data accurate when holding sales.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { id: 'rcs', label: 'Require Customer', sub: 'Require customer node', icon: <UserCheck className="w-4 h-4" />, state: requireCustomerSuspendedSale, action: (v: boolean) => updateConfig({ requireCustomerSuspendedSale: v }) },
                            { id: 'lss', label: 'Lock Paused Sale', sub: 'Prevent duplicate terminal access', icon: <ShieldCheck className="w-4 h-4" />, state: lockSuspendedSale, action: (v: boolean) => updateConfig({ lockSuspendedSale: v }) },
                            { id: 'dnc', label: 'Keep Cost on Resume', sub: 'Do not recal. cost on unsuspend', icon: <Zap className="w-4 h-4" />, state: doNotRecalculateCostOnUnsuspend, action: (v: boolean) => updateConfig({ doNotRecalculateCostOnUnsuspend: v }) },
                            { id: 'cdw', label: 'Change Date on Pause', sub: 'Change date when suspending', icon: <Calendar className="w-4 h-4" />, state: changeDateWhenSuspending, action: (v: boolean) => updateConfig({ changeDateWhenSuspending: v }) },
                            { id: 'cdc', label: 'Change Date on Complete', sub: 'Change date when completing', icon: <Calendar className="w-4 h-4" />, state: changeDateWhenCompletingSuspended, action: (v: boolean) => updateConfig({ changeDateWhenCompletingSuspended: v }) },
                            { id: 'sra', label: 'Receipt Auto-Sync', sub: 'Show receipt after suspending', icon: <Receipt className="w-4 h-4" />, state: showReceiptAfterSuspending, action: (v: boolean) => updateConfig({ showReceiptAfterSuspending: v }) },
                        ].map((item) => (
                            <div key={item.id} className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                        item.state ? "bg-primary text-white" : "bg-white text-slate-300 group-hover:text-foreground")}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.sub}</p>
                                    </div>
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

            {/* Sector 3: Label Semantics */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <Tag className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Custom Names</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Change the name of special sale types (like Layaway) to whatever you prefer.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Layaway Alias</Label>
                            <Input
                                value={overrideLayawayName}
                                onChange={e => updateConfig({ overrideLayawayName: e.target.value })}
                                placeholder="INTERNAL_LAYAWAY_LABEL"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimate Alias</Label>
                            <Input
                                value={overrideEstimateName}
                                onChange={e => updateConfig({ overrideEstimateName: e.target.value })}
                                placeholder="PROFORMA_INVOICE_LABEL"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5" /> Layaway Statement Logic
                        </Label>
                        <Textarea
                            value={layawayStatementMessage}
                            onChange={e => updateConfig({ layawayStatementMessage: e.target.value })}
                            placeholder="INITIALIZE STATEMENT MESSAGE PROTOCOL..."
                            className="min-h-[120px] bg-slate-50 border-none rounded-[2rem] p-8 text-[11px] font-black uppercase leading-relaxed focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
