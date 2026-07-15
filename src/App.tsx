import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import HRLayout from "./pages/hr/layout/HRLayout";
import { AIChatSidebar } from "@/components/ai/AIChatSidebar";
import { UpdateNotification } from "@/components/UpdateNotification";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import NewSale from "./pages/NewSale";
import SaleDetails from "./pages/SaleDetails";
import Products from "./pages/Products";
import NewProduct from "./pages/NewProduct";
import ProductDetails from "./pages/ProductDetails";
import Customers from "./pages/Customers";
import NewCustomer from "./pages/NewCustomer";
import CustomerDetails from "./pages/CustomerDetails";
import Transactions from "./pages/Transactions";
import NewTransaction from "./pages/NewTransaction";
import TransactionDetails from "./pages/TransactionDetails";
import Accounts from "./pages/Accounts";
import AccountDetails from "./pages/AccountDetails";
import Purchases from "./pages/Purchases";
import NewPurchase from "./pages/NewPurchase";
import PurchaseDetails from "./pages/PurchaseDetails";
import Stores from "./pages/Stores";
import Users from "./pages/Users";
import NewUser from "./pages/NewUser";
import HRDashboard from "./pages/hr/HRDashboard";
import ShiftScheduler from "./pages/hr/ShiftScheduler";
import HiringKanban from "./pages/hr/HiringKanban";
import HRChatAssistant from "./pages/hr/HRChatAssistant";
import Employees from "./pages/hr/Employees";
import EmployeeDetails from "./pages/hr/EmployeeDetails";
import Attendance from "./pages/hr/Attendance";
import Leaves from "./pages/hr/Leaves";
import Payroll from "./pages/hr/Payroll";
import Performance from "./pages/hr/Performance";
import Reports from "./pages/Reports";
import Cheques from "./pages/finance/Cheques";
import Suppliers from "./pages/Suppliers";
import NewSupplier from "./pages/NewSupplier";
import SupplierDetails from "./pages/SupplierDetails";
import SupplierSettings from "./pages/SupplierSettings";
import Receivings from "./pages/Receivings";
import NewReceiving from "./pages/NewReceiving";
import ReceivingDetails from "./pages/ReceivingDetails";
import SuspendedSales from "./pages/SuspendedSales";
import WorkOrders from "./pages/WorkOrders";
import Deliveries from "./pages/Deliveries";
import DeliverySettings from "./pages/DeliverySettings";
import GiftCards from "./pages/GiftCards";
import ActivityLogs from "./pages/ActivityLogs";
import CustomerDisplay from "./pages/CustomerDisplay";
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/invoices/NewInvoice";
import InvoiceDetails from "./pages/invoices/InvoiceDetails";

import DayBook from "./pages/financials/DayBook";
import ProfitAndLoss from "./pages/financials/ProfitAndLoss";
import PartyLedger from "./pages/financials/PartyLedger";
import StockSummary from "./pages/inventory/StockSummary";
import StockJournal from "./pages/inventory/StockJournal";
import More from "./pages/More";
import Quotations from "./pages/Quotations";
import NewQuotation from "./pages/NewQuotation";
import QuotationDetails from "./pages/QuotationDetails";
import PurchaseOrders from "./pages/PurchaseOrders";
import TaxSettings from "./pages/TaxSettings";
import ExpenseCategories from "./pages/ExpenseCategories";
import Commissions from "./pages/Commissions";
import Analytics from "./pages/Analytics";
import ItemKits from "./pages/ItemKits";
import CustomFields from "./pages/CustomFields";
import PriceCheck from "./pages/PriceCheck";
import StoreConfig from "./pages/StoreConfig";
import EcommerceDashboard from "./pages/ecommerce/EcommerceDashboard";
import EcommerceProducts from "./pages/ecommerce/EcommerceProducts";
import EcommerceOrders from "./pages/ecommerce/EcommerceOrders";
import EcommerceReviews from "./pages/ecommerce/EcommerceReviews";
import EcommerceFeedback from "./pages/ecommerce/EcommerceFeedback";
import EcommerceReturns from "./pages/ecommerce/EcommerceReturns";
import Notifications from "./pages/Notifications";
import AccessControl from "./pages/AccessControl";
import NotFound from "./pages/NotFound";
import SyncDiagnostics from "./pages/SyncDiagnostics";

