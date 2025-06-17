
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Factory,
  ChefHat,
  Truck,
  Warehouse
} from "lucide-react";

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ComponentType<any>;
  submenu?: MenuItem[];
  hidden?: boolean;
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentStore, setCurrentStore, stores } = useStore();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Don't show store-specific menu items for admin users
  const isAdminArea = location.pathname.startsWith('/admin');
  
  if (isAdminArea) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
            Admin Menu
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:w-[280px]">
          <SheetHeader>
            <SheetTitle>Admin Menu</SheetTitle>
            <SheetDescription>
              System administration
            </SheetDescription>
          </SheetHeader>
          <Separator className="my-4" />
          
          <div className="text-center text-sm text-muted-foreground">
            Please use the main admin sidebar for navigation
          </div>

          <Separator className="my-4" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
                <Avatar className="mr-2">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                {user?.email}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SheetContent>
      </Sheet>
    );
  }

  const menuItems: MenuItem[] = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/pos", label: "Point of Sale", icon: ShoppingCart },
    {
      label: "Production",
      icon: Factory,
      submenu: [
        { path: "/production", label: "Production Management", icon: ChefHat },
        { path: "/inventory", label: "Store Inventory", icon: Package },
        { path: "/commissary-inventory", label: "Commissary Inventory", icon: Warehouse },
      ]
    },
    {
      label: "Orders & Supply",
      icon: Truck,
      submenu: [
        { path: "/order-management", label: "Order Management", icon: Truck },
      ]
    },
    { path: "/customers", label: "Customers", icon: Users },
    { path: "/reports", label: "Reports", icon: BarChart3 },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
          Menu
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Navigate your store
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />

        {menuItems.map((item, index) => {
          if (item.hidden) return null;

          if (item.submenu) {
            return (
              <Accordion type="single" collapsible key={index}>
                <AccordionItem value={item.label}>
                  <AccordionTrigger className="data-[state=open]:bg-secondary hover:bg-secondary rounded-md">
                    <div className="flex items-center space-x-2 w-full">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-2">
                      {item.submenu.map((subItem, subIndex) => {
                        if (subItem.hidden) return null;
                        return (
                          <button
                            key={subIndex}
                            onClick={() => navigate(subItem.path || "")}
                            className={`flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-accent text-sm ${isActive(subItem.path || "") ? 'bg-secondary' : ''}`}
                          >
                            <subItem.icon className="h-3 w-3" />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          } else {
            return (
              <button
                key={index}
                onClick={() => navigate(item.path || "")}
                className={`flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-accent ${isActive(item.path || "") ? 'bg-secondary' : ''}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          }
        })}

        <Separator className="my-4" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-accent-foreground bg-muted hover:bg-muted-foreground hover:text-accent-foreground h-10 px-4 py-2 w-full">
              <Avatar className="mr-2">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              {user?.email}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator className="my-4" />

        <div>
          <p className="text-sm font-medium px-4">Current Store</p>
          <select
            className="w-full h-10 rounded-md bg-muted px-4"
            value={currentStore?.id}
            onChange={(e) => {
              const selectedStore = stores.find(store => store.id === e.target.value);
              setCurrentStore(selectedStore || null);
            }}
          >
            <option value="">Select a store</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
      </SheetContent>
    </Sheet>
  );
}
