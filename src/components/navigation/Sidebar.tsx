
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { useOfflineMode } from "@/hooks/useOfflineMode";
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
  Shield,
  DollarSign,
  Activity
} from "lucide-react";
import { 
  checkRouteAccess,
  canAccessAdminPanel,
  ROUTE_PATHS
} from "@/contexts/auth/role-utils";

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ComponentType<any>;
  hidden?: boolean;
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentStore, setCurrentStore, stores } = useStore();
  const offlineMode = useOfflineMode(currentStore?.id || null);

  const isActive = (path?: string) => {
    if (!path) return false;
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
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <Home className="mr-2 h-4 w-4" />
                Back to Store
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SheetContent>
      </Sheet>
    );
  }

  // Store-level navigation - OPTIMIZED STRUCTURE
  const getFilteredMenuItems = (): MenuItem[] => {
    const baseMenuItems: MenuItem[] = [
      { path: ROUTE_PATHS.DASHBOARD, label: "Dashboard", icon: Home },
      { path: ROUTE_PATHS.POS, label: "Point of Sale", icon: ShoppingCart },
      { 
        path: ROUTE_PATHS.PRODUCTS, 
        label: "Products", 
        icon: ShoppingBag,
        hidden: !checkRouteAccess(user?.role, ROUTE_PATHS.PRODUCTS)
      },
      { 
        path: ROUTE_PATHS.STOCK_ORDERS, 
        label: "Stock Orders", 
        icon: ClipboardList,
        hidden: !checkRouteAccess(user?.role, ROUTE_PATHS.STOCK_ORDERS)
      },
      { 
        path: ROUTE_PATHS.INVENTORY, 
        label: "Store Inventory", 
        icon: Package,
        hidden: !checkRouteAccess(user?.role, ROUTE_PATHS.INVENTORY)
      },
      { 
        path: '/inventory/monitor', 
        label: "Inventory Monitor", 
        icon: Activity,
        hidden: !checkRouteAccess(user?.role, ROUTE_PATHS.INVENTORY)
      },
      { path: ROUTE_PATHS.CUSTOMERS, label: "Customers", icon: Users },
      {
        path: ROUTE_PATHS.ORDER_MANAGEMENT, 
        label: "Order Management", 
        icon: Truck,
        hidden: !checkRouteAccess(user?.role, ROUTE_PATHS.ORDER_MANAGEMENT)
      },
      { 
        path: ROUTE_PATHS.EXPENSES, 
        label: "Expenses", 
        icon: DollarSign
      },
      { 
        path: ROUTE_PATHS.REPORTS, 
        label: "Reports", 
        icon: BarChart3
      },
      { 
        path: ROUTE_PATHS.SETTINGS, 
        label: "Settings", 
        icon: Settings,
        hidden: !checkRouteAccess(user?.role, ROUTE_PATHS.SETTINGS)
      },
    ];

    return baseMenuItems.filter(item => !item.hidden);
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
          <SheetTitle>Store Menu</SheetTitle>
          <SheetDescription>
            Navigate your store operations
          </SheetDescription>
        </SheetHeader>
        <Separator className="my-4" />

        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => item.path && navigate(item.path)}
            className={`flex items-center justify-between space-x-2 py-2 px-4 rounded-md hover:bg-accent w-full text-left ${isActive(item.path) ? 'bg-secondary' : ''}`}
            disabled={!item.path}
          >
            <div className="flex items-center space-x-2">
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            {item.path === '/inventory/monitor' && offlineMode.pendingApprovals && offlineMode.pendingApprovals > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {offlineMode.pendingApprovals}
              </Badge>
            )}
          </button>
        ))}

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
            {canAccessAdminPanel(user?.role) && (
              <>
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
