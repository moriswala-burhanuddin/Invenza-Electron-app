import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertCircle, Search, Undo2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency } from '@/lib/utils';
import { API_URL } from '@/lib/config';
import { useERPStore } from '@/lib/store-data';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

const EcommerceReturns = () => {
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedReturn, setSelectedReturn] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const { accessToken } = useERPStore();

    const fetchReturns = useCallback(async () => {
        if (!accessToken) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/online-returns/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error("Failed to fetch returns from ERP");

            const data = await response.json();
            setReturns(Array.isArray(data) ? data : (data.results || []));
        } catch (err: any) {
            setError(err.message || "Failed to fetch returns");
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleUpdateStatus = async (returnId: string, status: string) => {
        if (!accessToken) return;

        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/online-returns/${returnId}/update_status/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) throw new Error("Failed to update status in ERP");

            toast.success(`Return status updated to ${status}`);
            fetchReturns();
        } catch (err: any) {
            toast.error(err.message || "Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': case 'refunded': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'requested': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'picked up': case 'approved': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'rejected': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status?.toLowerCase()) {
            case 'completed': case 'refunded': return <CheckCircle className="w-3 h-3" />;
            case 'requested': return <Clock className="w-3 h-3" />;
            case 'rejected': return <XCircle className="w-3 h-3" />;
            default: return <Undo2 className="w-3 h-3" />;
        }
    };

    const filteredReturns = returns.filter(r =>
        r.order?.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-orange-600 rounded-2xl text-white shadow-xl shadow-orange-100">
                            <Undo2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Returns Management</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Manage product returns and refunds</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                    <div className="flex flex-col md:flex-row gap-6 mb-12">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by Order ID or Reason..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-16 pl-16 pr-8 bg-slate-50 border-none rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Button onClick={fetchReturns} variant="outline" className="h-16 w-16 rounded-2xl border-slate-200">
                            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <RefreshCw className="w-12 h-12 text-slate-200 animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving return requests...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-100" />
                            <p className="text-sm font-black text-slate-900 uppercase">{error}</p>
                            <Button onClick={fetchReturns} variant="ghost" className="uppercase text-[10px] font-black">Try Again</Button>
                        </div>
                    ) : filteredReturns.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4 text-center">
                            <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                                <Undo2 className="w-16 h-16" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">No Return Requests</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Requests from the online store will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Order ID</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Reason</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Date</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Refund</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Status</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReturns.map((r) => (
                                        <TableRow key={r.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                            <TableCell className="py-6 font-black text-slate-900">
                                                #{r.order?.order_id || 'N/A'}
                                            </TableCell>
                                            <TableCell className="py-6">
                                                <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap text-sm font-black text-slate-900">
                                                    {r.reason || "No reason provided"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 text-[10px] font-black text-slate-600 uppercase">
                                                {new Date(r.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="py-6 font-black text-slate-900">{formatCurrency(r.refund_amount || 0)}</TableCell>
                                            <TableCell className="py-6">
                                                <div className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider",
                                                    getStatusStyles(r.status)
                                                )}>
                                                    <StatusIcon status={r.status || 'requested'} />
                                                    {r.status || 'Requested'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            onClick={() => setSelectedReturn(r)}
                                                            variant="ghost"
                                                            className="h-10 px-4 rounded-xl hover:bg-white hover:shadow-sm font-black uppercase text-[10px] tracking-widest gap-2"
                                                        >
                                                            Manage
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-xl rounded-[2.5rem] p-10">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Return #{r.id.substring(0,8).toUpperCase()}</DialogTitle>
                                                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Process refund request</DialogDescription>
                                                        </DialogHeader>

                                                        <div className="space-y-6 py-6">
                                                            <div className="p-6 bg-slate-50 rounded-2xl">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Return Reason</Label>
                                                                <p className="text-sm font-black text-slate-700 leading-relaxed uppercase">{r.reason}</p>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <Label className="text-[10px] font-black uppercase text-slate-400">Update Status</Label>
                                                                <Select
                                                                    defaultValue={r.status}
                                                                    onValueChange={(val) => handleUpdateStatus(r.id, val)}
                                                                    disabled={isUpdating}
                                                                >
                                                                    <SelectTrigger className="rounded-xl h-14 font-black text-[10px] uppercase">
                                                                        <SelectValue placeholder="Change Status" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-xl border-none shadow-2xl">
                                                                        <SelectItem value="Requested" className="text-[10px] font-black uppercase">Requested</SelectItem>
                                                                        <SelectItem value="Approved" className="text-[10px] font-black uppercase text-blue-600">Approved</SelectItem>
                                                                        <SelectItem value="Picked Up" className="text-[10px] font-black uppercase text-purple-600">Picked Up</SelectItem>
                                                                        <SelectItem value="Refunded" className="text-[10px] font-black uppercase text-emerald-600">Refunded</SelectItem>
                                                                        <SelectItem value="Completed" className="text-[10px] font-black uppercase text-slate-600">Completed</SelectItem>
                                                                        <SelectItem value="Rejected" className="text-[10px] font-black uppercase text-red-600">Rejected</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                
                                                                <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] font-black uppercase text-slate-400">Refund Amount</span>
                                                                        <span className="text-xl font-black text-slate-900">{formatCurrency(r.refund_amount || 0)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default EcommerceReturns;
