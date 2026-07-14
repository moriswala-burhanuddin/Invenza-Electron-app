import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { FileText, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { isElectron } from '@/lib/electron-helper';

export default function TransactionDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getStoreTransactions, getStoreAccounts } = useERPStore();

    const transactions = getStoreTransactions();
    const accounts = getStoreAccounts();
    const transaction = transactions.find(t => t.id === id);

    if (!transaction) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6">
                <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-black uppercase text-slate-900">Transaction Not Found</h2>
                <Button onClick={() => navigate('/transactions')} className="mt-6 bg-primary text-white rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest">
                    Return to Ledger
                </Button>
            </div>
        );
    }

    const account = accounts.find(a => a.id === transaction.accountId);

    const handleDownloadReceipt = async () => {
        const html = `
        <html>
          <head>
            <style>
              body { font-family: monospace; padding: 20px; font-size: 14px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 18px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .bold { font-weight: bold; }
              .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">TRANSACTION RECEIPT</div>
            <div class="row"><span>ID:</span><span>${transaction.id.substring(0,8)}</span></div>
            <div class="row"><span>Date:</span><span>${new Date(transaction.date).toLocaleString()}</span></div>
            <div class="row"><span>Type:</span><span>${transaction.type.toUpperCase()}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Account:</span><span>${account?.name || 'N/A'}</span></div>
            <div class="row"><span>Desc:</span><span>${transaction.description || 'N/A'}</span></div>
            ${transaction.customerName ? `<div class="row"><span>Customer:</span><span>${transaction.customerName}</span></div>` : ''}
            <div class="divider"></div>
            <div class="row bold" style="font-size:16px;"><span>AMOUNT:</span><span>${formatCurrency(transaction.amount)}</span></div>
            <div class="divider"></div>
            <div style="text-align:center; margin-top: 20px;">Record Generated Successfully</div>
          </body>
        </html>
        `;

        if (isElectron() && window.electronAPI?.printReceipt) {
            await window.electronAPI.printReceipt(html);
        } else {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.print();
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            <PageHeader
                title="Transaction Details"
                showBack
            />

            <main className="max-w-4xl mx-auto px-6 mt-12">
                <div className="bg-white rounded-[3rem] shadow-sm border border-white overflow-hidden">
                    <div className="p-12 border-b border-slate-50 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={cn(
                                    "w-3 h-3 rounded-full animate-pulse",
                                    transaction.type === 'cash_in' ? "bg-emerald-500" : "bg-rose-500"
                                )} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type: {transaction.type.replace('_', ' ')}</span>
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">{transaction.description}</h1>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ID: {transaction.id}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Amount</p>
                            <p className={cn(
                                "text-4xl font-black tracking-tighter",
                                transaction.type === 'cash_in' ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {transaction.type === 'cash_in' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                        </div>
                    </div>

                    <div className="p-12 bg-slate-50/50 grid grid-cols-2 md:grid-cols-3 gap-12">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</p>
                            <p className="text-sm font-black text-slate-900">{new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account</p>
                            <p className="text-sm font-black text-slate-900">{account?.name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account Type</p>
                            <p className="text-sm font-black text-slate-900 uppercase">{account?.type || 'Unknown'}</p>
                        </div>
                        {transaction.customerName && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer</p>
                                <p className="text-sm font-black text-slate-900">{transaction.customerName}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sync Status</p>
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Saved</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-12 flex justify-end gap-4 bg-white">
                        <Button
                            onClick={() => navigate('/transactions')}
                            className="h-14 bg-slate-100 text-slate-600 rounded-2xl px-10 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Back to Transactions
                        </Button>
                        <Button 
                            onClick={handleDownloadReceipt}
                            className="h-14 bg-primary text-white rounded-2xl px-10 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20"
                        >
                            Download Receipt
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
