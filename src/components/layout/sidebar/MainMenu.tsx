
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Package2,
  Factory,
  Truck,
  ClipboardList,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';

interface MenuItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ to, icon, label, isActive, badge }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50",
      isActive && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
    )}
  >
    {icon}
    <span>{label}</span>
    {badge && (
      <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
        {badge}
      </span>
    )}
  </Link>
);

export const MainMenu: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
  const isManagerOrAbove = isAdminOrOwner || user?.role === 'manager';

  const menuItems = [
    {
      to: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: 'Dashboard',
    },
    {
      to: '/pos',
      icon: <ShoppingCart className="h-4 w-4" />,
      label: 'Point of Sale',
    },
    {
      to: '/product-catalog',
      icon: <ShoppingBag className="h-4 w-4" />,
      label: 'Product Catalog',
    },
    {
      to: '/stock-orders',
      icon: <ClipboardList className="h-4 w-4" />,
      label: 'Stock Orders',
      managerOnly: true,
    },
    {
      to: '/production-management',
      icon: <Factory className="h-4 w-4" />,
      label: 'Production Management',
      managerOnly: true,
    },
    {
      to: '/inventory',
      icon: <Package2 className="h-4 w-4" />,
      label: 'Store Inventory',
      managerOnly: true,
    },
    {
      to: '/order-management',
      icon: <Truck className="h-4 w-4" />,
      label: 'Order Management',
      managerOnly: true,
    },
    {
      to: '/reports',
      icon: <BarChart3 className="h-4 w-4" />,
      label: 'Reports',
      managerOnly: true,
    },
    {
      to: '/settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
    },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdminOrOwner) return false;
    if (item.managerOnly && !isManagerOrAbove) return false;
    return true;
  });

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {filteredMenuItems.map((item) => (
        <MenuItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          isActive={location.pathname.startsWith(item.to)}
        />
      ))}
    </nav>
  );
};
