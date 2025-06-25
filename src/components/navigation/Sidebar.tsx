
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
  Truck,
  ShoppingBag,
  ClipboardList,
  DollarSign,
  Warehouse,
  Factory
} from "lucide-react";
import { 
  checkRouteAccess
} from "@/contexts/auth/role-utils";

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

  // Store-level navigation with updated structure
  const getFilteredMenuItems = (): MenuItem[] => {
    const baseMenuItems: MenuItem[] = [
      { path: "/dashboard", label: "Dashboard", icon: Home },
      { path: "/pos", label: "Point of Sale", icon: ShoppingCart },
      { path: "/products", label: "Products", icon: Package },
      { path: "/customers", label: "Customers", icon: Users },
      { 
        path: "/inventory", 
        label: "Inventory", 
        icon: Warehouse,
        hidden: !checkRouteAccess(user?.role, "/inventory")
      },
      { 
        path: "/stock-orders", 
        label: "Stock Orders", 
        icon: Truck,
        hidden: !checkRouteAccess(user?.role, "/stock-orders")
      },
      {
        path: "/orders", 
        label: "Order Management", 
        icon: ClipboardList,
        hidden: !checkRouteAccess(user?.role, "/orders")
      },
      { 
        path: "/expenses", 
        label: "Expenses", 
        icon: DollarSign,
        hidden: !checkRouteAccess(user?.role, "/expenses")
      },
      { 
        path: "/reports", 
        label: "Reports", 
        icon: BarChart3,
        hidden: !checkRouteAccess(user?.role, "/reports")
      },
      { 
        path: "/production", 
        label: "Production", 
        icon: Factory,
        hidden: !checkRouteAccess(user?.role, "/production")
      },
      { 
        path: "/settings", 
        label: "Settings", 
        icon: Settings,
        hidden: !checkRouteAccess(user?.role, "/settings")
      },
    ];

    return baseMenuItems.filter(item => {
      if (item.hidden) return false;
      return item.path ? checkRouteAccess(user?.role, item.path) : true;
    });
  };

  const menuItems = getFilteredMenuItems();

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

          return (
            <button
              key={index}
              onClick={() => navigate(item.path || "")}
              className={`flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-accent w-full text-left ${isActive(item.path || "") ? 'bg-secondary' : ''}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
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
