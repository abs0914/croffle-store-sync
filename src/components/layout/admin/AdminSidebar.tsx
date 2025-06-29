
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  FileText, 
  Settings,
  DollarSign,
  ShoppingBag,
  ClipboardList,
  Package2,
  ChefHat,
  Warehouse,
  Factory
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    title: "Product Catalog",
    icon: ShoppingBag,
    href: "/admin/product-catalog",
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
    title: "Reports",
    icon: FileText,
    href: "/admin/reports",
  },
];

export function AdminSidebar() {
  const location = useLocation();

  const isActiveLink = (href: string) => {
    return location.pathname === href || 
           (href !== "/admin" && location.pathname.startsWith(href));
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-50">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-croffle-primary">
            Croffle Admin
          </h1>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-3 py-4 space-y-1">
            {adminMenuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  isActiveLink(item.href)
                    ? "bg-croffle-accent text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                    isActiveLink(item.href)
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-500"
                  )}
                  aria-hidden="true"
                />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
