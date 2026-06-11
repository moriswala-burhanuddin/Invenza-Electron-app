import {
    LucideIcon,
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    FileText,
    Settings,
    BarChart3,
    Truck,
    LogOut,
    ShoppingBag,
    UserPlus,
    Calendar,
    CreditCard,
    MessageSquare,
    Calculator,
    PieChart,
    Percent,
    ClipboardList,
    BookOpen,
    Undo2,
    Bell,
    Shield,
    Store,
    Activity,
    PackageSearch
} from "lucide-react";

export type Role = 'admin' | 'staff' | 'user' | 'hr_manager' | 'super_admin' | 'sales_manager' | 'inventory_manager' | 'accountant' | 'employee';

export interface NavItem {
    title: string;
    href: string;
    icon: LucideIcon;
    variant?: "default" | "ghost";
    moduleKey?: string;
    requiredPermission?: string | string[];
}

export const ROLE_SIDEBARS: Record<Role, NavItem[]> = {
    // Super Admin - Sees Everything
    super_admin: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard },
        { title: "Products", href: "/products", icon: Package, requiredPermission: ['canAddProduct', 'canEditProduct', 'canChangeStock', 'canTransferStock'] },
        { title: "Inventory Summary", href: "/stock-summary", icon: BarChart3, requiredPermission: ['canChangeStock', 'canTransferStock'] },
        { title: "Sales", href: "/sales", icon: ShoppingCart, requiredPermission: ['canSeeDetailedSales', 'canSeeExpectedSales', 'canApplyDiscounts'] },
        { title: "Logistics", href: "/deliveries", icon: Truck, requiredPermission: 'canManageEmployees' },
        { title: "Customers", href: "/customers", icon: Users, requiredPermission: 'canManageCustomers' },
        { title: "Suppliers", href: "/suppliers", icon: Truck, requiredPermission: 'canSeeSuppliers' },
        { title: "Purchases", href: "/purchases", icon: ShoppingBag, requiredPermission: ['canSeePurchases', 'canSeeDetailedPurchases'] },
        { title: "Goods Receiving", href: "/receivings", icon: Package, requiredPermission: 'canSeeDetailedPurchases' },
        { title: "HR Department", href: "/hr", icon: Users, moduleKey: 'employeeManagement', requiredPermission: ['canManageEmployees', 'canManagePayroll', 'canManageAttendance'] },
        { title: "Accounts", href: "/accounts", icon: BookOpen, moduleKey: 'storeAccount', requiredPermission: ['canManageLedger', 'canManageCommissions', 'canManageCheques'] },
        { title: "Cheques", href: "/finance/cheques", icon: CreditCard },
        { title: "Invoices", href: "/invoices", icon: FileText },
        { title: "Quotations", href: "/quotations", icon: FileText, moduleKey: 'quotations' },
        { title: "Day Book", href: "/day-book", icon: BookOpen, moduleKey: 'dayBook' },
        { title: "Party Ledger", href: "/party-ledger", icon: BookOpen, moduleKey: 'partyLedger' },
        { title: "Price Check", href: "/price-check", icon: Calculator, moduleKey: 'priceCheck' },
        { title: "Settings", href: "/more", icon: Settings },
        { title: "P & L", href: "/profit-loss", icon: PieChart },
        { title: "Reports", href: "/reports", icon: FileText },
        { title: "Stores", href: "/stores", icon: Store },
        { title: "Online Store", href: "/ecommerce", icon: ShoppingBag },
        { title: "Notifications", href: "/notifications", icon: Bell },
        { title: "Users", href: "/users", icon: Users },
        { title: "Store Config", href: "/store-config", icon: Settings },
        { title: "Access Control", href: "/access-control", icon: Shield },
        { title: "Sync Diagnostics", href: "/sync-diagnostics", icon: Activity },
    ],

    // HR Manager
    hr_manager: [
        { title: "HR Dashboard", href: "/hr", icon: LayoutDashboard },
        { title: "Mark Attendance", href: "/employee/attendance", icon: Calendar },
        { title: "Apply Leave", href: "/employee/leave", icon: FileText },
        { title: "Employees", href: "/hr/employees", icon: Users },
        { title: "Attendance", href: "/hr/attendance", icon: Calendar },
        { title: "Leaves", href: "/hr/leaves", icon: FileText },
        { title: "Payroll", href: "/hr/payroll", icon: CreditCard },
        { title: "Performance", href: "/hr/performance", icon: BarChart3 },
    ],

    // Sales Manager
    sales_manager: [
        { title: "Sales Dashboard", href: "/sales", icon: LayoutDashboard },
        { title: "Mark Attendance", href: "/employee/attendance", icon: Calendar },
        { title: "Apply Leave", href: "/employee/leave", icon: FileText },
        { title: "New Sale", href: "/sales/new", icon: ShoppingCart },
        { title: "Invoices", href: "/invoices", icon: FileText },
        { title: "Quotations", href: "/sales/quotations", icon: FileText },
        { title: "Customers", href: "/customers", icon: Users },
        { title: "Day Book", href: "/day-book", icon: BookOpen },
    ],

    // Inventory Manager
    inventory_manager: [
        { title: "Inventory Dashboard", href: "/products", icon: LayoutDashboard },
        { title: "Mark Attendance", href: "/employee/attendance", icon: Calendar },
        { title: "Apply Leave", href: "/employee/leave", icon: FileText },
        { title: "Inventory Summary", href: "/stock-summary", icon: Package },
        { title: "Stock Journal", href: "/stock-journal", icon: ClipboardList },
        { title: "Suppliers", href: "/suppliers", icon: Truck },
        { title: "Purchase Orders", href: "/purchase-orders", icon: Truck },
        { title: "Goods Receiving", href: "/receivings", icon: Package },
    ],

    // Accountant
    accountant: [
        { title: "Finance Dashboard", href: "/transactions", icon: LayoutDashboard },
        { title: "Mark Attendance", href: "/employee/attendance", icon: Calendar },
        { title: "Apply Leave", href: "/employee/leave", icon: FileText },
        { title: "Ledger", href: "/accounts", icon: BookOpen },
        { title: "Profit & Loss", href: "/profit-loss", icon: PieChart },
        { title: "Purchases", href: "/purchases", icon: ShoppingCart },
        { title: "Suppliers", href: "/suppliers", icon: Truck },
        { title: "Commissions", href: "/commissions", icon: Percent },
        { title: "Invoices", href: "/invoices", icon: FileText },
        { title: "Cheques", href: "/finance/cheques", icon: CreditCard },
        { title: "Tax Settings", href: "/tax-settings", icon: Calculator },
    ],

    // Employee
    employee: [
        { title: "My Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
        { title: "Mark Attendance", href: "/employee/attendance", icon: Calendar },
        { title: "Apply Leave", href: "/employee/leave", icon: FileText },
    ],

    // Fallbacks
    admin: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard },
        { title: "Inventory", href: "/products", icon: Package },
        { title: "Sales", href: "/sales", icon: ShoppingCart },
        { title: "Logistics", href: "/deliveries", icon: Truck },
        { title: "Invoices", href: "/invoices", icon: FileText },
        { title: "Cheques", href: "/finance/cheques", icon: CreditCard },
        { title: "Quotations", href: "/quotations", icon: FileText },
        { title: "Customers", href: "/customers", icon: Users },
        { title: "Suppliers", href: "/suppliers", icon: Truck },
        { title: "Purchases", href: "/purchases", icon: ShoppingCart },
        { title: "Goods Receiving", href: "/receivings", icon: Package },
        { title: "HR", href: "/hr", icon: Users },
        { title: "Finance", href: "/transactions", icon: Calculator },
        { title: "Reports", href: "/reports", icon: BarChart3 },
        { title: "Stores", href: "/stores", icon: Store },
        { title: "Users", href: "/users", icon: Users },
        { title: "Store Config", href: "/store-config", icon: Settings },
        { title: "Access Control", href: "/access-control", icon: Shield },
        { title: "Sync Diagnostics", href: "/sync-diagnostics", icon: Activity },
        { title: "Settings", href: "/more", icon: Settings },
    ],
    staff: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard },
        { title: "Sales", href: "/sales", icon: ShoppingCart },
    ],
    user: [
        { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ]
};
