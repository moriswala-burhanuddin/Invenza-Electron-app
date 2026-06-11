import { useState } from 'react';
import { useERPStore, Product, Store } from '@/lib/store-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

interface StockTransferFormProps {
    onSuccess?: () => void;
    initialProductId?: string;
}

export function StockTransferForm({ onSuccess, initialProductId }: StockTransferFormProps) {
    const { products, stores, processStockTransfer, activeStoreId } = useERPStore();
    const [productId, setProductId] = useState(initialProductId || '');
    const [fromStoreId, setFromStoreId] = useState(activeStoreId || '');
    const [toStoreId, setToStoreId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !fromStoreId || !toStoreId || !quantity) {
            toast.error('Please fill all fields');
            return;
        }

        if (fromStoreId === toStoreId) {
            toast.error('Source and destination stores must be different');
            return;
        }

        setIsSubmitting(true);
        try {
            await processStockTransfer({
                productId,
                fromStoreId,
                toStoreId,
                quantity: parseFloat(quantity),
            });
            toast.success('Stock transfer initiated successfully');
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error('Failed to process transfer');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pt-4 text-white">
            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Select Product Asset</Label>
                <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="h-16 bg-white/10 border-white/10 rounded-2xl text-lg font-black focus:ring-[#2156C1]">
                        <SelectValue placeholder="Select inventory item..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#12286D] border-white/10 text-white">
                        {products.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="focus:bg-[#2156C1] focus:text-white">
                                {p.name} ({p.sku})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Source Node</Label>
                    <Select value={fromStoreId} onValueChange={setFromStoreId}>
                        <SelectTrigger className="h-14 bg-white/10 border-white/10 rounded-2xl focus:ring-[#2156C1]">
                            <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#12286D] border-white/10 text-white">
                            {stores.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="focus:bg-[#2156C1] focus:text-white">
                                    {s.name} - {s.branch}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Destination Node</Label>
                    <Select value={toStoreId} onValueChange={setToStoreId}>
                        <SelectTrigger className="h-14 bg-white/10 border-white/10 rounded-2xl focus:ring-[#2156C1]">
                            <SelectValue placeholder="Destination" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#12286D] border-white/10 text-white">
                            {stores.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="focus:bg-[#2156C1] focus:text-white">
                                    {s.name} - {s.branch}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Transfer Quantity</Label>
                <Input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="AMOUNT TO DEPLOY..."
                    className="h-16 bg-white/10 border-white/10 rounded-2xl text-lg font-black placeholder:text-white/20 focus:ring-[#2156C1] uppercase tracking-widest"
                />
            </div>

            <Button type="submit" className="w-full h-16 bg-[#2156C1] hover:bg-[#2156C1]/80 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/20 transition-all active:scale-95 text-xs" disabled={isSubmitting}>
                {isSubmitting ? 'AUTHORIZING TRANSFER...' : 'EXECUTE PROTOCOL'}
            </Button>
        </form>
    );
}
