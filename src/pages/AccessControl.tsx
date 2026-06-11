import { useState, useEffect } from 'react';
import { useERPStore, PermissionSet, User } from '@/lib/store-data';
import { Shield, ChevronDown, ChevronRight, Save, RotateCcw, User as UserIcon, Check, Package, DollarSign, Truck, Users, LayoutList } from 'lucide-react';
import { toast } from 'sonner';

// ─── Permission Definitions ───────────────────────────────────────────────────
const PERMISSION_SECTIONS = [
  {
    title: 'Inventory',
    icon: <Package className="w-4 h-4 text-blue-500" />,
    permissions: [
      { key: 'canSeeBuyingPrice', label: 'Can see buying / purchase price' },
      { key: 'canSeeProfit', label: 'Can see profit per item' },
      { key: 'canEditProduct', label: 'Can edit products' },
      { key: 'canAddProduct', label: 'Can add new products' },
      { key: 'canChangeStock', label: 'Can manually change stock quantity' },
      { key: 'canTransferStock', label: 'Can transfer stock between branches' },
    ]
  },
  {
    title: 'Sales & Finance',
    icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
    permissions: [
      { key: 'canSeePurchases', label: 'Can access and view purchases module' },
      { key: 'canSeeExpectedSales', label: 'Can see expected sales & profit targets' },
      { key: 'canSeeDetailedSales', label: 'Can view full sale details (cost, margin)' },
      { key: 'canSeeDetailedPurchases', label: 'Can view purchase/receiving details' },
      { key: 'canSeeRevenueMetrics', label: 'Can see revenue & profit on dashboard' },
      { key: 'canApplyDiscounts', label: 'Can apply discounts to sales' },
      { key: 'canAccessAllInvoices', label: 'Can access and view all invoices' },
      { key: 'canManageCustomers', label: 'Can manage customer profiles and credit' },
    ]
  },
  {
    title: 'Suppliers',
    icon: <Truck className="w-4 h-4 text-orange-500" />,
    permissions: [
      { key: 'canSeeSuppliers', label: 'Can access supplier module' },
    ]
  },
  {
    title: 'Finance & Accounts',
    icon: <LayoutList className="w-4 h-4 text-pink-500" />,
    permissions: [
      { key: 'canManageLedger', label: 'Can manage ledger & day book' },
      { key: 'canManageCommissions', label: 'Can manage sales commissions' },
      { key: 'canManageCheques', label: 'Can manage cheques & tracking' },
      { key: 'canManageTaxes', label: 'Can manage tax settings & rates' },
    ]
  },
  {
    title: 'Human Resources',
    icon: <Users className="w-4 h-4 text-purple-500" />,
    permissions: [
      { key: 'canManageEmployees', label: 'Can manage employees & HR modules' },
      { key: 'canManagePayroll', label: 'Can manage payroll processing' },
      { key: 'canManageAttendance', label: 'Can manage attendance and leaves' },
    ]
  },
];

