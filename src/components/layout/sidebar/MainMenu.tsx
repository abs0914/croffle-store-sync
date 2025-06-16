import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import { Package, Upload, Users, Settings, Store, BarChart3, ShoppingCart, Boxes, Truck } from "lucide-react";
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
    permissions: ["admin", "owner", "manager", "staff"] as UserRole[],
  },
  {
    title: "Point of Sale",
    icon: ShoppingCart,
    href: "/pos",
    permissions: ["admin", "owner", "manager", "staff"] as UserRole[],
  },
  {
    title: "Products",
    icon: Boxes,
    href: "/products",
    permissions: ["admin", "owner", "manager"] as UserRole[],
  },
  {
    title: "Inventory",
    icon: Truck,
    href: "/inventory",
    permissions: ["admin", "owner", "manager"] as UserRole[],
  },
  {
    title: "Bulk Upload",
    icon: Upload,
    href: "/bulk-upload",
    permissions: ["admin", "owner"] as UserRole[],
  },
  {
    title: "Order Management",
    icon: ShoppingCart,
    href: "/orders",
    permissions: ["admin", "owner", "manager"] as UserRole[],
  },
  {
    title: "Users",
    icon: Users,
    href: "/users",
    permissions: ["admin", "owner"] as UserRole[],
  },
  {
    title: "Stores",
    icon: Store,
    href: "/stores",
    permissions: ["admin", "owner"] as UserRole[],
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    permissions: ["admin", "owner"] as UserRole[],
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
      <Separator className="my-2" />
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Utilities</AccordionTrigger>
            <AccordionContent>
              <Button
                variant="ghost"
                className={cn(
                  "justify-start font-normal",
                  location.pathname === "/under-construction" ? "bg-secondary hover:bg-secondary" : "hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={() => navigate("/under-construction")}
              >
                <Package className="mr-2 h-4 w-4" />
                <span>Placeholder</span>
              </Button>
            </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
