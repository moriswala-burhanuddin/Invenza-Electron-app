import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Printer, Download, ShoppingBag, Calendar, User, ArrowLeft, Trash2, Zap, ShieldCheck, Box, MoreHorizontal, History, Activity, TrendingUp, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

import { useStoreConfig } from '@/lib/store-config';
import { isElectron } from '@/lib/electron-helper';
import { generateUgandaComplianceHtml, UgandaComplianceData } from '@/components/compliance/UgandaInvoiceTemplate';
import { TaxInclusionDialog } from '@/components/compliance/TaxInclusionDialog';

export default function PurchaseDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const config = useStoreConfig();
    const { getStorePurchases, getStoreAccounts, deletePurchase, suppliers, checkPermission, taxSlabs } = useERPStore();

    const purchases = getStorePurchases();
    const accounts = getStoreAccounts();

    const purchase = purchases.find(p => p.id === id);
    const account = accounts.find(a => a.id === purchase?.accountId);
    const supplier = suppliers.find(s => s.companyName === purchase?.supplier || s.id === (purchase as any).supplierId);

    const canSeePurchases = checkPermission('canSeePurchases');
    const canSeeDetailedPurchases = checkPermission('canSeeDetailedPurchases');
    const canManagePurchases = canSeeDetailedPurchases || checkPermission('canSeeSuppliers');

    const [showTaxPrompt, setShowTaxPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<'print' | 'pdf' | null>(null);

    if (!canSeePurchases) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl max-w-md w-full border border-white">
                    <ShieldCheck className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Access Restricted</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">You do not have permission to view purchase details.</p>
                    <Button onClick={() => navigate('/purchases')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Return to Purchases
                    </Button>
                </div>
            </div>
        );
    }

    if (!purchase) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl max-w-md w-full border border-white">
                    <ShoppingBag className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Purchase Not Found</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">The requested purchase record does not exist.</p>
                    <Button onClick={() => navigate('/purchases')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Return to Purchases
                    </Button>
                </div>
            </div>
        );
    }

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this purchase record?')) {
            deletePurchase(id!);
            toast.success("Purchase Record Deleted");
            navigate('/purchases');
        }
    };

    const getComplianceData = (): UgandaComplianceData => {
        const taxableAmount = (purchase.subtotal || 0); // Assuming no discount on purchases for now
        let taxPercentage = 0;
        let taxName = 'Tax';
        if (purchase.taxAmount && taxableAmount > 0) {
            taxPercentage = Math.round((purchase.taxAmount / taxableAmount) * 100);
            const matchedSlab = taxSlabs?.find(s => s.percentage === taxPercentage);
            if (matchedSlab) taxName = matchedSlab.name;
        }

        return {
            invoiceNumber: purchase.invoiceNumber,
            date: purchase.date,
            items: purchase.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.price,
                total: item.quantity * item.price,
                taxCategory: 'A',
                unitMeasure: 'PCE-Piece'
            })),
            subtotal: purchase.subtotal || 0,
            taxAmount: purchase.taxAmount || 0,
            totalAmount: purchase.totalAmount,
            taxName,
            taxPercentage,
            supplierName: purchase.supplier,
            supplierPhone: supplier?.phone,
            paymentMode: 'Cash', // Default for purchase
            notes: (purchase as any).notes || 'N/A'
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
            const html = generateUgandaComplianceHtml(getComplianceData(), config, 'PURCHASE', showTax);
            await window.electronAPI.printReceipt(html);
        } else if (action === 'pdf') {
            const html = generateUgandaComplianceHtml(getComplianceData(), config, 'PURCHASE', showTax);
            const result = await window.electronAPI.generatePDF(html, `Purchase_${purchase.invoiceNumber}.pdf`);
            if (result.success) {
                toast.success("Purchase saved as PDF.");
            } else if (result.error !== 'Cancelled') {
                toast.error(`Failed to save PDF: ${result.error}`);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-40">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/purchases')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{purchase.invoiceNumber}</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Purchase Details • Supplier: {purchase.supplier || 'UNKNOWN'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {canManagePurchases && (
                            <>
                                <Button onClick={handlePrint} variant="ghost" className="rounded-2xl h-12 bg-slate-50 font-black uppercase text-[10px] tracking-widest text-slate-400 px-6">
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Compliance
                                </Button>
                                <Button onClick={handleDownloadPDF} variant="ghost" className="rounded-2xl h-12 bg-primary text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-black/20">
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF
                                </Button>
                                <Button onClick={handleDelete} variant="ghost" className="rounded-2xl h-12 w-12 p-0 bg-red-50 text-red-600 hover:bg-red-100">
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Acquisition Profile */}
                    <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-primary rounded-2xl text-white shadow-lg shadow-slate-200">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Purchase Summary</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Supplier and payment details</p>
                                </div>
                            </div>
                            <div className={cn(
                                "px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                                purchase.type === 'credit' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                                {purchase.type === 'credit' ? <History className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                {purchase.type?.toUpperCase() || 'CASH PURCHASE'}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Supplier
                                </p>
                                <p className="text-base font-black text-slate-900">{purchase.supplier || 'UNKNOWN'}</p>
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">Verified Supplier</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Date & Time
                                </p>
                                <p className="text-base font-black text-slate-900 uppercase">{new Date(purchase.date).toLocaleDateString()}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(purchase.date).toLocaleTimeString()}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Wallet className="w-3.5 h-3.5" /> Account
                                </p>
                                <p className="text-base font-black text-slate-900 tracking-tight">{account?.name || 'CREDIT ACCOUNT'}</p>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Payment Verified</p>
                            </div>
                        </div>

                        <hr className="my-12 border-slate-50" />

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Items List</h3>
                            <div className="space-y-4">
                                {purchase.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] group hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-slate-100">
                                        <div className="flex items-center gap-8">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-200 group-hover:text-foreground transition-colors shadow-sm">
                                                <Box className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-tight mb-2">{item.productName}</h4>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {item.productId.substring(0, 8)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-12 text-right">
                                            <div>
                                                <p className="text-xl font-black text-slate-900 tracking-tighter mb-1 font-mono">{item.quantity}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quantity</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-slate-400 tracking-tighter mb-1 font-mono">{formatCurrency(item.price)}</p>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Price</p>
                                            </div>
                                            <div className="w-28 pl-12 border-l border-slate-100">
                                                <p className="text-xl font-black text-slate-900 tracking-tighter mb-1 font-mono">{formatCurrency(item.price * item.quantity)}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Line Total</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Financial Synthesis Summary */}
                    <div className="bg-primary rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
                        <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                        <div className="relative z-10 font-mono">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-10">Payment Summary</h4>

                            <div className="space-y-6">
                                <div className="flex justify-between items-center text-slate-400 text-xs">
                                    <span className="uppercase tracking-widest">Subtotal</span>
                                    <span>{formatCurrency(purchase.subtotal || purchase.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400 text-xs">
                                    <span className="uppercase tracking-widest">Tax</span>
                                    <span>{formatCurrency(purchase.taxAmount || 0)}</span>
                                </div>
                                <hr className="border-white/10" />
                                <div className="flex justify-between items-end">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pb-1">Total Amount</p>
                                    <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(purchase.totalAmount)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">System Status</p>
                        <div className="flex items-center justify-center p-6 bg-slate-50 rounded-2xl mb-8">
                            <Activity className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Purchase Recorded</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider mb-8">This purchase has been recorded and inventory levels updated.</p>
                        <Button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl h-12 font-black uppercase text-[9px] tracking-widest">
                            <Download className="w-4 h-4 mr-2" />
                            Download Info
                        </Button>
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
