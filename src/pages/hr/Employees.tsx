import { useState, useEffect, useCallback } from "react";
import { useERPStore, Employee } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, User as UserIcon, Briefcase, Building2, Calendar, CreditCard, ShieldCheck, ArrowLeft, MoreVertical, Ghost, Mail, Eye, EyeOff, Trash2, Lock, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useStoreConfig } from "@/lib/store-config";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ROLE_OPTIONS = [
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'sales_manager', label: 'Sales Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'accountant', label: 'Accountant' },
];

const DEPARTMENT_OPTIONS = [
    'Management', 'HR', 'Sales', 'Inventory', 'Accounts', 'IT', 'Operations', 'General'
];

const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; class: string }> = {
        employee: { label: 'Employee', class: 'bg-slate-50 text-slate-600 border-slate-100' },
        hr_manager: { label: 'HR Manager', class: 'bg-rose-50 text-rose-600 border-rose-100' },
        sales_manager: { label: 'Sales Manager', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        inventory_manager: { label: 'Inv. Manager', class: 'bg-amber-50 text-amber-700 border-amber-100' },
        accountant: { label: 'Accountant', class: 'bg-sky-50 text-sky-700 border-sky-100' },
        staff: { label: 'Staff', class: 'bg-violet-50 text-violet-600 border-violet-100' },
        admin: { label: 'Admin', class: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
        super_admin: { label: 'Super Admin', class: 'bg-primary text-white border-primary' },
    };
    return map[role] || { label: role.toUpperCase(), class: 'bg-slate-50 text-slate-500 border-slate-100' };
};

const DEFAULT_FORM = {
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    designation: '',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0],
};

