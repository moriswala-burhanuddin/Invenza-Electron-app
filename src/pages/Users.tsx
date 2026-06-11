import { useState } from 'react';
import { useERPStore, User } from '@/lib/store-data';
import { Search, Plus, Mail, Shield, ShieldCheck, Trash2, Edit, User as UserIcon, Users as UsersIcon, Building2, Phone, ArrowRight, MoreHorizontal, ShieldAlert, Key, Zap, CheckCircle2, MoreVertical, Settings, UserPlus, ArrowLeft, Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function Users() {
  const navigate = useNavigate();
  const { users, activeStoreId, deleteUser, stores } = useERPStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user =>
    user.email !== 'burhanuddinmoris52@gmail.com' &&
    user.email !== 'burhanuddinmoris5253@gmail.com' &&
    (user.storeId === activeStoreId || user.role === 'admin' || user.role === 'super_admin') &&
    (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(id);
      toast.success("User deleted.");
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin': return { icon: <ShieldCheck className="w-3.5 h-3.5" />, class: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'ADMIN' };
      case 'manager': return { icon: <Shield className="w-3.5 h-3.5" />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'MANAGER' };
      case 'sales': return { icon: <Zap className="w-3.5 h-3.5" />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'SALES' };
      default: return { icon: <UserIcon className="w-3.5 h-3.5" />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: role.toUpperCase() };
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Users</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Login accounts & roles • {filteredUsers.length} users</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/users/new')}
              className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4 mr-2 text-indigo-400" />
              Add Login User
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
        {/* HR Separation Banner */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-[2rem] px-8 py-5 flex items-start gap-4">
          <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-black text-indigo-800 uppercase tracking-widest mb-1">Login Access Only</p>
            <p className="text-xs text-indigo-600 font-medium leading-relaxed">
              This module manages <strong>login credentials and roles</strong> only. To add employees with attendance, leave &amp; payroll tracking,
              use the <button onClick={() => navigate('/hr/employees')} className="font-black underline underline-offset-2 inline-flex items-center gap-1 hover:text-indigo-800 transition-colors">HR → Employees <ExternalLink className="w-3 h-3" /></button> module instead.
            </p>
          </div>
        </div>
        {/* Registry Controls */}
        <div className="bg-white p-6 rounded-[3rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex-1 relative group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-foreground transition-colors" />
            <input
              type="text"
              placeholder="SEARCH BY NAME, USERNAME, OR ROLE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-16 bg-slate-50 border-none rounded-[1.5rem] pl-16 pr-8 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary placeholder:text-slate-200 transition-all font-mono"
            />
          </div>
        </div>        {/* Personnel Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => {
              const roleConfig = getRoleConfig(u.role);
              const isSuperAdmin = u.role === 'super_admin';
              
              return (
                <div
                  key={u.id}
                  className={cn(
                    "rounded-[3rem] p-10 border-2 transition-all duration-500 group relative",
                    isSuperAdmin 
                      ? "bg-slate-900 border-indigo-500/30 shadow-2xl shadow-indigo-500/20 text-white" 
                      : "bg-white border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 text-slate-900"
                  )}
                >
                  {isSuperAdmin && (
                    <div className="absolute top-8 right-8">
                      <div className="bg-indigo-500 text-white text-[8px] font-black px-3 py-1 rounded-full tracking-widest animate-pulse">
                        GLOABL_ACCESS
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col items-center text-center mb-10">
                    <div className={cn(
                      "w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all shadow-inner relative mb-6 overflow-hidden",
                      isSuperAdmin ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-50 text-slate-200 group-hover:bg-primary group-hover:text-white"
                    )}>
                      <UserIcon className="w-10 h-10 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100" />
                    </div>
                    <h4 className={cn(
                      "text-xl font-black uppercase tracking-tight mb-2 truncate w-full px-4",
                      isSuperAdmin ? "text-white" : "text-slate-900 group-hover:text-indigo-600"
                    )}>{u.name}</h4>
                    <Badge className={cn(
                      "px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border shadow-sm",
                      isSuperAdmin ? "bg-indigo-500 border-indigo-400 text-white" : roleConfig.class
                    )}>
                      <span className="mr-2">{isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : roleConfig.icon}</span>
                      {isSuperAdmin ? 'SUPER ADMIN' : roleConfig.label}
                    </Badge>
                  </div>

                  <div className="space-y-6 mb-10">
                    <div className={cn(
                      "flex items-center justify-between text-[11px] font-black uppercase tracking-widest p-4 rounded-2xl",
                      isSuperAdmin ? "bg-white/5 text-indigo-300" : "bg-slate-50/50 text-slate-400"
                    )}>
                      <span className="flex items-center gap-3"><Key className="w-4 h-4 text-indigo-500" /> USERNAME</span>
                      <span className={cn("font-mono", isSuperAdmin ? "text-white" : "text-slate-900")}>@{u.username}</span>
                    </div>
                    <div className={cn(
                      "flex items-center justify-between text-[11px] font-black uppercase tracking-widest p-4 rounded-2xl",
                      isSuperAdmin ? "bg-white/5 text-indigo-300" : "bg-slate-50/50 text-slate-400"
                    )}>
                      <span className="flex items-center gap-3"><Building2 className="w-4 h-4 text-emerald-500" /> STORE</span>
                      <span className={isSuperAdmin ? "text-white" : "text-slate-900"}>
                        {isSuperAdmin || u.storeId === 'all' 
                          ? 'ALL STORES' 
                          : (stores.find(s => s.id === u.storeId)?.name || 'BRANCH_ACCESS')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate(`/users/edit/${u.id}`)}
                      className={cn(
                        "flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest transition-all shadow-none border",
                        isSuperAdmin 
                          ? "bg-white/10 hover:bg-white hover:text-foreground text-white border-white/10" 
                          : "bg-slate-50 hover:bg-primary hover:text-white text-slate-900 border-slate-50"
                      )}
                    >
                      Edit Profile
                      <Edit className="w-4 h-4 ml-3" />
                    </Button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border",
                        isSuperAdmin
                          ? "bg-white/5 text-white/20 hover:bg-rose-500 hover:text-white border-white/5"
                          : "bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-600 border-slate-50"
                      )}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-60 text-center opacity-30 flex flex-col items-center justify-center bg-white rounded-[4rem] border-4 border-dashed border-slate-50">
              <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-10">
                <UsersIcon className="w-16 h-16 text-slate-100" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">No Users Found</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4 px-20 max-w-2xl leading-loose text-center">No users found. Add a new user to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
