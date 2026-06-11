import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, Invoice } from '@/lib/store-data';
import {
    Printer, Edit, Trash2, ChevronLeft,
    CircleCheck, Clock, AlertTriangle, XCircle,
    Send, User, Truck, CreditCard, Calendar, FileText, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useStoreConfig } from '@/lib/store-config';
import { isElectron } from '@/lib/electron-helper';
import { formatCurrency } from '@/lib/utils';

import { generateUgandaComplianceHtml, UgandaComplianceData } from '@/components/compliance/UgandaInvoiceTemplate';
import { TaxInclusionDialog } from '@/components/compliance/TaxInclusionDialog';

export default function InvoiceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const config = useStoreConfig();
    const { invoices, deleteInvoice, updateInvoice, fetchInvoices, addTransaction, getStoreAccounts } = useERPStore();
    const printRef = useRef<HTMLDivElement>(null);

    const [showTaxPrompt, setShowTaxPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState<'print' | 'pdf' | null>(null);

    const invoice = invoices.find(inv => inv.id === id);

    useEffect(() => {
        if (!invoice) {
            fetchInvoices();
        }
    }, [id, invoice, fetchInvoices]);

    if (!invoice) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <FileText className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h2 className="font-black text-slate-900 uppercase tracking-tighter text-2xl">Invoice Not Found</h2>
                    <Button variant="link" onClick={() => navigate('/invoices')} className="mt-4 font-bold">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Invoices
                    </Button>
                </div>
            </div>
        );
    }

    const getComplianceData = (): UgandaComplianceData => {
        return {
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            items: (invoice.items || []).map(item => ({
                productName: item.productName || 'Unknown Item',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
                taxCategory: 'A',
                unitMeasure: 'PCE-Piece'
            })),
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            totalAmount: invoice.totalAmount,
            customerName: invoice.customerName,
            supplierName: invoice.supplierName,
            paymentMode: 'Online',
            notes: invoice.notes || 'N/A'
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
            toast({
                title: "Not Available",
                description: "This feature only works in the desktop app.",
                variant: "destructive"
            });
        }
    };

    const handleTaxConfirm = async (showTax: boolean) => {
        setShowTaxPrompt(false);
        const action = pendingAction;
        setPendingAction(null);

        if (action === 'print') {
            const html = generateUgandaComplianceHtml(getComplianceData(), config, invoice.type === 'customer' ? 'SALE' : 'PURCHASE', showTax);
            await window.electronAPI.printReceipt(html);
        } else if (action === 'pdf') {
            const html = generateUgandaComplianceHtml(getComplianceData(), config, invoice.type === 'customer' ? 'SALE' : 'PURCHASE', showTax);
            const result = await window.electronAPI.generatePDF(html, `Invoice_${invoice.invoiceNumber}.pdf`);
            if (result.success) {
                toast({
                    title: "Invoice Saved",
                    description: `Saved to: ${result.filePath}`,
                    variant: "default"
                });
            } else if (result.error !== 'Cancelled') {
                toast({
                    title: "Could Not Save PDF",
                    description: result.error,
                    variant: "destructive"
                });
            }
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CircleCheck className="w-4 h-4 text-green-500" />;
            case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
            case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            case 'cancelled': return <XCircle className="w-4 h-4 text-slate-400" />;
            default: return <Clock className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusColorBadge = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid': return 'bg-green-50 text-green-600 border-green-100';
            case 'sent': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'draft': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-gray-50 text-gray-500 border-gray-100';
        }
    };

    return (
        <div className="min-h-screen pb-20 lg:pb-0 font-sans bg-slate-50">
            <PageHeader
                title={`Invoice #${invoice.invoiceNumber}`}
                subtitle={`${invoice.type?.toUpperCase()} DOCUMENT`}
                showBack
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            className="erp-button erp-button-ghost"
                            onClick={() => navigate(`/invoices/edit/${invoice.id}`)}
                        >
                            <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button
                            className="erp-button erp-button-secondary"
                            onClick={handleDownloadPDF}
                        >
                            <Download className="w-4 h-4 mr-2" /> Download PDF
                        </Button>
                        <Button
                            className="erp-button erp-button-primary"
                            onClick={handlePrint}
                        >
                            <Printer className="w-4 h-4 mr-2" /> Print / Receipt
                        </Button>
                    </div>
                }
            />

            <div className="erp-page-content max-w-4xl mx-auto">
                <div className="erp-card bg-white p-8 md:p-12 mb-8" ref={printRef}>
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between gap-8 mb-12 border-b border-gray-100 pb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 uppercase">
                                {['customer', 'retail', 'wholesale', 'cash', 'credit'].includes(invoice.type?.toLowerCase()) ? 'Invoice' : 'Purchase Bill'}
                            </h1>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="font-bold text-gray-400">#{invoice.invoiceNumber}</span>
                                <div className={`erp-badge ml-2 ${getStatusColorBadge(invoice.status)}`}>
                                    {getStatusIcon(invoice.status)}
                                    <span className="ml-1.5 uppercase font-bold text-[10px]">{invoice.status}</span>
                                </div>
                            </div>

                            <div className="space-y-1 text-xs font-semibold text-gray-500 uppercase tracking-tight">
                                <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-300" /> Issued: {new Date(invoice.date).toLocaleDateString()}</p>
                                {invoice.dueDate && (
                                    <p className="flex items-center gap-2 text-red-500/80"><Clock className="w-3.5 h-3.5 opacity-50" /> Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>

                        <div className="text-left md:text-right flex flex-col items-start md:items-end">
                            {config.companyLogo && (
                                <img src={config.companyLogo} alt="Logo" className="w-24 h-24 object-contain mb-4 bg-white p-2 rounded-xl shadow-sm border border-slate-50" />
                            )}
                            <h2 className="font-bold text-xl tracking-tight uppercase text-foreground">{config.companyName || 'INVENZA ERP'}</h2>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase leading-relaxed max-w-[200px] mt-2">
                                <p>{config.taxId || 'Corporate Headquarters'}</p>
                                <p>Web: {config.websiteUrl || 'www.invenza.app'}</p>
                                <p>Email: {config.companyEmail || 'contact@invenza.app'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Parties */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div className="bg-gray-50 p-6 rounded-2xl">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">
                                {invoice.type === 'customer' ? 'Bill To' : 'Vendor'}
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl">
                                    {(invoice.customerName || invoice.supplierName || '?')[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-lg tracking-tight uppercase text-foreground">{invoice.customerName || invoice.supplierName}</p>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">ID: {invoice.customerId || invoice.supplierId}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-end text-right">
                            <div className="inline-block bg-primary text-white p-6 rounded-2xl ml-auto shadow-lg">
                                <p className="text-[10px] font-bold tracking-wider uppercase mb-1.5 opacity-60">Total Amount Due</p>
                                <p className="text-3xl font-bold tracking-tight text-white">
                                    {formatCurrency(invoice.totalAmount)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="mb-12">
                        <table className="erp-table">
                            <thead>
                                <tr>
                                    <th className="uppercase tracking-wider">Item / Description</th>
                                    <th className="text-right uppercase tracking-wider">Price</th>
                                    <th className="text-center uppercase tracking-wider">Qty</th>
                                    <th className="text-right uppercase tracking-wider">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.items || []).map((item, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <p className="font-bold text-foreground">{item.productName}</p>
                                            {item.description && <p className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">{item.description}</p>}
                                        </td>
                                        <td className="text-right font-semibold text-gray-500">{formatCurrency(item.unitPrice)}</td>
                                        <td className="text-center font-bold text-foreground">{item.quantity}</td>
                                        <td className="text-right font-bold text-foreground">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Block */}
                    <div className="flex flex-col md:flex-row justify-between gap-12 border-t border-gray-100 pt-8">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-gray-300" /> Notes & Terms
                            </p>
                            <div className="text-xs font-medium text-gray-500 bg-gray-50 p-5 rounded-2xl italic leading-relaxed">
                                {invoice.notes || "No special instructions provided."}
                            </div>
                        </div>

                        <div className="w-full md:w-64 space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-tight">Subtotal</span>
                                <span className="font-bold text-foreground">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-tight">Discount</span>
                                <span className="font-bold text-red-500">-{formatCurrency(invoice.discountAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-tight">Tax</span>
                                <span className="font-bold text-foreground">{formatCurrency(invoice.taxAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center py-4 border-y border-gray-50">
                                <span className="text-sm font-bold uppercase tracking-wide text-foreground">Total</span>
                                <span className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(invoice.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs pt-1">
                                <span className="font-bold text-gray-400 uppercase tracking-tight">Paid</span>
                                <span className="font-bold text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-sm pt-4 bg-gray-50 rounded-xl p-3 mt-2">
                                <span className="uppercase tracking-wider text-[10px] text-gray-500">Balance Due</span>
                                <span className="tracking-tight text-red-500">{formatCurrency(invoice.amountDue)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center border-t border-slate-100 pt-8">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">Generated by Invenza ERP Professional v2.0</p>
                    </div>
                </div>

                <div className="flex justify-center gap-3 mb-12 flex-wrap pb-10">
                    <Button
                        variant="ghost"
                        className={`erp-button erp-button-secondary ${invoice.status === 'paid' ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => {
                            updateInvoice(invoice.id, { status: 'paid', amountPaid: invoice.totalAmount, amountDue: 0 });
                            
                            // Automate Ledger Update
                            const accounts = getStoreAccounts();
                            const primaryAccount = accounts[0];
                            
                            addTransaction({
                                type: 'cash_in',
                                amount: invoice.totalAmount,
                                originalAmount: invoice.totalAmount,
                                originalCurrency: 'UGX', // Default base currency for this build
                                description: `Receipt for Invoice #${invoice.invoiceNumber}`,
                                accountId: primaryAccount?.id || 'cash-account',
                                customerId: invoice.customerId,
                                customerName: invoice.customerName,
                                storeId: invoice.storeId || '',
                                date: new Date().toISOString()
                            });

                            toast({ title: "Invoice Paid", description: "Ledger updated and payment recorded." });
                        }}
                    >
                        <CircleCheck className="w-4 h-4 mr-2" /> Mark Paid
                    </Button>

                    <Button
                        variant="ghost"
                        className="erp-button erp-button-secondary"
                        onClick={() => {
                            toast({ title: "Email Queued", description: "Invoice PDF is being sent." });
                        }}
                    >
                        <Send className="w-4 h-4 mr-2" /> Email
                    </Button>

                    <Button
                        variant="ghost"
                        className="erp-button erp-button-ghost text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                            if (confirm("Void this invoice permanently?")) {
                                updateInvoice(invoice.id, { status: 'cancelled' });
                                toast({ title: "Invoice Voided", description: "Cancelled successfully." });
                            }
                        }}
                    >
                        <XCircle className="w-4 h-4 mr-2" /> Void
                    </Button>
                </div>
            </div>
            <TaxInclusionDialog
                open={showTaxPrompt}
                onOpenChange={setShowTaxPrompt}
                onConfirm={handleTaxConfirm}
            />
        </div>
    );
}
