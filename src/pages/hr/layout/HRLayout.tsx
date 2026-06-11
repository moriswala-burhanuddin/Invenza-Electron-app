import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
    Users,
    Calendar,
    FileText,
    CreditCard,
    BarChart2,
    MessageSquare,
    LayoutDashboard,
    LogOut,
    Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useERPStore } from "@/lib/store-data";
import { useLicense } from "@/contexts/LicenseContext";

const HRLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { hasFeature } = useLicense();
    const logout = useERPStore(state => state.logout);
    const currentUser = useERPStore(state => state.currentUser);

    const menuItems = [
        { icon: LayoutDashboard, label: "Command Center", path: "/hr" },
        { icon: Users, label: "Employees", path: "/hr/employees" },
        { icon: Calendar, label: "Attendance", path: "/hr/attendance" },
        { icon: FileText, label: "Leaves", path: "/hr/leaves" },
        { icon: CreditCard, label: "Payroll", path: "/hr/payroll" },
        { icon: BarChart2, label: "Performance", path: "/hr/performance" },
        ...(hasFeature('HR Assistant') ? [{ icon: MessageSquare, label: "HR Assistant", path: "/hr/chat" }] : []),
    ];

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold">HR</div>
                        <div>
                            <h1 className="font-bold text-lg">Invenza HR</h1>
                            <p className="text-xs text-slate-400">Department Module</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Button
                                key={item.path}
                                variant="ghost"
                                className={`w-full justify-start gap-3 ${isActive ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => navigate(item.path)}
                            >
                                <Icon className="h-5 w-5" />
                                {item.label}
                            </Button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{currentUser?.name || 'HR Manager'}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                        </div>
                    </div>
                    <Button variant="destructive" className="w-full justify-start gap-3" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b flex items-center justify-between px-6">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {menuItems.find(i => i.path === location.pathname)?.label || 'HR Module'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-sm font-medium text-slate-900">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-xs text-slate-500">
                                {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5 text-slate-600" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default HRLayout;
