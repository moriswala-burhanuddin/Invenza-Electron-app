import { useState } from 'react';
import { useERPStore, CustomField } from '@/lib/store-data';
import { Plus, Trash2, Edit2, Settings2, Hash, Type, Calendar, ToggleLeft, ChevronRight, ArrowLeft, Layers, ShieldCheck, Info, Ghost, Smartphone, LayoutGrid, Zap } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function CustomFields() {
    const { customFields, addCustomField, updateCustomField, deleteCustomField } = useERPStore();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingField, setEditingField] = useState<CustomField | null>(null);

    // Form State
    const [label, setLabel] = useState('');
    const [type, setType] = useState<'text' | 'number' | 'date' | 'select'>('text');
    const [defaultValue, setDefaultValue] = useState('');
    const [isRequired, setIsRequired] = useState(false);

    const resetForm = () => {
        setLabel('');
        setType('text');
        setDefaultValue('');
        setIsRequired(false);
        setEditingField(null);
    };

    const handleSubmit = async () => {
        if (!label) {
            toast.error('Error: Field name is required.');
            return;
        }

        const fieldData = {
            label: label,
            type: type,
            defaultValue,
            isRequired,
            showOnReceipt: false,
            targetType: 'product' as const,
            updatedAt: new Date().toISOString()
        };

        try {
            if (editingField) {
                await updateCustomField(editingField.id, fieldData);
                toast.success('Success: Field updated.');
            } else {
                await addCustomField(fieldData);
                toast.success('Success: New field added.');
            }
            setIsAddOpen(false);
            resetForm();
        } catch (error) {
            toast.error('System Error: Could not save the field.');
        }
    };

    const handleEdit = (field: CustomField) => {
        setEditingField(field);
        setLabel(field.label);
        setType(field.type);
        setDefaultValue(field.defaultValue || '');
        setIsRequired(field.isRequired);
        setIsAddOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this custom field?')) return;
        try {
            await deleteCustomField(id);
            toast.info('Field removed.');
        } catch (error) {
            toast.error('Failed to remove field');
        }
    };

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
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Custom Fields Setup</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Add extra details to your products and sales</p>
                        </div>
                    </div>

                    <Dialog open={isAddOpen} onOpenChange={(val) => { setIsAddOpen(val); if (!val) resetForm(); }}>
                        <DialogTrigger asChild>
                            <button className="flex items-center gap-3 bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 uppercase">
                                <Plus className="w-4 h-4" />
                                <span>Add New Field</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[440px] rounded-[3rem] border-none shadow-[0_32px_128px_rgba(0,0,0,0.1)] p-0 overflow-hidden">
                            <div className="p-10">
                                <DialogHeader className="mb-8">
                                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                                        {editingField ? 'Edit Field' : 'Add New Field'}
                                    </DialogTitle>
                                    <DialogDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Add extra information that isn't included in the standard system.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Field Name</Label>
                                        <input
                                            value={label}
                                            onChange={e => setLabel(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none placeholder:text-slate-200 shadow-sm"
                                            placeholder="E.G. COLOR, SIZE, ETC."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type of Information</Label>
                                        <select
                                            value={type}
                                            onChange={e => setType(e.target.value as 'text' | 'number' | 'date' | 'select')}
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none shadow-sm appearance-none"
                                        >
                                            <option value="text">Text</option>
                                            <option value="number">Number</option>
                                            <option value="date">Date</option>
                                            <option value="select">Dropdown List</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Default Value (Optional)</Label>
                                        <input
                                            value={defaultValue}
                                            onChange={e => setDefaultValue(e.target.value)}
                                            className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 text-[11px] font-black uppercase focus:ring-2 focus:ring-primary outline-none shadow-sm"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={isRequired}
                                            onChange={e => setIsRequired(e.target.checked)}
                                            id="req"
                                            className="w-5 h-5 rounded-lg border-slate-200 text-foreground focus:ring-0"
                                        />
                                        <label htmlFor="req" className="text-[10px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Required Field</label>
                                    </div>
                                </div>

                                <div className="mt-10 flex gap-4">
                                    <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</Button>
                                    <Button onClick={handleSubmit} className="flex-1 h-14 bg-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20">Save Field</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
                {/* Active System Status */}
                <div className="bg-amber-500 rounded-[3rem] p-10 text-white shadow-2xl shadow-amber-500/20 overflow-hidden relative group">
                    <Zap className="absolute -right-10 -top-10 w-48 h-48 text-white/10 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Settings2 className="w-5 h-5 text-white" />
                            </div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em]">System Ready</h4>
                        </div>
                        <p className="text-[10px] font-bold text-amber-50/70 uppercase tracking-widest leading-relaxed max-w-lg">
                            The fields you add here will appear when you create or edit products and sales.
                        </p>
                    </div>
                </div>

                {/* Attribute Matrix */}
                <div className="bg-white rounded-[4rem] p-12 shadow-sm border border-white min-h-[500px]">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-lg shadow-indigo-100">
                                <LayoutGrid className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Your Custom Fields</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extra information you have added</p>
                            </div>
                        </div>
                        <Badge className="bg-slate-900 text-white rounded-full px-5 py-2 font-black text-[9px] uppercase tracking-widest">
                            {customFields.length} Fields Active
                        </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customFields.map((field) => (
                            <div key={field.id} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative">
                                <div className="flex flex-col h-full gap-8">
                                    <div className="flex items-start justify-between">
                                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                                            field.type === 'number' ? 'bg-emerald-50 text-emerald-600' :
                                                field.type === 'date' ? 'bg-indigo-50 text-indigo-600' :
                                                    'bg-white text-slate-900 shadow-sm border border-slate-100')}>
                                            {field.type === 'number' ? <Hash className="w-6 h-6" /> :
                                                field.type === 'date' ? <Calendar className="w-6 h-6" /> :
                                                    field.type === 'select' ? <ToggleLeft className="w-6 h-6" /> :
                                                        <Type className="w-6 h-6" />}
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(field)} className="p-3 bg-white text-slate-300 hover:text-foreground rounded-xl transition-all shadow-sm border border-slate-50">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(field.id)} className="p-3 bg-white text-slate-300 hover:text-rose-600 rounded-xl transition-all shadow-sm border border-slate-50">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">{field.label}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1 bg-slate-100 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest">{field.type}</span>
                                            {field.isRequired && (
                                                <span className="px-3 py-1 bg-rose-50 rounded-lg text-[8px] font-black text-rose-600 uppercase tracking-widest border border-rose-100">REQUIRED</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {customFields.length === 0 && (
                            <div className="col-span-full py-40 text-center opacity-30 flex flex-col items-center">
                                <Ghost className="w-20 h-20 text-slate-100 mb-8" />
                                <h4 className="text-2xl font-black text-slate-900 uppercase">No Custom Fields Yet</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase mt-2 px-20 text-center">You haven't added any custom fields. Use the button above to add one.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
