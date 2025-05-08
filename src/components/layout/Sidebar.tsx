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
  Users
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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

interface SidebarProps {
  isMenuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const Sidebar = ({ isMenuOpen, setMenuOpen }: SidebarProps) => {
  const { currentStore } = useStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
      <SheetContent className="w-64 flex flex-col">
        <SheetHeader className="mb-4">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Navigate through your store management options.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <span className="font-semibold">{user?.email}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                  <span className="sr-only">Open user menu</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.121.8 4.057 2.242 5.493a3 3 0 01-2.72 5.223c-1.04.156-2.073.225-3.1.225a9 9 0 01-4.5 0c-1.027 0-2.06-.069-3.1-.225a3 3 0 01-2.72-5.223A12.751 12.751 0 015.25 9v-.75zm7.5 6.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <MainMenu />

          <div className="mt-auto p-4">
            {currentStore ? (
              <Button variant="secondary" className="w-full" onClick={() => navigate("/stores/edit")}>
                Edit Current Store
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => navigate("/stores/new")}>
                Create New Store
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
