import { useState } from 'react';
import { useStoreConfig } from '@/lib/store-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImagePlus, Trash2, Building2, Globe, Database, Cpu, ShieldCheck, RefreshCw, HardDrive, KeyRound, Link2, Ghost, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CompanyInfoTab() {
    const {
        companyName, taxId, websiteUrl, companyEmail, etimsApiUrl,
        aiHostUrl, aiSearchUsername, aiSearchPassword, aiSearchClientId,
        updateConfig
    } = useStoreConfig();
    const [isBackingUp, setIsBackingUp] = useState(false);

    const handleBackup = async () => {
        setIsBackingUp(true);
        toast.info("Preparing secure data export...");
        try {
            if (!(window as any).electronAPI?.manualBackup) {
                toast.error("Manual Backup feature not available in browser mode.");
                return;
            }
            const result = await (window as any).electronAPI.manualBackup();
            if (result.success) {
                toast.success("Identity Backup Successful: Snapshot persisted.");
            } else if (result.error !== 'Cancelled') {
                toast.error(`Backup Failure: ${result.error}`);
            }
        } catch (error) {
            console.error('Backup error:', error);
            toast.error("A system error occurred during backup.");
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div className="space-y-12">
            {/* Sector 1: Identity Matrix */}
            <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-primary rounded-xl text-white">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Company Details</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Basic information about your business and logo.</p>
                </div>

                <div className="lg:col-span-8 grid gap-8">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5" /> Company Name
                            </Label>
                            <Input
                                value={companyName}
                                onChange={e => updateConfig({ companyName: e.target.value })}
                                placeholder="ENTER COMPANY NAME"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5" /> Tax Number (Tax ID)
                            </Label>
                            <Input
                                value={taxId}
                                onChange={e => updateConfig({ taxId: e.target.value })}
                                placeholder="ENTER TAX NUMBER"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Globe className="w-3.5 h-3.5" /> Website Address
                            </Label>
                            <Input
                                value={websiteUrl}
                                onChange={e => updateConfig({ websiteUrl: e.target.value })}
                                placeholder="HTTPS://WWW.YOURSTORE.COM"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5" /> Email Address
                            </Label>
                            <Input
                                value={companyEmail}
                                onChange={e => updateConfig({ companyEmail: e.target.value })}
                                placeholder="CONTACT@YOURSTORE.COM"
                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">Company Branding Logo</Label>
                        <div className="flex flex-col items-center gap-8 p-12 bg-slate-50 rounded-[3.5rem] border border-slate-100 group transition-all relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="h-48 w-48 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white group-hover:border-primary transition-all relative overflow-hidden shadow-inner cursor-pointer"
                                 onClick={() => document.getElementById('logo-upload')?.click()}>
                                {useStoreConfig.getState().companyLogo ? (
                                    <img src={useStoreConfig.getState().companyLogo!} alt="Preview" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <>
                                        <ImagePlus className="h-10 w-10 text-slate-200 group-hover:text-foreground transition-colors" />
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mt-4">Drop Logo Here</p>
                                    </>
                                )}
                            </div>
                            
                            <input 
                                type="file" 
                                id="logo-upload" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            updateConfig({ companyLogo: reader.result as string });
                                            toast.success("Identity Matrix Updated: Logo ingested successfully.");
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />

                            <div className="flex flex-col w-full gap-3 relative z-10">
                                <Button 
                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                    className="h-16 w-full rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Select New Asset
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => updateConfig({ companyLogo: null })}
                                    className="h-16 w-full rounded-2xl bg-white text-rose-500 hover:text-rose-600 font-black uppercase text-[10px] tracking-widest shadow-sm border border-slate-100 flex items-center justify-center gap-3 transition-all"
                                >
                                    <Trash2 className="h-4 w-4" /> Purge Asset
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector 2: Integration Nexus */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Connections</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Settings for connecting to external services and AI.</p>
                </div>

                <div className="lg:col-span-8 grid md:grid-cols-2 gap-8">
                    <div className="space-y-3 md:col-span-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ETIMS API Address</Label>
                        <Input
                            value={etimsApiUrl}
                            onChange={e => updateConfig({ etimsApiUrl: e.target.value })}
                            placeholder="HTTPS://ETIMS.GATEWAY.ADDRESS"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5" /> AI Server Address
                        </Label>
                        <Input
                            value={aiHostUrl}
                            onChange={e => updateConfig({ aiHostUrl: e.target.value })}
                            placeholder="HTTPS://AI.SERVER.URL"
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI Username</Label>
                        <Input
                            value={aiSearchUsername}
                            onChange={e => updateConfig({ aiSearchUsername: e.target.value })}
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5" /> AI Password
                        </Label>
                        <Input
                            type="password"
                            value={aiSearchPassword}
                            onChange={e => updateConfig({ aiSearchPassword: e.target.value })}
                            className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase"
                        />
                    </div>
                </div>
            </div>

            {/* Sector 3: Maintenance Protocols */}
            <div className="pt-12 border-t border-slate-100 grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-4">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-slate-100 rounded-xl text-slate-900 border border-slate-200">
                            <Database className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">System Settings</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Tools for backing up data and checking for updates.</p>
                </div>

                <div className="lg:col-span-8">
                    <div className="flex gap-4">
                        <Button 
                            variant="ghost" 
                            disabled={isBackingUp}
                            onClick={handleBackup}
                            className="h-16 px-10 rounded-[1.8rem] bg-slate-50 border border-slate-100 text-slate-600 hover:text-foreground font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                        >
                            {isBackingUp ? <Loader2 className="w-5 h-5 animate-spin" /> : <HardDrive className="w-5 h-5 text-indigo-400" />}
                            {isBackingUp ? 'Securing Data...' : 'Back Up Data Now'}
                        </Button>
                        <Button variant="ghost" className="h-16 px-10 rounded-[1.8rem] bg-slate-50 border border-slate-100 text-slate-600 hover:text-foreground font-black uppercase text-[10px] tracking-widest flex items-center gap-3 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
                            <RefreshCw className="w-5 h-5 text-emerald-400" />
                            Check for Updates
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
