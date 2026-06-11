import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useERPStore, HRAttendance } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Zap, Target, Activity, MoreHorizontal, ArrowLeft, ArrowRight, UserCheck, ShieldCheck, Fingerprint, Calendar as CalendarIcon, Download, Search, Ghost } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AttendanceProps {
    isEmployeeView?: boolean;
}

const Attendance = ({ isEmployeeView = false }: AttendanceProps) => {
    const { currentUser, hrAttendance, checkIn, checkOut, fetchAttendance, checkPermission } = useERPStore();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [searchQuery, setSearchQuery] = useState('');

    const canManageAttendance = checkPermission('canManageAttendance');

    useEffect(() => {
        if (canManageAttendance || isEmployeeView) {
          const startDate = date ? new Date(date).toISOString().split('T')[0] : undefined;
          const endDate = date ? new Date(date).toISOString().split('T')[0] : undefined;
          fetchAttendance(startDate, endDate);
        }
    }, [date, fetchAttendance, canManageAttendance, isEmployeeView]);

    const todayRecord = hrAttendance.find(a => {
        const today = new Date().toISOString().split('T')[0];
        return a.employeeId?.toLowerCase() === currentUser?.employeeId?.toLowerCase() && a.date === today;
    });

    const isCheckedIn = !!todayRecord && !todayRecord.checkOut;

    const handleAttendanceAction = async () => {
        toast.info(isCheckedIn ? "Checking out..." : "Recording Attendance...");
        const action = isCheckedIn ? checkOut : checkIn;
        const result = await action();

        if (result.success) {
            toast.success(`Attendance marked successfully`);
        } else {
            toast.error(`Error: ${result.message || "Something went wrong"}`);
        }
    };

    const formatTime = (timeString?: string) => {
        if (!timeString) return "--:--";
        if (timeString.includes('T')) {
          // ISO format: 2026-04-08T16:16:58.352Z
          return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // HH:MM:SS format: 16:16:58
        const [h, m] = timeString.split(':');
        const d = new Date();
        d.setHours(parseInt(h), parseInt(m));
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'present': return { icon: <CheckCircle className="w-3.5 h-3.5" />, class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Present' };
            case 'late': return { icon: <Clock className="w-3.5 h-3.5" />, class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Late' };
            case 'absent': return { icon: <XCircle className="w-3.5 h-3.5" />, class: 'bg-rose-50 text-rose-600 border-rose-100', label: 'Absent' };
            default: return { icon: <Activity className="w-3.5 h-3.5" />, class: 'bg-slate-50 text-slate-500 border-slate-100', label: status };
        }
    };

    const filteredAttendance = hrAttendance.filter(record =>
        record.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                {isEmployeeView ? 'My Attendance' : 'Attendance System'}
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                {isEmployeeView ? 'Your daily records' : 'Staff attendance overview'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isEmployeeView ? (
                            <Button
                                onClick={handleAttendanceAction}
                                className={cn(
                                    "h-14 px-12 rounded-[1.2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-3",
                                    isCheckedIn ? "bg-rose-600 text-white shadow-rose-200" : "bg-primary text-white shadow-black/20"
                                )}
                            >
                                <Fingerprint className="w-5 h-5" />
                                {isCheckedIn ? 'Check Out' : 'Check In'}
                            </Button>
                        ) : canManageAttendance && (
                            <div className="flex gap-2">
                                <Button variant="ghost" className="h-12 rounded-2xl bg-slate-50 font-black uppercase text-[9px] tracking-widest text-slate-400 px-8 flex items-center gap-2 hover:bg-slate-100 hover:text-foreground">
                                    <Download className="w-4 h-4" />
                                    Export Logs
                                </Button>
                                <Button className="h-12 rounded-2xl bg-primary text-white px-10 font-black uppercase text-[9px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Override Entry
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                {!canManageAttendance && !isEmployeeView ? (
                  <div className="lg:col-span-12 bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the company attendance logs.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Temporal Controls */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white rounded-[3rem] p-4 shadow-sm border border-white overflow-hidden">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="w-full rounded-2xl"
                            />
                        </div>

                        <div className="bg-primary rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
                            <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                            <div className="relative z-10">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Monthly Stats</h4>
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Attendance Rate</p>
                                            <p className="text-xl font-black text-white leading-none tracking-tighter">-- %</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400">
                                            <Target className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Lateness</p>
                                            <p className="text-xl font-black text-white leading-none tracking-tighter">-- min</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Stream */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div className="bg-white p-4 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 px-12 border border-white shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shadow-sm">
                                    <CalendarIcon className="w-5 h-5" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                    {isEmployeeView ? 'My Records' : `Attendance for: ${date?.toDateString().toUpperCase()}`}
                                </h3>
                            </div>
                            <div className="relative w-full md:w-64 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="h-12 bg-slate-50 border-none rounded-xl pl-12 pr-6 text-[10px] font-black uppercase focus:ring-2 focus:ring-primary w-full"
                                    placeholder="SEARCH EMPLOYEE..."
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[600px]">
                            {filteredAttendance.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredAttendance.map((record) => {
                                        const status = getStatusConfig(record.status);
                                        return (
                                            <div key={record.id} className="bg-slate-50 hover:bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group flex items-center justify-between">
                                                <div className="flex items-center gap-8">
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-foreground transition-all shadow-sm shrink-0 relative overflow-hidden">
                                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <Fingerprint className="w-7 h-7 relative z-10" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest opacity-60">ID:{record.id.substring(4, 10).toUpperCase()}</span>
                                                            <div className={cn("px-4 py-1 rounded-full border text-[7px] font-black uppercase tracking-widest flex items-center gap-2", status.class)}>
                                                                {status.icon}
                                                                {status.label}
                                                            </div>
                                                        </div>
                                                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">{record.name || "Unknown Employee"}</h4>
                                                        <div className="flex items-center gap-8">
                                                            <div className="flex items-center gap-3 group/time">
                                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-400 shadow-sm border border-emerald-50">
                                                                    <ArrowRight className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Entry</p>
                                                                    <p className="text-xs font-black text-slate-900 font-mono tracking-widest">{formatTime(record.checkIn)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3 group/time">
                                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-400 shadow-sm border border-rose-50">
                                                                    <ArrowLeft className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Exit</p>
                                                                    <p className="text-xs font-black text-slate-900 font-mono tracking-widest">{formatTime(record.checkOut)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-white text-slate-200 hover:text-foreground border border-slate-100 shadow-sm transition-all group-hover:border-slate-200">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-40 text-center opacity-30 flex flex-col items-center">
                                    <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Records Found</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-20 text-center mx-auto max-w-lg leading-relaxed">
                                        No attendance records found for this date. Check again later.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                  </>
                )}
            </main>
        </div>
    );
};

export default Attendance;
