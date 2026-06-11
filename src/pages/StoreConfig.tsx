import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Calculator, Coins, CreditCard, Truck, RefreshCcw, ShoppingBag, PauseCircle, Link2, Settings2, Save, Loader2, Server, ShieldCheck, Zap, Activity, ArrowLeft, Globe, HardDrive, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { dbAdapter } from '@/lib/db-adapter';
import { useERPStore } from '@/lib/store-data';
import { useStoreConfig } from '@/lib/store-config';
import { cn } from '@/lib/utils';

import { CompanyInfoTab } from './store-config-tabs/CompanyInfoTab';
import { TaxManagementTab } from './store-config-tabs/TaxManagementTab';
import { CurrencyTab } from './store-config-tabs/CurrencyTab';
import { PaymentsTab } from './store-config-tabs/PaymentsTab';
import { OrdersDeliveryTab } from './store-config-tabs/OrdersDeliveryTab';
import { ReturnsTab } from './store-config-tabs/ReturnsTab';
import { SalesConfigTab } from './store-config-tabs/SalesConfigTab';
import { SuspendedSalesTab } from './store-config-tabs/SuspendedSalesTab';
import { IntegrationsTab } from './store-config-tabs/IntegrationsTab';
import { AdvancedModulesTab } from './store-config-tabs/AdvancedModulesTab';

const StoreConfig = () => {
    const { getActiveStore } = useERPStore();
    const configData = useStoreConfig();
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        toast.info("Transmitting infrastructure parameters...");
        try {
            const activeStore = getActiveStore();
            if (!activeStore?.id) {
                toast.error('Store Node Identification Failure');
                return;
            }

            // Sanitize data: remove all functions (actions) from zustand store
            // Electron IPC cannot clone objects with functions
            const sanitizedData = Object.fromEntries(
                Object.entries(configData).filter(([_, value]) => typeof value !== 'function')
            );

            const result = await dbAdapter.saveStoreConfig(activeStore.id, sanitizedData as Record<string, unknown>);

            if (result?.success) {
                toast.success('Infrastructure Synchronized: Parameters persisted.');
            } else {
                toast.error('Failed to save settings');
            }
        } catch (error) {
            console.error('Save config error:', error);
            toast.error('An error occurred during synchronization.');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'company', label: 'Store Identity', icon: <Building2 className="w-4 h-4" /> },
        { id: 'currency', label: 'Currency Settings', icon: <Coins className="w-4 h-4" /> },
        { id: 'integrations', label: 'Online Store', icon: <Globe className="w-4 h-4" /> },
        { id: 'advanced', label: 'Advanced', icon: <Settings2 className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-black/10">
                            <Server className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Infrastructure Control</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">System-wide architecture configuration • Store Node 01</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3 mr-6 px-6 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Environment Secure</span>
                        </div>
                        <Button onClick={handleSave} disabled={isSaving} className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                            {isSaving ? 'Synchronizing...' : 'Authorize Changes'}
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <Tabs defaultValue="company" className="space-y-12">
                    <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-white flex justify-center">
                        <TabsList className="bg-transparent h-auto flex flex-wrap justify-center gap-1 p-1">
                            {tabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-2xl h-12 px-6 font-black uppercase text-[9px] tracking-widest transition-all gap-2 flex items-center hover:bg-slate-50 data-[state=active]:hover:bg-primary"
                                >
                                    {tab.icon}
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-white min-h-[600px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                            <HardDrive className="w-64 h-64 text-slate-900 rotate-12" />
                        </div>

                        <div className="relative z-10">
                            <TabsContent value="company" className="mt-0 focus-visible:ring-0"><CompanyInfoTab /></TabsContent>
                            <TabsContent value="tax" className="mt-0 focus-visible:ring-0"><TaxManagementTab /></TabsContent>
                            <TabsContent value="currency" className="mt-0 focus-visible:ring-0"><CurrencyTab /></TabsContent>
                            <TabsContent value="payments" className="mt-0 focus-visible:ring-0"><PaymentsTab /></TabsContent>
                            <TabsContent value="delivery" className="mt-0 focus-visible:ring-0"><OrdersDeliveryTab /></TabsContent>
                            <TabsContent value="returns" className="mt-0 focus-visible:ring-0"><ReturnsTab /></TabsContent>
                            <TabsContent value="sales" className="mt-0 focus-visible:ring-0"><SalesConfigTab /></TabsContent>
                            <TabsContent value="suspended" className="mt-0 focus-visible:ring-0"><SuspendedSalesTab /></TabsContent>
                            <TabsContent value="integrations" className="mt-0 focus-visible:ring-0"><IntegrationsTab /></TabsContent>
                            <TabsContent value="advanced" className="mt-0 focus-visible:ring-0"><AdvancedModulesTab /></TabsContent>
                        </div>
                    </div>
                </Tabs>

                {/* Infrastructure Footer Status */}
                <div className="mt-12 grid md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white flex items-center gap-6">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Processing Vector</p>
                            <h4 className="text-sm font-black text-slate-900 uppercase">Edge Optimization Active</h4>
                        </div>
                    </div>
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-white flex items-center gap-6">
                        <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-500">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Sync</p>
                            <h4 className="text-sm font-black text-slate-900 uppercase">Cortex Link Established</h4>
                        </div>
                    </div>
                    <div className="bg-primary rounded-[2.5rem] p-8 shadow-xl shadow-black/10 flex items-center gap-6 group">
                        <div className="p-4 bg-white/10 rounded-2xl text-white group-hover:bg-white/20 transition-colors">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">System Pulse</p>
                            <h4 className="text-sm font-black text-white uppercase">Operational Integrity 100%</h4>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StoreConfig;
