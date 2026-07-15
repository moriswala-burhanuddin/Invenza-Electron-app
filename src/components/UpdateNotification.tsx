import { useEffect, useState } from 'react';
import { RefreshCw, Download, CheckCircle, X, ArrowRight, ServerCrash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface UpdateInfo {
    version: string;
}

interface DownloadProgress {
    percent: number;
}

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

interface ElectronUpdaterAPI {
    onUpdateAvailable?: (cb: (info: UpdateInfo) => void) => void;
    onDownloadProgress?: (cb: (info: DownloadProgress) => void) => void;
    onUpdateDownloaded?: (cb: (info: UpdateInfo) => void) => void;
    onUpdaterError?: (cb: (info: { message: string }) => void) => void;
    checkForUpdates?: () => Promise<{ success: boolean; info?: unknown; error?: string }>;
    installUpdate?: () => void;
}

function getAPI(): ElectronUpdaterAPI | null {
    return (window as Window & { electronAPI?: ElectronUpdaterAPI }).electronAPI ?? null;
}

export function UpdateNotification() {
    const [state, setState] = useState<UpdateState>('idle');
    const [version, setVersion] = useState('');
    const [percent, setPercent] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const api = getAPI();
        if (!api) return;

        api.onUpdateAvailable?.((info: UpdateInfo) => {
            setVersion(info.version);
            setState('available');
            setVisible(true);
        });

        api.onDownloadProgress?.((info: DownloadProgress) => {
            setPercent(info.percent);
            setState('downloading');
            setVisible(true);
        });

        api.onUpdateDownloaded?.((info: UpdateInfo) => {
            setVersion(info.version);
            setState('ready');
            setVisible(true);
        });

        api.onUpdaterError?.((info: { message: string }) => {
            setErrorMsg(info.message);
            setState('error');
            setVisible(true);
            
            // Auto hide error after 5s
            setTimeout(() => {
                setVisible(false);
                setTimeout(() => setState('idle'), 300);
            }, 5000);
        });
    }, []);

    const handleInstall = () => {
        getAPI()?.installUpdate?.();
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 min-w-[340px] max-w-[400px] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-5 shadow-2xl shadow-indigo-500/10 text-white relative overflow-hidden group">
                
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent opacity-50" />
                
                {/* Close Button (only show if not downloading/ready to prevent blocking install) */}
                {state !== 'downloading' && state !== 'ready' && (
                    <button 
                        onClick={() => setVisible(false)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                <div className="relative z-10 flex items-start gap-4">
                    <div className={cn(
                        "p-3 rounded-xl flex-shrink-0 border",
                        state === 'error' ? "bg-red-500/20 border-red-500/30 text-red-400" :
                        state === 'ready' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
                        "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
                    )}>
                        {state === 'error' ? <ServerCrash className="w-6 h-6" /> :
                         state === 'ready' ? <CheckCircle className="w-6 h-6" /> :
                         state === 'downloading' ? <Download className="w-6 h-6 animate-bounce" /> :
                         <RefreshCw className="w-6 h-6 animate-spin" />}
                    </div>

                    <div className="flex-1 pt-1">
                        {state === 'available' && (
                            <>
                                <h3 className="text-[15px] font-bold text-white mb-1 tracking-tight">Update Available</h3>
                                <p className="text-xs text-indigo-200/70 font-medium">Version {version} is downloading in the background...</p>
                            </>
                        )}
                        
                        {state === 'downloading' && (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[15px] font-bold text-white tracking-tight">Downloading Update</h3>
                                    <span className="text-xs font-black text-indigo-400">{Math.floor(percent)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </>
                        )}

                        {state === 'ready' && (
                            <>
                                <h3 className="text-[15px] font-bold text-white mb-1 tracking-tight">Update Ready to Install</h3>
                                <p className="text-xs text-emerald-200/70 font-medium mb-4">Version {version} has been downloaded.</p>
                                <Button 
                                    onClick={handleInstall}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold border-none shadow-lg shadow-emerald-500/20 h-9"
                                >
                                    Restart App Now <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </>
                        )}

                        {state === 'error' && (
                            <>
                                <h3 className="text-[15px] font-bold text-white mb-1 tracking-tight">Update Failed</h3>
                                <p className="text-xs text-red-200/70 font-medium line-clamp-2">{errorMsg}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
