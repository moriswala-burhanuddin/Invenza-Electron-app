import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useERPStore, type Transaction } from '@/lib/store-data';
import { formatCurrency, convertToBase, convertFromBase } from '@/lib/utils';
import { useStoreConfig } from '@/lib/store-config';
import { useNavigate } from 'react-router-dom';

export default function NewTransaction() {
  const navigate = useNavigate();
  const { addTransaction, getStoreAccounts, getStoreCustomers, activeStoreId } = useERPStore();
  const { baseCurrency } = useStoreConfig();
  
  const accounts = getStoreAccounts();
  const customers = getStoreCustomers();
  const expenseCategories = useERPStore(state => state.expenseCategories);

  const [type, setType] = useState<Transaction['type']>('cash_in');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [customerId, setCustomerId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const customer = customers.find(c => c.id === customerId);
    
    const baseAmount = convertToBase(parseFloat(amount) || 0, baseCurrency);
    
    addTransaction({
      type,
      amount: baseAmount,
      originalAmount: parseFloat(amount) || 0,
      originalCurrency: baseCurrency,
      description,
      accountId,
      customerId: type === 'cash_in' && customerId ? customerId : undefined,
      customerName: type === 'cash_in' && customer ? customer.name : undefined,
      expenseCategoryId: type === 'expense' ? expenseCategoryId : undefined,
      storeId: activeStoreId,
      date: new Date().toISOString()
    });

    navigate('/transactions');
  };

  const types = [
    { id: 'cash_in', label: 'Cash In', description: 'Money received' },
    { id: 'cash_out', label: 'Cash Out', description: 'Money withdrawn' },
    { id: 'expense', label: 'Expense', description: 'Business expense' },
    { id: 'sale_return', label: 'Sale Return', description: 'Product returned' },
  ];

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <PageHeader title="New Transaction" showBack />

      <form onSubmit={handleSubmit} className="erp-page-content space-y-4">
        {/* Type Selection */}
        <div className="erp-card">
          <label className="block text-sm font-medium text-foreground mb-3">Transaction Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {types.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id as Transaction['type'])}
                className={`p-3 rounded-lg text-left transition-colors ${
                  type === t.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <p className="font-medium text-sm">{t.label}</p>
                <p className="text-xs opacity-70">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="erp-card">
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-medium text-foreground">Amount ({baseCurrency})</label>
            {baseCurrency !== 'UGX' && Number(amount) > 0 && (
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                ≈ UGX {convertToBase(Number(amount), baseCurrency).toLocaleString()}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">{baseCurrency}</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="erp-input pl-8 text-xl font-semibold"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Customer (for cash_in) */}
        {type === 'cash_in' && customers.length > 0 && (
          <div className="erp-card">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Customer (for credit payment)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="erp-input"
            >
              <option value="">No customer (general)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {formatCurrency(c.creditBalance)} credit
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Expense Category (Only for Expense) */}
        {type === 'expense' && (
          <div className="erp-card">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Expense Category
            </label>
            <select
              value={expenseCategoryId}
              onChange={(e) => setExpenseCategoryId(e.target.value)}
              className="erp-input"
            >
              <option value="">No category (general)</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div className="erp-card">
          <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="erp-input"
            placeholder="e.g. Credit payment, Office supplies..."
            required
          />
        </div>

        {/* Account */}
        <div className="erp-card">
          <label className="block text-sm font-medium text-foreground mb-1.5">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="erp-input"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.balance)})
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="erp-button erp-button-primary w-full py-3">
          Add Transaction
        </button>
      </form>
    </div>
  );
}
