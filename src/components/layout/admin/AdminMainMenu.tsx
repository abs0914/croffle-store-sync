
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
import { useRolePermissions } from "@/contexts/RolePermissionsContext";

// ROLE-BASED ADMIN MENU STRUCTURE
const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: ROUTE_PATHS.ADMIN_ROOT,
    permission: 'dashboard' as const,
  },
  {
    title: "Stores",
    icon: Store,
    href: ROUTE_PATHS.ADMIN_STORES,
    permission: 'settings' as const,
  },
  {
    title: "Recipes",
    icon: Receipt,
    href: ROUTE_PATHS.ADMIN_RECIPES,
    permission: 'recipe_management' as const,
  },
  {
    title: "Commissary & Production",
    icon: Package,
    permission: 'commissary_inventory' as const,
    items: [
      { 
        title: "Commissary Inventory", 
        href: ROUTE_PATHS.ADMIN_COMMISSARY,
        permission: 'commissary_inventory' as const,
      },
      { 
        title: "Production Management", 
        href: ROUTE_PATHS.ADMIN_PRODUCTION,
        permission: 'production_management' as const,
      },
    ],
  },
  {
    title: "Users",
    icon: Users,
    permission: 'user_management' as const,
    items: [
      { 
        title: "All Users", 
        href: ROUTE_PATHS.ADMIN_USERS,
        permission: 'user_management' as const,
      },
      { 
        title: "Cashiers", 
        href: ROUTE_PATHS.ADMIN_CASHIERS,
        permission: 'user_management' as const,
      },
      { 
        title: "Managers", 
        href: ROUTE_PATHS.ADMIN_MANAGERS,
        permission: 'user_management' as const,
      },
    ],
  },
  {
    title: "Orders",
    icon: ShoppingCart,
    href: ROUTE_PATHS.ADMIN_ORDER_MANAGEMENT,
    permission: 'order_management' as const,
  },
  {
    title: "Expenses",
    icon: DollarSign,
    href: ROUTE_PATHS.ADMIN_EXPENSES,
    permission: 'expenses' as const,
  },
  {
    title: "Customers",
    icon: Users,
    href: ROUTE_PATHS.ADMIN_CUSTOMERS,
    permission: 'user_management' as const,
  },
  {
    title: "Reports",
    icon: FileText,
    href: ROUTE_PATHS.ADMIN_REPORTS,
    permission: 'reports' as const,
  },
  {
    title: "Add-ons",
    icon: Package,
    href: ROUTE_PATHS.ADMIN_ADDONS,
    permission: 'recipe_management' as const,
  },
];

export function AdminMainMenu() {
  const location = useLocation();
  const { hasPermission } = useRolePermissions();
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

  const isActiveSectionItem = (items: { href: string; permission?: keyof import('@/types/rolePermissions').RolePermissions }[]) => {
    return items.some(item => 
      hasPermission(item.permission || 'dashboard') && isActiveLink(item.href)
    );
  };

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter(item => {
    // Always show dashboard if user has dashboard permission
    if (item.title === "Dashboard" && hasPermission('dashboard')) {
      return true;
    }
    
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    if (item.items) {
      // Show section if user has access to at least one sub-item
      return item.items.some(subItem => 
        hasPermission(subItem.permission || 'dashboard')
      );
    }
    return hasPermission(item.permission || 'dashboard');
  });

  return (
    <nav className="space-y-2">
      {visibleMenuItems.map((item) => {
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
                {item.items
                  .filter(subItem => hasPermission(subItem.permission || 'dashboard'))
                  .map((subItem) => (
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
