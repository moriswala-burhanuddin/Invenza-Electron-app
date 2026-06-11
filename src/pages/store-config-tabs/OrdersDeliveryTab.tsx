import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Truck, MapPin, Navigation, UserCheck, ShieldCheck, Zap, MoreHorizontal, LayoutGrid, Package, Map, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function OrdersDeliveryTab() {
    const {
        doNotTaxServiceDeliveries, deliveryColorByStatus,
        shippingProviders, shippingZones, defaultDeliveryAssignment, defaultEmployeeDeliveries,
        updateConfig, addShippingProvider, removeShippingProvider, addShippingZone, removeShippingZone
    } = useStoreConfig();

    return (
        <div className="space-y-12">
            {/* Sector 1: Logistics Architecture */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Navigation className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Delivery Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">General settings for how deliveries and orders are handled.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { id: 'doNotTaxServiceDeliveries', label: 'Service Tax Immunity', sub: 'Exclude tax on delivery services', state: doNotTaxServiceDeliveries, action: (v: boolean) => updateConfig({ doNotTaxServiceDeliveries: v }) },
                            { id: 'deliveryColorByStatus', label: 'Chromatic Status Sync', sub: 'Dynamic color coding active', state: deliveryColorByStatus, action: (v: boolean) => updateConfig({ deliveryColorByStatus: v }) },
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

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Truck className="w-3.5 h-3.5" /> Default Delivery Company
                            </Label>
                            <Input
                                value={defaultDeliveryAssignment}
                                onChange={e => updateConfig({ defaultDeliveryAssignment: e.target.value })}
                                placeholder="INTERNAL_COURIER"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UserCheck className="w-3.5 h-3.5" /> Default Delivery Person
                            </Label>
                            <Input
                                value={defaultEmployeeDeliveries}
                                onChange={e => updateConfig({ defaultEmployeeDeliveries: e.target.value })}
                                placeholder="EMPLOYEE_NAME"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 2: Carrier Nexus */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <Package className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Delivery Companies</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">List of companies that handle your deliveries and their fees.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registered Companies</h4>
                        <Button
                            variant="ghost"
                            className="h-10 px-6 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest hover:scale-[1.02] shadow-xl shadow-black/20"
                            onClick={() => {
                                addShippingProvider({ id: Date.now().toString(), name: 'NEW_CARRIER', fee: 0, timeDays: 1, isDefault: false });
                                toast.success("New company added successfully");
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Company
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {shippingProviders.map((provider, index) => (
                            <div key={provider.id} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-wrap lg:flex-nowrap items-center gap-8 group hover:bg-white hover:border-slate-200 transition-all">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 border border-slate-100 shadow-sm shrink-0">
                                    {(index + 1).toString().padStart(2, '0')}
                                </div>

                                <div className="flex-1 grid md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</Label>
                                        <Input
                                            value={provider.name}
                                            onChange={e => {
                                                const newProviders = [...shippingProviders];
                                                newProviders[index].name = e.target.value;
                                                updateConfig({ shippingProviders: newProviders });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Fee (UGX)</Label>
                                        <Input
                                            type="number"
                                            value={provider.fee}
                                            onChange={e => {
                                                const newProviders = [...shippingProviders];
                                                newProviders[index].fee = parseFloat(e.target.value) || 0;
                                                updateConfig({ shippingProviders: newProviders });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Time (Days)</Label>
                                        <Input
                                            type="number"
                                            value={provider.timeDays}
                                            onChange={e => {
                                                const newProviders = [...shippingProviders];
                                                newProviders[index].timeDays = parseInt(e.target.value) || 0;
                                                updateConfig({ shippingProviders: newProviders });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end gap-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Default Choice</Label>
                                        <Switch
                                            checked={provider.isDefault}
                                            onCheckedChange={v => {
                                                const newProviders = shippingProviders.map(p => ({ ...p, isDefault: p.id === provider.id ? v : false }));
                                                updateConfig({ shippingProviders: newProviders });
                                            }}
                                            className="data-[state=checked]:bg-primary scale-90"
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all" onClick={() => removeShippingProvider(provider.id)}>
                                        <Trash2 className="h-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sector 3: Spatial Zoning */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <Map className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Delivery Zones</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Create zones based on areas or pin codes to set different delivery fees.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zones</h4>
                        <Button
                            variant="ghost"
                            className="h-10 px-6 rounded-xl bg-primary text-white font-black uppercase text-[9px] tracking-widest hover:scale-[1.02] shadow-xl shadow-black/20"
                            onClick={() => {
                                addShippingZone({ id: Date.now().toString(), name: 'NEW_ZONE_ALPHA', zipRegex: '', fee: 0, taxGroupId: '' });
                                toast.success("New zone added successfully");
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Zone
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {shippingZones.map((zone, index) => (
                            <div key={zone.id} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-wrap lg:flex-nowrap items-center gap-8 group hover:bg-white hover:border-slate-200 transition-all">
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-slate-900 border border-slate-100 shadow-sm shrink-0">
                                    <MapPin className="w-6 h-6 text-slate-200 group-hover:text-foreground transition-colors" />
                                </div>

                                <div className="flex-1 grid md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Zone Name</Label>
                                        <Input
                                            value={zone.name}
                                            onChange={e => {
                                                const newZones = [...shippingZones];
                                                newZones[index].name = e.target.value;
                                                updateConfig({ shippingZones: newZones });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black uppercase"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Pin Code Pattern</Label>
                                        <Input
                                            value={zone.zipRegex || ''}
                                            onChange={e => {
                                                const newZones = [...shippingZones];
                                                newZones[index].zipRegex = e.target.value;
                                                updateConfig({ shippingZones: newZones });
                                            }}
                                            placeholder="^[0-9]{5}$"
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Fee (UGX)</Label>
                                        <Input
                                            type="number"
                                            value={zone.fee}
                                            onChange={e => {
                                                const newZones = [...shippingZones];
                                                newZones[index].fee = parseFloat(e.target.value) || 0;
                                                updateConfig({ shippingZones: newZones });
                                            }}
                                            className="h-12 bg-white border-slate-100 rounded-xl px-4 text-[10px] font-black"
                                        />
                                    </div>
                                </div>

                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all" onClick={() => removeShippingZone(zone.id)}>
                                    <Trash2 className="h-5 h-5" />
                                </Button>
                            </div>
                        ))}
                        {shippingZones.length === 0 && (
                            <div className="py-20 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-16 h-16 text-slate-100 mb-6" />
                                <h4 className="text-xl font-black text-slate-900 uppercase">No Zones Set</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase mt-2 px-20 text-center">No delivery zones found. Using same settings for everywhere.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
