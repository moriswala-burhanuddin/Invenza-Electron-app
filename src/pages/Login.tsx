import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '@/lib/store-data';
import { Store, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, ArrowRight, Fingerprint, ShieldAlert, Cpu, X, UserCircle, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '../assets/invenza-bg.png';
import { Checkbox } from '@/components/ui/checkbox';

interface SavedAccount {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useERPStore();
  const [email, setEmail] = useState('demo@invenza.app');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{email: string, password: string} | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{status: 'checking'|'available'|'downloading'|'downloaded'|'error', version?: string, percent?: number, message?: string} | null>(null);

  useEffect(() => {
    let mounted = true;
    if (window.electronAPI) {
      window.electronAPI.onUpdateAvailable((info: any) => mounted && setUpdateInfo({ status: 'available', version: info?.version }));
      window.electronAPI.onDownloadProgress((info: any) => mounted && setUpdateInfo({ status: 'downloading', percent: info?.percent }));
      window.electronAPI.onUpdateDownloaded((info: any) => mounted && setUpdateInfo({ status: 'downloaded', version: info?.version }));
      window.electronAPI.onUpdaterError((info: any) => mounted && setUpdateInfo({ status: 'error', message: info?.message }));
      
      // Auto-trigger a check when login page loads if we are in Electron
      window.electronAPI.checkForUpdates().catch(console.error);
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const loadSavedAccounts = async () => {
      let saved = null;
      if (window.electronAPI) {
        try {
          saved = await window.electronAPI.getSetting('system_saved_accounts');
        } catch (e) {
          console.error("Failed to load saved accounts from SQLite", e);
        }
      }
      if (!saved) {
        saved = localStorage.getItem('invenza_saved_accounts');
      }
      
      if (saved) {
        try {
          setSavedAccounts(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved accounts");
        }
      }
    };
    loadSavedAccounts();
  }, []);

  const persistAccounts = async (accounts: SavedAccount[]) => {
    const jsonStr = JSON.stringify(accounts);
    if (window.electronAPI) {
      try {
        await window.electronAPI.setSetting('system_saved_accounts', jsonStr);
      } catch (e) {
        console.error("Failed to save accounts to SQLite", e);
      }
    }
    localStorage.setItem('invenza_saved_accounts', jsonStr);
  };

  const savePendingAccount = async () => {
    if (pendingCredentials) {
      const exists = savedAccounts.find(a => a.email.toLowerCase() === pendingCredentials.email.toLowerCase());
      if (!exists) {
        const updated = [...savedAccounts, pendingCredentials];
        setSavedAccounts(updated);
        await persistAccounts(updated);
      }
      setShowSavePrompt(false);
      proceedToDashboard();
    }
  };

  const deleteAccount = async (e: React.MouseEvent, emailToDelete: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.email !== emailToDelete);
    setSavedAccounts(updated);
    await persistAccounts(updated);
  };

  const selectAccount = (acc: SavedAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  const proceedToDashboard = () => {
    const user = useERPStore.getState().currentUser;
    const canSeeRevenue = useERPStore.getState().checkPermission('canSeeRevenueMetrics');
    const canManageHR = useERPStore.getState().checkPermission('canManageEmployees');
    const canManageInventory = useERPStore.getState().checkPermission('canAddProduct');
    const canManageSales = useERPStore.getState().checkPermission('canSeeDetailedSales');
    const canManageAccounts = useERPStore.getState().checkPermission('canManageLedger');
    
    // Priority 1: High-level users (Admins/Managers with Revenue visibility) go to Dashboard
    if (canSeeRevenue || user?.role === 'admin' || user?.role === 'super_admin') {
      navigate('/');
    }
    // Priority 2: Inventory Managers
    else if (canManageInventory || user?.role === 'inventory_manager') {
      navigate('/products');
    }
    // Priority 3: Sales Managers
    else if (canManageSales || user?.role === 'sales_manager') {
      navigate('/sales');
    }
    // Priority 4: HR Managers
    else if (canManageHR || user?.role === 'hr_manager') {
      navigate('/hr');
    }
    // Priority 5: Accountants
    else if (canManageAccounts || user?.role === 'accountant') {
      navigate('/accounts');
    }
    // Priority 6: Specific Employees
    else if (user?.role === 'employee') {
      navigate('/employee/dashboard');
    }
    // Final Fallback
    else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        if (rememberMe) {
          const alreadySaved = savedAccounts.find(a => a.email.toLowerCase() === email.toLowerCase());
          if (!alreadySaved) {
            setPendingCredentials({ email, password });
            setShowSavePrompt(true);
            setLoading(false);
            return;
          }
        }
        proceedToDashboard();
      } else {
        setError(result.message || 'Login failed: Please check your email and password.');
      }
    } catch (err) {
      setError('System error: Please try again later.');
    } finally {
      if (!showSavePrompt) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] relative overflow-hidden font-sans">
      {/* Background Synthesis */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-500/30 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/30 rounded-full blur-[160px] animate-pulse delay-700" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="w-full max-w-[480px] px-6 relative z-10">
        <div className="bg-[#141417]/80 backdrop-blur-3xl rounded-[4rem] p-12 shadow-[0_32px_128px_rgba(0,0,0,0.8)] border border-white/5 relative overflow-hidden">

          {/* Subtle Scanning Line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-scan" />

          {updateInfo && updateInfo.status !== 'checking' && (
            <div className="mb-8 p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-center">
              {updateInfo.status === 'available' && <p className="text-sm font-semibold text-indigo-400">Update available (v{updateInfo.version}). Downloading...</p>}
              {updateInfo.status === 'downloading' && (
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-sm font-semibold text-indigo-400">Downloading update...</p>
                  <div className="w-full bg-indigo-950 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${updateInfo.percent || 0}%` }} />
                  </div>
                </div>
              )}
              {updateInfo.status === 'downloaded' && (
                <div className="flex flex-col gap-3 items-center">
                  <p className="text-sm font-semibold text-emerald-400">Update v{updateInfo.version} downloaded!</p>
                  <button onClick={() => window.electronAPI?.installUpdate()} className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold transition-colors">
                    Restart to Install
                  </button>
                </div>
              )}
              {updateInfo.status === 'error' && <p className="text-sm font-semibold text-rose-400">Update failed: {updateInfo.message}</p>}
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="relative mb-6 group">
              <div className="absolute -inset-4 bg-indigo-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-emerald-500 p-[1px] shadow-2xl shadow-indigo-500/20 transition-transform duration-700 group-hover:scale-105 group-hover:rotate-6">
                <div className="w-full h-full bg-[#0A0A0B] rounded-[2.4rem] flex items-center justify-center overflow-hidden">
                  <img src={logo} alt="Invenza Logo" className="w-[70%] h-[70%] object-contain" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-[#141417]">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Invenza<span className="text-indigo-500 text-4xl">.</span></h1>
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Interface v3</span>
            </div>
          </div>

          {/* Saved Accounts Carousel */}
          {savedAccounts.length > 0 && (
            <div className="mb-10 space-y-4">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-3">
                Saved Credentials
              </label>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                {savedAccounts.map((acc, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectAccount(acc)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all relative group",
                      email === acc.email 
                        ? "bg-[#2156C1]/20 border-[#2156C1]/50 text-white" 
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    <UserCircle className={cn("w-5 h-5", email === acc.email ? "text-[#2156C1]" : "text-slate-500")} />
                    <span className="text-[11px] font-black lowercase tracking-tight max-w-[120px] truncate">{acc.email}</span>
                    <div 
                      onClick={(e) => deleteAccount(e, acc.email)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                    >
                      <X className="w-3 h-3 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest p-5 rounded-[1.8rem] flex items-center gap-4 border border-rose-500/20 animate-shake">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">
                Identifier (Email)
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 pl-14 pr-6 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 hover:bg-white/[0.08]"
                  placeholder="yourname@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-3">
                Security Key (Password)
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-[2rem] py-5 pl-14 pr-14 text-sm font-bold text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700 hover:bg-white/[0.08]"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-white/20 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" 
                />
                <label htmlFor="remember" className="text-xs font-bold text-slate-500 cursor-pointer select-none">
                  Remember credentials
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-foreground h-20 rounded-[2.2rem] font-black uppercase tracking-[0.3em] text-xs shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:shadow-[0_25px_50px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-primary/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  AUTHORIZE LOGIN
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Metrics */}
          <div className="mt-14 pt-10 border-t border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Node Status</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-white">ENCRYPTED</span>
              </div>
            </div>
            {window.electronAPI && (
              <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.electronAPI?.checkForUpdates?.()}>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">System Version</span>
                <span className="text-[10px] font-black text-indigo-400">CHECK FOR UPDATES</span>
              </div>
            )}
            {/* <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Session ID</span>
              <span className="text-[10px] font-black text-white">SF-CORE-992</span>
            </div> */}
          </div>
        </div>

        <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mt-12 leading-relaxed">
          Authorized Users Only &nbsp;&nbsp;|&nbsp;&nbsp; Encryption System Active
        </p>
      </div>

      {/* Save Password Prompt (Overlay Modal) */}
      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[400px] bg-[#141417] border border-white/10 rounded-[3.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-[2.5rem] flex items-center justify-center">
                <Save className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Save Credentials?</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wider">Would you like to store this profile locally for faster authorized access?</p>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-[2.2rem] border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Identified Account</span>
                <span className="text-[11px] font-black text-white lowercase truncate max-w-[180px]">{pendingCredentials?.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={savePendingAccount}
                className="w-full h-16 bg-white text-black rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Check className="w-4 h-4" />
                SECURE SAVE
              </button>
              <button
                onClick={() => { setShowSavePrompt(false); proceedToDashboard(); }}
                className="w-full h-16 bg-white/5 text-white/50 hover:text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all"
              >
                NOT NOW
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(600px); opacity: 0; }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
