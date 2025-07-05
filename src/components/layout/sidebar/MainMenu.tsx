
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  Settings,
  DollarSign,
  Users,
  ShoppingBag,
  ClipboardList,
  ToggleLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "POS",
    icon: ShoppingCart,
    href: "/pos",
  },
  {
    title: "Product Availability",
    icon: ToggleLeft,
    href: "/products",
  },
  {
    title: "Inventory",
    icon: Package,
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
    href: "/customers",
  },
  {
    title: "Expenses",
    icon: DollarSign,
    href: "/expenses",
  },
  {
    title: "Reports",
    icon: FileText,
    href: "/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function MainMenu() {
  const location = useLocation();

  const isActiveLink = (href: string) => {
    return location.pathname === href || 
           (href !== "/dashboard" && location.pathname.startsWith(href));
  };

  return (
    <nav className="space-y-2">
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
          <item.icon className="h-4 w-4 mr-2" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
