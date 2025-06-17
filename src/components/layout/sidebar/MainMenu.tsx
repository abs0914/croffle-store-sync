
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { BarChart3, ShoppingCart, Users, Settings } from "lucide-react";
import { UserRole } from '@/types';

interface MenuItem {
  title: string;
  icon: React.ComponentType<any>;
  href: string;
  permissions: UserRole[];
}

const menuItems = [
  {
    title: "Dashboard",
    icon: BarChart3,
    href: "/dashboard",
    permissions: ["admin", "owner", "manager", "cashier"] as UserRole[],
  },
  {
    title: "Point of Sale",
    icon: ShoppingCart,
    href: "/pos",
    permissions: ["admin", "owner", "manager", "cashier"] as UserRole[],
  },
  {
    title: "Customers",
    icon: Users,
    href: "/customers",
    permissions: ["admin", "owner", "manager", "cashier"] as UserRole[],
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/reports",
    permissions: ["admin", "owner", "manager", "cashier"] as UserRole[],
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    permissions: ["admin", "owner", "manager", "cashier"] as UserRole[],
  },
];

export function MainMenu() {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredMenuItems = menuItems.filter(item =>
    item.permissions.some(role => hasPermission(role))
  );

  return (
    <div className="flex flex-col space-y-1">
      {filteredMenuItems.map((item) => (
        <Button
          key={item.href}
          variant="ghost"
          className={cn(
            "justify-start font-normal",
            location.pathname === item.href ? "bg-secondary hover:bg-secondary" : "hover:bg-accent hover:text-accent-foreground",
          )}
          onClick={() => navigate(item.href)}
        >
          <item.icon className="mr-2 h-4 w-4" />
          <span>{item.title}</span>
        </Button>
      ))}
    </div>
  );
}
