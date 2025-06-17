
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  ChefHat, 
  ShoppingBag, 
  Users, 
  FileText, 
  BarChart3, 
  Settings,
  Package,
  UserCheck,
  Truck,
  Upload,
  ArrowUpDown,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Store Management',
    href: '/admin/stores',
    icon: Store,
  },
  {
    name: 'Product Management',
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Inventory Management',
    href: '/admin/inventory',
    icon: Truck,
  },
  {
    name: 'Recipe Management',
    href: '/admin/recipes',
    icon: ChefHat,
  },
  {
    name: 'Customer Management',
    href: '/admin/customers',
    icon: Users,
  },
  {
    name: 'Order Management',
    href: '/admin/order-management',
    icon: ShoppingCart,
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: UserCheck,
  },
  {
    name: 'Commissary Inventory',
    href: '/admin/commissary-inventory',
    icon: Truck,
  },
  {
    name: 'Bulk Upload',
    href: '/admin/bulk-upload',
    icon: Upload,
  },
  {
    name: 'Inventory Conversion',
    href: '/admin/inventory-conversion',
    icon: ArrowUpDown,
  },
  {
    name: 'Reports & Analytics',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    name: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export const AdminMainMenu: React.FC = () => {
  return (
    <nav className="space-y-1">
      {menuItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.href}
          end={item.href === '/admin'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )
          }
        >
          <item.icon className="h-5 w-5" />
          {item.name}
        </NavLink>
      ))}
    </nav>
  );
};
