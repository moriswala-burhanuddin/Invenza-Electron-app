import { useStoreConfig } from '@/lib/store-config';
import { useERPStore } from '@/lib/store-data';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Cpu, ShieldCheck, Users, Wallet, Key, Target, Layers, Box, Truck, Receipt, BarChart3, Lock, Zap, MoreHorizontal, LayoutGrid, Ghost, FileText, ClipboardList, CreditCard, BookOpen, Calculator, Trash2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function AdvancedModulesTab() {
    const {
        disabledModules,
        employeeManagementSettings, storeAccountConfiguration, idNumberConfiguration,
        customerLoyaltyConfig, priceTierConfig, customFieldsConfig, itemKitBundlesConfig,
        purchaseOrdersConfig, expenseCategoriesConfig, salesCommissionsConfig,
        analyticsConfig, securityAuditConfig,
        updateConfig
    } = useStoreConfig();
    const { clearLocalData: resetData } = useERPStore();
    const [isResetLoading, setIsResetLoading] = useState(false);

    const toggleModule = (moduleName: string, enabled: boolean) => {
        if (enabled) {
            updateConfig({ disabledModules: disabledModules.filter(m => m !== moduleName) });
            toast.success(`${moduleName.toUpperCase()} Turned On`);
        } else {
            updateConfig({ disabledModules: [...disabledModules, moduleName] });
            toast.info(`${moduleName.toUpperCase()} Turned Off`);
        }
    };

    const isEnabled = (moduleName: string) => !disabledModules.includes(moduleName);

    const advancedModules = [
        { key: 'employeeManagement', label: 'Employees', icon: <Users className="w-4 h-4" />, value: employeeManagementSettings, setter: 'employeeManagementSettings' },
        { key: 'storeAccount', label: 'Store Account', icon: <Wallet className="w-4 h-4" />, value: storeAccountConfiguration, setter: 'storeAccountConfiguration' },
        { key: 'idNumber', label: 'ID Numbers', icon: <Key className="w-4 h-4" />, value: idNumberConfiguration, setter: 'idNumberConfiguration' },
        { key: 'customerLoyalty', label: 'Loyalty Points', icon: <Target className="w-4 h-4" />, value: customerLoyaltyConfig, setter: 'customerLoyaltyConfig' },
        { key: 'priceTier', label: 'Price Tiers', icon: <Layers className="w-4 h-4" />, value: priceTierConfig, setter: 'priceTierConfig' },
        { key: 'customFields', label: 'Custom Fields', icon: <Box className="w-4 h-4" />, value: customFieldsConfig, setter: 'customFieldsConfig' },
        { key: 'itemKitBundles', label: 'Item Kits', icon: <Box className="w-4 h-4" />, value: itemKitBundlesConfig, setter: 'itemKitBundlesConfig' },
        { key: 'purchaseOrders', label: 'Purchase Orders', icon: <Truck className="w-4 h-4" />, value: purchaseOrdersConfig, setter: 'purchaseOrdersConfig' },
        { key: 'expenseCategories', label: 'Expense Categories', icon: <Receipt className="w-4 h-4" />, value: expenseCategoriesConfig, setter: 'expenseCategoriesConfig' },
        { key: 'salesCommissions', label: 'Sales Commissions', icon: <Zap className="w-4 h-4" />, value: salesCommissionsConfig, setter: 'salesCommissionsConfig' },
        { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, value: analyticsConfig, setter: 'analyticsConfig' },
        { key: 'quotations', label: 'Quotations', icon: <FileText className="w-4 h-4" />, value: '', setter: '' },
        { key: 'workOrders', label: 'Work Orders', icon: <ClipboardList className="w-4 h-4" />, value: '', setter: '' },
        { key: 'giftCards', label: 'Gift Cards', icon: <CreditCard className="w-4 h-4" />, value: '', setter: '' },
        { key: 'dayBook', label: 'Day Book', icon: <BookOpen className="w-4 h-4" />, value: '', setter: '' },
        { key: 'partyLedger', label: 'Party Ledger', icon: <BookOpen className="w-4 h-4" />, value: '', setter: '' },
        { key: 'stockJournal', label: 'Stock Journal', icon: <ClipboardList className="w-4 h-4" />, value: '', setter: '' },
        { key: 'priceCheck', label: 'Price Check', icon: <Calculator className="w-4 h-4" />, value: '', setter: '' },
        { key: 'securityAudit', label: 'Security Log', icon: <Lock className="w-4 h-4" />, value: securityAuditConfig, setter: 'securityAuditConfig' },
    ];

    return (
        <div className="space-y-12">
            {/* Sector 1: Modular Topology */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <Cpu className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Extra Features</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Turn on or off additional features for your store.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-4">
                    {advancedModules.map((mod) => (
                        <div key={mod.key} className={cn("p-6 rounded-[2rem] border transition-all group flex flex-wrap lg:flex-nowrap items-center gap-8",
                            isEnabled(mod.key) ? "bg-white border-slate-200 shadow-xl shadow-slate-200/50" : "bg-slate-50 border-slate-100 opacity-60")}>

                            <div className="flex items-center gap-4 w-full lg:w-1/3 shrink-0">
                                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                    isEnabled(mod.key) ? "bg-primary text-white" : "bg-white text-slate-200")}>
                                    {mod.icon}
                                </div>
                                <div className="flex flex-col">
                                    <Label className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{mod.label}</Label>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{mod.key.replace(/([A-Z])/g, '_$1')}</span>
                                </div>
                                <Switch
                                    checked={isEnabled(mod.key)}
                                    onCheckedChange={(val) => toggleModule(mod.key, val)}
                                    className="data-[state=checked]:bg-primary ml-auto lg:hidden"
                                />
                            </div>

                            <div className="flex-1 min-w-[200px]">
                                {mod.setter && (
                                    <>
                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Settings</Label>
                                        <Input
                                            placeholder={`Enter ${mod.label} settings...`}
                                            disabled={!isEnabled(mod.key)}
                                            value={mod.value}
                                            onChange={(e) => updateConfig({ [mod.setter!]: e.target.value })}
                                            className="h-12 bg-slate-50 border-none rounded-xl px-4 text-[10px] font-mono group-hover:bg-white transition-colors"
                                        />
                                    </>
                                )}
                            </div>

                            <Switch
                                checked={isEnabled(mod.key)}
                                onCheckedChange={(val) => toggleModule(mod.key, val)}
                                className="data-[state=checked]:bg-primary hidden lg:flex"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-10 bg-rose-50 border border-rose-100 rounded-[3rem] text-center">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-4" />
                <h4 className="text-[10px] font-black text-rose-900 uppercase tracking-widest mb-2 italic">Danger Zone</h4>
                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-relaxed max-w-sm mx-auto mb-8">
                    Strict reset will delete all local data except 3 products and 3 sales. This action is irreversible.
                </p>
                <div className="flex justify-center">
                    <button
                        onClick={async () => {
                            if (window.confirm("ARE YOU ABSOLUTELY SURE? All transactional data will be purged. This cannot be undone.")) {
                                setIsResetLoading(true);
                                try {
                                    await resetData();
                                    toast.success("ERP Reset Complete: Data purged.");
                                } catch (error) {
                                    toast.error("ERP Reset Failed");
                                } finally {
                                    setIsResetLoading(false);
                                }
                            }
                        }}
                        disabled={isResetLoading}
                        className="h-14 px-10 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isResetLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isResetLoading ? "Resetting Core..." : "Purge All Data"}
                    </button>
                </div>
            </div>

            <div className="p-10 bg-slate-50 border border-slate-100 rounded-[3rem] text-center">
                <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Protection ON</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-md mx-auto">All feature changes are updated across the entire system. Turning off a feature will disable it everywhere.</p>
            </div>
        </div>
    );
}
