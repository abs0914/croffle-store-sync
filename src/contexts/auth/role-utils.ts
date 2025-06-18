
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
 * Route constants for better maintainability
 */
export const ROUTE_PATHS = {
  DASHBOARD: '/dashboard',
  POS: '/pos',
  PRODUCT_CATALOG: '/product-catalog',
  CUSTOMERS: '/customers',
  REPORTS: '/reports',
  ORDER_MANAGEMENT: '/order-management',
  SETTINGS: '/settings',
  INVENTORY: '/inventory',
  PRODUCTION: '/production',
  COMMISSARY_INVENTORY: '/commissary-inventory',
  BULK_UPLOAD: '/bulk-upload',
  INVENTORY_CONVERSION: '/inventory-conversion'
} as const;

/**
 * Check if a user has access to a specific route based on their role
 */
export const checkRouteAccess = (userRole: UserRole | undefined, route: string): boolean => {
  if (!userRole) return false;
  
  // Admin and owner have access to everything
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  // Define allowed routes for each role with detailed access control
  const roleRoutes: Record<UserRole, string[]> = {
    admin: [], // Admin gets everything, handled above
    owner: [], // Owner gets everything, handled above
    manager: [
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.POS,
      ROUTE_PATHS.PRODUCT_CATALOG, // Managers can manage product offerings
      ROUTE_PATHS.CUSTOMERS,
      ROUTE_PATHS.REPORTS,
      ROUTE_PATHS.ORDER_MANAGEMENT, // Managers can access order management for purchasing finished goods
      ROUTE_PATHS.SETTINGS, // Limited settings access
      ROUTE_PATHS.INVENTORY, // Managers can access inventory management
      ROUTE_PATHS.INVENTORY_CONVERSION // Managers can handle inventory conversions
    ],
    cashier: [
      ROUTE_PATHS.DASHBOARD, // Dashboard access for basic overview
      ROUTE_PATHS.POS, // Primary function - Point of Sale
      ROUTE_PATHS.PRODUCT_CATALOG, // Cashiers need to see available products for POS
      ROUTE_PATHS.CUSTOMERS // Customer management for transactions
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
 * Check if a user can access production management (commissary operations)
 */
export const canAccessProduction = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner';
};

/**
 * Check if a user can access inventory management
 */
export const canAccessInventory = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner' || userRole === 'manager';
};

/**
 * Check if a user can access commissary inventory (admin-only)
 */
export const canAccessCommissary = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner';
};

/**
 * Check if a user can access recipe management (admin-only)
 */
export const canAccessRecipeManagement = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner';
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

/**
 * Get route access level description for documentation
 */
export const getRouteAccessDescription = (route: string): string => {
  const accessMap: Record<string, string> = {
    [ROUTE_PATHS.DASHBOARD]: 'All authenticated users',
    [ROUTE_PATHS.POS]: 'All authenticated users with store access',
    [ROUTE_PATHS.PRODUCT_CATALOG]: 'All authenticated users with store access',
    [ROUTE_PATHS.CUSTOMERS]: 'All authenticated users with store access',
    [ROUTE_PATHS.REPORTS]: 'Managers and above with store access',
    [ROUTE_PATHS.ORDER_MANAGEMENT]: 'Managers and above with store access',
    [ROUTE_PATHS.SETTINGS]: 'Managers and above',
    [ROUTE_PATHS.INVENTORY]: 'Managers and above with store access',
    [ROUTE_PATHS.PRODUCTION]: 'Owners and admins only',
    [ROUTE_PATHS.COMMISSARY_INVENTORY]: 'Owners and admins only',
    [ROUTE_PATHS.BULK_UPLOAD]: 'Managers and above',
    [ROUTE_PATHS.INVENTORY_CONVERSION]: 'Managers and above with store access'
  };
  
  return accessMap[route] || 'Access level not defined';
};

/**
 * Debug function to log access decisions
 */
export const debugRouteAccess = (userRole: UserRole | undefined, route: string, hasStoreAccess: boolean): void => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔐 Route Access Check: ${route}`);
    console.log(`User Role: ${userRole || 'undefined'}`);
    console.log(`Has Store Access: ${hasStoreAccess}`);
    console.log(`Route Access: ${checkRouteAccess(userRole, route)}`);
    console.log(`Access Description: ${getRouteAccessDescription(route)}`);
    console.groupEnd();
  }
};
