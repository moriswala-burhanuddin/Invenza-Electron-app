import { useState, useMemo } from 'react';
import { ShoppingBag, Package, RefreshCw, AlertCircle, Plus, Search, Filter, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useERPStore } from '@/lib/store-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';

const EcommerceProducts = () => {
    const navigate = useNavigate();
    const { getStoreProducts } = useERPStore();
    const [searchTerm, setSearchTerm] = useState("");

    const products = useMemo(() => {
        return getStoreProducts().map(p => ({
            ...p,
            title: p.name,
            slug: p.sku,
            current_price: p.sellingPrice,
            category: { name: p.categoryName || "Uncategorized" },
            is_active: p.quantity > 0,
            image: null
        }));
    }, [getStoreProducts]);

    const isLoading = false;
    const error = null;

    const fetchProducts = () => {
        // Data is reactive via Zustand store
    };

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32">
            <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-purple-600 rounded-2xl text-white shadow-xl shadow-purple-200">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Website Products</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Manage items available on your online store</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="h-12 px-8 rounded-xl bg-primary text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-xl shadow-black/10">
                            <Plus className="w-4 h-4" />
                            Add New Product
                        </Button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
                    <div className="flex flex-col md:flex-row gap-6 mb-12">
                        <div className="relative flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search products or categories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-16 pl-16 pr-8 bg-slate-50 border-none rounded-2xl text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <Button variant="outline" className="h-16 px-8 rounded-2xl border-slate-200 font-black uppercase text-[10px] tracking-widest gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6">
                            <RefreshCw className="w-12 h-12 text-slate-200 animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving product catalog...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-100" />
                            <p className="text-sm font-black text-slate-900 uppercase">{error}</p>
                            <Button onClick={fetchProducts} variant="ghost" className="uppercase text-[10px] font-black">Try Again</Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Product Information</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Category</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Price</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6">Status</TableHead>
                                        <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredProducts.map((p) => (
                                        <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                            <TableCell className="py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                                                        {p.image ? (
                                                            <img src={p.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                                <Package className="w-8 h-8" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{p.title}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">SKU: {p.slug?.substring(0, 8).toUpperCase() || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6">
                                                <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                                                    {p.category?.name || "Uncategorized"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-6 font-black text-slate-900">${p.current_price || "0.00"}</TableCell>
                                            <TableCell className="py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${p.is_active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                    <span className="text-[10px] font-black text-slate-600 uppercase">
                                                        {p.is_active !== false ? 'Live' : 'Draft'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 text-right">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-sm">
                                                        <Edit className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-red-50 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
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

export default EcommerceProducts;