import { useEffect } from "react";
import { useERPStore } from "@/lib/store-data";
import { useStoreConfig } from "@/lib/store-config";
import { dbAdapter } from "@/lib/db-adapter";
import { LicenseProvider, useLicense } from "@/contexts/LicenseContext";
import LicenseSetup from "@/components/LicenseSetup";

import { Component, ErrorInfo, ReactNode } from "react";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white p-8 border border-slate-200 shadow-xl rounded-none">
            <h1 className="text-xl font-black text-red-600 uppercase tracking-tight mb-2">System Fault Detected</h1>
            <p className="text-sm text-slate-600 mb-6 font-mono leading-relaxed">
              The application encountered a fatal rendering error. This usually indicates a data mismatch or missing property after login.
            </p>
            <div className="bg-slate-50 p-4 mb-6 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Error Trace</p>
              <p className="text-[11px] font-mono text-slate-700 break-all">{this.state.error?.message}</p>
            </div>
            <button
              onClick={() => { window.location.href = window.location.pathname; }}
              className="w-full bg-slate-900 text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              Force Restart Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

// A generic wrapper component to block access if license is not verified
const LicenseGate = ({ children }: { children: ReactNode }) => {
  const { isLicensed, isLoading } = useLicense();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400 font-medium">Verifying License...</p>
      </div>
    );
  }

  if (!isLicensed) {
    return <LicenseSetup />;
  }

  return <>{children}</>;
};

