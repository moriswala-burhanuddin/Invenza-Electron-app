import { useState, useEffect } from "react";
import { useERPStore } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Plus, CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle, History, CalendarRange, Ghost, ShieldCheck, X, Plane, Users2 } from "lucide-react";

interface LeavesProps {
    isEmployeeView?: boolean;
}

interface LeaveWithUser {
    id: string;
    employeeId: string;
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    userName?: string;
}

const Leaves = ({ isEmployeeView = false }: LeavesProps) => {
    const { currentUser, hrLeaves, applyLeave, fetchLeaves, updateLeaveStatus, checkPermission } = useERPStore();
    const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'balances'>('pending');
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [newLeave, setNewLeave] = useState<{
        type: 'sick' | 'casual' | 'earned' | 'unpaid';
        startDate: string;
        endDate: string;
        reason: string;
    }>({
        type: 'casual',
        startDate: '',
        endDate: '',
        reason: ''
    });

    // Dynamic Balances State
    const [users, setUsers] = useState<any[]>([]);
    const [selectedBalEmp, setSelectedBalEmp] = useState<string>('');
    const [empBalances, setEmpBalances] = useState<any[]>([]);
    const [isEditBalOpen, setIsEditBalOpen] = useState(false);
    const [editBalances, setEditBalances] = useState<Record<string, number>>({
        casual: 0, sick: 0, earned: 0
    });
    const { getLeaveBalances, setLeaveBalance } = useERPStore();

    const { activeStoreId } = useERPStore();
    const canManageAttendance = checkPermission('canManageAttendance');

    useEffect(() => {
        if (canManageAttendance || isEmployeeView) {
          fetchLeaves();
          if (window.electronAPI) {
              window.electronAPI.getEmployees(activeStoreId || 'store-1').then((u: any[]) => setUsers(u));
          }
        }
    }, [fetchLeaves, canManageAttendance, isEmployeeView]);

    useEffect(() => {
        const empToLoad = isEmployeeView ? currentUser?.employeeId : selectedBalEmp;
        if (empToLoad) {
            getLeaveBalances(empToLoad).then(b => {
                setEmpBalances(b);
                setEditBalances({
                    casual: b.find((x: any) => x.leaveType === 'casual')?.balance || 12,
                    sick: b.find((x: any) => x.leaveType === 'sick')?.balance || 12,
                    earned: b.find((x: any) => x.leaveType === 'earned')?.balance || 12,
                });
            });
        }
    }, [selectedBalEmp, isEmployeeView, currentUser?.employeeId, getLeaveBalances]);

    const handleSaveBalances = async () => {
        const empToSave = isEmployeeView ? currentUser?.employeeId : selectedBalEmp;
        if (!empToSave) return;
        try {
            await setLeaveBalance(empToSave, 'casual', editBalances.casual, new Date().getFullYear());
            await setLeaveBalance(empToSave, 'sick', editBalances.sick, new Date().getFullYear());
            await setLeaveBalance(empToSave, 'earned', editBalances.earned, new Date().getFullYear());
            toast.success("Leave balances updated successfully.");
            setIsEditBalOpen(false);
            const b = await getLeaveBalances(empToSave);
            setEmpBalances(b);
        } catch (e) {
            toast.error("Failed to update balances.");
        }
    };

    const handleApplyLeave = async () => {
        if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) {
            toast.error("Please fill in all fields.");
            return;
        }
        if (!currentUser) return;
        await applyLeave({
            type: newLeave.type,
            startDate: newLeave.startDate,
            endDate: newLeave.endDate,
            reason: newLeave.reason,
            employeeId: currentUser.employeeId || ''
        });
        setIsApplyModalOpen(false);
        setNewLeave({ type: 'casual', startDate: '', endDate: '', reason: '' });
        toast.success("Leave request submitted successfully.");
    };

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        await updateLeaveStatus(id, status);
        if (status === 'approved') toast.success("Leave approved.");
        else toast.success("Leave rejected.");
    };

    const pendingLeaves = hrLeaves.filter(l => l.status === 'pending');
    const historyLeaves = hrLeaves.filter(l => l.status !== 'pending');

    const statusConfig: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
        pending: { label: 'Awaiting Review', class: 'bg-amber-50 text-amber-600 border-amber-100', icon: <Clock className="w-3.5 h-3.5" /> },
        approved: { label: 'Approved', class: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        rejected: { label: 'Rejected', class: 'bg-rose-50 text-rose-600 border-rose-100', icon: <XCircle className="w-3.5 h-3.5" /> },
    };

    const typeConfig: Record<string, { color: string; bg: string }> = {
        casual: { color: 'text-indigo-600', bg: 'bg-indigo-50' },
        sick: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
        earned: { color: 'text-amber-600', bg: 'bg-amber-50' },
        unpaid: { color: 'text-slate-600', bg: 'bg-slate-100' },
    };

    const calculateBalance = (type: string, targetEmpId?: string) => {
        const approved = hrLeaves.filter(l =>
            l.status === 'approved' &&
            l.type === type &&
            (targetEmpId ? l.employeeId === targetEmpId : (isEmployeeView ? l.employeeId === currentUser?.employeeId : true))
        );
        return approved.reduce((acc, curr) => {
            const start = new Date(curr.startDate);
            const end = new Date(curr.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return acc + diffDays;
        }, 0);
    };

    const targetEmpData = users.find(u => u.id === (isEmployeeView ? currentUser?.employeeId : selectedBalEmp));
    
    const balances = [
        { label: 'Casual Leave', type: 'casual', color: 'indigo', icon: <Plane className="w-5 h-5" /> },
        { label: 'Sick Leave', type: 'sick', color: 'emerald', icon: <AlertCircle className="w-5 h-5" /> },
        { label: 'Earned Leave', type: 'earned', color: 'amber', icon: <CalendarRange className="w-5 h-5" /> },
    ].map(b => {
        const bd = empBalances.find(x => x.leaveType === b.type);
        const total = bd ? bd.totalDays : 12; // default 12 if not explicitly set
        return { ...b, total, used: calculateBalance(b.type, isEmployeeView ? currentUser?.employeeId : selectedBalEmp) };
    });

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Leave Requests</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                {isEmployeeView ? 'Your Leave Records' : `${hrLeaves.length} Total Requests`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {isEmployeeView && (
                            <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                                        <Plus className="w-4 h-4 text-indigo-400" />
                                        Apply for Leave
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[3rem] p-12 max-w-lg border-none shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Apply for Leave</DialogTitle>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fill in the form to submit your leave request.</p>
                                    </DialogHeader>
                                    <div className="space-y-8 py-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Leave Type</Label>
                                            <Select value={newLeave.type} onValueChange={(v) => setNewLeave({ ...newLeave, type: v as 'sick' | 'casual' | 'earned' | 'unpaid' })}>
                                                <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="casual" className="text-[11px] font-black uppercase">Casual Leave</SelectItem>
                                                    <SelectItem value="sick" className="text-[11px] font-black uppercase">Sick Leave</SelectItem>
                                                    <SelectItem value="earned" className="text-[11px] font-black uppercase">Earned Leave</SelectItem>
                                                    <SelectItem value="unpaid" className="text-[11px] font-black uppercase">Unpaid Leave</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</Label>
                                                <Input type="date" value={newLeave.startDate} onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })}
                                                    className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black focus:ring-2 focus:ring-primary" />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</Label>
                                                <Input type="date" value={newLeave.endDate} onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })}
                                                    className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black focus:ring-2 focus:ring-primary" />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason</Label>
                                            <Textarea value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })}
                                                className="bg-slate-50 border-none rounded-2xl p-6 text-[11px] font-black min-h-[120px] focus:ring-2 focus:ring-primary resize-none"
                                                placeholder="Describe your reason..." />
                                        </div>
                                    </div>
                                    <DialogFooter className="gap-4">
                                        <Button variant="ghost" onClick={() => setIsApplyModalOpen(false)} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
                                        <Button onClick={handleApplyLeave} className="h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 px-12">
                                            Submit Request
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 h-full">
                {!canManageAttendance && !isEmployeeView ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the company leave records.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Tab Navigator */}
                    <div className="flex gap-2 bg-white p-2 rounded-[2rem] border border-white shadow-sm w-fit">
                        {[
                            { key: 'pending', label: `Pending [${pendingLeaves.length}]`, icon: <Clock className="w-4 h-4" /> },
                            { key: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
                            { key: 'balances', label: 'Balances', icon: <CalendarCheck className="w-4 h-4" /> },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as 'pending' | 'history' | 'balances')}
                                className={cn(
                                    "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all",
                                    activeTab === tab.key ? "bg-primary text-white shadow-xl shadow-black/20" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Pending Applications */}
                    {activeTab === 'pending' && (
                        <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[500px]">
                            {pendingLeaves.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingLeaves.map(app => {
                                        const tc = typeConfig[app.type] || typeConfig.other;
                                        return (
                                            <div key={app.id} className="bg-slate-50 hover:bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex items-center gap-8 flex-1">
                                                    <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0", tc.bg)}>
                                                        <CalendarCheck className={cn("w-8 h-8", tc.color)} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className={cn("px-4 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest", tc.bg, tc.color)}>
                                                                {app.type} Leave
                                                            </span>
                                                            <span className="px-4 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" /> Pending
                                                            </span>
                                                        </div>
                                                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
                                                            {!isEmployeeView ? ((app as LeaveWithUser).userName || app.employeeId).toUpperCase() : currentUser?.name || 'Me'}
                                                        </h4>
                                                        <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            <span className="flex items-center gap-2"><CalendarRange className="w-3.5 h-3.5" />{app.startDate} → {app.endDate}</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-2 italic">&ldquo;{app.reason}&rdquo;</p>
                                                    </div>
                                                </div>
                                                {!isEmployeeView && (
                                                    <div className="flex items-center gap-3 self-end md:self-center opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button onClick={() => handleStatusUpdate(app.id, 'rejected')} variant="ghost" className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100">
                                                            <X className="w-5 h-5" />
                                                        </Button>
                                                        <Button onClick={() => handleStatusUpdate(app.id, 'approved')} className="h-14 px-8 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Authorize
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                    <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Pending Requests</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-20 text-center mx-auto max-w-lg leading-relaxed">
                                        All leave requests have been handled.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History */}
                    {activeTab === 'history' && (
                        <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[500px]">
                            {historyLeaves.length > 0 ? (
                                <div className="space-y-4">
                                    {historyLeaves.map(app => {
                                        const sc = statusConfig[app.status] || statusConfig.pending;
                                        const tc = typeConfig[app.type] || typeConfig.other;
                                        return (
                                            <div key={app.id} className="bg-slate-50 p-8 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:bg-white transition-all group flex flex-col md:flex-row md:items-center justify-between gap-8">
                                                <div className="flex items-center gap-8 flex-1">
                                                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shrink-0", app.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50')}>
                                                        {app.status === 'approved' ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <XCircle className="w-7 h-7 text-rose-500" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className={cn("px-4 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5", sc.class)}>
                                                                {sc.icon} {sc.label}
                                                            </span>
                                                            <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", tc.bg, tc.color)}>
                                                                {app.type}
                                                            </span>
                                                        </div>
                                                        {!isEmployeeView && <h4 className="text-sm font-black text-slate-900 uppercase mb-1">{(app as any).userName || app.employeeId}</h4>}
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{app.startDate} → {app.endDate}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                    <History className="w-24 h-24 text-slate-100 mb-8" />
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Records Yet</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-lg mx-auto leading-relaxed">No past leave records found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Balances */}
                    {activeTab === 'balances' && (
                        <div className="space-y-8">
                            {!isEmployeeView && (
                                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-white flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Users2 className="w-5 h-5 text-slate-400" />
                                        <Select onValueChange={setSelectedBalEmp} value={selectedBalEmp}>
                                            <SelectTrigger className="w-64 h-12 bg-slate-50 border-none rounded-xl px-4 text-xs font-black uppercase tracking-widest">
                                                <SelectValue placeholder="Select Employee" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                                {users.map(u => (
                                                    <SelectItem key={u.id} value={u.id} className="text-xs font-bold uppercase">{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedBalEmp && (
                                        <Dialog open={isEditBalOpen} onOpenChange={setIsEditBalOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="h-12 px-6 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest transition-all gap-2">
                                                    Manage Balances
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="rounded-[3rem] p-10 max-w-sm border-none shadow-2xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Balances</DialogTitle>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Adjust total allowed leaves for {targetEmpData?.name || 'this employee'}.</p>
                                                </DialogHeader>
                                                <div className="space-y-6 py-6">
                                                    {[
                                                        { key: 'casual', label: 'Casual Leaves' },
                                                        { key: 'sick', label: 'Sick Leaves' },
                                                        { key: 'earned', label: 'Earned Leaves' }
                                                    ].map(l => (
                                                        <div key={l.key} className="space-y-2">
                                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{l.label}</Label>
                                                            <Input 
                                                                type="number" 
                                                                className="h-12 bg-slate-50 border-none rounded-xl px-4 text-sm font-black" 
                                                                value={editBalances[l.key]} 
                                                                onChange={e => setEditBalances({...editBalances, [l.key]: parseFloat(e.target.value) || 0})}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button variant="ghost" onClick={() => setIsEditBalOpen(false)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</Button>
                                                    <Button onClick={handleSaveBalances} className="flex-1 h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/20">Save</Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            )}

                            {(!isEmployeeView && !selectedBalEmp) ? (
                                <div className="py-32 text-center opacity-30 flex flex-col items-center">
                                    <Users2 className="w-20 h-20 text-slate-100 mb-6" />
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Select an Employee</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {balances.map(item => {
                                        const remaining = Math.max(0, item.total - item.used);
                                        const pct = item.total > 0 ? (item.used / item.total) * 100 : 0;
                                        return (
                                            <div key={item.label} className="bg-white rounded-[3rem] p-10 shadow-sm border border-white hover:shadow-xl transition-all group">
                                                <div className={cn("p-4 rounded-2xl w-fit mb-8", `bg-${item.color}-50`, `text-${item.color}-500`)}>
                                                    {item.icon}
                                                </div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{item.label}</p>
                                                <div className="flex items-end justify-between mb-6">
                                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{remaining}</h3>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">/ {item.total} Days</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-1000", `bg-${item.color}-500`)}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-3">{item.used} Days Used</p>
                                            </div>
                                        );
                                    })}

                                    <div className="md:col-span-3 bg-primary rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-white/10 rounded-2xl text-emerald-400">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Leave Balance Status</p>
                                                <h4 className="text-sm font-black uppercase tracking-tight">Leave balances are up to date</h4>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Updated</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                )}
            </main>
        </div>
    );
};

export default Leaves;
