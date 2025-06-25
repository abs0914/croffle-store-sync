
import React from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Truck,
  ClipboardList,
  DollarSign,
  Warehouse,
  Factory
} from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { usePermissions } from "@/hooks/usePermissions";

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ComponentType<any>;
  submenu?: MenuItem[];
  hidden?: boolean;
}

interface SidebarMenuProps {
  navigate: (path: string) => void;
  isActive: (path: string) => boolean;
}

export function SidebarMenu({ navigate, isActive }: SidebarMenuProps) {
  const { user } = useAuth();
  const { 
    canAccessOrderManagement,
    canAccessExpenses,
    canAccessReports,
    canAccessInventory,
    canAccessProducts,
    canAccessCustomers 
  } = usePermissions();

  const getFilteredMenuItems = (): MenuItem[] => {
    const baseMenuItems: MenuItem[] = [
      { path: "/dashboard", label: "Dashboard", icon: Home },
      { path: "/pos", label: "Point of Sale", icon: ShoppingCart },
      { 
        path: "/products", 
        label: "Products", 
        icon: Package,
        hidden: !canAccessProducts().hasPermission
      },
      { 
        path: "/customers", 
        label: "Customers", 
        icon: Users,
        hidden: !canAccessCustomers().hasPermission
      },
      { 
        path: "/inventory", 
        label: "Inventory", 
        icon: Warehouse,
        hidden: !canAccessInventory().hasPermission
      },
      { 
        path: "/stock-orders", 
        label: "Stock Orders", 
        icon: Truck,
        hidden: !canAccessOrderManagement().hasPermission
      },
      {
        path: "/orders", 
        label: "Order Management", 
        icon: ClipboardList,
        hidden: !canAccessOrderManagement().hasPermission
      },
      { 
        path: "/expenses", 
        label: "Expenses", 
        icon: DollarSign,
        hidden: !canAccessExpenses().hasPermission
      },
      { 
        path: "/reports", 
        label: "Reports", 
        icon: BarChart3,
        hidden: !canAccessReports().hasPermission
      },
      { 
        path: "/production", 
        label: "Production", 
        icon: Factory,
        hidden: !(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'manager')
      },
      { 
        path: "/settings", 
        label: "Settings", 
        icon: Settings,
        hidden: !(user?.role === 'admin' || user?.role === 'owner')
      },
    ];

    return baseMenuItems.filter(item => !item.hidden);
  };

  const menuItems = getFilteredMenuItems();

  return (
    <>
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => navigate(item.path || "")}
          className={`flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-accent w-full text-left ${isActive(item.path || "") ? 'bg-secondary' : ''}`}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
        </button>
      ))}
    </>
  );
}
