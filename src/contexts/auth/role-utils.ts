
import { UserRole } from "@/types";

/**
 * Maps a user email to a role (temporary solution, to be replaced with database roles)
 */
export const mapUserRole = (email: string): UserRole => {
  if (email === 'admin@example.com') return 'admin';
  if (email === 'owner@example.com') return 'owner';
  if (email.includes('manager') || email === 'rbsons.north.manager@croffle.com') return 'manager';
  if (email === 'marasabaras@croffle.com' || email === 'robinsons.north@croffle.com') return 'cashier';
  return 'cashier'; // Default role
};

/**
 * Checks if a user has permission based on role hierarchy
 */
export const checkPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    owner: 3,
    manager: 2,
    cashier: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Check if a user has access to a specific route based on their role
 */
export const checkRouteAccess = (userRole: UserRole | undefined, route: string): boolean => {
  if (!userRole) return false;
  
  // Admin and owner have access to everything
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  // Define allowed routes for each role
  const roleRoutes: Record<UserRole, string[]> = {
    admin: [], // Admin gets everything, handled above
    owner: [], // Owner gets everything, handled above
    manager: [
      '/dashboard',
      '/pos',
      '/customers',
      '/reports',
      '/order-management',
      '/settings' // Limited settings access
    ],
    cashier: [
      '/dashboard',
      '/pos',
      '/customers'
    ]
  };
  
  const allowedRoutes = roleRoutes[userRole] || [];
  
  // Check if the route starts with any allowed route pattern
  return allowedRoutes.some(allowedRoute => 
    route === allowedRoute || route.startsWith(allowedRoute + '/')
  );
};

/**
 * Check if a user can access admin panel
 */
export const canAccessAdminPanel = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner';
};

/**
 * Check if a user can access production management
 */
export const canAccessProduction = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner' || userRole === 'manager';
};

/**
 * Check if a user can access inventory management
 */
export const canAccessInventory = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner' || userRole === 'manager';
};

/**
 * Checks if a user has access to a specific store
 * Admin and owner users have access to all stores
 */
export const checkStoreAccess = (userStoreIds: string[] | undefined, storeId: string, userRole?: UserRole): boolean => {
  // Admin and owner users have access to all stores
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  if (!userStoreIds) return false;
  return userStoreIds.includes(storeId);
};
