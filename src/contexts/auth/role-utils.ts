
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
  // Main App Routes
  ROOT: '/',
  DASHBOARD: '/dashboard',
  POS: '/pos',
  PRODUCT_CATALOG: '/product-catalog',
  STOCK_ORDERS: '/stock-orders',
  INVENTORY: '/inventory',
  ORDER_MANAGEMENT: '/order-management',
  CUSTOMERS: '/customers',
  EXPENSES: '/expenses',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  // Admin Routes
  ADMIN_DASHBOARD: '/admin',
  ADMIN_STORES: '/admin/stores',
  ADMIN_RECIPES: '/admin/recipes',
  ADMIN_PRODUCT_CATALOG: '/admin/product-catalog',
  COMMISSARY_INVENTORY: '/admin/commissary-inventory',
  PRODUCTION: '/admin/production-management',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_ORDERS: '/admin/orders',
  ADMIN_ORDER_MANAGEMENT: '/admin/order-management',
  ADMIN_USERS: '/admin/users',
  ADMIN_MANAGERS: '/admin/managers',
  ADMIN_CASHIERS: '/admin/cashiers',
  ADMIN_REPORTS: '/admin/reports'
} as const;

/**
 * Check if a user has access to a specific route based on their role
 */
export const checkRouteAccess = (userRole: UserRole | undefined, route: string | undefined): boolean => {
  if (!userRole || !route) return false;
  
  // Admin and owner have access to everything
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  // Root route should be accessible to all authenticated users (redirects to dashboard)
  if (route === ROUTE_PATHS.ROOT) {
    return true;
  }
  
  // Define allowed routes for each role with detailed access control
  const roleRoutes: Record<UserRole, string[]> = {
    admin: [], // Admin gets everything, handled above
    owner: [], // Owner gets everything, handled above
    manager: [
      ROUTE_PATHS.ROOT,
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.POS,
      ROUTE_PATHS.PRODUCT_CATALOG,
      ROUTE_PATHS.STOCK_ORDERS,
      ROUTE_PATHS.INVENTORY,
      ROUTE_PATHS.ORDER_MANAGEMENT,
      ROUTE_PATHS.CUSTOMERS,
      ROUTE_PATHS.EXPENSES,
      ROUTE_PATHS.REPORTS,
      ROUTE_PATHS.SETTINGS
    ],
    cashier: [
      ROUTE_PATHS.ROOT,
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.POS,
      ROUTE_PATHS.PRODUCT_CATALOG,
      ROUTE_PATHS.CUSTOMERS
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
 * Check if a user can access store inventory management
 */
export const canAccessStoreInventory = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner' || userRole === 'manager';
};

/**
 * Check if a user can access recipe management (admin-only)
 */
export const canAccessRecipeManagement = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner';
};

/**
 * Check if a user can access commissary inventory (admin-only)
 */
export const canAccessCommissary = (userRole: UserRole | undefined): boolean => {
  return userRole === 'admin' || userRole === 'owner';
};

/**
 * Check if a user can access production management (admin-only)
 */
export const canAccessProduction = (userRole: UserRole | undefined): boolean => {
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
    [ROUTE_PATHS.ROOT]: 'All authenticated users',
    [ROUTE_PATHS.DASHBOARD]: 'All authenticated users',
    [ROUTE_PATHS.POS]: 'All authenticated users with store access',
    [ROUTE_PATHS.PRODUCT_CATALOG]: 'All authenticated users with store access',
    [ROUTE_PATHS.STOCK_ORDERS]: 'Managers and above with store access',
    [ROUTE_PATHS.INVENTORY]: 'Managers and above with store access',
    [ROUTE_PATHS.ORDER_MANAGEMENT]: 'Managers and above with store access',
    [ROUTE_PATHS.CUSTOMERS]: 'All authenticated users with store access',
    [ROUTE_PATHS.EXPENSES]: 'Managers and above with store access',
    [ROUTE_PATHS.REPORTS]: 'Managers and above with store access',
    [ROUTE_PATHS.SETTINGS]: 'Managers and above',
    [ROUTE_PATHS.ADMIN_DASHBOARD]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_STORES]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_RECIPES]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_PRODUCT_CATALOG]: 'Admin and owner only',
    [ROUTE_PATHS.COMMISSARY_INVENTORY]: 'Admin and owner only',
    [ROUTE_PATHS.PRODUCTION]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_CUSTOMERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_ORDERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_ORDER_MANAGEMENT]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_USERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_MANAGERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_CASHIERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_REPORTS]: 'Admin and owner only'
  };
  
  return accessMap[route] || 'All authenticated users';
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
