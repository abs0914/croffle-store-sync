
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  Users, 
  FileText, 
  ShoppingCart,
  Factory,
  Receipt,
  DollarSign,
  ChevronDown,
  Warehouse
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ROUTE_PATHS } from "@/contexts/auth/role-utils";

// OPTIMIZED ADMIN MENU STRUCTURE
const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: ROUTE_PATHS.ADMIN_ROOT,
  },
  {
    title: "Stores",
    icon: Store,
    href: ROUTE_PATHS.ADMIN_STORES,
  },
  {
    title: "Recipes",
    icon: Receipt,
    href: ROUTE_PATHS.ADMIN_RECIPES,
  },
  {
    title: "Commissary & Production",
    icon: Package,
    items: [
      { title: "Commissary Inventory", href: ROUTE_PATHS.ADMIN_COMMISSARY },
      { title: "Production Management", href: ROUTE_PATHS.ADMIN_PRODUCTION },
    ],
  },
  {
    title: "Users",
    icon: Users,
    items: [
      { title: "All Users", href: ROUTE_PATHS.ADMIN_USERS },
      { title: "Cashiers", href: ROUTE_PATHS.ADMIN_CASHIERS },
      { title: "Managers", href: ROUTE_PATHS.ADMIN_MANAGERS },
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: ROUTE_PATHS.ADMIN_ORDER_MANAGEMENT,
  },
  {
    title: "Expenses",
    icon: DollarSign,
    href: ROUTE_PATHS.ADMIN_EXPENSES,
  },
  {
    title: "Customers",
    icon: Users,
    href: ROUTE_PATHS.ADMIN_CUSTOMERS,
  },
  {
    title: "Reports",
    icon: FileText,
    href: ROUTE_PATHS.ADMIN_REPORTS,
  },
];

export function AdminMainMenu() {
  const location = useLocation();
  const [openSections, setOpenSections] = React.useState<string[]>([]);

  const toggleSection = (title: string) => {
    setOpenSections(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActiveLink = (href: string) => {
    return location.pathname === href || 
           (href !== "/admin" && location.pathname.startsWith(href));
  };

  const isActiveSectionItem = (items: { href: string }[]) => {
    return items.some(item => isActiveLink(item.href));
  };

  return (
    <nav className="space-y-2">
      {menuItems.map((item) => {
        if (item.items) {
          const isOpen = openSections.includes(item.title);
          const hasActiveChild = isActiveSectionItem(item.items);
          
          return (
            <Collapsible key={item.title} open={isOpen} onOpenChange={() => toggleSection(item.title)}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    hasActiveChild
                      ? "bg-croffle-accent text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center">
                    <item.icon className="h-4 w-4 mr-3" />
                    {item.title}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1">
                {item.items.map((subItem) => (
                  <Link
                    key={subItem.href}
                    to={subItem.href}
                    className={cn(
                      "block px-3 py-2 text-sm rounded-md transition-colors",
                      isActiveLink(subItem.href)
                        ? "bg-croffle-accent text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {subItem.title}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        }

        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActiveLink(item.href)
                ? "bg-croffle-accent text-white"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <item.icon className="h-4 w-4 mr-3" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