const Employees = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [formData, setFormData] = useState({ ...DEFAULT_FORM });
    const navigate = useNavigate();

    const { activeStoreId, addEmployee, deleteEmployee, checkPermission } = useERPStore();
    const { baseCurrency } = useStoreConfig();

    const canManageEmployees = checkPermission('canManageEmployees');

    const loadData = useCallback(async () => {
        if (!canManageEmployees) return;
        setLoading(true);
        try {
            if (window.electronAPI) {
                const emps = await window.electronAPI.getEmployees(activeStoreId || 'store-1');
                setEmployees(emps || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load employee registry.");
        } finally {
            setLoading(false);
        }
    }, [activeStoreId, canManageEmployees]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password || !formData.department || !formData.designation) {
            toast.error("All required fields must be filled.");
            return;
        }
        setSubmitting(true);
        try {
            await addEmployee({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role as any,
                department: formData.department,
                designation: formData.designation,
                salary: parseFloat(formData.salary) || 0,
                joiningDate: formData.joiningDate,
                documents: [],
                storeId: activeStoreId || 'store-1',
                employeeId: '',
                isStaff: false,
                isActive: true
            });
            toast.success(`${formData.name} onboarded successfully. Login account created.`);
            setIsOpen(false);
            setFormData({ ...DEFAULT_FORM });
            loadData();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message?.includes('UNIQUE') ? "An account with this email already exists." : "Failed to create employee profile.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (empId: string) => {
        try {
            await deleteEmployee(empId);
            toast.success("Employee deactivated successfully.");
            setDeleteConfirm(null);
            loadData();
        } catch (err) {
            toast.error("Failed to deactivate employee.");
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.user?.email !== 'burhanuddinmoris52@gmail.com' &&
        emp.user?.email !== 'burhanuddinmoris5253@gmail.com' &&
        (emp.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const set = (key: string, val: string) => setFormData(f => ({ ...f, [key]: val }));

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => window.history.back()} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">All Employees</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                Staff list • {filteredEmployees.length} active
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {canManageEmployees && (
                          <>
                            <div className="group relative">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search employees..."
                                    className="h-14 bg-slate-50 border-none rounded-2xl pl-12 pr-6 text-[11px] font-bold focus:ring-2 focus:ring-primary w-64 placeholder:text-slate-300"
                                />
                            </div>

                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                        <Plus className="w-4 h-4 mr-2" />
                                        ADD EMPLOYEE
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[3rem] p-6 sm:p-10 border-none shadow-2xl">
                                    <DialogHeader className="mb-6 shrink-0">
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Add New Employee</DialogTitle>
                                        <p className="text-xs text-slate-400 font-medium mt-1">
                                            A login account will be created for this employee automatically.
                                        </p>
                                    </DialogHeader>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Login Credentials Section */}
                                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Lock className="w-4 h-4 text-slate-400" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Login Details</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2 col-span-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name *</Label>
                                                    <Input
                                                        value={formData.name}
                                                        onChange={e => set('name', e.target.value)}
                                                        placeholder="e.g. Ahmad Ali"
                                                        required
                                                        className="h-12 bg-white border-slate-200 rounded-xl px-4 text-sm font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email *</Label>
                                                    <Input
                                                        type="email"
                                                        value={formData.email}
                                                        onChange={e => set('email', e.target.value)}
                                                        placeholder="ahmad@company.com"
                                                        required
                                                        className="h-12 bg-white border-slate-200 rounded-xl px-4 text-sm font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password *</Label>
                                                    <div className="relative">
                                                        <Input
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={formData.password}
                                                            onChange={e => set('password', e.target.value)}
                                                            placeholder="Min. 6 characters"
                                                            required
                                                            className="h-12 bg-white border-slate-200 rounded-xl px-4 pr-12 text-sm font-medium"
                                                        />
                                                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors">
                                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Job Role *</Label>
                                                    <Select value={formData.role} onValueChange={val => set('role', val)}>
                                                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl text-sm font-medium">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {ROLE_OPTIONS.map(r => (
                                                                <SelectItem key={r.value} value={r.value} className="text-sm font-medium">{r.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Job Details Section */}
                                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Briefcase className="w-4 h-4 text-slate-400" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Details</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Department *</Label>
                                                    <Select value={formData.department} onValueChange={val => set('department', val)}>
                                                        <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl text-sm font-medium">
                                                            <SelectValue placeholder="Select department" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                            {DEPARTMENT_OPTIONS.map(d => (
                                                                <SelectItem key={d} value={d} className="text-sm font-medium">{d}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Designation *</Label>
                                                    <Input
                                                        value={formData.designation}
                                                        onChange={e => set('designation', e.target.value)}
                                                        placeholder="e.g. Sales Executive"
                                                        required
                                                        className="h-12 bg-white border-slate-200 rounded-xl px-4 text-sm font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monthly Salary ({baseCurrency})</Label>
                                                    <Input
                                                        type="number"
                                                        value={formData.salary}
                                                        onChange={e => set('salary', e.target.value)}
                                                        placeholder="e.g. 35000"
                                                        className="h-12 bg-white border-slate-200 rounded-xl px-4 text-sm font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Joining Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.joiningDate}
                                                        onChange={e => set('joiningDate', e.target.value)}
                                                        className="h-12 bg-white border-slate-200 rounded-xl px-4 text-sm font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents Section */}
                                        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents</p>
                                                </div>
                                                <Button variant="link" type="button" onClick={() => toast.info('PDF Instructions downloading...')} className="px-0 text-[10px] font-black uppercase tracking-widest text-primary h-auto flex items-center gap-1.5">
                                                    PDF Instructions
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Upload ID, Contract, or Resume</Label>
                                                <div className="flex items-center justify-center w-full">
                                                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-100 transition-all">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <FileText className="w-5 h-5 text-slate-400 mb-2" />
                                                            <p className="text-xs text-slate-500 font-black uppercase tracking-tight">Click to upload employee documents</p>
                                                            <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest mt-2 px-3 py-1 bg-rose-50 rounded-lg border border-rose-100">
                                                                ⚠️ PLEASE UPLOAD ALL DOCUMENTS TOGETHER IN ONE PDF
                                                            </p>
                                                        </div>
                                                        <input id="dropzone-file" type="file" className="hidden" accept="application/pdf" />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-2">
                                            <Button type="button" variant="ghost" className="h-12 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => setIsOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" disabled={submitting} className="h-12 px-12 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 disabled:opacity-50">
                                                {submitting ? 'Creating...' : 'Create Employee'}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                          </>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {!canManageEmployees ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the employee registry.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white min-h-[700px]">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Employee List</h3>
                        </div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            {filteredEmployees.length} of {employees.length} employees
                        </p>
                    </div>

                    {loading ? (
                        <div className="py-32 text-center">
                            <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-6" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loading registry...</p>
                        </div>
                    ) : filteredEmployees.length > 0 ? (
                        <div className="space-y-3">
                            {filteredEmployees.map((emp) => {
                                const roleBadge = getRoleBadge(emp.user?.role || 'employee');
                                return (
                                    <div key={emp.id} className="bg-slate-50 hover:bg-white p-6 rounded-[2rem] border border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-6 flex-1 min-w-0">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-foreground group-hover:bg-slate-50 transition-all shadow-sm shrink-0">
                                                <UserIcon className="w-7 h-7" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                                    <span className="text-[9px] font-black text-slate-300 font-mono tracking-widest">ID:{emp.id.substring(4, 12).toUpperCase()}</span>
                                                    <div className={cn("px-3 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5", roleBadge.class)}>
                                                        <ShieldCheck className="w-3 h-3" />
                                                        {roleBadge.label}
                                                    </div>
                                                    <div className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[8px] font-black uppercase tracking-widest">
                                                        {emp.department}
                                                    </div>
                                                </div>
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{emp.user?.name || "Unknown"}</h4>
                                                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1.5">
                                                    {emp.user?.email && (
                                                        <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                            <Mail className="w-3 h-3 text-slate-300" /> {emp.user.email}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                        <Briefcase className="w-3 h-3 text-slate-300" /> {emp.designation}
                                                    </p>
                                                    <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3 text-slate-300" /> Since {emp.joiningDate}
                                                    </p>
                                                    {emp.salary > 0 && (
                                                        <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1.5">
                                                            <CreditCard className="w-3 h-3 text-slate-300" /> {formatCurrency(emp.salary)}/mo
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                                            {deleteConfirm === emp.id ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-rose-500 uppercase">Confirm?</span>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(emp.id)} className="h-9 px-4 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-black uppercase text-[9px]">Yes</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)} className="h-9 px-4 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[9px]">No</Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => navigate(`/hr/employees/${emp.id}`)}
                                                        className="h-12 w-12 rounded-2xl bg-white text-slate-200 hover:text-foreground border border-slate-100 shadow-sm transition-all group-hover:border-slate-200"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => setDeleteConfirm(emp.id)} className="h-12 w-12 rounded-2xl bg-white text-slate-200 hover:text-rose-500 border border-slate-100 shadow-sm transition-all group-hover:border-slate-200">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-40 text-center opacity-30 flex flex-col items-center">
                            <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Employees Yet</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 px-20 text-center mx-auto max-w-lg leading-relaxed">
                                Click "Add Employee" to add staff members.
                            </p>
                        </div>
                    )}
                  </div>
                )}
            </main>
        </div>
    );
};

export default Employees;
