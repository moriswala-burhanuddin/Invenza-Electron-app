import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { User, Phone, MapPin, CreditCard, Clock, ChevronRight, Gift, Award, ArrowLeft, ArrowUpRight, ArrowDownLeft, Activity, Wallet, History, Star, MoreHorizontal, Edit, Banknote, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

interface LedgerEntry {
    date: string;
    type: 'SALE' | 'PAYMENT' | 'PURCHASE' | 'RETURN';
    reference: string;
    debit: number;
    credit: number;
    cumulative_balance: number;
}

export default function CustomerDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getStoreCustomers, getStoreSales, customFields, customerCustomValues } = useERPStore();
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
    const [isLoadingLedger, setIsLoadingLedger] = useState(false);
    const [pointsToAdd, setPointsToAdd] = useState('');

    const customers = getStoreCustomers();
    const sales = getStoreSales();

    const customer = customers.find(c => c.id === id);

    const clientCustomFields = customFields.filter(f => f.targetType === 'client');
    const clientValues = customerCustomValues.filter(v => v.customerId === id);

    useEffect(() => {
        const fetchLedger = async () => {
            if (id && window.electronAPI && window.electronAPI.getCustomerLedger) {
                setIsLoadingLedger(true);
                // Ensure the data returned by electronAPI matches LedgerEntry[]
                const data = (await window.electronAPI.getCustomerLedger(id)) as LedgerEntry[];
                setLedger(data);
                setIsLoadingLedger(false);
            }
        };
        const fetchLoyalty = async () => {
            if (id && window.electronAPI && window.electronAPI.getLoyaltyPoints) {
                const data = await window.electronAPI.getLoyaltyPoints(id);
                const total = data.reduce((acc: number, p: { points: number }) => acc + p.points, 0);
                setLoyaltyPoints(total);
            }
        }
        fetchLedger();
        fetchLoyalty();
    }, [id]);

    const handleAddPoints = async () => {
        if (!pointsToAdd || !id) return;
        toast.info("Only Admin can add loyalty points.");
    }

    if (!customer) {
        return (
            <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl max-w-md w-full border border-white">
                    <User className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Customer Not Found</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">This customer could not be found.</p>
                    <Button onClick={() => navigate('/customers')} className="w-full bg-primary text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest">
                        Back to Customers
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Superior Header */}
            <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/customers')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{customer.name}</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Customer Details</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="rounded-2xl h-12 w-12 p-0 bg-slate-50">
                            <MoreHorizontal className="w-5 h-5 text-slate-400" />
                        </Button>
                        <div className="h-10 w-px bg-slate-100 mx-2" />
                        <Button
                            onClick={() => navigate(`/customers/edit/${id}`)}
                            className="bg-primary text-white rounded-[1.2rem] h-14 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                {/* Intelligence Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-red-50 rounded-2xl">
                                <Wallet className="w-6 h-6 text-red-600" />
                            </div>
                            <span className="text-[8px] font-black text-red-500/40 uppercase tracking-[0.2em]">{customer.creditBalance > 0 ? 'Dues Active' : 'Cleared'}</span>
                        </div>
                        <h2 className={cn("text-3xl font-black leading-none mb-1", customer.creditBalance > 0 ? 'text-red-900' : 'text-emerald-900')}>
                            {formatCurrency(customer.creditBalance)}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Owed</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                <Activity className="w-6 h-6" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{formatCurrency(customer.totalPurchases || 0)}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Spent</p>
                    </div>

                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-white">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
                                <Star className="w-6 h-6" />
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Loyalty</span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-1">{loyaltyPoints.toLocaleString()}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loyalty Points</p>
                    </div>

                    <div className="bg-primary rounded-[2rem] p-8 text-white shadow-xl shadow-black/10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-white/10 rounded-2xl text-white">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Tenure</span>
                        </div>
                        <h2 className="text-xl font-black leading-none mb-2 uppercase">{new Date(customer.joinedAt).toLocaleDateString()}</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Member Since</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    {/* Profile & Loyalty Controls */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
                            <div className="flex items-center gap-3 mb-10">
                                <User className="w-5 h-5 text-slate-400" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Contact Info</h3>
                            </div>
                            <div className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Phone</p>
                                        <p className="text-sm font-black text-slate-900">{customer.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Area</p>
                                        <p className="text-sm font-black text-slate-900 uppercase">{customer.area || 'Not Set'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Metadata Section */}
                            {clientCustomFields.length > 0 && (
                                <div className="mt-12 pt-10 border-t border-slate-50">
                                    <div className="flex items-center gap-3 mb-8">
                                        <History className="w-5 h-5 text-slate-400" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Additional Details</h3>
                                    </div>
                                    <div className="space-y-5">
                                        {clientCustomFields.map(field => {
                                            const val = clientValues.find(v => v.fieldId === field.id)?.value;
                                            return (
                                                <div key={field.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{field.label}</span>
                                                    <span className="text-[11px] font-black text-slate-700 uppercase">{val || '—'}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-indigo-200">
                            <Gift className="w-10 h-10 text-white/30 mb-8" />
                            <h3 className="text-xl font-black uppercase tracking-tight mb-2">Loyalty Adjustment</h3>
                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-10">Add loyalty points manually</p>

                            <div className="space-y-4">
                                <Input
                                    type="number"
                                    placeholder="Enter points value..."
                                    value={pointsToAdd}
                                    onChange={e => setPointsToAdd(e.target.value)}
                                    className="h-16 bg-white/10 border-none rounded-2xl px-6 text-white font-black placeholder:text-white/30"
                                />
                                <Button onClick={handleAddPoints} className="w-full bg-white text-indigo-600 rounded-[1.2rem] h-16 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 active:scale-95 transition-all">
                                    ADD POINTS
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Ledger */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-white">
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-400">
                                        <History className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Transaction History</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ledger.length} Entries</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                            </div>

                            {isLoadingLedger ? (
                                <div className="py-24 text-center">
                                    <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-6" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading transactions...</p>
                                </div>
                            ) : ledger.length > 0 ? (
                                <div className="space-y-4">
                                    {ledger.map((row, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] group hover:bg-white hover:shadow-xl transition-all duration-500 border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-8">
                                                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center font-black", row.type === 'SALE' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600')}>
                                                    {row.type === 'SALE' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-black text-sm uppercase tracking-tight">{row.reference}</h4>
                                                        <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", row.type === 'SALE' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600')}>
                                                            {row.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(row.date).toLocaleDateString()} • {new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12 text-right">
                                                {row.debit > 0 && (
                                                    <div>
                                                    <p className="text-xl font-black text-red-600 tracking-tighter mb-1">+{formatCurrency(row.debit)}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Added</p>
                                                    </div>
                                                )}
                                                {row.credit > 0 && (
                                                    <div>
                                                    <p className="text-xl font-black text-emerald-600 tracking-tighter mb-1">-{formatCurrency(row.credit)}</p>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paid</p>
                                                    </div>
                                                )}
                                                <div className="w-24 px-6 border-l border-slate-100">
                                                    <p className="text-xl font-black text-slate-900 tracking-tighter mb-1">{formatCurrency(row.cumulative_balance)}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-24 text-center opacity-30">
                                    <History className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Transactions Yet</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">No transactions found for this customer</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