const App = () => {
  const loadFromDatabase = useERPStore(state => state.loadFromDatabase);
  const syncData = useERPStore(state => state.syncData);
  const activeStore = useERPStore(state => state.activeStoreId);
  const updateStoreConfig = useStoreConfig(state => state.updateConfig);

  const setActiveStore = useERPStore(state => state.setActiveStore);

  // Load data from Electron database on app startup
  useEffect(() => {
    const restoreAndLoad = async () => {
      // If localStorage lost the active store due to Chromium issues, restore from SQLite
      if (window.electronAPI) {
        try {
          const sysStore = await window.electronAPI.getSetting('system_active_store');
          const localStore = localStorage.getItem('invenza_active_store');
          if (sysStore && sysStore !== localStore) {
            await setActiveStore(sysStore);
          }
        } catch (e) {
          console.warn("Failed to restore system store context", e);
        }
      }
      loadFromDatabase();
    };
    restoreAndLoad();
  }, [loadFromDatabase, setActiveStore]);

  // Load Store Configuration from DB when active store changes or on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (activeStore) {
        try {
          const config = await dbAdapter.getStoreConfig(activeStore);
          if (config) {
            updateStoreConfig(config);
          }
        } catch (error) {
          console.error('Failed to load store config from DB:', error);
        }
      }
    };
    loadConfig();
  }, [activeStore, updateStoreConfig]);

  // Set up sync trigger listener
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onSyncTrigger) {
      window.electronAPI.onSyncTrigger(() => {
        console.log("Real-time sync triggered from background");
        syncData();
      });
    }
  }, [syncData]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LicenseProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <LicenseGate>
              <AIChatSidebar />
              <UpdateNotification />
              <HashRouter>
            <Routes>
              {/* ... same routes ... */}
              <Route path="/login" element={<Login />} />

              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                {/* ... other routes ... */}
                <Route path="/sales" element={<Sales />} />
                <Route path="/sales/new" element={<NewSale />} />
                <Route path="/sales/:id" element={<SaleDetails />} />
                <Route path="/suspended-sales" element={<SuspendedSales />} />
                <Route path="/work-orders" element={<WorkOrders />} />
                <Route path="/deliveries" element={<Deliveries />} />
                <Route path="/gift-cards" element={<GiftCards />} />

                <Route path="/finance/cheques" element={<Cheques />} />

                <Route path="/products" element={<Products />} />
                <Route path="/products/new" element={<NewProduct />} />
                <Route path="/products/:id" element={<ProductDetails />} />
                <Route path="/products/edit/:id" element={<NewProduct />} />
                <Route path="/item-kits" element={<ItemKits />} />
                <Route path="/custom-fields" element={<CustomFields />} />

                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/new" element={<NewCustomer />} />
                <Route path="/customers/:id" element={<CustomerDetails />} />
                <Route path="/customers/edit/:id" element={<NewCustomer />} />

                <Route path="/transactions" element={<Transactions />} />
                <Route path="/transactions/new" element={<NewTransaction />} />
                <Route path="/transactions/:id" element={<TransactionDetails />} />

                <Route path="/quotations" element={<Quotations />} />
                <Route path="/quotations/new" element={<NewQuotation />} />
                <Route path="/quotations/:id" element={<QuotationDetails />} />

                <Route path="/accounts" element={<Accounts />} />
                <Route path="/accounts/:id" element={<AccountDetails />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<NewInvoice />} />
                <Route path="/invoices/:id" element={<InvoiceDetails />} />
                <Route path="/invoices/edit/:id" element={<NewInvoice />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/purchases/new" element={<NewPurchase />} />
                <Route path="/purchases/:id" element={<PurchaseDetails />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />

                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/suppliers/new" element={<NewSupplier />} />
                <Route path="/suppliers/settings" element={<SupplierSettings />} />
                <Route path="/suppliers/:id" element={<SupplierDetails />} />
                <Route path="/suppliers/edit/:id" element={<NewSupplier />} />

                <Route path="/receivings" element={<Receivings />} />
                <Route path="/receivings/new" element={<NewReceiving />} />
                <Route path="/receivings/:id" element={<ReceivingDetails />} />

                <Route path="/stores" element={<Stores />} />
                <Route path="/users" element={<Users />} />
                <Route path="/users/new" element={<NewUser />} />
                <Route path="/users/edit/:id" element={<NewUser />} />

                <Route path="/reports" element={<Reports />} />

                <Route path="/day-book" element={<DayBook />} />
                <Route path="/delivery-settings" element={<DeliverySettings />} />
                <Route path="/profit-loss" element={<ProfitAndLoss />} />
                <Route path="/party-ledger" element={<PartyLedger />} />
                <Route path="/stock-summary" element={<StockSummary />} />
                <Route path="/stock-journal" element={<StockJournal />} />
                <Route path="/tax-settings" element={<TaxSettings />} />
                <Route path="/price-check" element={<PriceCheck />} />
                <Route path="/expense-categories" element={<ExpenseCategories />} />
                <Route path="/commissions" element={<Commissions />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
                <Route path="/more" element={<More />} />
                <Route path="/store-config" element={<StoreConfig />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/access-control" element={<AccessControl />} />
                <Route path="/sync-diagnostics" element={<SyncDiagnostics />} />

                {/* Ecommerce Module Routes */}
                <Route path="/ecommerce">
                  <Route index element={<EcommerceDashboard />} />
                  <Route path="products" element={<EcommerceProducts />} />
                  <Route path="orders" element={<EcommerceOrders />} />
                  <Route path="returns" element={<EcommerceReturns />} />
                  <Route path="reviews" element={<EcommerceReviews />} />
                  <Route path="feedback" element={<EcommerceFeedback />} />
                </Route>

                {/* HR Module Routes - Now integrated into Main Layout */}
                <Route path="/hr">
                  <Route index element={<HRDashboard />} />
                  <Route path="employees" element={<Employees />} />
                  <Route path="employees/:id" element={<EmployeeDetails />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="leaves" element={<Leaves />} />
                  <Route path="payroll" element={<Payroll />} />
                  <Route path="performance" element={<Performance />} />
                  <Route path="schedule" element={<ShiftScheduler />} />
                  <Route path="hiring" element={<HiringKanban />} />
                  <Route path="chat" element={<HRChatAssistant />} />
                </Route>

                {/* Employee Portal Routes */}
                <Route path="/employee">
                  <Route path="dashboard" element={<HRDashboard isEmployeeView={true} />} />
                  <Route path="attendance" element={<Attendance isEmployeeView={true} />} />
                  <Route path="leave" element={<Leaves isEmployeeView={true} />} />
                  <Route path="payslip" element={<Payroll isEmployeeView={true} />} />
                  <Route path="history" element={<Attendance isEmployeeView={true} />} />
                </Route>
                <Route path="/customer-display" element={<CustomerDisplay />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
            </LicenseGate>
          </TooltipProvider>
        </LicenseProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
