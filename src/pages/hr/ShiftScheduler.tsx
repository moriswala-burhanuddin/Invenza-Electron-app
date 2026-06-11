import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLicense } from "@/contexts/LicenseContext";
import { useERPStore } from "@/lib/store-data";
import { Calendar, Clock, Plus, Sparkles, Ghost, ArrowLeft, Zap, Users2, Lock } from "lucide-react";

const ShiftScheduler = () => {
    const { hasFeature } = useLicense();
    const [shifts, setShifts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aiInsights, setAiInsights] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState("");
    const [shiftType, setShiftType] = useState("Custom Shift");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("18:00");
    const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
    const { activeStoreId } = useERPStore();
    const [employees, setEmployees] = useState<any[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            if (window.electronAPI && activeStoreId) {
                const emps = await window.electronAPI.getEmployees(activeStoreId);
                setEmployees(emps || []);
                const today = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(today.getDate() + 7);
                const fetchedShifts = await window.electronAPI.getShifts(activeStoreId, today.toISOString().split('T')[0], nextWeek.toISOString().split('T')[0]);
                setShifts(fetchedShifts);
            }
        } catch (error) {
            toast.error("LINK_FAILURE: Schedule data synchronization failed.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [activeStoreId]);

    const handleSmartSchedule = async () => {
        setAnalyzing(true);
        try {
            if (window.electronAPI) {
                const sales = await window.electronAPI.getSales(activeStoreId!);
                const result = await window.electronAPI.optimizeSchedule(sales, users);
                if (result.recommendedShifts?.length > 0) {
                    toast.success(`Smart schedule done: ${result.recommendedShifts.length} shifts added.`);
                    setAiInsights(result.insights);
                    for (const s of result.recommendedShifts) {
                        await window.electronAPI.assignShift({ id: `shift-${Date.now()}-${Math.random()}`, employeeId: s.employeeId || s.userId, storeId: activeStoreId, startTime: `${s.date}T${s.startTime}:00`, endTime: `${s.date}T${s.endTime}:00`, type: s.type });
                    }
                    loadData();
                } else {
                    toast.info("Shifts look fine. No changes needed.");
                }
            }
        } catch (e) {
            toast.error("Smart schedule failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const handleAddShift = async () => {
        if (!selectedUser || !shiftDate || !startTime || !endTime) return;
        try {
            await window.electronAPI?.assignShift({ id: `shift-${Date.now()}`, employeeId: selectedUser, storeId: activeStoreId, startTime: `${shiftDate}T${startTime}:00`, endTime: `${shiftDate}T${endTime}:00`, type: shiftType });
            toast.success("Shift assigned successfully.");
            setIsDialogOpen(false);
            loadData();
        } catch { toast.error("Assignment protocol failed."); }
    };

    const shiftTypeConfig: Record<string, { class: string; label: string }> = {
        morning: { class: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Morning Shift' },
        evening: { class: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'Evening Shift' },
        full: { class: 'bg-blue-50 text-blue-600 border-blue-100', label: 'Full Day Shift' },
    };

    const getShiftConfig = (s: any) => {
        if (shiftTypeConfig[s.type]) return shiftTypeConfig[s.type];
        return { class: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: s.type || 'Custom Shift' };
    };

    const groupedShifts = shifts.reduce((acc: any, shift) => {
        const date = shift.startTime.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(shift);
        return acc;
    }, {});

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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Shift Schedule</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Staff Shifts • {shifts.length} Total</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                    {hasFeature('HR & Performance AI') ? (
                        <Button onClick={handleSmartSchedule} disabled={analyzing} className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                            <Sparkles className={cn("w-4 h-4", analyzing && "animate-pulse")} />
                            {analyzing ? "Setting up..." : "Smart Schedule"}
                        </Button>
                    ) : (
                        <Button disabled className="h-14 px-8 rounded-2xl bg-slate-100 text-slate-400 font-black uppercase text-[10px] tracking-widest border-none cursor-not-allowed gap-3">
                            <Lock className="w-4 h-4 opacity-30" />
                            Smart Schedule Locked
                        </Button>
                    )}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                                    <Plus className="w-4 h-4 text-indigo-400" />
                                    Add Shift
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[3rem] p-12 max-w-md border-none shadow-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Add a Shift</DialogTitle>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Pick an employee, date, and shift time.</p>
                                </DialogHeader>
                                <div className="space-y-6 py-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee</Label>
                                        <Select onValueChange={setSelectedUser}>
                                            <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase">
                                                <SelectValue placeholder="Select Employee" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                {employees.map(e => <SelectItem key={e.id} value={e.id} className="text-[11px] font-black uppercase">{e.user?.name || e.id}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</Label>
                                        <input type="date" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-primary outline-none" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Time</Label>
                                            <input type="time" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-primary outline-none" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Time</Label>
                                            <input type="time" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-primary outline-none" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Label</Label>
                                        <input type="text" placeholder="e.g. Flex Shift" className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-sm font-black focus:ring-2 focus:ring-primary outline-none" value={shiftType} onChange={e => setShiftType(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Button type="button" onClick={() => setIsDialogOpen(false)} variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
                                    <Button onClick={handleAddShift} className="flex-1 h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20">
                                        Save Shift
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-10">
                {/* AI Insights Banner */}
                {aiInsights && (
                    <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 flex items-start gap-6">
                        <div className="p-4 bg-white/10 rounded-2xl text-indigo-300 shrink-0">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Smart Suggestion</h4>
                            <p className="text-sm font-bold leading-relaxed opacity-90">{aiInsights}</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="py-40 text-center flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-6" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading shifts...</p>
                    </div>
                ) : Object.keys(groupedShifts).length > 0 ? (
                    <div className="space-y-12">
                        {Object.entries(groupedShifts).sort().map(([date, dayShifts]: [string, any]) => (
                            <div key={date}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-primary rounded-2xl text-white">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
                                    </h3>
                                    <span className="px-4 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full uppercase tracking-widest">{dayShifts.length} Shifts</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {dayShifts.map((shift: any) => {
                                        const tc = shiftTypeConfig[shift.type] || shiftTypeConfig.full;
                                        return (
                                            <div key={shift.id} className="bg-white rounded-[2.5rem] p-8 border-2 border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group">
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className="w-16 h-16 rounded-[1.8rem] bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center text-slate-200 text-xl font-black">
                                                        {(shift.userName || '?').charAt(0)}
                                                    </div>
                                                    <span className={cn("px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest", tc.class)}>
                                                        {tc.label}
                                                    </span>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">{shift.userName || 'UNASSIGNED'}</h4>
                                                <div className="space-y-1 mb-6">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{shift.userRole || 'NO_ROLE'}</p>
                                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest opacity-60">{shift.userEmail || ''}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest font-mono">
                                                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[3.5rem] py-40 text-center flex flex-col items-center opacity-30">
                        <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Shifts Scheduled</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-lg mx-auto leading-relaxed px-12">
                            No shifts for the next 7 days. Use Smart Schedule or add a shift manually.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ShiftScheduler;