// ─── Role Presets ─────────────────────────────────────────────────────────────
const ROLE_PRESETS: Record<string, { label: string; color: string; permissions: Partial<PermissionSet> }> = {
  inventory_manager: {
    label: 'Inventory Manager',
    color: '#3b82f6',
    permissions: {
      canSeePurchases: true,
      canSeeBuyingPrice: false,
      canSeeProfit: false,
      canEditProduct: false,
      canAddProduct: false,
      canChangeStock: true,
      canTransferStock: true,
      canSeeExpectedSales: false,
      canSeeDetailedSales: false,
      canSeeDetailedPurchases: false,
      canSeeSuppliers: false,
      canSeeRevenueMetrics: false,
      canManageEmployees: false,
      canManagePayroll: false,
      canManageAttendance: false,
      canApplyDiscounts: false,
      canAccessAllInvoices: false,
      canManageCustomers: false,
      canManageLedger: false,
      canManageCommissions: false,
      canManageCheques: false,
      canManageTaxes: false,
    }
  },
  sales_staff: {
    label: 'Sales Staff',
    color: '#10b981',
    permissions: {
      canSeePurchases: true,
      canSeeBuyingPrice: false,
      canSeeProfit: false,
      canEditProduct: false,
      canAddProduct: false,
      canChangeStock: false,
      canTransferStock: false,
      canSeeExpectedSales: false,
      canSeeDetailedSales: true,
      canSeeDetailedPurchases: false,
      canSeeSuppliers: false,
      canSeeRevenueMetrics: false,
      canManageEmployees: false,
      canManagePayroll: false,
      canManageAttendance: false,
      canApplyDiscounts: false,
      canAccessAllInvoices: true,
      canManageCustomers: true,
      canManageLedger: false,
      canManageCommissions: false,
      canManageCheques: false,
      canManageTaxes: false,
    }
  },
  sales_manager: {
    label: 'Sales Manager',
    color: '#0ea5e9',
    permissions: {
      canSeePurchases: true,
      canSeeBuyingPrice: false,
      canSeeProfit: false,
      canEditProduct: false,
      canAddProduct: false,
      canChangeStock: false,
      canTransferStock: false,
      canSeeExpectedSales: true,
      canSeeDetailedSales: true,
      canSeeDetailedPurchases: false,
      canSeeSuppliers: false,
      canSeeRevenueMetrics: true,
      canManageEmployees: false,
      canManagePayroll: false,
      canManageAttendance: false,
      canApplyDiscounts: true,
      canAccessAllInvoices: true,
      canManageCustomers: true,
      canManageLedger: false,
      canManageCommissions: false,
      canManageCheques: false,
      canManageTaxes: false,
    }
  },
  hr_manager: {
    label: 'HR Manager',
    color: '#d946ef',
    permissions: {
      canSeePurchases: false,
      canSeeBuyingPrice: false,
      canSeeProfit: false,
      canEditProduct: false,
      canAddProduct: false,
      canChangeStock: false,
      canTransferStock: false,
      canSeeExpectedSales: false,
      canSeeDetailedSales: false,
      canSeeDetailedPurchases: false,
      canSeeSuppliers: false,
      canSeeRevenueMetrics: false,
      canManageEmployees: true,
      canManagePayroll: true,
      canManageAttendance: true,
      canApplyDiscounts: false,
      canAccessAllInvoices: false,
      canManageCustomers: false,
      canManageLedger: false,
      canManageCommissions: false,
      canManageCheques: false,
      canManageTaxes: false,
    }
  },
  accountant: {
    label: 'Accountant',
    color: '#f43f5e',
    permissions: {
      canSeePurchases: true,
      canSeeBuyingPrice: true,
      canSeeProfit: true,
      canEditProduct: false,
      canAddProduct: false,
      canChangeStock: false,
      canTransferStock: false,
      canSeeExpectedSales: true,
      canSeeDetailedSales: true,
      canSeeDetailedPurchases: true,
      canSeeSuppliers: true,
      canSeeRevenueMetrics: true,
      canManageEmployees: false,
      canManagePayroll: false,
      canManageAttendance: false,
      canApplyDiscounts: false,
      canAccessAllInvoices: true,
      canManageCustomers: false,
      canManageLedger: true,
      canManageCommissions: true,
      canManageCheques: true,
      canManageTaxes: true,
    }
  },
  store_manager: {
    label: 'Store Manager',
    color: '#f59e0b',
    permissions: {
      canSeePurchases: true,
      canSeeBuyingPrice: true,
      canSeeProfit: true,
      canEditProduct: true,
      canAddProduct: true,
      canChangeStock: true,
      canTransferStock: true,
      canSeeExpectedSales: true,
      canSeeDetailedSales: true,
      canSeeDetailedPurchases: true,
      canSeeSuppliers: true,
      canSeeRevenueMetrics: true,
      canManageEmployees: false,
      canManagePayroll: false,
      canManageAttendance: false,
      canApplyDiscounts: true,
      canAccessAllInvoices: true,
      canManageCustomers: true,
      canManageLedger: false,
      canManageCommissions: false,
      canManageCheques: false,
      canManageTaxes: false,
    }
  },
  full_access: {
    label: 'Full Access',
    color: '#8b5cf6',
    permissions: {
      canSeePurchases: true,
      canSeeBuyingPrice: true,
      canSeeProfit: true,
      canEditProduct: true,
      canAddProduct: true,
      canChangeStock: true,
      canTransferStock: true,
      canSeeExpectedSales: true,
      canSeeDetailedSales: true,
      canSeeDetailedPurchases: true,
      canSeeSuppliers: true,
      canSeeRevenueMetrics: true,
      canManageEmployees: true,
      canManagePayroll: true,
      canManageAttendance: true,
      canApplyDiscounts: true,
      canAccessAllInvoices: true,
      canManageCustomers: true,
      canManageLedger: true,
      canManageCommissions: true,
      canManageCheques: true,
      canManageTaxes: true,
    }
  },
};

const DEFAULT_PERMISSIONS: PermissionSet = {
  canSeePurchases: false,
  canSeeBuyingPrice: false,
  canSeeProfit: false,
  canEditProduct: false,
  canAddProduct: false,
  canChangeStock: true,
  canTransferStock: false,
  canSeeExpectedSales: false,
  canSeeDetailedSales: false,
  canSeeDetailedPurchases: false,
  canSeeSuppliers: false,
  canSeeRevenueMetrics: false,
  canManageEmployees: false,
  canManagePayroll: false,
  canManageAttendance: false,
  canApplyDiscounts: false,
  canAccessAllInvoices: false,
  canManageCustomers: false,
  canManageLedger: false,
  canManageCommissions: false,
  canManageCheques: false,
  canManageTaxes: false,
};

