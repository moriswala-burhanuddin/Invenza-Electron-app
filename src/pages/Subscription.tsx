import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { ShieldCheck, Calendar, Clock, AlertTriangle, ArrowRight, Zap, RefreshCw, Box, Layers, Building, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/config';
import { isElectron } from '@/lib/electron-helper';
import { motion } from 'framer-motion';

interface CompanyData {
    id: number;
    name: string;
    subscription_status: 'trial' | 'active' | 'expired';
    trial_days_left: number;
    expiry_date?: string;
    is_ai_enabled: boolean;
    created_at: string;
    subscription?: {
        plan_name: string;
    };
}

export default function Subscription() {
    const { currentUser, getActiveStore } = useERPStore();
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [loading, setLoading] = useState(true);
    const activeStore = getActiveStore();
    const companyId = currentUser?.companyId || (activeStore as any)?.company_id || (activeStore as any)?.companyId;

    useEffect(() => {
        const fetchCompanyDetails = async () => {
            if (!companyId) {
                setLoading(false);
                return;
            }
            try {
                // Get JWT token if available, or try central API
                const token = localStorage.getItem('access_token');
                const res = await fetch(`${API_URL.replace('/v1', '')}/companies/${companyId}/`, {
                    headers: token ? { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } : {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!res.ok) throw new Error('Failed to fetch data');
                const data = await res.json();
                setCompany(data);
            } catch (error) {
                console.error("Failed to fetch subscription details", error);
                // Mock fallback for UI demo purposes if network fails in electron
                if (isElectron()) {
                    setCompany({
                        id: 1,
                        name: "Your Enterprise",
                        subscription_status: 'trial',
                        trial_days_left: 7,
                        is_ai_enabled: true,
                        created_at: new Date().toISOString()
                    });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCompanyDetails();
    }, [companyId]);

    const isTrial = company?.subscription_status === 'trial';
    const isExpired = company?.subscription_status === 'expired';
    const isActive = company?.subscription_status === 'active';

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 md:p-8">
            <PageHeader
                title="Subscription & Billing"
                subtitle="Manage your SaaS subscription, licenses, and cloud services."
            />

            {loading ? (
                <div className="flex items-center justify-center h-64 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                    Loading subscription details...
                </div>
            ) : company ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                    {/* Left Column: Main Status Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <Card className={`border-l-4 overflow-hidden ${isExpired ? 'border-l-red-500' : isTrial ? 'border-l-orange-400' : 'border-l-emerald-500'} shadow-md`}>
                                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                    <ShieldCheck className="w-48 h-48" />
                                </div>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-2xl font-black text-slate-900 flex items-center">
                                            {company.subscription?.plan_name || 'Enterprise SaaS'} Plan
                                        </CardTitle>
                                        <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center shadow-sm ${
                                            isExpired ? 'bg-red-100 text-red-700' : 
                                            isTrial ? 'bg-orange-100 text-orange-700' : 
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {isExpired && <AlertTriangle className="w-3 h-3 mr-1" />}
                                            {isTrial && <Clock className="w-3 h-3 mr-1" />}
                                            {isActive && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {company.subscription_status}
                                        </div>
                                    </div>
                                    <CardDescription className="text-base text-slate-500 mt-2 max-w-lg">
                                        {isExpired ? 'Your subscription has expired. Cloud syncing is paused. Your local data remains safe.' : 
                                         isTrial ? `Your trial includes full access. Upgrade to unlock advanced features indefinitely.` :
                                         'Your subscription is active and syncing smoothly with Invenza Cloud.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-slate-100 mt-2">
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium mb-1">Company</p>
                                            <p className="text-lg font-bold text-slate-900 flex items-center">
                                                <Building className="w-4 h-4 mr-2 text-indigo-500" />
                                                {company.name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium mb-1">Status</p>
                                            <p className="text-lg font-bold text-slate-900 flex items-center capitalize">
                                                <Zap className={`w-4 h-4 mr-2 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                {company.subscription_status}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium mb-1">Time Left</p>
                                            <p className={`text-lg font-bold flex items-center ${isExpired ? 'text-red-500' : 'text-slate-900'}`}>
                                                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                                {isTrial ? `${company.trial_days_left} Days` : 
                                                 isExpired ? 'Expired' : 
                                                 company.expiry_date ? new Date(company.expiry_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Lifetime'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500 font-medium mb-1">AI Features</p>
                                            <p className="text-lg font-bold text-slate-900 flex items-center">
                                                <Sparkles className={`w-4 h-4 mr-2 ${company.is_ai_enabled ? 'text-purple-500' : 'text-slate-300'}`} />
                                                {company.is_ai_enabled ? 'Enabled' : 'Disabled'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-6 bg-slate-50/50 flex justify-between items-center">
                                    <p className="text-sm text-slate-500">
                                        To upgrade or renew, please visit the central web portal.
                                    </p>
                                    <Button 
                                        onClick={() => window.open('https://invenza-erp.cloud/portal/pricing', '_blank')}
                                        className={isExpired ? "bg-red-600 hover:bg-red-700 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}
                                    >
                                        {isExpired ? 'Renew Now' : 'Upgrade Plan'} <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                                <Card className="shadow-sm h-full">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center"><Layers className="w-5 h-5 mr-2 text-indigo-500"/> Cloud Sync</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-600 text-sm">
                                            {isExpired 
                                                ? "Cloud synchronization is disabled because your plan has expired. Local operations will still function normally." 
                                                : "Your desktop ERP data is automatically backed up and synced to the cloud."}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
                                <Card className="shadow-sm h-full">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center"><Box className="w-5 h-5 mr-2 text-pink-500"/> Local Storage</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-slate-600 text-sm">
                                            Your business data is safely stored in a local SQLite database, ensuring lightning-fast performance even offline.
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Column: Included Features */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <Card className="shadow-sm border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white h-full">
                            <CardHeader>
                                <CardTitle className="text-lg text-indigo-950">Included in your plan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-4">
                                    {['Unlimited Offline Transactions', 'Local SQLite Database', 'Basic Inventory Management', 'Invoicing & Quotations', 'Cloud Synchronization', 'Advanced Analytics & AI', 'Multi-Store Support'].map((feature, idx) => (
                                        <li key={idx} className="flex items-start">
                                            <div className={`mt-0.5 mr-3 rounded-full p-1 ${idx < 5 || isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                            <span className={`text-sm font-medium ${idx < 5 || isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-64">
                    <Card className="p-8 text-center max-w-md shadow-sm">
                        <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Company Not Linked</h3>
                        <p className="text-slate-500 mb-6">Could not retrieve subscription details. Ensure your ERP is linked to a valid SaaS account.</p>
                    </Card>
                </div>
            )}
        </div>
    );
}
// Note: Some imports like Sparkles, CheckCircle2 might be missing from lucide-react above.
// Fixed below in a second tool call if needed.
