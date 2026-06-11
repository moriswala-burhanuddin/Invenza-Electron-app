import { useState } from 'react';
import { useERPStore } from '@/lib/store-data';
import { Plus, ShieldCheck, Trash2, ArrowLeft, Percent, Calculator, Info, Ghost } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TaxSettings() {
    const { taxSlabs, addTaxSlab, checkPermission } = useERPStore();
    const [newSlab, setNewSlab] = useState({ name: '', percentage: '' });

    const canManageTax = checkPermission('canManageTaxes');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSlab.name || !newSlab.percentage) {
            toast.error('IDENTIFICATION ERROR: Slab parameters incomplete.');
            return;
        }
        await addTaxSlab({
            name: newSlab.name.toUpperCase(),
            percentage: parseFloat(newSlab.percentage)
        });
        toast.success('Tax rate saved.');
        setNewSlab({ name: '', percentage: '' });
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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Tax Settings</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Taxation Tiers • System Governance</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 h-full">
                {!canManageTax ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage tax settings and fiscal slabs.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Add Slab Sector */}
                    <div className="lg:col-span-4 lg:sticky lg:top-36 h-fit">
                        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-500 rounded-xl text-white">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Integrate Slab</h3>
                            </div>

                            <form onSubmit={handleAdd} className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slab Nomenclature</Label>
                                    <Input
                                        value={newSlab.name}
                                        onChange={e => setNewSlab({ ...newSlab, name: e.target.value })}
                                        placeholder="E.G. VAT_OUTPUT_15"
                                        className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Percentage Coefficient (%)</Label>
                                    <div className="relative">
                                        <Percent className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <Input
                                            type="number"
                                            value={newSlab.percentage}
                                            onChange={e => setNewSlab({ ...newSlab, percentage: e.target.value })}
                                            placeholder="18.00"
                                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 pr-14 text-sm font-black focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
                                    Authorize Slab
                                </Button>
                            </form>

                            <div className="mt-10 p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex items-start gap-4">
                                <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                                <p className="text-[9px] font-bold text-indigo-900 uppercase tracking-widest leading-relaxed">Authorized slabs are propagated to all product nodes and transaction engines globally.</p>
                            </div>
                        </div>
                    </div>

                    {/* Active Slabs Sector */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white min-h-[600px]">
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-lg shadow-emerald-100">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Matrix</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enforced taxation protocols</p>
                                    </div>
                                </div>
                                <Badge className="bg-slate-900 text-white rounded-full px-4 py-1 font-black text-[9px] uppercase tracking-widest">
                                    {taxSlabs.length} Nodes Detected
                                </Badge>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {taxSlabs.length > 0 ? (
                                    taxSlabs.map((slab) => (
                                        <div key={slab.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
                                            <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                                <Calculator className="w-32 h-32" />
                                            </div>

                                            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-black text-base text-slate-900 uppercase tracking-tight mb-1">{slab.name}</h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">FISCAL_SLAB_ID: {slab.id.substring(0, 8).toUpperCase()}</p>
                                                    </div>
                                                    <button onClick={() => {/* Delete Logic */ }} className="p-3 bg-white text-slate-200 hover:text-rose-600 rounded-xl transition-all border border-slate-50 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="flex items-end justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-3xl font-black text-slate-900 leading-none">{slab.percentage}%</span>
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2">Applied to product nodes</span>
                                                    </div>
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-100">
                                                        <Percent className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 py-40 text-center opacity-30 flex flex-col items-center">
                                        <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                                        <h4 className="text-2xl font-black text-slate-900 uppercase">Policy Vacuum</h4>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20">No active tax slabs detected. System currently operating in duty-free protocol.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>
                )}
            </main>
        </div>
    );
}
