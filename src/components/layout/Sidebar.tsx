
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
  Menu
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const MainMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { user, logout } = useAuth();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  useEffect(() => {
    // Close the submenu when the route changes
    setIsSubMenuOpen(false);
  }, [location.pathname]);

  const handleProductsInventoryClick = () => {
    setIsSubMenuOpen(!isSubMenuOpen);
  };

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Point of Sale", path: "/pos", icon: <ShoppingCart className="w-5 h-5" /> },
    { name: "Customers", path: "/customers", icon: <Users className="w-5 h-5" /> },
    {
      name: "Products & Inventory",
      path: "#",
      icon: <Package className="w-5 h-5" />,
      submenu: [
        { name: "Products", path: "/products", icon: <Package2 className="w-4 h-4 mr-2" /> },
        { name: "Inventory", path: "/inventory", icon: <Warehouse className="w-4 h-4 mr-2" /> },
        { name: "Stock History", path: "/stock-history", icon: <History className="w-4 h-4 mr-2" /> },
      ],
    },
    { name: "Stores", path: "/stores", icon: <Store className="w-5 h-5" /> }
  ];

  return (
    <div className="flex flex-col space-y-1">
      {menuItems.map((item) => (
        <div key={item.name}>
          {item.submenu ? (
            <>
              <Button
                variant="ghost"
                className="w-full h-11 rounded-none justify-start px-4 font-normal text-sm hover:bg-secondary"
                onClick={handleProductsInventoryClick}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Button>
              {isSubMenuOpen && (
                <div className="flex flex-col pl-4">
                  {item.submenu.map((subItem) => (
                    <Button
                      key={subItem.name}
                      variant="ghost"
                      className={cn(
                        "w-full h-9 rounded-none justify-start px-4 font-normal text-sm hover:bg-secondary",
                        location.pathname === subItem.path ? "bg-secondary text-white" : ""
                      )}
                      onClick={() => navigate(subItem.path)}
                    >
                      {subItem.icon}
                      <span>{subItem.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              className={cn(
                "w-full h-11 rounded-none justify-start px-4 font-normal text-sm hover:bg-secondary",
                location.pathname === item.path ? "bg-secondary text-white" : ""
              )}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="ml-2">{item.name}</span>
            </Button>
          )}
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

      <div className="hidden md:flex h-screen w-64 flex-col border-r bg-background">
        <div className="flex items-center h-16 px-4 border-b">
          <h2 className="text-lg font-semibold">PVOSyncPOS</h2>
        </div>
        
        <div className="flex-1 overflow-auto py-2">
          <MainMenu />
        </div>
        
        <div className="p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage src={user?.avatar} />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{currentStore?.name || "No store selected"}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex items-center h-16 px-4 border-b">
            <h2 className="text-lg font-semibold">PVOSyncPOS</h2>
          </div>
          
          <div className="flex-1 overflow-auto py-2">
            <MainMenu />
          </div>
          
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user?.name || user?.email}</p>
                  <p className="text-xs text-muted-foreground">{currentStore?.name || "No store selected"}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
