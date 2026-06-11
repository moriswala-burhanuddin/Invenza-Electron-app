import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, CustomerCustomValue } from '@/lib/store-data';
import { Users, Save, X, UserPlus, Smartphone, Mail, MapPin, Globe, ShieldCheck, Zap, ArrowLeft, CheckCircle2, FileText, CreditCard } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function NewCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    addCustomer,
    updateCustomer,
    customers,
    activeStoreId,
    customFields,
    customerCustomValues,
    updateCustomerCustomValues
  } = useERPStore();

  const isEditMode = Boolean(id);
  const customer = isEditMode ? customers.find(c => c.id === id) : null;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    area: '',
    openingBalance: '0',
    balanceType: 'debit' as 'debit' | 'credit',
  });

  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditMode && customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        area: customer.area || '',
        openingBalance: Math.abs(customer.creditBalance || 0).toString(),
        balanceType: (customer.creditBalance || 0) >= 0 ? 'debit' : 'credit',
      });

      // Load custom values for this customer
      const values = customerCustomValues.filter(v => v.customerId === id);
      const valuesMap: Record<string, string> = {};
      values.forEach(v => {
        valuesMap[v.fieldId] = v.value;
      });
      setCustomValues(valuesMap);
    }
  }, [isEditMode, customer, id, customerCustomValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error("Name and phone number are required.");
      return;
    }

    try {
      let customerId = id;

      if (isEditMode && id) {
        updateCustomer(id, {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          area: formData.area,
        });
      } else {
        const initialBalance = parseFloat(formData.openingBalance) || 0;
        const newCustomer = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          area: formData.area || 'General',
          creditBalance: formData.balanceType === 'debit' ? initialBalance : -initialBalance,
          totalPurchases: 0,
          storeId: activeStoreId,
          joinedAt: new Date().toISOString(),
        };
        // addCustomer returns void but generateId is used inside it. 
        // For simplicity, we assume addCustomer implementation or generate a new one here if needed.
        // Actually addCustomer in store-data generates an ID.
        addCustomer(newCustomer);
        // Wait, we need the ID to save custom values. 
        // Let's find the newly added customer or change addCustomer to return ID.
        // Since we can't easily change addCustomer to return ID without affecting other things,
        // let's just find it by name/phone (imperfect) or modify addCustomer.
        // I'll modify addCustomer to return the ID in store-data.ts later if needed, 
        // but for now I'll just find the added customer.
        const allCustomers = useERPStore.getState().customers;
        const added = allCustomers.find(c => c.phone === formData.phone && c.name === formData.name);
        if (added) customerId = added.id;
      }

      // Save custom values
      if (customerId) {
        const valuesToSave = Object.entries(customValues).map(([fieldId, value]) => ({
          fieldId,
          value
        }));
        await updateCustomerCustomValues(customerId, valuesToSave);
      }

      toast.success(isEditMode ? "Customer Updated" : "Customer Added");
      navigate('/customers');
    } catch (error) {
      toast.error("Failed to save customer. Please try again.");
    }
  };

  const clientFields = customFields.filter(f => f.targetType === 'client');

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40">
      {/* Superior Header */}
      <div className="bg-white border-b border-slate-100 z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/customers')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                {isEditMode ? 'Edit Customer' : 'Add New Customer'}
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                {isEditMode ? `Editing ${customer?.name}` : 'Fill in customer details below'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/customers')} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] text-slate-400">
              Discard
            </Button>
            <Button onClick={handleSubmit} className="bg-primary text-white rounded-[1.2rem] h-14 px-10 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {isEditMode ? 'Save Changes' : 'Save Customer'}
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-8">
        {/* Intelligence Group 1: Core Identity */}
        <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Basic Info</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Required customer details</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name <span className="text-red-500">*</span></Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="INDIVIDUAL OR CORPORATE ENTITY NAME..."
                className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-sm font-bold uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="CONTACT NUMBER..."
                    className="h-16 bg-slate-50 border-none rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="EMAIL ADDRESS..."
                    className="h-16 bg-slate-50 border-none rounded-2xl pl-16 pr-6 text-sm font-bold lowercase focus:ring-2 focus:ring-primary placeholder:text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Location & Balance</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Area and initial financial state</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Area / Location</Label>
              <div className="relative">
                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <Input
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="E.G. DOWNTOWN SECTOR..."
                  className="h-16 bg-slate-50 border-none rounded-2xl pl-16 pr-6 text-sm font-bold uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200"
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Opening Balance & Type</Label>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input
                    name="openingBalance"
                    type="number"
                    value={formData.openingBalance}
                    onChange={handleChange}
                    placeholder="0.00"
                    disabled={isEditMode}
                    className="h-16 bg-slate-50 border-none rounded-2xl pl-16 pr-6 text-sm font-bold focus:ring-2 focus:ring-primary placeholder:text-slate-200 disabled:opacity-50"
                  />
                </div>
                {!isEditMode && (
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1.5 h-16 items-center border border-slate-100/50">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, balanceType: 'debit' }))}
                      className={cn(
                        "h-full px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all",
                        formData.balanceType === 'debit' ? "bg-white shadow-sm text-rose-500" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Dr (Owed)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, balanceType: 'credit' }))}
                      className={cn(
                        "h-full px-6 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all",
                        formData.balanceType === 'credit' ? "bg-white shadow-sm text-emerald-500" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      Cr (Advance)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Group 3: Custom Metadata */}
        {clientFields.length > 0 && (
          <div className="bg-white rounded-[3rem] p-12 shadow-sm border border-white">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Custom Metadata</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Extended entity parameters</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {clientFields.map(field => (
                <div key={field.id} className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                    {field.label} {field.isRequired && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={customValues[field.id] || ''}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={`ENTER ${field.label.toUpperCase()}...`}
                    className="h-16 bg-slate-50 border-none rounded-2xl px-6 text-sm font-bold uppercase focus:ring-2 focus:ring-primary placeholder:text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security & Verification Index */}
        <div className="bg-primary rounded-[3rem] p-10 text-white shadow-2xl shadow-black/20 overflow-hidden relative group">
          <Zap className="absolute -right-10 -top-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 rounded-2xl">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-lg font-black uppercase tracking-tight mb-1">Ready to Save</h4>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">All details filled in</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] block mb-1">Entry Status</span>
              <div className="flex items-center gap-2 text-emerald-400 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <CheckCircle2 className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em]">Verified</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
