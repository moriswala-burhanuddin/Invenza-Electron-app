import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { ArrowLeft, Printer, Download, Share2, Trash2, Calendar, User, Wallet, Tag, ShieldCheck, Activity, ReceiptText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { isElectron } from '@/lib/electron-helper';
import { useStoreConfig } from '@/lib/store-config';

import { generateUgandaComplianceHtml, UgandaComplianceData } from '@/components/compliance/UgandaInvoiceTemplate';
import { TaxInclusionDialog } from '@/components/compliance/TaxInclusionDialog';

export default function SaleDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getStoreSales, getStoreCustomers, deleteSale, taxSlabs } = useERPStore();
    const config = useStoreConfig();
    const printRef = useRef<HTMLDivElement>(null);

    const sales = getStoreSales();
    const customers = getStoreCustomers();

    const sale = sales.find(s => s.id === id);
    const customer = sale?.customerId ? customers.find(c => c.id === sale.customerId) : null;

    const [showTaxPrompt, setShowTaxPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<'print' | 'pdf' | null>(null);

    if (!sale) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl max-w-md w-full border border-white">
                    <ReceiptText className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Record Missing</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">This sale could not be found.</p>
                    <Button onClick={() => navigate('/sales')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Back to Sales
                    </Button>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this sale? This cannot be undone.')) {
            deleteSale(id!);
            toast.success("Sale deleted.");
            navigate('/sales');
        }
    };

    const getComplianceData = (): UgandaComplianceData => {
        const taxableAmount = sale.subtotal - (sale.discountAmount || 0);
        let taxPercentage = 0;
        let taxName = 'Tax';
        if (sale.taxAmount && taxableAmount > 0) {
            taxPercentage = Math.round((sale.taxAmount / taxableAmount) * 100);
            const matchedSlab = taxSlabs?.find(s => s.percentage === taxPercentage);
            if (matchedSlab) taxName = matchedSlab.name;
        }

        return {
            invoiceNumber: sale.invoiceNumber,
            date: sale.date,
            items: sale.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.quantity * item.price,
                taxCategory: 'A',
                unitMeasure: 'PCE-Piece'
            })),
            subtotal: sale.subtotal,
            taxAmount: sale.taxAmount || 0,
            totalAmount: sale.totalAmount,
            taxName,
            taxPercentage,
            customerName: customer?.name,
            customerPhone: customer?.phone,
            paymentMode: sale.paymentMode || 'Cash',
            notes: (sale as any).notes || 'N/A'
        };
    };

    const handlePrint = async () => {
        if (isElectron() && window.electronAPI?.printReceipt) {
            setPendingAction('print');
            setShowTaxPrompt(true);
        } else {
            window.print();
        }
    };

    const handleDownloadPDF = async () => {
        if (isElectron() && window.electronAPI?.generatePDF) {
            setPendingAction('pdf');
            setShowTaxPrompt(true);
        } else {
            toast.error("PDF download requires the desktop app.");
        }
    };

    const handleTaxConfirm = async (showTax: boolean) => {
        setShowTaxPrompt(false);
        const action = pendingAction;
        setPendingAction(null);

        if (action === 'print') {
            const html = generateUgandaComplianceHtml(getComplianceData(), config, 'SALE', showTax);
            await window.electronAPI.printReceipt(html);
        } else if (action === 'pdf') {
            const html = generateUgandaComplianceHtml(getComplianceData(), config, 'SALE', showTax);
            const result = await window.electronAPI.generatePDF(html, `Invoice_${sale.invoiceNumber}.pdf`);
            if (result.success) {
                toast.success("Invoice saved as PDF.");
            } else if (result.error !== 'Cancelled') {
                toast.error(`Failed to save PDF: ${result.error}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* High-Impact Header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/sales')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-0.5">
                                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Invoice #{sale.invoiceNumber}</h1>
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    sale.status === 'completed' ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                )}>
                                    {sale.status}
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sale Details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={handleDelete} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all">
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <div className="h-10 w-px bg-slate-100 mx-2" />
                        <Button className="bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl h-12 w-12 p-0 shadow-none">
                            <Share2 className="w-5 h-5" />
                        </Button>
                        <Button onClick={handlePrint} className="bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-xl h-12 w-12 p-0 shadow-none">
                            <Printer className="w-5 h-5" />
                        </Button>
                        <Button onClick={handleDownloadPDF} className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all ml-2">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>
                </div>
            </div>

            <main ref={printRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {/* Branding Header for Documents */}
                <div className="hidden print:flex flex-col md:flex-row justify-between gap-8 mb-16 border-b-2 border-slate-100 pb-12">
                    <div className="flex flex-col items-start">
                        {config.companyLogo && (
                            <img src={config.companyLogo} alt="Logo" className="w-32 h-32 object-contain mb-6 bg-white p-3 rounded-2xl shadow-sm border border-slate-50" />
                        )}
                        <h2 className="font-black text-4xl tracking-tighter uppercase text-slate-900">{config.companyName || 'INVENZA ERP'}</h2>
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed mt-4 max-w-sm">
                            <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> {config.taxId || 'Corporate Headquarters'}</p>
                            <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> Web: {config.websiteUrl || 'www.invenza.app'}</p>
                            <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-200" /> Email: {config.companyEmail || 'contact@invenza.app'}</p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-end">
                        <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter mb-2">SALE RECEIPT</h1>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">TRANSACTION VERIFIED • NODE ID: SF-CORE-01</p>
                    </div>
                </div>

                {/* Metrics widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-indigo-50 rounded-2xl">
                                <Wallet className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount Paid</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{formatCurrency(sale.totalAmount)}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <Calendar className="w-6 h-6 text-slate-400" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 leading-none mb-2 uppercase">{new Date(sale.date).toLocaleDateString()}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time: {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <User className="w-6 h-6 text-slate-400" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</span>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 leading-none mb-2 uppercase truncate max-w-full">
                            {customer?.name || "Walk-in Guest"}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{customer?.phone || "No Phone Number"}</p>
                    </div>

                    <div className="bg-primary rounded-[2rem] p-8 shadow-xl shadow-black/10 border border-primary/5 text-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-white/10 rounded-2xl">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</span>
                        </div>
                        <h2 className="text-xl font-black leading-none mb-2 uppercase tracking-tight">Sale Verified</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">ID: {sale.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    {/* Items Breakdown */}
                    <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-sm border border-white relative overflow-hidden">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Items Sold</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">List of items sold</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <Tag className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {sale.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2rem] group hover:bg-slate-900 hover:text-white transition-all duration-500">
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 bg-white rounded-[1.2rem] flex items-center justify-center font-black text-slate-900 shadow-sm group-hover:bg-white/10 group-hover:text-white transition-colors">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-sm uppercase tracking-tight mb-1">{item.productName}</h4>
                                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <span>Qty: {item.quantity}</span>
                                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                                <span>Rate: {formatCurrency(item.price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black tracking-tighter">{formatCurrency(item.quantity * item.price)}</div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 p-8 bg-indigo-50/50 rounded-[2.5rem] flex items-center justify-between border border-indigo-50 group hover:bg-indigo-600 transition-all cursor-pointer">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-600">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black uppercase text-indigo-950 group-hover:text-white transition-colors tracking-tight">Price Summary</h4>
                                    <p className="text-[9px] font-bold text-indigo-400 group-hover:text-white/60 transition-colors uppercase tracking-widest">All prices include applicable taxes</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-indigo-200 group-hover:text-white" />
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="space-y-6 sticky top-28">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-10">
                                <ReceiptText className="w-5 h-5 text-slate-400" />
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 text-[10px]">Payment Summary</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subtotal</span>
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(sale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Discount</span>
                                    <span className="text-sm font-black text-red-500">-{formatCurrency(sale.discountAmount || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tax</span>
                                    <span className="text-sm font-black text-slate-900">{formatCurrency(sale.taxAmount || 0)}</span>
                                </div>

                                <div className="h-px bg-slate-100 my-6" />

                                <div className="bg-slate-50 rounded-[2rem] p-8 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em]">Total</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{formatCurrency(sale.totalAmount)}</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Paid via {sale.paymentMode || 'Cash'}</p>
                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Paid</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {customer && (
                            <div onClick={() => navigate(`/customers/${customer.id}`)} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white group hover:bg-primary transition-all duration-500 cursor-pointer">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-white/10 transition-colors">
                                        <User className="w-6 h-6 text-slate-400 group-hover:text-white" />
                                    </div>
                                    <ArrowLeft className="w-5 h-5 text-slate-200 rotate-180 group-hover:translate-x-2 transition-transform" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 group-hover:text-white transition-colors uppercase tracking-tight mb-1">{customer.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{customer?.area || 'No Area Set'}</p>
                                <div className="mt-8 pt-8 border-t border-slate-50 group-hover:border-white/10 flex items-center justify-between">
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Customer Profile</div>
                                    <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Active</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <TaxInclusionDialog 
                open={showTaxPrompt} 
                onOpenChange={setShowTaxPrompt} 
                onConfirm={handleTaxConfirm} 
            />
        </div>
    );
}
