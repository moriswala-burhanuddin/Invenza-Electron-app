import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Settings2, UserPlus, MapPin, Truck, Trash2, ShieldCheck, Zap, Globe, Gauge, Fuel, UserCheck, MoreHorizontal, ArrowLeft, Plus, CreditCard, Clock, Bell } from 'lucide-react';
import { useERPStore } from '@/lib/store-data';
import { useStoreConfig } from '@/lib/store-config';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

import { toast } from 'sonner';

export default function DeliverySettings() {
    const {
        users,
        activeStoreId,
        deliveryZones,
        addDeliveryZone,
        updateDeliveryZone,
        deleteDeliveryZone,
        toggleDriverStatus
    } = useERPStore();

    const [newZoneName, setNewZoneName] = useState('');
    const [newZoneFee, setNewZoneFee] = useState('');

    const drivers = users.map(u => ({
        id: u.id,
        name: u.name,
        isActive: !!u.isDriver
    }));

    const handleAddZone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newZoneName || !newZoneFee) {
            toast.error("Please provide both zone name and fee.");
            return;
        }

        await addDeliveryZone({
            name: newZoneName.toUpperCase(),
            fee: parseFloat(newZoneFee)
        });

        setNewZoneName('');
        setNewZoneFee('');
        toast.success("Delivery Zone Added");
    };

    const toggleZoneValue = async (id: string, currentStatus: boolean) => {
        await updateDeliveryZone(id, { isActive: !currentStatus });
        toast.success(`Zone ${!currentStatus ? 'Activated' : 'Suspended'}`);
    };

    const removeZone = async (id: string) => {
        if (confirm('Are you sure you want to delete this zone?')) {
            await deleteDeliveryZone(id);
            toast.error("Delivery Zone Deleted");
        }
    };

    const toggleDriver = async (id: string, currentStatus: boolean) => {
        await toggleDriverStatus(id, !currentStatus);
        toast.success(`Driver status updated`);
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Delivery Settings</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Manage zones, fees, and drivers</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Delivery Matrix */}
                    <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-lg shadow-indigo-100">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Delivery Zones</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Define delivery areas and fees</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-12">
                            <form onSubmit={handleAddZone} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                <div className="md:col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Zone Name</label>
                                    <input
                                        type="text"
                                        className="w-full h-14 bg-white border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200 shadow-sm"
                                        placeholder="e.g. Downtown"
                                        value={newZoneName}
                                        onChange={(e) => setNewZoneName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block">Delivery Fee</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-black font-mono">{useStoreConfig.getState().currencySymbol || '$'}</span>
                                        <input
                                            type="number"
                                            className="w-full h-14 bg-white border-none rounded-2xl pl-12 pr-6 text-sm font-black focus:ring-2 focus:ring-primary shadow-sm"
                                            placeholder="0.00"
                                            value={newZoneFee}
                                            onChange={(e) => setNewZoneFee(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Add Zone
                                </Button>
                            </form>
                        </div>

                        <div className="space-y-4">
                            {deliveryZones.map(zone => (
                                <div key={zone.id} className="flex items-center justify-between p-8 bg-white border border-slate-50 rounded-[2.5rem] group hover:bg-slate-50 transition-all duration-500 hover:shadow-xl">
                                    <div className="flex items-center gap-8">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-foreground transition-colors shadow-sm">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-black text-sm uppercase tracking-tight">{zone.name}</h4>
                                                <div className={cn(
                                                    "px-3 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-widest",
                                                    zone.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                )}>
                                                    {zone.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Fee: {formatCurrency(zone.fee)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            onClick={() => toggleZoneValue(zone.id, zone.isActive)}
                                            className={cn(
                                                "h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all",
                                                zone.isActive ? "text-slate-400 hover:bg-slate-100" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                            )}
                                        >
                                            {zone.isActive ? 'Suspend' : 'Activate'}
                                        </Button>
                                        <button onClick={() => removeZone(zone.id)} className="p-3 bg-white text-slate-100 hover:text-rose-500 rounded-xl transition-all border border-slate-50">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fleet Manifest */}
                    <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 shadow-lg shadow-amber-100">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Drivers</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Manage delivery personnel</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {drivers.map(driver => (
                                <div key={driver.id} className="p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm uppercase">
                                            {driver.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-xs uppercase tracking-tight mb-0.5">{driver.name}</p>
                                            <p className="font-black text-xs uppercase tracking-tight mb-0.5">{driver.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleDriver(driver.id, driver.isActive)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                                            driver.isActive
                                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                : 'bg-white text-slate-300 border-slate-50 hover:bg-slate-100'
                                        )}
                                    >
                                        {driver.isActive ? 'Active Driver' : 'Inactive'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Advanced Logistics Logic */}
                    <div className="bg-primary rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
                        <Gauge className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Global Settings</h4>

                            <div className="space-y-6">
                                <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <input type="checkbox" className="w-5 h-5 mt-0.5 rounded-lg bg-white/10 border-white/10 text-indigo-500 focus:ring-0" defaultChecked />
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1">C.O.D. Enabled</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">Allow cash on delivery payments.</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <input type="checkbox" className="w-5 h-5 mt-0.5 rounded-lg bg-white/10 border-white/10 text-indigo-500 focus:ring-0" defaultChecked />
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1">Require Signature</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">Require customer signature on delivery.</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white/10 rounded-2xl border border-white/10 transition-colors">
                                    <div className="w-5 h-5 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-emerald-400">Auto-Assignment</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">Automatically assign drivers to orders.</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">Delivery Config</p>
                        <div className="flex items-center justify-center p-6 bg-slate-50 rounded-2xl mb-8">
                            <Fuel className="w-10 h-10 text-rose-500" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Fuel Surcharges</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider mb-8">Configure additional delivery charges based on distance.</p>
                        <Button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl h-12 font-black uppercase text-[9px] tracking-widest">
                            <Gauge className="w-4 h-4 mr-2" />
                            Configure Surcharges
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
