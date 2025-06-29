
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
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-croffle-primary">
            Croffle Admin
          </h1>
        </div>
        <div className="mt-5 flex-grow flex flex-col">
          <nav className="flex-1 px-2 pb-4 space-y-1">
            {adminMenuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActiveLink(item.href)
                    ? "bg-croffle-accent text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className="mr-3 flex-shrink-0 h-5 w-5"
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
