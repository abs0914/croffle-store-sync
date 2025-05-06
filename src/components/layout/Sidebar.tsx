
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  CreditCard,
  BarChart4
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className, ...props }: SidebarProps) {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const menuItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
      minRole: "cashier",
    },
    {
      name: "POS",
      href: "/pos",
      icon: ShoppingCart,
      minRole: "cashier",
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Package,
      minRole: "manager",
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
      minRole: "cashier",
    },
    {
      name: "Sales",
      href: "/sales",
      icon: CreditCard,
      minRole: "manager",
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart4,
      minRole: "manager",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      minRole: "manager",
    },
  ];
  
  if (!user) return null;

  return (
    <div
      className={cn(
        "flex flex-col h-screen pb-12 border-r bg-croffle-background",
        className
      )}
      {...props}
    >
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <div className="flex items-center justify-center mb-6">
            <img
              src="/lovable-uploads/e4103c2a-e57f-45f0-9999-1567aeda3f3d.png"
              alt="The Croffle Store"
              className="h-24"
            />
          </div>
          <h2 className="text-lg font-semibold text-croffle-primary text-center mb-2">
            PVOSyncPOS
          </h2>
          <Button
            variant="default"
            className="w-full bg-croffle-accent hover:bg-croffle-accent/90"
            asChild
          >
            <Link to="/pos">Start Shift</Link>
          </Button>
        </div>
        <Separator className="bg-croffle-primary/20" />
        <div className="px-3 py-2">
          <div className="space-y-1">
            {menuItems.map((item) => {
              // Only show menu items the user has permission to access
              if (!hasPermission(item.minRole as any)) return null;
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive(item.href) 
                        ? "bg-croffle-primary text-white" 
                        : "text-croffle-text hover:bg-croffle-primary/10"
                    )}
                  >
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
