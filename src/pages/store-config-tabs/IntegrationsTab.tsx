import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Mail, Globe, Cloud, Database, Code, Zap, ShieldCheck, MoreHorizontal, LayoutGrid, Smartphone, Target, Activity, Share2, Store, Link2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { eleganceApi } from '@/lib/elegance-api';

export function IntegrationsTab() {
    const {
        emailSettingsHtml, ssoInfo, quickbooksIntegration, ecommerceIntegration,
        ecommerceEnabled, ecommerceApiUrl, ecommerceAuthToken,
        apiSettings, webhooks, lookupApi,
        updateConfig
    } = useStoreConfig();

    const [isTesting, setIsTesting] = useState(false);

    const handleTestConnection = async () => {
        if (!ecommerceApiUrl) {
            toast.error("Please enter a Store Website Link first.");
            return;
        }

        setIsTesting(true);
        try {
            await toast.promise(eleganceApi.getStoreSummary(), {
                loading: 'Connecting to your store...',
                success: 'Connected successfully!',
                error: (err) => err.message || 'Could not connect to store.'
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-12">
            {/* Sector 1: Online Store Settings (NEW) */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                            <Store className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Website Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Connect your online store to manage stock and orders directly from here.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Show Website Section</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Enable this to see the store menu in the sidebar</p>
                        </div>
                        <Switch
                            checked={ecommerceEnabled}
                            onCheckedChange={(val) => updateConfig({ ecommerceEnabled: val })}
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Link2 className="w-3.5 h-3.5" /> Website Address
                            </Label>
                            <Input
                                value={ecommerceApiUrl}
                                onChange={e => updateConfig({ ecommerceApiUrl: e.target.value })}
                                placeholder="https://elegancebackend.pythonanywhere.com"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black"
                            />
                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 ml-1">Do not include "/admin/" at the end of the link.</p>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" /> Login Key
                            </Label>
                            <Input
                                type="password"
                                value={ecommerceAuthToken}
                                onChange={e => updateConfig({ ecommerceAuthToken: e.target.value })}
                                placeholder="ENTER KEY..."
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black"
                            />
                        </div>
                    </div>

                    {/* NEW: Get Key Automatically Helper */}
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">No Login Key?</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enter your website email and password to get it automatically.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <Input
                                id="site-email"
                                placeholder="WEBSITE EMAIL"
                                className="h-12 bg-white border-slate-200 rounded-xl px-6 text-[10px] font-black"
                            />
                            <Input
                                id="site-pass"
                                type="password"
                                placeholder="WEBSITE PASSWORD"
                                className="h-12 bg-white border-slate-200 rounded-xl px-6 text-[10px] font-black"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const email = (document.getElementById('site-email') as HTMLInputElement).value;
                                const pass = (document.getElementById('site-pass') as HTMLInputElement).value;
                                if (!email || !pass) return toast.error("Please enter email and password.");
                                if (!ecommerceApiUrl) return toast.error("Enter your Website Link first.");

                                toast.promise(eleganceApi.login(email, pass), {
                                    loading: 'Getting your key...',
                                    success: (token) => {
                                        updateConfig({ ecommerceAuthToken: token });
                                        return 'Key saved successfully!';
                                    },
                                    error: (err) => err.message || 'Login failed.'
                                });
                            }}
                            className="h-12 px-8 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest"
                        >
                            Login & Get Key
                        </Button>
                    </div>

                    <Button
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest gap-3"
                    >
                        {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        Check Connection
                    </Button>
                </div>
            </div>

            {/* Sector 2: SMTP Communications */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Mail className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Email Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for sending emails and email templates.</p>
                </div>

                <div className="lg:col-span-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <LayoutGrid className="w-3.5 h-3.5" /> Email HTML Template
                        </Label>
                        <Textarea
                            value={emailSettingsHtml}
                            onChange={e => updateConfig({ emailSettingsHtml: e.target.value })}
                            placeholder="PASTE YOUR EMAIL HTML TEMPLATE HERE..."
                            className="min-h-[160px] bg-slate-50 border-none rounded-[2rem] p-8 text-[11px] font-black uppercase leading-relaxed focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Sector 2: Enterprise Bridges */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <Cloud className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Extra Connections</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Connect to other services like QuickBooks or Shopify.</p>
                </div>

                <div className="lg:col-span-8 grid md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5" /> Login Provider (SSO)
                        </Label>
                        <Input
                            value={ssoInfo}
                            onChange={e => updateConfig({ ssoInfo: e.target.value })}
                            placeholder="CLIENT_ID"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Database className="w-3.5 h-3.5" /> QuickBooks Integration
                        </Label>
                        <Input
                            value={quickbooksIntegration}
                            onChange={e => updateConfig({ quickbooksIntegration: e.target.value })}
                            placeholder="QUICKBOOKS_TOKEN"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" /> Other Store (Shopify/Woo)
                        </Label>
                        <Input
                            value={ecommerceIntegration}
                            onChange={e => updateConfig({ ecommerceIntegration: e.target.value })}
                            placeholder="API_KEY_HERE"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Sector 3: Developer Infrastructure */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white">
                            <Code className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Developer Area</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Technical settings for developers and external apps.</p>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5" /> Internal API Keys
                            </Label>
                            <Input
                                value={apiSettings}
                                onChange={e => updateConfig({ apiSettings: e.target.value })}
                                placeholder="CORE_API_ACCESS_VECTOR"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Share2 className="w-3.5 h-3.5" /> Catalog Lookup Node
                            </Label>
                            <Input
                                value={lookupApi}
                                onChange={e => updateConfig({ lookupApi: e.target.value })}
                                placeholder="https://api.external-catalog.org/..."
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" /> Webhooks (Notification Links)
                        </Label>
                        <Textarea
                            value={webhooks}
                            onChange={e => updateConfig({ webhooks: e.target.value })}
                            placeholder='[{"event": "SALE_COMPLETED", "url": "https://..."}]'
                            className="min-h-[140px] bg-slate-900 text-emerald-400 border-none rounded-[2rem] p-8 text-[11px] font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
