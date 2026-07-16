import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, User } from '@/lib/store-data';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ShieldCheck, UserCheck, Briefcase, Calculator, ShieldAlert, Building2, Eye, EyeOff, Save, ArrowLeft, UserPlus, Zap, CheckCircle2 } from 'lucide-react';

export default function NewUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addUser, updateUser, users, stores } = useERPStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('employee');
  const [storeId, setStoreId] = useState(stores[0]?.id || '');
  const [showPassword, setShowPassword] = useState(false);

  // New Profile Fields
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');


  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [globalEmailError, setGlobalEmailError] = useState<string | null>(null);
  const isEdit = Boolean(id);

  const checkGlobalEmail = async (emailToCheck: string) => {
    if (!emailToCheck || !emailToCheck.includes('@') || isEdit) return;
    
    setIsCheckingEmail(true);
    setGlobalEmailError(null);
    try {
      const { authApi } = await import('@/lib/auth-api');
      const result = await authApi.checkEmail(emailToCheck);
      if (!result.available) {
        setGlobalEmailError(result.message || "THIS EMAIL IS REGISTERED TO ANOTHER COMPANY.");
        toast.error("IDENTITY CONFLICT: EMAIL ALREADY IN USE GLOBALLY.");
      }
    } catch (e) {
      console.error("Failed to check email availability:", e);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    if (isEdit && users.length > 0) {
      const user = users.find(u => u.id === id);
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setStoreId(user.storeId || '');
        setPhone(user.phone || '');
        setBio(user.bio || '');
        setAddressLine1(user.addressLine1 || user.address_line1 || '');
        setAddressLine2(user.addressLine2 || user.address_line2 || '');
        setCity(user.city || '');
        setState(user.state || '');
        setPincode(user.pincode || '');
      }
    }
  }, [id, isEdit, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (globalEmailError) {
      toast.error("CANNOT PROCEED: PLEASE USE A UNIQUE EMAIL ADDRESS.");
      return;
    }

    // 1. Uniqueness Validation (Local check against existing users)
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = name.toLowerCase().trim().replace(/\s+/g, '_');

    const duplicateEmail = users.find(u => u.id !== id && u.email.toLowerCase() === normalizedEmail);
    if (duplicateEmail) {
      toast.error(`ERROR: THE EMAIL "${normalizedEmail.toUpperCase()}" IS ALREADY LINKED TO ANOTHER ACCOUNT.`);
      return;
    }

    const userData: any = {
      name,
      email: normalizedEmail,
      username: normalizedUsername,
      role,
      storeId,
      phone,
      bio,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state,
      pincode,
    };

    // Fix Password Bug: Only update password if a new one is entered
    if (password && password.length > 0) {
      userData.password = password;
    }

    try {
      if (isEdit) {
        await updateUser(id!, userData);
        toast.success("SYSTEM UPDATED: USER PROFILE SYNCHRONIZED.");
      } else {
        // For new users, password is required
        if (!password) {
          toast.error("SECURITY REQUIREMENT: PASSWORD IS MANDATORY FOR NEW ACCOUNTS.");
          return;
        }

        const generatedId = `user-${Date.now()}`;
        await addUser({
          ...userData,
          id: generatedId,
          password,
          isStaff: role !== 'user',
          isActive: true
        });

        toast.success("USER DEPLOYED: CLOUD ACCOUNT PROVISIONED SUCCESSFULLY.");
      }
      navigate('/users');
    } catch (error: any) {
      const errorMsg = error?.message || "SYSTEM FAILURE: COULD NOT SAVE USER DATA.";
      toast.error(errorMsg.toUpperCase());
    }
  };

  const roles = [
    { id: 'admin', label: 'Store Admin', category: 'Admin' },
    { id: 'super_admin', label: 'Super Admin', category: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40 text-slate-900">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/users')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{isEdit ? 'Edit User' : 'Add New User'}</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{isEdit ? 'Update user details' : 'Fill in the new user details'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Identity Matrix */}
          <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-lg shadow-indigo-100">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identity & Access</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Core account credentials</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200"
                  placeholder="E.G. JOHN SMITH"
                  required
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</Label>
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (globalEmailError) setGlobalEmailError(null);
                    }}
                    onBlur={() => checkGlobalEmail(email)}
                    className={cn(
                      "h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black lowercase focus:ring-2 placeholder:text-slate-200 transition-all",
                      globalEmailError ? "ring-2 ring-rose-500 bg-rose-50" : "focus:ring-primary"
                    )}
                    placeholder="member@collective.com"
                    required
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {globalEmailError && (
                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-2 ml-1 animate-pulse">
                    {globalEmailError}
                  </p>
                )}
              </div>
              <div className="space-y-4 md:col-span-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-primary placeholder:text-slate-200"
                    placeholder="••••••••"
                    required={!isEdit}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {isEdit && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 ml-1">LEAVE BLANK TO KEEP CURRENT PASSWORD.</p>}
              </div>
            </div>
          </div>

          {/* Professional Profile */}
          <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 shadow-lg shadow-amber-100">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Professional Profile</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Contact & location details</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                  placeholder="CITYNAME"
                />
              </div>
              <div className="space-y-4 md:col-span-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Address Line 1</Label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                  placeholder="STREET, BUILDING, FLOOR"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">State / Province</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                  placeholder="STATECODE"
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Pincode / ZIP</Label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                  placeholder="000000"
                />
              </div>
              <div className="space-y-4 md:col-span-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Professional Bio</Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full min-h-[120px] bg-slate-50 border-none rounded-2xl p-6 text-[11px] font-bold uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200 resize-none font-mono tracking-wider"
                  placeholder="DESCRIBE THE USER'S ROLE, EXPERIENCE, OR NOTES..."
                />
              </div>
            </div>
          </div>

          {/* Privilege Allocation */}
          <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-lg shadow-emerald-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Privilege Allocation</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Role-based access level</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((r) => {
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as User['role'])}
                    className={cn(
                      "p-6 rounded-[2rem] text-left transition-all duration-300 border-2",
                      role === r.id
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                        : "bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200"
                    )}
                  >
                    <p className={cn("text-[7px] font-black uppercase tracking-widest mb-1", role === r.id ? "text-indigo-400" : "text-slate-400")}>{r.category}</p>
                    <p className="text-[10px] font-black uppercase tracking-tight">{r.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Node Placement */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
            <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
            <div className="relative z-10">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 font-mono">Infrastructure Placement</h4>

              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Assigned Store Node</Label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xs font-black uppercase text-white focus:ring-2 focus:ring-indigo-500 appearance-none pointer-events-auto"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900">
                        {s.name?.toUpperCase() || ''} {s.branch ? `- ${s.branch.toUpperCase()}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                         <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Status</p>
                      <p className="text-[9px] font-black text-white uppercase">ACTIVE</p>
                   </div>
                   <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mb-3">
                         <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Sync</p>
                      <p className="text-[9px] font-black text-white uppercase">ENABLED</p>
                   </div>
                </div>

                {!isEdit && (
                  <div className="p-6 bg-indigo-500/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 font-mono">System Note</p>
                    <p className="text-[10px] font-bold text-white/40 leading-relaxed mb-4 italic">
                      "Each credential provisioned is automatically isolated within the tenant wall. Staff access is strictly governed."
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/hr/employees')}
                      className="w-full py-3 bg-indigo-500/10 text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20"
                    >
                      Management Controls →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <ShieldAlert className="w-10 h-10 text-rose-500" />
               </div>
               <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">Data Integrity</h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-[0.15em] px-4">All user profiles are encrypted and synchronized with our redundant cloud nodes.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
