import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Hash, ShieldCheck, Zap, Percent, Copy, CheckCircle2, Package, Wallet, Monitor, EyeOff, AlertTriangle, Ghost, MoreHorizontal, LayoutGrid, Target, Activity, Banknote, Landmark, CreditCard, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function SalesConfigTab() {
    const {
        saleIdPrefix, itemIdDisplay, validateCustomerLocation, requireSupplierForReceiving, requireCustomerForSale,
        disableLineDiscounts, disableFixedDiscounts, disablePercentageDiscounts, disableEntireSaleDiscount,
        disableSaleCloning, disableReceivingCloning, confirmBeforeCompletingSale, confirmBeforeCompletingReceiving,
        allowReorderOnSales, allowReorderOnReceiving, chooseQuantityAfterAddingSale, chooseQuantityAfterAddingReceiving,
        updateBaseCostFromVariations, updateBaseSellingFromUnit,
        trackCashInRegister, trackChecksInRegister, trackDebitCards, trackCreditCards, trackAirtelMoney,
        alertWhenCashAboveLimit, alertWhenCashBelowLimit, setMinimumCashInDrawer,
        alwaysShowItemGrid, hideImagesInGrid, hideOutOfStock, enableQuickSelect, defaultViewForGrid,
        hideCategories, hideTags, hideSuppliers, hideFavorites,
        doNotAllowSaleBelowCost, doNotAllowOutOfStockSales, doNotAllowDuplicateItemGrid,
        doNotAllowVariationWithoutSelection, disableSupplierSelectionOnSales,
        updateConfig
    } = useStoreConfig();

    return (
        <div className="space-y-16">
            {/* Sector 1: Transaction Identity & Validation */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <Hash className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sales ID & Items</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for how sales are numbered and how items are displayed.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Identifier Prefix</Label>
                            <Input
                                value={saleIdPrefix}
                                onChange={e => updateConfig({ saleIdPrefix: e.target.value })}
                                placeholder="SALE_PRE"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Universal Item ID Display</Label>
                            <Select
                                value={itemIdDisplay}
                                onValueChange={(val: 'UPC' | 'EAN' | 'ISBN') => updateConfig({ itemIdDisplay: val })}
                            >
                                <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                    <SelectItem value="UPC" className="text-[11px] font-black uppercase">UPC_PROTOCOL</SelectItem>
                                    <SelectItem value="EAN" className="text-[11px] font-black uppercase">EAN_ENCODING</SelectItem>
                                    <SelectItem value="ISBN" className="text-[11px] font-black uppercase">ISBN_CATALOG</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { id: 'vcl', label: 'Geo-Spatial Audit', sub: 'Validate cust. location', state: validateCustomerLocation, action: (v: boolean) => updateConfig({ validateCustomerLocation: v }) },
                            { id: 'rsr', label: 'Supplier Hook', sub: 'Require supplier for REC', state: requireSupplierForReceiving, action: (v: boolean) => updateConfig({ requireSupplierForReceiving: v }) },
                            { id: 'rcs', label: 'Customer Hook', sub: 'Require customer for SALE', state: requireCustomerForSale, action: (v: boolean) => updateConfig({ requireCustomerForSale: v }) },
                        ].map((item) => (
                            <div key={item.id} className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                                <div>
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.sub}</p>
                                </div>
                                <Switch
                                    checked={item.state}
                                    onCheckedChange={item.action}
                                    className="data-[state=checked]:bg-primary scale-90"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sector 2: Discount Matrix */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-rose-500 rounded-xl text-white">
                            <Percent className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Discount Rules</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Turn on or off different types of discounts for your sales.</p>
                </div>

                <div className="lg:col-span-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { id: 'dld', label: 'Line Vector', sub: 'Disable line disc.', state: disableLineDiscounts, action: (v: boolean) => updateConfig({ disableLineDiscounts: v }) },
                        { id: 'dfd', label: 'Fixed Vector', sub: 'Disable fixed disc.', state: disableFixedDiscounts, action: (v: boolean) => updateConfig({ disableFixedDiscounts: v }) },
                        { id: 'dpd', label: 'Perc. Vector', sub: 'Disable % disc.', state: disablePercentageDiscounts, action: (v: boolean) => updateConfig({ disablePercentageDiscounts: v }) },
                        { id: 'des', label: 'Global Vector', sub: 'Disable entire sale', state: disableEntireSaleDiscount, action: (v: boolean) => updateConfig({ disableEntireSaleDiscount: v }) },
                    ].map((item) => (
                        <div key={item.id} className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex flex-col justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all min-h-[120px]">
                            <Switch
                                checked={item.state}
                                onCheckedChange={item.action}
                                className="data-[state=checked]:bg-rose-500 self-end mb-4"
                            />
                            <div>
                                <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sector 3: Workflow Synthesis */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Work Process</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for copying sales, verifying orders, and reordering stock.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-12">
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { id: 'dsc', label: 'Sale Replication', sub: 'Disable sale cloning', icon: <Copy className="w-4 h-4" />, state: disableSaleCloning, action: (v: boolean) => updateConfig({ disableSaleCloning: v }) },
                            { id: 'drc', label: 'Receipt Replication', sub: 'Disable rec. cloning', icon: <Copy className="w-4 h-4" />, state: disableReceivingCloning, action: (v: boolean) => updateConfig({ disableReceivingCloning: v }) },
                            { id: 'csc', label: 'Sale Verification', sub: 'Confirm before SALE', icon: <CheckCircle2 className="w-4 h-4" />, state: confirmBeforeCompletingSale, action: (v: boolean) => updateConfig({ confirmBeforeCompletingSale: v }) },
                            { id: 'crc', label: 'REC Verification', sub: 'Confirm before REC', icon: <CheckCircle2 className="w-4 h-4" />, state: confirmBeforeCompletingReceiving, action: (v: boolean) => updateConfig({ confirmBeforeCompletingReceiving: v }) },
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

                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            { id: 'ars', label: 'Sale Reorder', sub: 'Allow reorder @ POS', state: allowReorderOnSales, action: (v: boolean) => updateConfig({ allowReorderOnSales: v }) },
                            { id: 'arr', label: 'REC Reorder', sub: 'Allow reorder @ REC', state: allowReorderOnReceiving, action: (v: boolean) => updateConfig({ allowReorderOnReceiving: v }) },
                            { id: 'cqs', label: 'Quant Prompt (S)', sub: 'Select quantity on add', state: chooseQuantityAfterAddingSale, action: (v: boolean) => updateConfig({ chooseQuantityAfterAddingSale: v }) },
                            { id: 'cqr', label: 'Quant Prompt (R)', sub: 'Select quantity on add', state: chooseQuantityAfterAddingReceiving, action: (v: boolean) => updateConfig({ chooseQuantityAfterAddingReceiving: v }) },
                            { id: 'ucv', label: 'Dynamic Costing', sub: 'Cost from variations', state: updateBaseCostFromVariations, action: (v: boolean) => updateConfig({ updateBaseCostFromVariations: v }) },
                            { id: 'usp', label: 'Dynamic Pricing', sub: 'Price from unit base', state: updateBaseSellingFromUnit, action: (v: boolean) => updateConfig({ updateBaseSellingFromUnit: v }) },
                        ].map((item) => (
                            <div key={item.id} className="bg-slate-100/50 p-5 rounded-[1.5rem] border border-slate-100 flex items-center justify-between hover:bg-white transition-all">
                                <div>
                                    <p className="text-[8px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{item.sub}</p>
                                </div>
                                <Switch
                                    checked={item.state}
                                    onCheckedChange={item.action}
                                    className="data-[state=checked]:bg-primary scale-75"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sector 4: Register Gauges */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Cash Drawer Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for tracking cash, cheques, and cards in your register.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Tracking Vectors</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { key: 'trackCashInRegister', label: 'CASH', icon: <Banknote className="w-3 h-3" />, checked: trackCashInRegister },
                                { key: 'trackChecksInRegister', label: 'CHECK', icon: <Landmark className="w-3 h-3" />, checked: trackChecksInRegister },
                                { key: 'trackDebitCards', label: 'DEBIT', icon: <CreditCard className="w-3 h-3" />, checked: trackDebitCards },
                                { key: 'trackCreditCards', label: 'CREDIT', icon: <CreditCard className="w-3 h-3" />, checked: trackCreditCards },
                                { key: 'trackAirtelMoney', label: 'MOBILE', icon: <Smartphone className="w-3 h-3" />, checked: trackAirtelMoney },
                            ].map((v) => (
                                <div key={v.key} className={cn("p-4 rounded-2xl flex flex-col items-center gap-3 transition-all",
                                    v.checked ? "bg-primary text-white shadow-lg" : "bg-white text-slate-400 opacity-50")}>
                                    {v.icon}
                                    <span className="text-[8px] font-black">{v.label}</span>
                                    <Switch
                                        checked={v.checked}
                                        onCheckedChange={val => updateConfig({ [v.key]: val })}
                                        className="data-[state=checked]:bg-emerald-400 scale-75"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Overflow Target (Alert Above)</Label>
                            <Input
                                type="number"
                                value={alertWhenCashAboveLimit}
                                onChange={e => updateConfig({ alertWhenCashAboveLimit: parseFloat(e.target.value) || 0 })}
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Underflow Target (Alert Below)</Label>
                            <Input
                                type="number"
                                value={alertWhenCashBelowLimit}
                                onChange={e => updateConfig({ alertWhenCashBelowLimit: parseFloat(e.target.value) || 0 })}
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Core Reserve (Min in Drawer)</Label>
                            <Input
                                type="number"
                                value={setMinimumCashInDrawer}
                                onChange={e => updateConfig({ setMinimumCashInDrawer: parseFloat(e.target.value) || 0 })}
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 5: POS Interface Topology */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sales Screen Look</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for how items are shown on the check-out screen.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { id: 'asg', label: 'Grid Persistence', sub: 'Always show item grid', state: alwaysShowItemGrid, action: (v: boolean) => updateConfig({ alwaysShowItemGrid: v }) },
                            { id: 'hig', label: 'Minimalist Vector', sub: 'Hide images in grid', state: hideImagesInGrid, action: (v: boolean) => updateConfig({ hideImagesInGrid: v }) },
                            { id: 'hos', label: 'Stock Filtering', sub: 'Hide out-of-stock items', state: hideOutOfStock, action: (v: boolean) => updateConfig({ hideOutOfStock: v }) },
                            { id: 'eqs', label: 'Velocity Selection', sub: 'Enable quick select', state: enableQuickSelect, action: (v: boolean) => updateConfig({ enableQuickSelect: v }) },
                        ].map((item) => (
                            <div key={item.id} className="bg-slate-50 p-6 rounded-[1.8rem] border border-slate-100 flex flex-col justify-between group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all min-h-[120px]">
                                <Switch
                                    checked={item.state}
                                    onCheckedChange={item.action}
                                    className="data-[state=checked]:bg-indigo-500 self-end mb-4"
                                />
                                <div>
                                    <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{item.label}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default View Topology</Label>
                        <Select value={defaultViewForGrid} onValueChange={(val: 'Categories' | 'All') => updateConfig({ defaultViewForGrid: val })}>
                            <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                <SelectItem value="Categories" className="text-[11px] font-black uppercase">CATEGORY_HIERARCHY</SelectItem>
                                <SelectItem value="All" className="text-[11px] font-black uppercase">GLOBAL_FLAT_GRID</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <EyeOff className="w-4 h-4 text-slate-300" /> Filter Suppression Protocols
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { key: 'hideCategories', label: 'Categories', checked: hideCategories },
                                { key: 'hideTags', label: 'Tags', checked: hideTags },
                                { key: 'hideSuppliers', label: 'Suppliers', checked: hideSuppliers },
                                { key: 'hideFavorites', label: 'Favorites', checked: hideFavorites },
                            ].map((v) => (
                                <div key={v.key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-500">{v.label}</span>
                                    <Switch
                                        checked={v.checked}
                                        onCheckedChange={val => updateConfig({ [v.key]: val })}
                                        className="data-[state=checked]:bg-indigo-400 scale-75"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 6: Integrity Shields */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Store Safety Rules</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Main rules to prevent common mistakes and protect your profit.</p>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        {[
                            { id: 'sbc', label: 'Block Sales Below Cost', sub: 'Block sales below cost price', state: doNotAllowSaleBelowCost, action: (v: boolean) => updateConfig({ doNotAllowSaleBelowCost: v }) },
                            { id: 'oos', label: 'Block Out-of-Stock Sales', sub: 'Block out-of-stock sales', state: doNotAllowOutOfStockSales, action: (v: boolean) => updateConfig({ doNotAllowOutOfStockSales: v }) },
                            { id: 'dig', label: 'Block Duplicate Items', sub: 'Block duplicate item in grid', state: doNotAllowDuplicateItemGrid, action: (v: boolean) => updateConfig({ doNotAllowDuplicateItemGrid: v }) },
                            { id: 'vws', label: 'Require Variation Selection', sub: 'Block variation without selection', state: doNotAllowVariationWithoutSelection, action: (v: boolean) => updateConfig({ doNotAllowVariationWithoutSelection: v }) },
                            { id: 'dss', label: 'Supplier Redirection', sub: 'Disable supplier link on sales', state: disableSupplierSelectionOnSales, action: (v: boolean) => updateConfig({ disableSupplierSelectionOnSales: v }) },
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
