
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  ShoppingCart,
  Package,
  Store,
  LayoutDashboard,
  Package2,
  Warehouse,
  History,
  Users,
  Menu,
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { designClass } from "@/utils/designSystem";

// Design constants - centralized in the component
const DESIGN = {
  colors: {
    active: "bg-croffle-accent text-white",
    hover: "hover:bg-croffle-accent/80 hover:text-white",
  },
  spacing: {
    menuItem: "h-11 px-4 py-2 mb-1",
    submenuItem: "h-9 px-6 py-1.5 mb-1",
  },
  radius: "rounded-lg",
}

const MainMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  useEffect(() => {
    // Close the submenu when the route changes
    setIsSubMenuOpen(false);
  }, [location.pathname]);

  const handleProductsInventoryClick = () => {
    setIsSubMenuOpen(!isSubMenuOpen);
  };

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { name: "Point of Sale", path: "/pos", icon: <ShoppingCart className="w-5 h-5" /> },
    { name: "Stores", path: "/stores", icon: <Store className="w-5 h-5" /> },
    { name: "Menu Management", path: "#", icon: <Package className="w-5 h-5" /> },
    { name: "Inventory Stock", path: "/inventory", icon: <Warehouse className="w-5 h-5" /> },
    { name: "Customers", path: "/customers", icon: <Users className="w-5 h-5" /> },
    { name: "Sales", path: "#", icon: <History className="w-5 h-5" /> },
  ];

  return (
    <div className="flex flex-col space-y-0.5 px-3 py-2" data-design-locked="true">
      {menuItems.map((item) => (
        <div key={item.name}>
          <Button
            variant="ghost"
            className={cn(
              DESIGN.spacing.menuItem,
              DESIGN.radius,
              "w-full justify-start font-normal",
              location.pathname === item.path 
                ? DESIGN.colors.active
                : DESIGN.colors.hover,
              "transition-colors text-croffle-text"
            )}
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-center">
              <span className="w-5 h-5 mr-2 flex items-center justify-center">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </div>
          </Button>
        </div>
      ))}
    </div>
  );
};

const Sidebar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { currentStore } = useStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div className="md:hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed top-4 left-4 z-50"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <div className="hidden md:flex h-screen w-64 flex-col bg-croffle-background border-r">
        {/* Logo and Branding Section */}
        <div className="flex flex-col items-center py-6 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light">
          <div className="w-36 h-36 mb-4">
            <img 
              src="/lovable-uploads/842d2338-c44c-4ef3-9af0-180d9a784c65.png" 
              alt="The Croffle Store" 
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl font-semibold text-croffle-primary mt-2">PVOSyncPOS</h2>
        </div>
        
        {/* Start Shift Button */}
        <div className="px-3 py-4">
          <Button 
            className="w-full bg-croffle-accent hover:bg-croffle-accent/90 text-white rounded-md py-3"
            onClick={() => navigate("/pos")}
          >
            Start Shift
          </Button>
        </div>
        
        {/* Menu Section */}
        <div className="flex-1 overflow-auto py-2" data-design-locked="true">
          <MainMenu />
        </div>
        
        {/* User Profile Section */}
        <div className="p-4 border-t bg-gradient-to-r from-croffle-background to-croffle-light">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="border-2 border-croffle-accent">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-croffle-primary text-white">{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-croffle-text">{user?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{currentStore?.name || "No store selected"}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-croffle-light hover:text-croffle-primary">
                  <span className="sr-only">Open user menu</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-croffle-background">
          {/* Logo and Branding Section */}
          <div className="flex flex-col items-center py-6 px-4 border-b bg-gradient-to-r from-croffle-background to-croffle-light">
            <div className="w-28 h-28 mb-2">
              <img 
                src="/lovable-uploads/842d2338-c44c-4ef3-9af0-180d9a784c65.png" 
                alt="The Croffle Store" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-lg font-semibold text-croffle-primary mt-1">PVOSyncPOS</h2>
          </div>
          
          {/* Start Shift Button */}
          <div className="px-3 py-3">
            <Button 
              className="w-full bg-croffle-accent hover:bg-croffle-accent/90 text-white rounded-md py-2"
              onClick={() => navigate("/pos")}
            >
              Start Shift
            </Button>
          </div>
          
          {/* Menu Section */}
          <div className="flex-1 overflow-auto py-2" data-design-locked="true">
            <MainMenu />
          </div>
          
          {/* User Profile Section */}
          <div className="p-4 border-t bg-gradient-to-r from-croffle-background to-croffle-light">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar className="border-2 border-croffle-accent">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-croffle-primary text-white">{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-croffle-text">{user?.name || user?.email}</p>
                  <p className="text-xs text-muted-foreground">{currentStore?.name || "No store selected"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-croffle-light hover:text-croffle-primary">
                    <span className="sr-only">Open user menu</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M3 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM8.5 10a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM15.5 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Sidebar;
