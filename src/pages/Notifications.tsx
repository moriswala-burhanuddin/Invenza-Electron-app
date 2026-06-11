import { useState, useEffect, useCallback } from 'react';
import { useERPStore } from '@/lib/store-data';
import { dbAdapter } from '@/lib/db-adapter';
import { Bell, RefreshCw, AlertCircle, CheckCircle, Info, AlertTriangle, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'stock_alert';
    is_read: boolean;
    created_at: string;
}

const Notifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    const { activeStoreId } = useERPStore();

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!activeStoreId) {
                setNotifications([]);
                setIsLoading(false);
                return;
            }

            console.log("[Notifications] Fetching local low stock alerts...");
            const results = await dbAdapter.getLowStockNotifications(activeStoreId);
            setNotifications(results || []);
            setUnreadCount((results || []).filter((n: any) => !n.is_read).length);
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError("COULD NOT FETCH SYSTEM ALERTS.");
        } finally {
            setIsLoading(false);
        }
    }, [activeStoreId]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const clearAll = () => {
        setNotifications([]);
        setUnreadCount(0);
        toast.success("All alerts cleared from view");
    };

    const getTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const XCircle = ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-100">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Notifications</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">System alerts, inventory updates and messages</p>
                        </div>
                    </div>
                    {notifications.length > 0 && (
                        <Button onClick={clearAll} variant="ghost" className="h-12 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-all">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All
                        </Button>
                    )}
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <RefreshCw className="w-12 h-12 text-slate-200 animate-spin" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Checking for new alerts...</p>
                    </div>
                ) : error ? (
                    <div className="bg-white rounded-[2.5rem] p-12 text-center border border-white">
                        <AlertCircle className="w-12 h-12 text-red-100 mx-auto mb-6" />
                        <p className="text-sm font-black text-slate-900 uppercase">{error}</p>
                        <Button onClick={() => fetchNotifications()} variant="ghost" className="mt-4 uppercase text-[10px] font-black">Try Again</Button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-32 text-center border border-white flex flex-col items-center justify-center">
                        <div className="p-10 bg-slate-50 rounded-full text-slate-200 mb-8">
                            <Bell className="w-16 h-16" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">System is Quiet</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-10">No new notifications to show right now.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                                className={cn(
                                    "bg-white rounded-[2rem] p-8 border border-white shadow-sm transition-all duration-300 flex items-start gap-6 cursor-pointer",
                                    !n.is_read ? "border-indigo-100 shadow-xl shadow-indigo-50/20" : "opacity-60"
                                )}
                            >
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                    !n.is_read ? "bg-indigo-50" : "bg-slate-50"
                                )}>
                                    {getTypeIcon(n.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{n.title}</h3>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed">{n.message}</p>
                                    {!n.is_read && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">New Alert</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Notifications;
