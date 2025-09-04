import React from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  FileText,
  DollarSign,
  ClipboardList,
  ChefHat,
  Warehouse,
  Factory,
  User,
  LogOut,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";

const adminMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    title: "Stores",
    icon: Store,
    href: "/admin/stores",
  },
  {
    title: "Recipe Management",
    icon: ChefHat,
    href: "/admin/recipes",
  },
  {
    title: "Commissary Inventory",
    icon: Warehouse,
    href: "/admin/commissary-inventory",
  },
  {
    title: "Production Management",
    icon: Factory,
    href: "/admin/production-management",
  },
  {
    title: "Order Management",
    icon: ClipboardList,  
    href: "/admin/order-management",
  },
  {
    title: "Customers",
    icon: Users,
    href: "/admin/customers",
  },
  {
    title: "User Management",
    icon: Users,
    href: "/admin/users",
  },
  {
    title: "Expenses",
    icon: DollarSign,
    href: "/admin/expenses",
  },
  {
    title: "Accounting",
    icon: Calculator,
    href: "/admin/accounting",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/admin/reports",
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActiveLink = (href: string) => {
    return location.pathname === href || 
           (href !== "/admin" && location.pathname.startsWith(href));
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40">
      <div className="flex flex-col h-full bg-croffle-background border-r border-croffle-light">
        {/* Logo Header */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-croffle-light bg-gradient-to-r from-croffle-background to-croffle-light">
          <div className="w-12 h-12 mb-2">
            <img 
              src="/lovable-uploads/cb3fd8e0-b11b-485f-af2f-41b76a79fbba.png" 
              alt="The Croffle Store" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <h2 className="text-xl font-semibold text-croffle-text mt-2">
            Admin Panel
          </h2>
          <p className="text-sm text-croffle-text/70 text-center">
            System Administration
          </p>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="px-3 py-4 space-y-1">
            {adminMenuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink(item.href)
                    ? "bg-croffle-accent text-white shadow-sm"
                    : "text-croffle-text hover:bg-croffle-light hover:text-croffle-text"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                    isActiveLink(item.href)
                      ? "text-white"
                      : "text-croffle-text/60 group-hover:text-croffle-text"
                  )}
                  aria-hidden="true"
                />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className="border-t border-croffle-light p-4 bg-gradient-to-r from-croffle-background to-croffle-light">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-croffle-accent">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-croffle-text">
                  {user.name}
                </p>
                <p className="text-xs text-croffle-text/70 truncate">
                  {user.email}
                </p>
                <p className="text-xs uppercase font-medium text-croffle-accent">
                  {user.role}
                </p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout} 
              className="w-full justify-start text-croffle-text hover:text-white hover:bg-croffle-accent"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
