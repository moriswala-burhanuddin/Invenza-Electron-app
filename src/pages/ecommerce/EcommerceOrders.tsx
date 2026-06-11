import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, RefreshCw, AlertCircle, Search, Truck, CheckCircle, Clock } from 'lucide-react';
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

const EcommerceOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const { accessToken } = useERPStore();

    const fetchOrders = useCallback(async () => {
        if (!accessToken) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/online-orders/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error("Failed to fetch orders from ERP");

            const data = await response.json();
            setOrders(Array.isArray(data) ? data : (data.results || []));
        } catch (err: any) {
            setError(err.message || "Failed to fetch orders");
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleUpdateStatus = async (orderId: string, status: string) => {
        if (!accessToken) return;

        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/online-orders/${orderId}/update_status/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });

            if (!response.ok) throw new Error("Failed to update status in ERP");

            toast.success(`Order status updated to ${status}`);
            fetchOrders();
        } catch (err: any) {
            toast.error(err.message || "Failed to update status");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddTracking = async (orderId: string, e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!accessToken) return;

        const formData = new FormData(e.currentTarget);
        const data = {
            courier_name: formData.get('courier_name') as string,
            tracking_number: formData.get('tracking_number') as string,
            shipping_method: formData.get('shipping_method') as string,
            estimated_delivery_date: formData.get('estimated_delivery_date') as string,
        };

        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/online-orders/${orderId}/add_tracking/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error("Failed to add tracking in ERP");

            toast.success("Tracking info added successfully");
            fetchOrders();
        } catch (err: any) {
            toast.error(err.message || "Failed to add tracking");
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered': case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'pending': return 'bg-orange-50 text-orange-600 border-orange-100';
            case 'processing': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'shipped': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'cancelled': case 'failed': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status?.toLowerCase()) {
            case 'delivered': case 'completed': return <CheckCircle className="w-3 h-3" />;
            case 'shipped': return <Truck className="w-3 h-3" />;
            case 'pending': return <Clock className="w-3 h-3" />;
            case 'processing': return <RefreshCw className="w-3 h-3 animate-spin" />;
            default: return <ShoppingBag className="w-3 h-3" />;
        }
    };

    const filteredOrders = orders.filter(o =>
        o.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary rounded-2xl text-white shadow-xl shadow-slate-200">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Order Management</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Control deliveries and status of online store purchases</p>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                    {/* Search Bar */}
                    <div className="flex flex-col md:flex-row gap-6 mb-12">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search order ID, customer, or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-16 pl-16 pr-8 bg-slate-50 border-none rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Button onClick={fetchOrders} variant="outline" className="h-16 w-16 rounded-2xl border-slate-200">
                            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <RefreshCw className="w-12 h-12 text-slate-200 animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving live store data...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-100" />
                            <p className="text-sm font-black text-slate-900 uppercase">{error}</p>
                            <Button onClick={fetchOrders} variant="ghost" className="uppercase text-[10px] font-black">Try Again</Button>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4 text-center">
                            <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                                <ShoppingBag className="w-16 h-16" />
                            </div>
                            <h3 className="text-sm font-black text-slate-900 uppercase">No Orders Found</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">New orders from your website will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Order ID</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Customer</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Date</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Amount</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Status</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((o) => (
                                        <TableRow key={o.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                            <TableCell className="py-6 font-black text-slate-900">
                                                #{o.order_id?.substring(0, 10).toUpperCase() || 'N/A'}
                                            </TableCell>
                                            <TableCell className="py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900">{o.full_name || "Guest"}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{o.user_email || "No email"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 text-[10px] font-black text-slate-600 uppercase">
                                                {o.created_at ? new Date(o.created_at).toLocaleDateString() : "N/A"}
                                            </TableCell>
                                            <TableCell className="py-6 font-black text-slate-900">{formatCurrency(o.amount || 0)}</TableCell>
                                            <TableCell className="py-6">
                                                <div className={cn(
                                                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider",
                                                    getStatusStyles(o.status)
                                                )}>
                                                    <StatusIcon status={o.status || 'pending'} />
                                                    {o.status || 'Pending'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            onClick={() => setSelectedOrder(o)}
                                                            variant="ghost"
                                                            className="h-10 px-4 rounded-xl hover:bg-white hover:shadow-sm font-black uppercase text-[10px] tracking-widest gap-2"
                                                        >
                                                            <Truck className="w-4 h-4" />
                                                            Manage
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl rounded-[2.5rem] p-10">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Order #{o.order_id}</DialogTitle>
                                                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">Update delivery status and tracking info</DialogDescription>
                                                        </DialogHeader>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                                                            {/* Customer & Shipping */}
                                                            <div className="space-y-6">
                                                                <div className="p-6 bg-slate-50 rounded-2xl">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Customer Info</Label>
                                                                    <p className="text-sm font-black text-slate-900">{o.full_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">{o.user_email}</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 mt-1">{o.phone}</p>
                                                                </div>

                                                                <div className="p-6 bg-slate-50 rounded-2xl">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Shipping Address</Label>
                                                                    <p className="text-[10px] font-bold text-slate-700 leading-relaxed uppercase">
                                                                        {o.address}, {o.city}, {o.state} - {o.pincode}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Update Status & Tracking */}
                                                            <div className="space-y-6">
                                                                <div className="space-y-2">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Update Status</Label>
                                                                    <Select
                                                                        defaultValue={o.status}
                                                                        onValueChange={(val) => handleUpdateStatus(o.id, val)}
                                                                        disabled={isUpdating}
                                                                    >
                                                                        <SelectTrigger className="rounded-xl h-12 font-black text-[10px] uppercase">
                                                                            <SelectValue placeholder="Change Status" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                                                            <SelectItem value="Pending" className="text-[10px] font-black uppercase">Pending</SelectItem>
                                                                            <SelectItem value="Processing" className="text-[10px] font-black uppercase">Processing</SelectItem>
                                                                            <SelectItem value="Shipped" className="text-[10px] font-black uppercase tracking-widest text-purple-600">Shipped</SelectItem>
                                                                            <SelectItem value="Delivered" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Delivered</SelectItem>
                                                                            <SelectItem value="Cancelled" className="text-[10px] font-black uppercase text-red-600">Cancelled</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <form onSubmit={(e) => handleAddTracking(o.id, e)} className="p-6 border-2 border-dashed border-slate-100 rounded-2xl space-y-4">
                                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Shipping Details</Label>
                                                                    <div className="space-y-3">
                                                                        <Input name="courier_name" placeholder="Courier Name (e.g. DHL, BlueDart)" defaultValue={o.courier_name} className="h-10 rounded-lg text-[10px] font-bold" />
                                                                        <Input name="tracking_number" placeholder="Tracking Number" defaultValue={o.tracking_number} className="h-10 rounded-lg text-[10px] font-bold" />
                                                                        <Input name="estimated_delivery_date" type="date" defaultValue={o.estimated_delivery_date} className="h-10 rounded-lg text-[10px] font-bold" />
                                                                        <Button type="submit" disabled={isUpdating} className="w-full h-12 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                                                                            {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Save Tracking Info"}
                                                                        </Button>
                                                                    </div>
                                                                </form>
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

export default EcommerceOrders;
