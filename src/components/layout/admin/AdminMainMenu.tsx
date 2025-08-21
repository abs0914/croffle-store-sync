
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  DollarSign,
  Settings,
  Archive,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

// SIMPLIFIED ADMIN MENU STRUCTURE - MATCHES ORIGINAL DESIGN
const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    title: "POS",
    icon: ShoppingCart,
    href: "/pos",
  },
  {
    title: "Product Catalog",
    icon: Package,
    href: "/products",
  },
  {
    title: "Inventory",
    icon: Archive,
    href: "/inventory",
  },
  {
    title: "Order Management",
    icon: ClipboardList,
    href: "/order-management",
  },
  {
    title: "Customers",
    icon: Users,
    href: "/admin/customers",
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
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function AdminMainMenu() {
  const location = useLocation();

  const isActiveLink = (href: string) => {
    return location.pathname === href || 
           (href !== "/admin" && location.pathname.startsWith(href));
  };

  return (
    <nav className="space-y-2 px-3">
      {menuItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            isActiveLink(item.href)
              ? "bg-croffle-accent text-white"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <item.icon className="h-4 w-4 mr-3" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
