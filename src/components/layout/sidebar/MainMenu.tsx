
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
  UserCircle,
  Utensils,
  Boxes
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "owner", "manager", "cashier"]
  },
  {
    name: "POS",
    href: "/pos",
    icon: ShoppingBasket,
    roles: ["admin", "owner", "manager", "cashier"]
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    roles: ["admin", "owner", "manager", "cashier"]
  },
  {
    name: "Menu Management",
    href: "/inventory",
    icon: Utensils,
    roles: ["admin", "owner", "manager"]
  },
  {
    name: "Inventory Stock",
    href: "/inventory/stock",
    icon: Boxes,
    roles: ["admin", "owner", "manager"]
  },
  {
    name: "Stores",
    href: "/stores",
    icon: Store,
    roles: ["admin", "owner"]
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart,
    roles: ["admin", "owner", "manager"]
  }
];

const settingsItems = [
  {
    name: "Cashiers",
    href: "/settings/cashiers",
    icon: UserCircle,
    roles: ["admin", "owner"]
  },
  {
    name: "Managers",
    href: "/settings/managers",
    icon: UserCircle,
    roles: ["admin", "owner"]
  }
];

export function MainMenu() {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActive = (href: string) => {
    if (href === "/dashboard" && location.pathname === "/") {
      return true;
    }
    return location.pathname.startsWith(href);
  };

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  );
  
  const filteredSettingsItems = settingsItems.filter(item => 
    !user?.role || item.roles.includes(user.role)
  );
  
  return (
    <div className="flex flex-col space-y-1 px-2">
      <nav className="space-y-1">
        {filteredMenuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.href} 
            className={cn(
              "py-2 px-4 flex items-center space-x-2 rounded-lg text-sm transition-colors", 
              isActive(item.href) 
                ? "bg-croffle-dark/80 text-white font-medium" 
                : "hover:bg-croffle-dark/30 text-croffle-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive(item.href) ? "text-white" : "text-croffle-foreground")} />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
      
      {filteredSettingsItems.length > 0 && (
        <div className="pt-6 border-t border-gray-700 mt-4">
          <p className="text-xs font-medium px-4 mb-2 text-muted-foreground">Settings</p>
          <nav className="space-y-1">
            {filteredSettingsItems.map((item) => (
              <Link 
                key={item.name} 
                to={item.href} 
                className={cn(
                  "py-2 px-4 flex items-center space-x-2 rounded-lg text-sm transition-colors", 
                  isActive(item.href) 
                    ? "bg-croffle-dark/80 text-white font-medium" 
                    : "hover:bg-croffle-dark/30 text-croffle-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.href) ? "text-white" : "text-croffle-foreground")} />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
