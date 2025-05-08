
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Store, 
  Warehouse, 
  Users,
  FileBarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
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

export const MainMenu: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  useEffect(() => {
    // Close the submenu when the route changes
    setIsSubMenuOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: <Home className="w-5 h-5" /> },
    { name: "Point of Sale", path: "/pos", icon: <ShoppingCart className="w-5 h-5" /> },
    { name: "Stores", path: "/stores", icon: <Store className="w-5 h-5" /> },
    { name: "Menu Management", path: "/inventory", icon: <Package className="w-5 h-5" /> },
    { name: "Inventory Stock", path: "/inventory/stock", icon: <Warehouse className="w-5 h-5" /> },
    { name: "Reports", path: "/reports", icon: <FileBarChart className="w-5 h-5" /> },
    { name: "Customers", path: "/customers", icon: <Users className="w-5 h-5" /> },
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