// ─── Toggle Switch Component ──────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
        }`}
    />
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AccessControl() {
  const { users, currentUser, userPermissions, updateUserPermissions, fetchPermissions } = useERPStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [pendingPerms, setPendingPerms] = useState<PermissionSet>(DEFAULT_PERMISSIONS);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'Inventory': true, 'Sales & Finance': true, 'Suppliers': true, 'Human Resources': true
  });
  const [saving, setSaving] = useState(false);

  // Only show non-super_admin users and exclude developer emails
  const eligibleUsers = users.filter(u => 
    u.role !== 'super_admin' && 
    u.email !== 'burhanuddinmoris52@gmail.com' && 
    u.email !== 'burhanuddinmoris5253@gmail.com'
  );

  const selectedUser = users.find(u => u.id === selectedUserId);
  const existingPerms = userPermissions.find(p => p.userId === selectedUserId);

  // When user selection changes, load permissions
  useEffect(() => {
    if (selectedUserId) {
      fetchPermissions(selectedUserId);
    }
  }, [selectedUserId, fetchPermissions]);

  // When existing permissions load, populate the form
  useEffect(() => {
    if (existingPerms) {
      setPendingPerms({ ...DEFAULT_PERMISSIONS, ...existingPerms.permissions });
    } else if (selectedUserId) {
      setPendingPerms({ ...DEFAULT_PERMISSIONS });
    }
  }, [existingPerms, selectedUserId]);

  const applyPreset = (presetKey: string) => {
    const preset = ROLE_PRESETS[presetKey];
    if (preset) {
      setPendingPerms({ ...DEFAULT_PERMISSIONS, ...preset.permissions });
      toast.info(`Applied "${preset.label}" preset`);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await updateUserPermissions(selectedUserId, pendingPerms);
      toast.success(`Permissions saved for ${selectedUser?.name || selectedUser?.email}`);
    } catch {
      toast.error('Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPendingPerms(existingPerms ? { ...DEFAULT_PERMISSIONS, ...existingPerms.permissions } : { ...DEFAULT_PERMISSIONS });
    toast.info('Changes discarded');
  };

  const toggleSection = (title: string) => {
    setExpandedSections(s => ({ ...s, [title]: !s[title] }));
  };

  const setPermission = (key: keyof PermissionSet, value: boolean) => {
    setPendingPerms(p => ({ ...p, [key]: value }));
  };

  // Guard: only super_admin and admin can access this page
  if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-8">
        <Shield className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Only Admins can manage employee permissions.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Access Control</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Granular permission management for employees</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Panel: User List ─────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Select Employee</p>
            <div className="space-y-1">
              {eligibleUsers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No employees found.</p>
              )}
              {eligibleUsers.map(user => {
                const hasCustomPerms = userPermissions.some(p => p.userId === user.id);
                const isSelected = user.id === selectedUserId;
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                      }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                      <UserIcon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                        {user.name || user.email}
                      </p>
                      <p className="text-[11px] text-slate-400 capitalize">{user.role?.replace('_', ' ')}</p>
                    </div>
                    {hasCustomPerms && (
                      <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" title="Has custom permissions" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Permission Editor ───────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedUserId ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Shield className="w-14 h-14 text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Select an employee to configure permissions</p>
              <p className="text-xs text-slate-400 mt-1">Changes sync across all branches automatically</p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-5">
              {/* User Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600">
                  <UserIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{selectedUser?.name || selectedUser?.email}</h2>
                  <p className="text-xs text-slate-500 capitalize">{selectedUser?.role?.replace(/_/g, ' ')} · {selectedUser?.email}</p>
                </div>
              </div>

              {/* Role Presets */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Presets</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:shadow-sm"
                      style={{ borderColor: preset.color + '50', color: preset.color, background: preset.color + '10' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Sections */}
              {PERMISSION_SECTIONS.map(section => (
                <div key={section.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => toggleSection(section.title)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{section.icon}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{section.title}</span>
                    </div>
                    {expandedSections[section.title]
                      ? <ChevronDown className="h-4 w-4 text-slate-400" />
                      : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </button>

                  {expandedSections[section.title] && (
                    <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                      {section.permissions.map(perm => {
                        const key = perm.key as keyof PermissionSet;
                        const isEnabled = pendingPerms[key];
                        return (
                          <div key={perm.key} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${isEnabled ? 'bg-green-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              <span className="text-sm text-slate-700 dark:text-slate-300">{perm.label}</span>
                            </div>
                            <Toggle
                              checked={!!isEnabled}
                              onChange={v => setPermission(key, v)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Save / Reset Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Permissions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
