import { useState, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, PaymentTerm } from '@/lib/store-data';
import {
    Plus, Clock, Settings2, CreditCard,
    Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// ────────────────────────────────────────────────
// CSV Template columns (must match import parser)
// ────────────────────────────────────────────────
const TEMPLATE_HEADERS = [
    'Supplier Code', 'Company Name*', 'First Name', 'Last Name',
    'Email', 'Phone', 'Website',
    'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip Code', 'Country',
    'Account Number', 'Tax Number', 'Opening Balance', 'Credit Limit', 'Currency',
    'Payment Term Name', 'Status', 'Internal Notes', 'Comments',
];

const SAMPLE_ROW = [
    'SUP-00001', 'Acme Corp Industries', 'John', 'Doe',
    'john@acmecorp.com', '+1-555-0101', 'acmecorp.com',
    '123 Business St', 'Suite 400', 'New York', 'NY', '10001', 'USA',
    'ACC-001', 'GSTIN-123456', '0', '50000', 'USD',
    'Net 30', 'active', 'Reliable vendor', 'Preferred for bulk orders',
];

interface ImportRow {
    row: number;
    companyName: string;
    status: 'ok' | 'error';
    error?: string;
}

export default function SupplierSettings() {
    const { paymentTerms, addPaymentTerm, addSupplier, activeStoreId } = useERPStore();

    // Payment Term form state
    const [isAddTermOpen, setIsAddTermOpen] = useState(false);
    const [termName, setTermName] = useState('');
    const [termDays, setTermDays] = useState('30');

    // Import state
    const importFileRef = useRef<HTMLInputElement>(null);
    const [importResults, setImportResults] = useState<ImportRow[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const resetTermForm = () => {
        setTermName('');
        setTermDays('30');
        setIsAddTermOpen(false);
    };

    const handleAddTerm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termName.trim()) return toast.error('Term name is required');
        const days = parseInt(termDays);
        if (isNaN(days) || days < 0) return toast.error('Days must be a valid number');
        try {
            await addPaymentTerm({ name: termName.trim(), days });
            toast.success(`Payment term "${termName}" added`);
            resetTermForm();
        } catch {
            toast.error('Failed to add payment term');
        }
    };

    const PRESET_TERMS = [
        { name: 'Immediate', days: 0 },
        { name: 'Net 7', days: 7 },
        { name: 'Net 15', days: 15 },
        { name: 'Net 30', days: 30 },
        { name: 'Net 45', days: 45 },
        { name: 'Net 60', days: 60 },
        { name: 'Net 90', days: 90 },
    ];

    const addPreset = async (preset: { name: string; days: number }) => {
        if (paymentTerms.find(t => t.name === preset.name)) {
            toast.warning(`"${preset.name}" already exists`);
            return;
        }
        try {
            await addPaymentTerm(preset);
            toast.success(`Added "${preset.name}"`);
        } catch {
            toast.error('Failed to add preset');
        }
    };

    // ─── Export Template ───────────────────────────────────
    const downloadTemplate = () => {
        const csv = [TEMPLATE_HEADERS.join(','), SAMPLE_ROW.join(',')].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'supplier_import_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Template downloaded — fill it in and import it back');
    };

    // ─── Import CSV ────────────────────────────────────────
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) {
                toast.error('CSV has no data rows');
                return;
            }

            setIsImporting(true);
            setShowResults(false);
            const results: ImportRow[] = [];

            // Skip header row (index 0)
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCSVLine(lines[i]);
                const companyName = cols[1]?.trim();
                const rowNum = i + 1;

                if (!companyName) {
                    results.push({ row: rowNum, companyName: '(empty)', status: 'error', error: 'Company Name is required' });
                    continue;
                }

                try {
                    const openingBalance = parseFloat(cols[15]) || 0;
                    const creditLimit = parseFloat(cols[16]) || 0;
                    const currency = cols[17]?.trim() || 'USD';
                    const status = (cols[19]?.trim() === 'disabled' ? 'disabled' : 'active') as 'active' | 'disabled';

                    await addSupplier({
                        supplierCode: cols[0]?.trim() || '',
                        companyName,
                        firstName: cols[2]?.trim() || '',
                        lastName: cols[3]?.trim() || '',
                        email: cols[4]?.trim() || '',
                        phone: cols[5]?.trim() || '',
                        website: cols[6]?.trim() || '',
                        addressLine1: cols[7]?.trim() || '',
                        addressLine2: cols[8]?.trim() || '',
                        city: cols[9]?.trim() || '',
                        state: cols[10]?.trim() || '',
                        zipCode: cols[11]?.trim() || '',
                        country: cols[12]?.trim() || '',
                        accountNumber: cols[13]?.trim() || '',
                        taxNumber: cols[14]?.trim() || '',
                        openingBalance,
                        creditLimit,
                        currency,
                        paymentTermId: '',
                        internalNotes: cols[20]?.trim() || '',
                        comments: cols[21]?.trim() || '',
                        status,
                        storeId: activeStoreId,
                        isPreferred: false,
                        isBlacklisted: false,
                        rating: 0,
                    });
                    results.push({ row: rowNum, companyName, status: 'ok' });
                } catch (err) {
                    results.push({ row: rowNum, companyName, status: 'error', error: 'Failed to save' });
                }
            }

            setImportResults(results);
            setIsImporting(false);
            setShowResults(true);

            const successful = results.filter(r => r.status === 'ok').length;
            const failed = results.filter(r => r.status === 'error').length;
            if (successful > 0) toast.success(`${successful} supplier(s) imported successfully`);
            if (failed > 0) toast.error(`${failed} row(s) failed — check the results below`);
        };

        reader.readAsText(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    // Simple CSV line parser (handles quoted fields)
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
            else { current += ch; }
        }
        result.push(current);
        return result;
    };

    const successCount = importResults.filter(r => r.status === 'ok').length;
    const errorCount = importResults.filter(r => r.status === 'error').length;

    return (
        <div className="min-h-screen pb-20 lg:pb-0 font-sans text-sm bg-slate-50">
            <PageHeader
                title="SUPPLIER SETTINGS"
                subtitle="CONFIGURE GLOBAL VENDOR PREFERENCES"
                showBack
            />

            <div className="erp-page-content max-w-4xl mx-auto p-4 lg:p-6 space-y-8">

                {/* ── Excel Import / Export ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-800 text-white font-bold uppercase flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                        Bulk Import / Export
                    </div>

                    <div className="p-6 grid md:grid-cols-2 gap-6">
                        {/* Download Template */}
                        <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                    <Download className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Download Template</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-black">CSV · 22 columns</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Download the standard CSV template with a sample row. Fill in your supplier data and import it back.
                                Fields marked with <strong>*</strong> are required.
                            </p>
                            <button
                                onClick={downloadTemplate}
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
                            >
                                <Download className="w-4 h-4" /> Download supplier_import_template.csv
                            </button>
                        </div>

                        {/* Upload & Import */}
                        <div className="border border-slate-200 rounded-2xl p-5 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Import Suppliers</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-black">CSV · Max 1000 rows</p>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Upload a completed CSV file. Each valid row will be created as a new supplier. Existing suppliers are <strong>not</strong> overwritten.
                            </p>
                            <input
                                ref={importFileRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleImportFile}
                            />
                            <button
                                onClick={() => importFileRef.current?.click()}
                                disabled={isImporting}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-60"
                            >
                                {isImporting ? (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
                                ) : (
                                    <><Upload className="w-4 h-4" /> Choose CSV File & Import</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Import Results */}
                    {showResults && importResults.length > 0 && (
                        <div className="border-t border-slate-100 p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <p className="font-bold text-slate-700">Import Results</p>
                                <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> {successCount} imported
                                </span>
                                {errorCount > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-full">
                                        <XCircle className="w-3.5 h-3.5" /> {errorCount} failed
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                {importResults.map((r, i) => (
                                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${r.status === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                                        <span className="flex items-center gap-2">
                                            {r.status === 'ok'
                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                            }
                                            <span className="font-bold">Row {r.row}</span> — {r.companyName}
                                        </span>
                                        {r.error && <span className="text-red-600 font-medium">{r.error}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Payment Terms ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-emerald-600 text-white font-bold uppercase flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Payment Terms
                        </div>
                        <button
                            onClick={() => setIsAddTermOpen(v => !v)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            ADD TERM
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Add Presets</p>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_TERMS.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => addPreset(preset)}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                                >
                                    + {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Custom Term Form */}
                    {isAddTermOpen && (
                        <form onSubmit={handleAddTerm} className="p-4 border-b border-slate-100 bg-emerald-50">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">Add Custom Term</p>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Term Name</label>
                                    <input
                                        value={termName}
                                        onChange={e => setTermName(e.target.value)}
                                        placeholder='e.g. "2/10 Net 30"'
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div className="w-28 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Days</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={termDays}
                                        onChange={e => setTermDays(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-bold text-center"
                                    />
                                </div>
                                <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all">
                                    SAVE
                                </button>
                                <button type="button" onClick={resetTermForm} className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
                                    ✕
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Terms List */}
                    <div className="divide-y divide-slate-50">
                        {paymentTerms.length === 0 ? (
                            <div className="text-center py-16">
                                <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold uppercase text-sm">No payment terms configured</p>
                                <p className="text-[11px] text-slate-400 mt-1">Use the presets above or add a custom term</p>
                            </div>
                        ) : (
                            paymentTerms.map((term: PaymentTerm) => (
                                <div key={term.id} className="flex items-center justify-between p-4 hover:bg-slate-50 group transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{term.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">
                                                {term.days === 0 ? 'Due Immediately' : `Due in ${term.days} days`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black">
                                        {term.days}D
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                    <div className="flex items-start gap-3">
                        <Settings2 className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-blue-800 text-sm">How Payment Terms Work</p>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                Payment terms configured here appear in the <strong>New Supplier</strong> form as a dropdown.
                                Assigning a term to a supplier helps track when invoices are due.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
