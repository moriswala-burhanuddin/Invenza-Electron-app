import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore } from '@/lib/store-data';
import { Package, Save, X, Sparkles, Loader2, ArrowLeft, Barcode, DollarSign, Info, ShieldCheck, Tag } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { cn, formatCurrency, convertToBase, convertFromBase } from '@/lib/utils';
import { useStoreConfig } from '@/lib/store-config';
import { Button } from '@/components/ui/button';
import { useLicense } from '@/contexts/LicenseContext';
import { isElectron } from '@/lib/electron-helper';
import { aiService } from '@/lib/ai-service';

export default function NewProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { hasFeature } = useLicense();
  const {
    addProduct,
    updateProduct,
    getStoreProducts,
    activeStoreId,
    customFields,
    productCustomValues,
    updateProductCustomValues,
    categories,
    addCategory,
    checkPermission
  } = useERPStore();
  const { baseCurrency } = useStoreConfig();

  const canEditProduct = checkPermission('canEditProduct');
  const canChangeStock = checkPermission('canChangeStock');
  const canSeeBuyingPrice = checkPermission('canSeeBuyingPrice');
  const canAddProduct = checkPermission('canAddProduct');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    categoryId: '',
    categoryName: '',
    brand: '',
    unit: '',
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    minStock: '',
    reorderQuantity: '',
    barcodeEnabled: true,
    limitedQty: '',
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  const isEditMode = Boolean(id);

  useEffect(() => {
    if (isEditMode) {
      const products = getStoreProducts();
      const product = products.find(p => p.id === id);
      if (product) {
        // Resolve categoryId if it's missing but we have a categoryName (for legacy/imported data)
        let finalCategoryId = product.categoryId;
        if (!finalCategoryId && product.categoryName && categories.length > 0) {
          const matchedCategory = categories.find(c => 
            c.name.toLowerCase().trim() === product.categoryName?.toLowerCase().trim()
          );
          if (matchedCategory) {
            finalCategoryId = matchedCategory.id;
          }
        }

        setFormData({
          name: product.name,
          description: product.description || '',
          sku: product.sku || '',
          categoryId: finalCategoryId || '',
          categoryName: product.categoryName || '', // Keep categoryName for display
          brand: product.brand || '',
          unit: product.unit || 'Pcs', // Default to 'Pcs' if not set
          purchasePrice: String(convertFromBase(product.purchasePrice || 0, baseCurrency)),
          sellingPrice: String(convertFromBase(product.sellingPrice || 0, baseCurrency)),
          quantity: String(product.quantity),
          minStock: String(product.minStock || '0'), // Ensure string, default to '0'
          reorderQuantity: String(product.reorderQuantity || '0'), // Ensure string, default to '0'
          barcodeEnabled: product.barcodeEnabled ?? true,
          limitedQty: product.limitedQty?.toString() || '',
        });

        const values = productCustomValues.filter(v => v.productId === id);
        const valuesMap = values.reduce((acc, v) => ({ ...acc, [v.fieldId]: v.value }), {} as Record<string, string>);
        setCustomValues(valuesMap);
      } else {
        toast.error("Product not found.");
        navigate('/products');
      }
    } else if (!canAddProduct) {
      toast.error("You do not have permission to add new products.");
      navigate('/products');
    } else if (location.state?.cloneData) {
      const product = location.state.cloneData as import('@/lib/store-data').Product;
      setFormData({
        name: `${product.name} (CLONE)`,
        description: product.description || '',
        sku: `${product.sku}-COPY`,
        categoryId: product.categoryId || '',
        categoryName: product.categoryName || '',
        brand: product.brand || '',
        unit: product.unit || '',
        purchasePrice: convertFromBase(product.purchasePrice, baseCurrency).toString(),
        sellingPrice: convertFromBase(product.sellingPrice, baseCurrency).toString(),
        quantity: '0',
        minStock: (product.minStock || 0).toString(),
        reorderQuantity: (product.reorderQuantity || 0).toString(),
        barcodeEnabled: product.barcodeEnabled ?? true,
        limitedQty: product.limitedQty?.toString() || '',
      });
    }
  }, [id, isEditMode, getStoreProducts, navigate, productCustomValues, location.state, categories, canAddProduct, baseCurrency]);

  const handleAiSuggest = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name required for AI analysis.");
      return;
    }
    setIsAiLoading(true);
    try {
      let result;
      if (isElectron() && window.electronAPI) {
        result = await window.electronAPI.suggestCategory(formData.name);
      } else {
        // Web Demo: Use our new aiService
        result = await aiService.suggestProductCategory(formData.name);
      }

      if (result) {
        setFormData(prev => ({
          ...prev,
          categoryName: result.category || prev.categoryName,
          brand: result.brand || prev.brand,
          unit: result.unit || prev.unit
        }));
        toast.success("AI Suggestions Applied");
      }
    } catch (error) {
      toast.error("AI Suggestion failed.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'categoryId' && value === 'ADD_NEW') {
      setIsAddingNew(true);
      setFormData(prev => ({ ...prev, categoryId: '', categoryName: '' }));
    } else if (name === 'categoryId') {
      const selectedCat = categories.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        categoryId: value,
        categoryName: selectedCat?.name || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku || (!formData.categoryId && !newCategoryName && !formData.categoryName)) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      let finalCategoryId = formData.categoryId;
      let finalCategoryName = formData.categoryName;

      // Handle Adding New Category
      if (isAddingNew && newCategoryName.trim()) {
        const newCat = await addCategory({
          name: newCategoryName,
          storeId: activeStoreId
        });
        finalCategoryId = newCat.id;
        finalCategoryName = newCat.name;
      } else if (!finalCategoryId && formData.categoryName) {
        // Find by name or create
        const existing = categories.find(c => c.name.toLowerCase() === formData.categoryName.toLowerCase());
        if (existing) {
          finalCategoryId = existing.id;
        } else {
          const newCat = await addCategory({
            name: formData.categoryName,
            storeId: activeStoreId
          });
          finalCategoryId = newCat.id;
          finalCategoryName = newCat.name;
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description || '',
        sku: formData.sku.toUpperCase(),
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        brand: formData.brand,
        unit: formData.unit || 'Pcs',
        purchasePrice: convertToBase(parseFloat(formData.purchasePrice) || 0, baseCurrency),
        sellingPrice: convertToBase(parseFloat(formData.sellingPrice) || 0, baseCurrency),
        quantity: parseInt(formData.quantity) || 0,
        minStock: parseInt(formData.minStock) || 0,
        reorderQuantity: parseInt(formData.reorderQuantity) || 0,
        barcodeEnabled: formData.barcodeEnabled,
        limitedQty: formData.limitedQty ? parseFloat(formData.limitedQty) : undefined,
        storeId: activeStoreId,
        lastUsed: new Date().toISOString().split('T')[0],
      };

      if (isEditMode && id) {
        await updateProduct(id, productData);
        const customValuesArray = Object.entries(customValues).map(([fieldId, value]) => ({ fieldId, value }));
        await updateProductCustomValues(id, customValuesArray);
        toast.success("Product Updated Successfully");
      } else {
        const newProduct = await addProduct(productData);
        const customValuesArray = Object.entries(customValues).map(([fieldId, value]) => ({ fieldId, value }));
        await updateProductCustomValues(newProduct.id, customValuesArray);
        toast.success("Product Added Successfully");
      }
      navigate('/products');
    } catch (error) {
      toast.error("Failed to save product.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-32">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/products')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{isEditMode ? 'Edit Product' : 'New Product'}</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isEditMode ? 'Update existing item' : 'Create new inventory entry'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/products')} className="rounded-[1.2rem] h-12 px-6 font-black uppercase text-[10px] tracking-widest">
              Discard
            </Button>
            <Button onClick={handleSubmit} className="bg-primary text-white rounded-[1.2rem] h-12 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              <Save className="w-4 h-4 mr-2" />
              Save Product
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Essential Identity Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Info className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Product Details</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Basic information</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Name *</label>
                  {hasFeature('Reorder Optimization') && (
                    <button
                      type="button"
                      onClick={handleAiSuggest}
                      disabled={isAiLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase hover:bg-indigo-100 transition-all"
                    >
                      {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Suggest
                    </button>
                  )}
                </div>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isEditMode && !canEditProduct}
                  className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 px-6 font-bold text-slate-900 focus:ring-2 focus:ring-primary transition-all placeholder:text-slate-300 disabled:opacity-50"
                  placeholder="Enter product title..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isEditMode && !canEditProduct}
                  rows={3}
                  className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 px-6 font-bold text-slate-900 focus:ring-2 focus:ring-primary transition-all placeholder:text-slate-300 disabled:opacity-50 resize-none"
                  placeholder="Optional details, dimensions, specs..."
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Barcode *</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <Barcode className="w-4 h-4 text-slate-300 group-focus-within:text-foreground transition-colors" />
                  </div>
                  <input
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    disabled={isEditMode && !canEditProduct}
                    className="w-full bg-slate-50 border-none rounded-[1.5rem] py-5 pl-12 pr-6 font-mono font-black text-slate-900 uppercase focus:ring-2 focus:ring-primary transition-all placeholder:text-slate-300 disabled:opacity-50"
                    placeholder="E.G. SF-HT-001"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category *</label>
                {isAddingNew ? (
                  <div className="relative">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-primary"
                      placeholder="New category name..."
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewCategoryName('');
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 uppercase"
                    >
                      Select Existing
                    </button>
                  </div>
                ) : (
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    disabled={isEditMode && !canEditProduct}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold appearance-none cursor-pointer focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="">Select...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    <option value="ADD_NEW" className="text-indigo-600 font-bold">+ Add New...</option>
                  </select>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</label>
                <input name="brand" value={formData.brand} onChange={handleChange} disabled={isEditMode && !canEditProduct} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-primary disabled:opacity-50" placeholder="Optional" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit of Measure</label>
                <input name="unit" value={formData.unit} onChange={handleChange} disabled={isEditMode && !canEditProduct} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-primary disabled:opacity-50" placeholder="Pcs, Set, Ltr..." />
              </div>
            </div>
          </div>

          {/* Financial & Stock Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Pricing & Stock</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Set prices and starting inventory</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Price *</label>
                  {baseCurrency !== 'UGX' && Number(formData.purchasePrice) > 0 && (
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                      ≈ UGX {convertToBase(Number(formData.purchasePrice), baseCurrency).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">{baseCurrency}</span>
                  <input 
                    name="purchasePrice" 
                    type={canSeeBuyingPrice ? "number" : "text"} 
                    step="0.01" 
                    value={canSeeBuyingPrice ? formData.purchasePrice : '***'} 
                    onChange={handleChange} 
                    disabled={!canSeeBuyingPrice || (isEditMode && !canEditProduct)} 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-10 pr-5 font-black text-slate-900 focus:ring-2 focus:ring-primary disabled:opacity-100 placeholder:text-slate-300" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selling Price *</label>
                  {baseCurrency !== 'UGX' && Number(formData.sellingPrice) > 0 && (
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                      ≈ UGX {convertToBase(Number(formData.sellingPrice), baseCurrency).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">{baseCurrency}</span>
                  <input name="sellingPrice" type="number" step="0.01" value={formData.sellingPrice} onChange={handleChange} disabled={isEditMode && !canEditProduct} className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-5 font-black text-slate-900 focus:ring-2 focus:ring-primary disabled:opacity-50" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial Stock</label>
                <input name="quantity" type="number" value={formData.quantity} onChange={handleChange} disabled={isEditMode && !canChangeStock && !canEditProduct} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-black text-slate-900 focus:ring-2 focus:ring-primary disabled:opacity-50" />
              </div>
            </div>
          </div>

          {/* Logistics Strategy Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Inventory Limits</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">When to reorder and alert levels</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Low Stock Alert</label>
                  <input name="minStock" type="number" value={formData.minStock} onChange={handleChange} disabled={isEditMode && !canChangeStock && !canEditProduct} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-primary disabled:opacity-50" placeholder="20" />
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed ml-1">Get an alert when stock reaches this amount.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reorder Amount</label>
                  <input name="reorderQuantity" type="number" value={formData.reorderQuantity} onChange={handleChange} disabled={isEditMode && !canChangeStock && !canEditProduct} className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-primary disabled:opacity-50" placeholder="50" />
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed ml-1">Recommended amount to buy when restocking.</p>
              </div>
            </div>

            <div className="mt-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Barcode className="w-5 h-5 text-slate-900" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase">Print Barcode Labels</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Allow printing labels for this item</p>
                </div>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="barcodeEnabled"
                  checked={formData.barcodeEnabled}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </div>
          </div>

          {/* Extra Info Card */}
          {customFields.filter(f => f.targetType === 'product').length > 0 && (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-white">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">More Information</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Other details you want to save for this item</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {customFields.filter(f => f.targetType === 'product').map(field => (
                  <div key={field.id} className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      {field.label} {field.isRequired ? '*' : ''}
                    </label>
                    <input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={customValues[field.id] || ''}
                      onChange={e => setCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold focus:ring-2 focus:ring-primary"
                      placeholder={field.label}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
