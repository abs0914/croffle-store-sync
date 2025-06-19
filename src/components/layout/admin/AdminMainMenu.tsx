
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
  ShoppingCart,
  Warehouse,
  Factory
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    name: 'Admin Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'Stores Management',
    href: '/admin/stores',
    icon: Store,
  },
  {
    name: 'Recipe Management',
    href: '/admin/recipes',
    icon: ChefHat,
  },
  {
    name: 'Commissary Inventory',
    href: '/admin/commissary-inventory',
    icon: Warehouse,
  },
  {
    name: 'Production Management',
    href: '/admin/production-management',
    icon: Factory,
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
                ? 'bg-croffle-accent text-white'
                : 'text-black hover:bg-croffle-accent/80 hover:text-white'
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
