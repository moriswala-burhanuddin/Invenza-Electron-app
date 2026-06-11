import { useState, useEffect } from "react";
import { useERPStore } from "@/lib/store-data";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeft, Download, Calculator, DollarSign, TrendingDown, TrendingUp, ShieldCheck, Ghost, CreditCard, CheckCircle2, Clock } from "lucide-react";

interface PayrollProps {
    isEmployeeView?: boolean;
}

const Payroll = ({ isEmployeeView = false }: PayrollProps) => {
    const { currentUser, hrPayroll, fetchPayroll, checkPermission, updatePayrollStatus } = useERPStore();

    const canManagePayroll = checkPermission('canManagePayroll');

    useEffect(() => {
        if (canManagePayroll || isEmployeeView) {
          fetchPayroll();
        }
    }, [fetchPayroll, canManagePayroll, isEmployeeView]);

    const displayPayrolls = isEmployeeView
        ? hrPayroll.filter(p => p.employeeId === currentUser?.employeeId)
        : hrPayroll;

    const totalNet = displayPayrolls.reduce((sum, r) => sum + r.netSalary, 0);
    const totalDeductions = displayPayrolls.reduce((sum, r) => sum + r.deductions, 0);
    const totalAllowances = displayPayrolls.reduce((sum, r) => sum + r.allowances, 0);

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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Payroll</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                {isEmployeeView ? 'Your Salary Records' : `${displayPayrolls.length} Payroll Records`}
                            </p>
                        </div>
                    </div>
                    {!isEmployeeView && canManagePayroll && (
                        <Button className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3">
                            <Calculator className="w-4 h-4 text-indigo-400" />
                            Run Payroll
                        </Button>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 h-full">
                {!canManagePayroll && !isEmployeeView ? (
                  <div className="bg-white rounded-[3rem] p-24 text-center border border-white flex flex-col items-center justify-center opacity-70">
                    <ShieldCheck className="w-24 h-24 text-slate-200 mb-6" />
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-3 leading-relaxed max-w-sm mx-auto">
                      You do not have permission to view or manage the company payroll.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {/* Intelligence Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                            <div className="p-4 bg-emerald-50 rounded-2xl w-fit mb-8 text-emerald-500">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pay (Net)</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalNet)}</h3>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                            <div className="p-4 bg-indigo-50 rounded-2xl w-fit mb-8 text-indigo-500">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Allowances</p>
                            <h3 className="text-3xl font-black text-emerald-600 tracking-tighter">+{formatCurrency(totalAllowances)}</h3>
                        </div>
                        <div className="bg-primary rounded-[2.5rem] p-10 text-white shadow-2xl shadow-black/20 flex flex-col justify-center">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-white/10 rounded-2xl text-rose-400">
                                    <TrendingDown className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deductions</span>
                            </div>
                            <h3 className="text-3xl font-black tracking-tighter">-{formatCurrency(totalDeductions)}</h3>
                        </div>
                    </div>

                    {/* Payroll Ledger */}
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-sm border border-white">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Salary Records</h3>
                            </div>
                        </div>

                        {displayPayrolls.length > 0 ? (
                            <div className="space-y-4">
                                {displayPayrolls.map(row => (
                                    <div key={row.id} className="bg-slate-50 hover:bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group flex flex-col md:flex-row md:items-center justify-between gap-8">
                                        <div className="flex items-center gap-8 flex-1">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 group-hover:bg-primary group-hover:text-white transition-all shadow-sm shrink-0">
                                                <CreditCard className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={cn("px-4 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                                        row.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    )}>
                                                        {row.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                        {row.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{row.employeeId}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{row.month}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 md:gap-16">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Basic</p>
                                                <p className="text-sm font-black text-slate-900">{formatCurrency(row.basicSalary)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Deductions</p>
                                                <p className="text-sm font-black text-rose-600">-{formatCurrency(row.deductions)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Allowances</p>
                                                <p className="text-sm font-black text-emerald-600">+{formatCurrency(row.allowances)}</p>
                                            </div>
                                            <div className="text-center min-w-[100px]">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Net</p>
                                                <p className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(row.netSalary)}</p>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <Button variant="ghost" className="h-10 w-14 rounded-xl bg-white text-slate-400 hover:text-foreground border border-slate-100 shadow-sm transition-all">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                {['draft', 'pending'].includes(row.status) && !isEmployeeView && canManagePayroll && (
                                                    <Button 
                                                        onClick={async () => {
                                                            try {
                                                                await updatePayrollStatus(row.id, 'paid');
                                                                toast.success("Payroll marked as PAID.");
                                                                fetchPayroll();
                                                            } catch(e) {
                                                                toast.error("Failed to update status.");
                                                            }
                                                        }} 
                                                        className="h-10 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shadow-md transition-all">
                                                        Mark Paid
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-32 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-24 h-24 text-slate-100 mb-8" />
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Payroll Data</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-lg mx-auto leading-relaxed">No payroll records found for this period.</p>
                            </div>
                        )}
                    </div>
                  </div>
                )}
            </main>
        </div>
    );
};

export default Payroll;
