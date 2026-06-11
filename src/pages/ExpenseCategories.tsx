import { useState } from 'react';
import { useERPStore, ExpenseCategory } from '@/lib/store-data';
import { Plus, FolderTree, Trash2, Tag, ArrowLeft, Layers, Smartphone, Ghost, Target, Zap, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ExpenseCategories() {
    const { expenseCategories, addExpenseCategory, deleteExpenseCategory } = useERPStore();
    const [newCat, setNewCat] = useState({ name: '', parentId: 'none' });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCat.name) {
            toast.error('ENTITY_INVALID: Category name required for node instantiation.');
            return;
        }
        await addExpenseCategory({
            name: newCat.name,
            parentId: newCat.parentId === 'none' ? undefined : newCat.parentId
        });
        toast.success('Expense category added.');
        setNewCat({ name: '', parentId: 'none' });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this expense category? This will affect related records.')) {
            await deleteExpenseCategory(id);
            toast.error('Expense category deleted.');
        }
    };

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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Taxonomy Architecture</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Classification Hub • {expenseCategories.length} Overhead Nodes</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Node Instantiation */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-white">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-3 bg-slate-900 rounded-xl text-white shadow-xl shadow-slate-200">
                                <Plus className="w-4 h-4" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Instantiate Node</h3>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-8">
                            <div className="space-y-2 group">
                                <Label className="text-[9px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Entity Label</Label>
                                <Input
                                    value={newCat.name}
                                    onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                                    placeholder="NODE_NAME (E.G. UTILITIES)"
                                    className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2 group">
                                <Label className="text-[9px] font-black text-slate-400 ml-4 h-4 block uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">Parent Hierarchy</Label>
                                <div className="relative">
                                    <Select value={newCat.parentId} onValueChange={v => setNewCat({ ...newCat, parentId: v })}>
                                        <SelectTrigger className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none transition-all">
                                            <SelectValue placeholder="TOP_LEVEL_NODE" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                            <SelectItem value="none" className="font-black uppercase text-[10px] tracking-widest">NONE (ROOT_NODE)</SelectItem>
                                            {expenseCategories.filter(c => !c.parentId).map(c => (
                                                <SelectItem key={c.id} value={c.id} className="font-black uppercase text-[10px] tracking-widest">{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                Initialize Classification
                            </Button>
                        </form>
                    </div>

                    <div className="bg-primary rounded-[3.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-black/30">
                        <Zap className="absolute -right-4 -top-4 w-24 h-24 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-700" />
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Taxonomy Health</h4>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-[11px] font-black uppercase">
                                <span className="text-slate-400">Total Sectors</span>
                                <span>{expenseCategories.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-black uppercase">
                                <span className="text-slate-400">Root Nodes</span>
                                <span>{expenseCategories.filter(c => !c.parentId).length}</span>
                            </div>
                            <div className="h-2 w-full bg-white/10 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[65%]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Master Taxonomy List */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[4rem] shadow-sm border border-white overflow-hidden min-h-[600px]">
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-900 border border-slate-50">
                                    <FolderTree className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Node Topology</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Index of identified classifications</p>
                                </div>
                            </div>
                        </div>

                        {expenseCategories.length > 0 ? (
                            <div className="divide-y divide-slate-50">
                                {expenseCategories.map((cat) => (
                                    <div key={cat.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-all duration-300 group">
                                        <div className="flex items-center gap-8">
                                            <div className={cn(
                                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                                                cat.parentId ? "ml-12 bg-slate-50 text-slate-300 border border-slate-100" : "bg-primary text-white shadow-xl shadow-slate-200"
                                            )}>
                                                <Tag className={cn("transition-transform group-hover:scale-110", cat.parentId ? "w-4 h-4" : "w-6 h-6")} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{cat.name}</h4>
                                                    {!cat.parentId && <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 px-2 py-0.5 rounded-md font-black text-[8px] uppercase">ROOT_NODE</Badge>}
                                                </div>
                                                {cat.parentId ? (
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                        <Layers className="w-3 h-3" /> Subcategory Of: {expenseCategories.find(p => p.id === cat.parentId)?.name || 'ROOT'}
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Classification Sector</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button className="p-3 bg-white hover:bg-slate-100 rounded-xl transition-all text-slate-200 hover:text-foreground border border-slate-50 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-3 bg-white hover:bg-rose-50 rounded-xl transition-all text-slate-200 hover:text-rose-500 border border-slate-50 opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 text-center opacity-30">
                                <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Taxonomy Empty</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 max-w-sm">No classification nodes detected. Initialize sectors to organize corporate overhead.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
