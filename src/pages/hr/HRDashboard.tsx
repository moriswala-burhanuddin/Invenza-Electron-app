import { useState, useEffect } from "react";
import { useERPStore } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Users, Clock, CalendarCheck, UserX, CreditCard, FileText, Zap, TrendingUp, ShieldCheck, Activity, Target, Briefcase, Plus, Search, ChevronRight, Bell, Gauge } from "lucide-react";
import { HRAttendance } from "@/lib/store-data";
import { cn, formatCurrency } from "@/lib/utils";

interface HRDashboardProps {
    isEmployeeView?: boolean;
}

const HRDashboard = ({ isEmployeeView = false }: HRDashboardProps) => {
    const { currentUser, getStoreSales, getStoreProducts, getStoreCustomers, getActiveStore, checkPermission } = useERPStore();

    const activeStore = getActiveStore();
    const canManageEmployees = checkPermission('canManageEmployees');

    const [attendanceStats, setAttendanceStats] = useState({
        present: 0,
        late: 0,
        absent: 0,
        total: 0
    });

    useEffect(() => {
        const loadData = async () => {
            if (!canManageEmployees && !isEmployeeView) return;
            try {
                if (window.electronAPI) {
                    const today = new Date().toISOString().split('T')[0];
                    const isAdmin = ['admin', 'super_admin', 'hr_manager'].includes(currentUser?.role || '');
                    const fetchEmployeeId = isEmployeeView ? currentUser?.employeeId : (isAdmin ? undefined : currentUser?.employeeId);
                    const att = (await window.electronAPI.getAttendance(fetchEmployeeId, today, today)) || [];
                    const users = (await window.electronAPI.getUsers()) || [];
                    const totalStaff = users.length;

                    setAttendanceStats({
                        present: att.filter((a: HRAttendance) => a.status === 'present').length,
                        late: att.filter((a: HRAttendance) => a.status === 'late').length,
                        absent: Math.max(0, totalStaff - att.length),
                        total: totalStaff
                    });
                }
            } catch (err) {
                console.error("HR LoadData Error:", err);
            }
        };

        loadData();
    }, [currentUser, isEmployeeView, canManageEmployees]);

    const navItems = [
        { label: 'Employees', icon: <Users className="w-4 h-4" />, href: '#/hr/employees' },
        { label: 'Attendance', icon: <Clock className="w-4 h-4" />, href: '#/hr/attendance' },
        { label: 'Leaves', icon: <CalendarCheck className="w-4 h-4" />, href: '#/hr/leaves' },
        { label: 'Shifts', icon: <Activity className="w-4 h-4" />, href: '#/hr/schedule' },
        { label: 'Payroll', icon: <CreditCard className="w-4 h-4" />, href: '#/hr/payroll' },
    ];

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-slate-200">
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{isEmployeeView ? `Welcome, ${currentUser?.name || 'User'}` : 'HR'}</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{isEmployeeView ? 'Your Dashboard' : 'Staff Overview'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isEmployeeView ? (
                            <div className="flex gap-2">
                                {navItems.map((item) => (
                                    <Button key={item.label} variant="ghost" onClick={() => window.location.hash = item.href} className="h-12 rounded-2xl bg-slate-50 font-black uppercase text-[9px] tracking-widest text-slate-400 px-6 gap-2 hover:bg-slate-100 hover:text-foreground transition-all">
                                        {item.icon}
                                        {item.label}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Button onClick={() => window.location.hash = '#/employee/attendance'} className="h-12 rounded-2xl bg-primary text-white px-10 font-black uppercase text-[9px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Mark Attendance</Button>
                                <Button variant="ghost" onClick={() => window.location.hash = '#/employee/leave'} className="h-12 rounded-2xl bg-slate-50 font-black uppercase text-[9px] tracking-widest text-slate-400 px-10 hover:bg-slate-100">Apply for Leave</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 h-full">
                {!canManageEmployees && !isEmployeeView ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view the HR dashboard or employee analytics.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Global Metrics */}
                    <div className="grid md:grid-cols-4 gap-6 mb-12">
                        {!isEmployeeView ? (
                            <>
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                    <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6 text-indigo-500">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Present Today</p>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{attendanceStats.present + attendanceStats.late} / {attendanceStats.total}</h3>
                                </div>
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                    <div className="p-3 bg-amber-50 rounded-xl w-fit mb-6 text-amber-500">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Late Arrivals</p>
                                    <h3 className="text-2xl font-black text-amber-600 tracking-tighter">{attendanceStats.late} Employees</h3>
                                </div>
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                    <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-6 text-emerald-500">
                                        <CalendarCheck className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">On Approved Leave</p>
                                    <h3 className="text-2xl font-black text-emerald-600 tracking-tighter">--</h3>
                                </div>
                                <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/10 relative overflow-hidden group">
                                    <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                                    <div className="relative z-10">
                                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Staff Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Operations Normal</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                    <div className="p-3 bg-green-50 rounded-xl w-fit mb-6 text-green-500">
                                        <CalendarCheck className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendance (Month)</p>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter">-- / -- Days</h3>
                                </div>
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                    <div className="p-3 bg-amber-50 rounded-xl w-fit mb-6 text-amber-500">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Times Late</p>
                                    <h3 className="text-2xl font-black text-amber-600 tracking-tighter">--</h3>
                                </div>
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                                    <div className="p-3 bg-indigo-50 rounded-xl w-fit mb-6 text-indigo-500">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Leaves</p>
                                    <h3 className="text-2xl font-black text-indigo-600 tracking-tighter">--</h3>
                                </div>
                                <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200">
                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Upcoming Salary</p>
                                    <h3 className="text-2xl font-black tracking-tighter">Next Month</h3>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid gap-8 lg:grid-cols-12">
                        {/* Main Feed Container */}
                        <div className="lg:col-span-12 xl:col-span-12 space-y-8">
                            <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white relative overflow-hidden group">
                                <Activity className="absolute -right-20 -top-20 w-80 h-80 text-slate-50 group-hover:text-indigo-50/50 transition-colors duration-1000" />
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-12">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Activity</h3>
                                    </div>
                                    <div className="h-[300px] flex flex-col items-center justify-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-center">
                                        <Gauge className="w-16 h-16 text-slate-100 mb-6" />
                                        <h4 className="text-xl font-black text-slate-300 uppercase tracking-tight">Activity Log</h4>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2">Recent actions will show here.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </>
                )}
            </main>
        </div>
    );
};

export default HRDashboard;
