import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, Product } from '@/lib/store-data';
import {
  Plus, Search, Package, ScanBarcode, FileSpreadsheet,
  Upload, Loader2, ArrowRightLeft, Sparkles, Copy,
  ArrowUpRight, Barcode, Filter
} from 'lucide-react';
import { StockTransferForm } from '@/components/inventory/StockTransferForm';
import { useNavigate } from 'react-router-dom';
import { isElectron } from '@/lib/electron-helper';
import { aiService } from '@/lib/ai-service';
import { parseExcelInventory } from '@/lib/inventory-utils';
import { useLicense } from '@/contexts/LicenseContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

export default function Products() {
  const navigate = useNavigate();
  const { hasFeature } = useLicense();
  const { getStoreProducts, handleBarcodeScan, processExcelUpload, getStoreSales, updateProduct, bulkDeleteProducts, bulkUpdateProducts, checkPermission } = useERPStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMode, setScanMode] = useState<'lookup' | 'out'>('lookup');

  // Modal States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ created: number; updated: number; failed: number } | null>(null);
  const [barcodeDialog, setBarcodeDialog] = useState<{ open: boolean, data?: string, name?: string, sku?: string }>({ open: false });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);

  const products = getStoreProducts();
  const categories = [...new Set(products.map(p => p.categoryName).filter(Boolean))];

  // ─── Permission Flags ─────────────────────────────────────────
  const canAddProduct   = checkPermission('canAddProduct');
  const canEditProduct  = checkPermission('canEditProduct');
  const canSeeBuyingPrice = checkPermission('canSeeBuyingPrice');
  const canTransferStock  = checkPermission('canTransferStock');

  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      const sales = getStoreSales();
      let suggestions;

      if (isElectron() && window.electronAPI) {
        suggestions = await window.electronAPI.optimizeReorder(products, sales);
      } else {
        // Web Demo: Use our new aiService
        suggestions = await aiService.optimizeReorderPoints(products, sales);
      }

      let updatedCount = 0;
      if (suggestions && typeof suggestions === 'object') {
        for (const [id, suggestion] of Object.entries(suggestions)) {
          const s = suggestion as { minStock: number, reorderQuantity: number };
          updateProduct(id, {
            minStock: s.minStock,
            reorderQuantity: s.reorderQuantity
          });
          updatedCount++;
        }

        toast.success('Optimization Complete', {
          description: `Updated reorder points for ${updatedCount} products.`
        });
      } else {
        throw new Error('Invalid suggestions received from AI.');
      }
    } catch (error) {
      toast.error('AI Optimization Failed', { description: (error as Error).message });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    if (scanMode === 'out') {
      const result = await handleBarcodeScan(barcode, 'OUT');

      if (result.status === 'SUCCESS') {
        toast.success(`Stock Removed: ${result.product_name}`, {
          description: `Quantity: ${result.previous_stock} -> ${result.updated_stock}`
        });
        setBarcodeInput('');
      } else if (result.status === 'NOT_FOUND') {
        toast.error('Product Not Found', {
          description: 'Would you like to create it?',
          action: {
            label: 'Create',
            onClick: () => navigate('/products/new')
          }
        });
      } else {
        toast.error('Scan Error', { description: result.warning });
      }
    } else {
      // Lookup Mode
      const found = products.find(p =>
        p.sku.toLowerCase() === barcode.toLowerCase() ||
        (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase())
      );

      if (found) {
        setSearchQuery(barcode);
        toast.success(`Found: ${found.name}`, {
          description: `Current Stock: ${found.quantity} ${found.unit || 'units'}`
        });
        setBarcodeInput('');
      } else {
        toast.error('Product Not Found', {
          description: 'No product matches this barcode/SKU.'
        });
      }
    }
  };

  const handleFileProcess = async (file: File) => {
    try {
      setIsLoading(true);
      setUploadStats(null);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { validRows, errors } = await parseExcelInventory(file);

      if (validRows.length === 0 && errors.length > 0) {
        toast.error('No valid rows found', { description: `Found ${errors.length} errors.` });
        setIsLoading(false);
        return;
      }

      const summary = await processExcelUpload(validRows);
      setUploadStats({
        created: summary.created_products,
        updated: summary.updated_products,
        failed: summary.failed_rows
      });

      toast.success('Import Complete', {
        description: `Processed ${summary.total_rows} rows.`
      });
    } catch (error) {
      toast.error('Upload Failed', { description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrintBarcode = async (product: import('@/lib/store-data').Product) => {
    if (window.electronAPI && window.electronAPI.generateBarcode) {
      try {
        const dataUrl = await window.electronAPI.generateBarcode(product.sku);
        setBarcodeDialog({
          open: true,
          data: dataUrl,
          name: product.name,
          sku: product.sku
        });
      } catch (error) {
        toast.error('Failed to generate barcode');
      }
    }
  };

  const handleClone = (product: import('@/lib/store-data').Product) => {
    navigate('/products/new', { state: { cloneData: product } });
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) return;
    try {
      await bulkDeleteProducts(selectedIds);
      toast.success('Bulk Delete Successful', { description: `Removed ${selectedIds.length} items.` });
      setSelectedIds([]);
    } catch (error) {
      toast.error('Bulk Delete Failed');
    }
  };

  const handleBulkCategoryUpdate = async () => {
    if (!bulkCategory) return;
    try {
      await bulkUpdateProducts(selectedIds, { categoryName: bulkCategory });
      toast.success('Bulk Update Successful', { description: `Updated ${selectedIds.length} items.` });
      setSelectedIds([]);
      setIsBulkEditOpen(false);
    } catch (error) {
      toast.error('Bulk Update Failed');
    }
  };

  const handlePriceUpdate = async (product: typeof products[0]) => {
    const newPrice = parseFloat(tempPrice);
      if (newPrice !== product.sellingPrice) {
        try {
          await updateProduct(product.id, { sellingPrice: newPrice });
          toast.success('Price Updated', { description: `${product.name} price set to ${formatCurrency(newPrice)}` });
        } catch (error) {
          toast.error('Update Failed');
        }
      }
    setEditingPriceId(null);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.categoryName === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalStockValue = products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24 lg:pb-10">
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} Products • ${canSeeBuyingPrice ? formatCurrency(totalStockValue) : '***'} Value`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* Superior Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-foreground transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-[1.5rem] py-4 pl-12 pr-4 text-sm font-bold border-none shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-slate-300"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {canAddProduct && (
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 bg-white text-slate-900 border-none shadow-sm px-5 py-3 rounded-[1.2rem] font-black text-[10px] tracking-widest hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap">
                  <FileSpreadsheet className="w-4 h-4" />
                  IMPORT
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="font-black text-2xl uppercase tracking-tight">Import Products</DialogTitle>
                  <DialogDescription className="font-bold text-slate-400">Excel or CSV files supported.</DialogDescription>
                </DialogHeader>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); handleFileProcess(e.dataTransfer.files[0]); }}
                  className={cn(
                    "mt-4 border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer",
                    isDragging ? "border-primary bg-slate-50 scale-[0.98]" : "border-slate-100 hover:border-slate-300",
                    isLoading ? "opacity-30 pointer-events-none" : ""
                  )}
                >
                  <input type="file" onChange={(e) => e.target.files && handleFileProcess(e.target.files[0])} className="hidden" id="import-input" />
                  <label htmlFor="import-input" className="flex flex-col items-center cursor-pointer">
                    {isLoading ? <Loader2 className="w-10 h-10 animate-spin text-foreground" /> : <Upload className="w-10 h-10 text-slate-300" />}
                    <span className="mt-4 font-black uppercase tracking-widest text-[10px]">Click to upload</span>
                  </label>
                </div>
              </DialogContent>
            </Dialog>
            )}

            {canTransferStock && (
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <button onClick={() => { setSelectedProductId(undefined); setIsTransferOpen(true); }} className="flex items-center gap-2 bg-white text-slate-900 border-none shadow-sm px-5 py-3 rounded-[1.2rem] font-black text-[10px] tracking-widest hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap">
                  <ArrowRightLeft className="w-4 h-4" />
                  TRANSFER STOCK
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="font-black text-2xl uppercase tracking-tight">Stock Transfer</DialogTitle>
                  <DialogDescription className="font-bold text-slate-400">Move inventory between branches.</DialogDescription>
                </DialogHeader>
                <StockTransferForm
                  initialProductId={selectedProductId}
                  onSuccess={() => setIsTransferOpen(false)}
                />
              </DialogContent>
            </Dialog>
            )}

            {hasFeature('Reorder Optimization') && canEditProduct && (
              <button onClick={runOptimization} disabled={isOptimizing} className="flex items-center gap-2 bg-indigo-600 text-white border-none shadow-lg shadow-indigo-200 px-5 py-3 rounded-[1.2rem] font-black text-[10px] tracking-widest hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap">
                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI OPTIMIZE
              </button>
            )}

            {canAddProduct && (
            <button onClick={() => navigate('/products/new')} className="flex items-center gap-2 bg-primary text-white border-none shadow-lg shadow-black/10 px-5 py-3 rounded-[1.2rem] font-black text-[10px] tracking-widest hover:bg-slate-800 transition-all active:scale-95 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              NEW PRODUCT
            </button>
            )}
          </div>
        </div>

        {/* Quick Scanner Card */}
        <div className="bg-slate-900 rounded-[2.5rem] p-6 mb-8 shadow-xl shadow-slate-900/10 transition-transform active:scale-[0.99] group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ScanBarcode className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center gap-4">
              <div className="bg-white/10 p-4 rounded-2xl">
                <ScanBarcode className="text-white w-6 h-6 animate-pulse" />
              </div>
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={scanMode === 'lookup' ? "SCAN TO FIND ITEM..." : "SCAN TO REMOVE STOCK..."}
                className="bg-transparent border-none text-white text-xl placeholder:text-slate-500 focus:outline-none flex-1 font-mono tracking-wider font-black"
                autoFocus
              />
            </form>

            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
              <button
                onClick={() => setScanMode('lookup')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  scanMode === 'lookup' ? "bg-white text-foreground shadow-lg" : "text-slate-400 hover:text-white"
                )}
              >
                Find Item
              </button>
              <button
                onClick={() => setScanMode('out')}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  scanMode === 'out' ? "bg-orange-600 text-white shadow-lg shadow-orange-900/20" : "text-slate-400 hover:text-white"
                )}
              >
                Remove Stock
              </button>
            </div>
          </div>
        </div>

        {/* Filtering & Layout Selection */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter:</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar no-scrollbar-hidden">
              <button
                onClick={() => setFilterCategory('all')}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                  filterCategory === 'all' ? "bg-primary text-white shadow-lg" : "bg-white text-slate-400 hover:text-slate-600 shadow-sm"
                )}
              >
                All
              </button>
              {categories.slice(0, 5).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                    filterCategory === cat ? "bg-primary text-white shadow-lg" : "bg-white text-slate-400 hover:text-slate-600 shadow-sm"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {canEditProduct && (
          <button
            onClick={toggleSelectAll}
            className="text-[10px] font-black text-slate-400 hover:text-foreground uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            {selectedIds.length > 0 ? `Deselect (${selectedIds.length})` : 'Select All'}
            <div className={cn("w-3 h-3 border-2 transition-colors", selectedIds.length === filteredProducts.length ? "bg-primary border-primary shadow-sm" : "border-slate-300")} />
          </button>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/products/${product.id}`)}
                className={cn(
                  "group relative bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 cursor-pointer border-2",
                  selectedIds.includes(product.id) ? "border-primary bg-slate-50" : "border-transparent"
                )}
              >
                {/* Selector */}
                {canEditProduct && (
                <div
                  onClick={(e) => toggleSelectRow(product.id, e)}
                  className={cn(
                    "absolute top-6 left-6 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all z-20",
                    selectedIds.includes(product.id) ? "bg-primary border-primary scale-110 shadow-lg shadow-black/20" : "bg-white border-slate-100 opacity-0 group-hover:opacity-100"
                  )}
                >
                  {selectedIds.includes(product.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                )}

                {/* Top Actions - only for users who can edit */}
                {canEditProduct && (
                <div className="absolute top-6 right-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                  <button onClick={(e) => { e.stopPropagation(); handlePrintBarcode(product); }} className="p-3 bg-white shadow-sm border border-slate-50 rounded-2xl text-slate-400 hover:text-foreground hover:shadow-md transition-all">
                    <Barcode className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleClone(product); }} className="p-3 bg-white shadow-sm border border-slate-50 rounded-2xl text-slate-400 hover:text-foreground hover:shadow-md transition-all">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                )}

                {/* Content */}
                <div className="flex flex-col h-full pt-4">
                  <div className="mb-6">
                    <div className="inline-block px-3 py-1 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg mb-2 group-hover:bg-white group-hover:shadow-sm transition-all">
                      {product.categoryName || 'Other'}
                    </div>
                    <h3 className="font-black text-slate-900 text-xl leading-snug group-hover:translate-x-1 transition-transform">{product.name}</h3>
                    <p className="font-mono text-slate-400 text-[10px] font-black mt-1 uppercase tracking-tighter">{product.sku}</p>
                  </div>

                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IN STOCK</p>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-2xl font-black leading-none",
                          product.quantity < 10 ? "text-red-500" : product.quantity < 20 ? "text-amber-500" : "text-foreground"
                        )}>
                          {product.quantity.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase">{product.unit || 'UNITS'}</span>
                      </div>
                      {product.quantity < 10 && (
                        <div className="mt-2 flex items-center gap-1.5 text-red-500 bg-red-50 px-3 py-1 rounded-full w-fit">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Low Stock</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PRICE</p>
                      <div
                        onClick={(e) => {
                          if (!canEditProduct) return;
                          e.stopPropagation();
                          setEditingPriceId(product.id);
                          setTempPrice(product.sellingPrice.toString());
                        }}
                        className={cn(
                          "text-2xl font-black text-foreground leading-none transition-transform origin-right",
                          canEditProduct ? "group-hover:scale-110 cursor-pointer" : "cursor-default"
                        )}
                      >
                        {formatCurrency(product.sellingPrice)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Overlay Detail Link */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-30 transform translate-x-2 group-hover:translate-x-0 transition-all">
                  <ArrowRightLeft className="w-5 h-5 text-foreground" />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 bg-white rounded-[3rem] text-center shadow-sm">
              <Package className="w-16 h-16 text-slate-100 mx-auto mb-4" />
              <h3 className="font-black text-slate-900 text-lg uppercase">No results found</h3>
              <p className="text-slate-400 font-bold text-xs mt-1">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modern Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white p-4 pr-6 rounded-[2rem] shadow-2xl z-[100] flex items-center gap-6 animate-in slide-in-from-bottom-20 duration-500">
          <div className="flex items-center gap-3 bg-white/10 px-6 py-4 rounded-[1.5rem]">
            <div className="w-8 h-8 bg-white text-foreground rounded-full flex items-center justify-center font-black text-sm">
              {selectedIds.length}
            </div>
            <span className="font-black text-[10px] uppercase tracking-[0.2em]">Items Selected</span>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setIsBulkEditOpen(true)} className="px-6 py-4 rounded-[1.5rem] bg-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20">
              CHANGE CATEGORY
            </button>
            {canAddProduct && (
            <button onClick={handleBulkDelete} className="px-6 py-4 rounded-[1.5rem] bg-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-lg shadow-red-600/20">
              DELETE
            </button>
            )}
            <button onClick={() => setSelectedIds([])} className="px-6 py-4 rounded-[1.5rem] bg-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95">
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Barcode Designer Dialog */}
      <Dialog open={barcodeDialog.open} onOpenChange={(val) => setBarcodeDialog({ ...barcodeDialog, open: val })}>
        <DialogContent className="rounded-[3rem] border-none shadow-2xl max-w-sm">
          <div className="p-8 text-center">
            <h3 className="font-black uppercase tracking-tight text-xl mb-6">Barcode Label</h3>
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 inline-block mb-6">
              {barcodeDialog.data && <img src={barcodeDialog.data} alt="Barcode" className="max-w-full h-auto" />}
              <p className="mt-4 font-black text-sm uppercase">{barcodeDialog.name}</p>
              <p className="font-mono text-[10px] text-slate-400">{barcodeDialog.sku}</p>
            </div>
            <Button className="w-full bg-primary text-white rounded-[1.5rem] h-14 font-black uppercase tracking-widest" onClick={() => window.print()}>Print Label</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Category Modal */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl uppercase tracking-tight">Bulk Update Category</DialogTitle>
            <DialogDescription className="font-bold text-slate-400">Apply to {selectedIds.length} items.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} className="w-full bg-[#F2F2F7] border-none rounded-[1.2rem] py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer">
              <option value="">Select Category...</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1 rounded-[1.2rem] h-14 font-black uppercase tracking-widest bg-primary text-white" onClick={handleBulkCategoryUpdate}>Apply</Button>
            <Button variant="outline" className="flex-1 rounded-[1.2rem] h-14 font-black uppercase tracking-widest" onClick={() => setIsBulkEditOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
