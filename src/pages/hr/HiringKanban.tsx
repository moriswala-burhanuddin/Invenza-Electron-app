import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLicense } from "@/contexts/LicenseContext";
import { Plus, FileText, Loader2, ArrowLeft, Users2, ClipboardCheck, Award, UserX, Briefcase, ShieldCheck, Zap, Lock } from "lucide-react";

interface Candidate {
    id: string;
    name: string;
    role: string;
    status: 'applied' | 'interview' | 'offer' | 'hired' | 'rejected';
    score: number;
    email?: string;
    phone?: string;
    skills?: string;
}

const COLUMNS = [
    { id: 'applied', label: 'Applied', icon: <Briefcase className="w-4 h-4" />, color: 'text-slate-500', bg: 'bg-slate-50', accent: 'bg-slate-200' },
    { id: 'interview', label: 'Interview', icon: <ClipboardCheck className="w-4 h-4" />, color: 'text-indigo-500', bg: 'bg-indigo-50', accent: 'bg-indigo-300' },
    { id: 'offer', label: 'Offer Sent', icon: <Award className="w-4 h-4" />, color: 'text-amber-500', bg: 'bg-amber-50', accent: 'bg-amber-300' },
    { id: 'hired', label: 'Hired', icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-500', bg: 'bg-emerald-50', accent: 'bg-emerald-300' },
    { id: 'rejected', label: 'Rejected', icon: <UserX className="w-4 h-4" />, color: 'text-rose-500', bg: 'bg-rose-50', accent: 'bg-rose-300' },
];

const HiringKanban = () => {
    const { hasFeature } = useLicense();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [resumeText, setResumeText] = useState("");
    const [parsing, setParsing] = useState(false);
    const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
        name: "", email: "", phone: "", role: "Sales Associate", status: 'applied'
    });

    useEffect(() => { loadCandidates(); }, []);

    const loadCandidates = async () => {
        if (!window.electronAPI) return;
        try {
            const data = await window.electronAPI.getCandidates('store-1');
            setCandidates(data);
        } catch (error) { console.error(error); }
    };

    const handleParseResume = async () => {
        if (!resumeText.trim() || !window.electronAPI) return;
        setParsing(true);
        try {
            const result = await window.electronAPI.parseResume(resumeText);
            setNewCandidate(prev => ({
                ...prev,
                name: result.name || prev.name,
                email: result.email || prev.email,
                phone: result.phone || prev.phone,
                skills: Array.isArray(result.skills) ? result.skills.join(', ') : result.skills,
                score: result.score || 0
            }));
            toast.success(`Resume Analyzed: Match Score ${result.score}/100`);
        } catch (e) {
            toast.error("AI suggestion failed.");
        } finally {
            setParsing(false);
        }
    };

    const handleAddCandidate = async () => {
        if (!newCandidate.name || !newCandidate.role) {
            toast.error("Identification parameters required.");
            return;
        }
        try {
            await window.electronAPI?.addCandidate({ id: `cand-${Date.now()}`, storeId: 'store-1', ...newCandidate, resumeText });
            toast.success("Candidate Node Materialized: Profile synchronized.");
            setIsAddOpen(false);
            setNewCandidate({ name: "", email: "", phone: "", role: "Sales Associate", status: 'applied' });
            setResumeText("");
            loadCandidates();
        } catch (e) {
            toast.error("Profile generation failed.");
        }
    };

    const moveCandidate = async (id: string, newStatus: string) => {
        try {
            await window.electronAPI?.updateCandidateStatus(id, newStatus);
            setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as Candidate['status'] } : c));
        } catch (e) { console.error(e); }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32 flex flex-col">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-full px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Hiring Board</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Job Applications • {candidates.length} Candidates</p>
                        </div>
                    </div>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                                <Plus className="w-4 h-4 text-indigo-400" />
                                ADD CANDIDATE
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl rounded-[3rem] p-12 border-none shadow-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Add New Candidate</DialogTitle>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Add a job applicant to the hiring board.</p>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-10 py-8">
                                <div className="space-y-6">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Zap className="w-3.5 h-3.5 text-indigo-500" /> Paste Resume (AI will read it)
                                    </Label>
                                    <Textarea
                                        className="h-[200px] text-xs font-mono bg-slate-50 border-none rounded-2xl p-6 resize-none"
                                        placeholder="Paste resume text here for AI to fill details automatically..."
                                        value={resumeText}
                                        onChange={e => setResumeText(e.target.value)}
                                    />
                                    {false && hasFeature('Recruitment AI') ? (
                                        <Button onClick={handleParseResume} disabled={parsing || !resumeText} className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 gap-3">
                                            {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                            {parsing ? "Reading..." : "Read Resume with AI"}
                                        </Button>
                                    ) : (
                                        <div className="bg-slate-100 rounded-2xl p-6 text-center border-2 border-dashed border-slate-200 text-slate-400">
                                            <Lock className="w-6 h-6 mx-auto mb-2 opacity-20" />
                                            <p className="text-[9px] font-black uppercase tracking-widest">AI Recruitment Feature Locked</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Full Name', field: 'name', placeholder: 'Full Name' },
                                        { label: 'Email', field: 'email', placeholder: 'Email address' },
                                        { label: 'Job Role', field: 'role', placeholder: 'e.g. Sales Associate' },
                                    ].map(item => (
                                        <div key={item.field} className="space-y-3">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{item.label}</Label>
                                            <Input
                                                value={(newCandidate as Partial<Candidate>)[item.field as keyof Candidate] as string || ''}
                                                onChange={e => setNewCandidate({ ...newCandidate, [item.field]: e.target.value })}
                                                placeholder={item.placeholder}
                                                className="h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    ))}
                                    {(newCandidate.score || 0) > 0 && (
                                        <div className="bg-slate-50 rounded-2xl p-6">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">AI Match Score</p>
                                            <div className="flex items-center gap-4">
                                                <h3 className={cn("text-3xl font-black tracking-tighter", (newCandidate.score || 0) > 70 ? "text-emerald-600" : "text-amber-600")}>{newCandidate.score}/100</h3>
                                                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className={cn("h-full rounded-full", (newCandidate.score || 0) > 70 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${newCandidate.score}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter className="gap-4">
                                <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400">Cancel</Button>
                                <Button onClick={handleAddCandidate} className="h-14 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 px-12">
                                    Save Candidate
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto px-4 sm:px-6 lg:px-8 mt-10 pb-12">
                <div className="flex gap-6 min-w-[1400px] h-full">
                    {COLUMNS.map(col => {
                        const colCandidates = candidates.filter(c => c.status === col.id);
                        return (
                            <div key={col.id} className={cn("flex-1 rounded-[2.5rem] p-6 flex flex-col gap-4 min-h-[600px]", col.bg)}>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2.5 bg-white rounded-xl shadow-sm", col.color)}>
                                            {col.icon}
                                        </div>
                                        <h3 className={cn("font-black text-[11px] uppercase tracking-[0.15em]", col.color)}>{col.label}</h3>
                                    </div>
                                    <span className="bg-white text-slate-500 font-black text-[11px] rounded-xl w-8 h-8 flex items-center justify-center shadow-sm">{colCandidates.length}</span>
                                </div>

                                <div className="flex-1 space-y-3 overflow-y-auto scrollbar-none">
                                    {colCandidates.map(c => (
                                        <div key={c.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-white hover:shadow-xl transition-all group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center text-slate-300 font-black">
                                                    {c.name.charAt(0)}
                                                </div>
                                                {c.score > 0 && (
                                                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black", c.score > 80 ? "bg-emerald-50 text-emerald-600" : c.score > 50 ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600")}>
                                                        {c.score}pts
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-black text-[12px] uppercase tracking-tight text-slate-900 mb-1">{c.name}</h4>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{c.role}</p>
                                            <select
                                                className="w-full h-9 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase px-3 focus:ring-2 focus:ring-primary"
                                                value={c.status}
                                                onChange={e => moveCandidate(c.id, e.target.value)}
                                            >
                                                <option value="applied">APPLIED</option>
                                                <option value="interview">INTERVIEW</option>
                                                <option value="offer">OFFER</option>
                                                <option value="hired">HIRED</option>
                                                <option value="rejected">REJECTED</option>
                                            </select>
                                        </div>
                                    ))}
                                    {colCandidates.length === 0 && (
                                        <div className="py-20 text-center opacity-20 flex flex-col items-center">
                                            <Users2 className="w-12 h-12 text-slate-300 mb-4" />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Candidates</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default HiringKanban;
