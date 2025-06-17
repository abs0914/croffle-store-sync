
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { 
  BarChart3, 
  Store, 
  Users, 
  ChefHat, 
  ShoppingCart, 
  User,
  Settings
} from "lucide-react";

interface AdminMenuItem {
  title: string;
  icon: React.ComponentType<any>;
  href: string;
  description: string;
}

const adminMenuItems: AdminMenuItem[] = [
  {
    title: "Dashboard",
    icon: BarChart3,
    href: "/admin",
    description: "System overview and metrics",
  },
  {
    title: "Store Management",
    icon: Store,
    href: "/admin/stores",
    description: "Manage all store locations",
  },
  {
    title: "Recipe & Products",
    icon: ChefHat,
    href: "/admin/recipes",
    description: "Master recipe and product management",
  },
  {
    title: "Customer Database",
    icon: Users,
    href: "/admin/customers",
    description: "Cross-store customer management",
  },
  {
    title: "Order Management",
    icon: ShoppingCart,
    href: "/admin/orders",
    description: "Centralized order processing",
  },
  {
    title: "User Management",
    icon: User,
    href: "/admin/users",
    description: "System user administration",
  },
  {
    title: "System Settings",
    icon: Settings,
    href: "/admin/settings",
    description: "System configuration",
  },
];

export function AdminMainMenu() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Only show menu if user is admin
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex flex-col space-y-1 px-3">
      {adminMenuItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className={cn(
            "justify-start font-normal text-gray-300 hover:text-white hover:bg-gray-800 h-auto p-3 flex-col items-start",
            location.pathname === item.href ? "bg-blue-600 text-white hover:bg-blue-600" : "",
          )}
          onClick={() => navigate(item.href)}
        >
          <div className="flex items-center w-full">
            <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
            <span className="font-medium">{item.title}</span>
          </div>
          <span className="text-xs text-gray-400 ml-7 mt-1">
            {item.description}
          </span>
        </Button>
      ))}
    </div>
  );
}
