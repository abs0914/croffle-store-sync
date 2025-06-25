
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  Factory,
  Warehouse,
  ClipboardList,
  DollarSign,
  Truck
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { usePermissions } from "@/hooks/usePermissions";

export function MainMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { 
    canAccessOrderManagement,
    canAccessExpenses,
    canAccessReports,
    canAccessInventory,
    canAccessProducts,
    canAccessCustomers 
  } = usePermissions();

  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      path: "/dashboard",
      show: true
    },
    {
      title: "POS",
      icon: ShoppingCart,
      path: "/pos",
      show: true
    },
    {
      title: "Products",
      icon: Package,
      path: "/products",
      show: canAccessProducts().hasPermission
    },
    {
      title: "Customers",
      icon: Users,
      path: "/customers",
      show: canAccessCustomers().hasPermission
    },
    {
      title: "Inventory",
      icon: Warehouse,
      path: "/inventory",
      show: canAccessInventory().hasPermission
    },
    {
      title: "Stock Orders",
      icon: Truck,
      path: "/stock-orders",
      show: canAccessOrderManagement().hasPermission
    },
    {
      title: "Orders",
      icon: ClipboardList,
      path: "/orders",
      show: canAccessOrderManagement().hasPermission
    },
    {
      title: "Expenses",
      icon: DollarSign,
      path: "/expenses",
      show: canAccessExpenses().hasPermission
    },
    {
      title: "Reports",
      icon: BarChart3,
      path: "/reports",
      show: canAccessReports().hasPermission
    },
    {
      title: "Production",
      icon: Factory,
      path: "/production",
      show: user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager'
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/settings",
      show: user?.role === 'admin' || user?.role === 'owner'
    }
  ];

  return (
    <nav className="space-y-2">
      {menuItems
        .filter(item => item.show)
        .map((item) => (
          <Button
            key={item.path}
            variant={location.pathname === item.path ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => navigate(item.path)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Button>
        ))}
    </nav>
  );
}
