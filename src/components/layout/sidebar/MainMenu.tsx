
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Store, 
  ShoppingBasket, 
  Users, 
  Settings, 
  BarChart, 
  Package, 
  FileSpreadsheet,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard
  },
  {
    name: "POS",
    href: "/pos",
    icon: ShoppingBasket
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users
  },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package
  },
  {
    name: "Stores",
    href: "/stores",
    icon: Store
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart
  }
];

const settingsItems = [
  {
    name: "Cashiers",
    href: "/settings/cashiers",
    icon: UserCircle
  }
];

export function MainMenu() {
  const location = useLocation();
  
  const isActive = (href: string) => {
    if (href === "/dashboard" && location.pathname === "/") {
      return true;
    }
    return location.pathname.startsWith(href);
  };
  
  return (
    <div className="flex flex-col space-y-1">
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.href} 
            className={cn(
              "py-2 px-3 flex items-center space-x-2 rounded-lg text-sm transition-colors", 
              isActive(item.href) ? "bg-croffle-light/10 text-croffle-light" : "hover:bg-muted-foreground/5"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      
      <div className="pt-6 border-t border-gray-700 mt-4">
        <p className="text-xs font-medium pl-3 mb-2 text-muted-foreground">Settings</p>
        <nav className="space-y-1">
          {settingsItems.map((item) => (
            <Link 
              key={item.name} 
              to={item.href} 
              className={cn(
                "py-2 px-3 flex items-center space-x-2 rounded-lg text-sm transition-colors", 
                isActive(item.href) ? "bg-croffle-light/10 text-croffle-light" : "hover:bg-muted-foreground/5"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
