
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  ChefHat, 
  Users, 
  BarChart3, 
  UserCheck,
  Truck,
  Upload,
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
    name: 'Stores',
    href: '/admin/stores',
    icon: Store,
  },
  {
    name: 'Recipes',
    href: '/admin/recipes',
    icon: ChefHat,
  },
  {
    name: 'Customers',
    href: '/admin/customers',
    icon: Users,
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Order Management',
    href: '/admin/order-management',
    icon: Truck,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: UserCheck,
  },
  {
    name: 'Managers',
    href: '/admin/managers',
    icon: UserCheck,
  },
  {
    name: 'Cashiers',
    href: '/admin/cashiers',
    icon: UserCheck,
  },
  {
    name: 'Bulk Upload',
    href: '/admin/bulk-upload',
    icon: Upload,
  },
  {
    name: 'Reports',
    href: '/admin/reports',
    icon: BarChart3,
  },
];

export const AdminMainMenu: React.FC = () => {
  return (
    <nav className="space-y-1 px-3">
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
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
