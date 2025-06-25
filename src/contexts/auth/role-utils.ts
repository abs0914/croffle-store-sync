import { UserRole } from '@/types';

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  staff: 1,
  cashier: 2,
  manager: 3,
  owner: 4,
  admin: 5,
};

// Check if user has required permission level
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Check if user can access a specific store
export function canAccessStore(userRole: UserRole, userStoreIds: string[], storeId: string): boolean {
  // Admin and owner can access all stores
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  // Other roles need explicit store access
  return userStoreIds.includes(storeId);
}

// Get user's display name based on role
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    staff: 'Staff',
    cashier: 'Cashier',
    manager: 'Manager',
    owner: 'Owner',
    admin: 'Administrator',
  };
  
  return roleNames[role] || role;
}

// Get allowed routes based on user role
export function getAllowedRoutes(role: UserRole): string[] {
  const routePermissions: Record<UserRole, string[]> = {
    staff: ['/dashboard', '/pos'],
    cashier: ['/dashboard', '/pos', '/customers'],
    manager: [
      '/dashboard',
      '/pos',
      '/product-catalog',
      '/stock-orders',
      '/inventory',
      '/order-management',
      '/customers',
      '/reports',
      '/settings'
    ],
    owner: [],
    admin: [],
  };

  return routePermissions[role] || [];
}

// Check if user can perform specific actions
export function canPerformAction(userRole: UserRole, action: string): boolean {
  const actionPermissions: Record<string, UserRole[]> = {
    'manage_products': ['manager', 'owner', 'admin'],
    'view_reports': ['manager', 'owner', 'admin'],
    'manage_users': ['owner', 'admin'],
    'manage_stores': ['owner', 'admin'],
    'process_transactions': ['cashier', 'manager', 'owner', 'admin'],
    'manage_inventory': ['manager', 'owner', 'admin'],
    'manage_orders': ['manager', 'owner', 'admin'],
  };

  const allowedRoles = actionPermissions[action] || [];
  return allowedRoles.includes(userRole);
}
