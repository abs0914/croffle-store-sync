
import { UserRole } from "@/types";

/**
 * SECURITY FIX: Removed insecure email pattern-based role assignment
 * Roles are now managed exclusively through the database app_users table
 * This function now returns a default role and logs security events
 */
export const mapUserRole = (email: string): UserRole => {
  // Log potential security bypass attempt
  if (process.env.NODE_ENV === 'development') {
    console.warn('🚨 SECURITY: mapUserRole called - roles should be managed via database only');
  }
  
  // Return default role - all role assignment must happen through database
  return 'cashier';
};

/**
 * Checks if a user has permission based on role hierarchy
 */
export const checkPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 7,
    owner: 6,
    commissary_user: 5,
    stock_user: 4,
    manager: 3,
    production_user: 2,
    cashier: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Route constants for better maintainability - OPTIMIZED STRUCTURE
 */
export const ROUTE_PATHS = {
  // Core Routes
  ROOT: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  
  // Store-Level Routes (Role-based access)
  POS: '/pos',
  INVOICE: '/invoice', // Invoice page for completed transactions
  PRODUCTS: '/products', // Unified product management for stores
  INVENTORY: '/inventory', // Store inventory management
  ORDER_MANAGEMENT: '/order-management', // Store order management
  CUSTOMERS: '/customers',
  EXPENSES: '/expenses',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  STOCK_ORDERS: '/stock-orders',
  
  // Admin-Only Routes (Clear separation)
  ADMIN_ROOT: '/admin',
  ADMIN_STORES: '/admin/stores',
  ADMIN_RECIPES: '/admin/recipes', // Recipe management (admin only)
  ADMIN_COMMISSARY: '/admin/commissary-inventory', // Commissary management
  ADMIN_PRODUCTION: '/admin/production-management',
  ADMIN_ORDER_MANAGEMENT: '/admin/order-management',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_USERS: '/admin/users',
  ADMIN_MANAGERS: '/admin/managers',
  ADMIN_CASHIERS: '/admin/cashiers',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_EXPENSES: '/admin/expenses',
  ADMIN_ADDONS: '/admin/add-ons',
  SM_ACCREDITATION_TESTING: '/sm-accreditation-testing'
} as const;

/**
 * Define clear role-based route access
 */
const STORE_ROUTES = [
  ROUTE_PATHS.DASHBOARD,
  ROUTE_PATHS.POS,
  ROUTE_PATHS.INVOICE,
  ROUTE_PATHS.PRODUCTS,
  ROUTE_PATHS.INVENTORY,
  ROUTE_PATHS.ORDER_MANAGEMENT,
  ROUTE_PATHS.CUSTOMERS,
  ROUTE_PATHS.EXPENSES,
  ROUTE_PATHS.REPORTS,
  ROUTE_PATHS.SETTINGS,
  ROUTE_PATHS.STOCK_ORDERS
];

const ADMIN_ROUTES = [
  ROUTE_PATHS.ADMIN_ROOT,
  ROUTE_PATHS.ADMIN_STORES,
  ROUTE_PATHS.ADMIN_RECIPES,
  ROUTE_PATHS.ADMIN_COMMISSARY,
  ROUTE_PATHS.ADMIN_PRODUCTION,
  ROUTE_PATHS.ADMIN_ORDER_MANAGEMENT,
  ROUTE_PATHS.ADMIN_CUSTOMERS,
  ROUTE_PATHS.ADMIN_USERS,
  ROUTE_PATHS.ADMIN_MANAGERS,
  ROUTE_PATHS.ADMIN_CASHIERS,
  ROUTE_PATHS.ADMIN_REPORTS,
  ROUTE_PATHS.ADMIN_EXPENSES,
  ROUTE_PATHS.ADMIN_ADDONS,
  ROUTE_PATHS.SM_ACCREDITATION_TESTING
];

/**
 * Check if a user has access to a specific route based on their role
 */
export const checkRouteAccess = (userRole: UserRole | undefined, route: string | undefined): boolean => {
  if (!userRole || !route) return false;
  
  // Admin and owner have access to everything
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }
  
  // Root route accessible to all authenticated users
  if (route === ROUTE_PATHS.ROOT || route === ROUTE_PATHS.LOGIN) {
    return true;
  }
  
  // Check admin routes - only admin/owner
  if (ADMIN_ROUTES.some(adminRoute => route.startsWith(adminRoute))) {
    return false; // Fixed: non-admin users cannot access admin routes
  }
  
  // Define role-specific access for store routes
  const roleRoutes: Record<UserRole, string[]> = {
    admin: [...STORE_ROUTES, ...ADMIN_ROUTES], // Admin gets everything
    owner: [...STORE_ROUTES, ...ADMIN_ROUTES], // Owner gets everything
    commissary_user: [
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.ADMIN_COMMISSARY,
      ROUTE_PATHS.ADMIN_PRODUCTION,
      ROUTE_PATHS.ADMIN_ORDER_MANAGEMENT
    ],
    stock_user: [
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.INVENTORY,
      ROUTE_PATHS.ORDER_MANAGEMENT,
      ROUTE_PATHS.EXPENSES,
      ROUTE_PATHS.STOCK_ORDERS
    ],
    production_user: [
      ROUTE_PATHS.DASHBOARD
    ],
    manager: [
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.POS,
      ROUTE_PATHS.INVOICE,
      ROUTE_PATHS.PRODUCTS,
      ROUTE_PATHS.INVENTORY,
      ROUTE_PATHS.ORDER_MANAGEMENT,
      ROUTE_PATHS.CUSTOMERS,
      ROUTE_PATHS.EXPENSES,
      ROUTE_PATHS.REPORTS,
      ROUTE_PATHS.SETTINGS,
      ROUTE_PATHS.STOCK_ORDERS
    ],
    cashier: [
      ROUTE_PATHS.DASHBOARD,
      ROUTE_PATHS.POS,
      ROUTE_PATHS.INVOICE,
      ROUTE_PATHS.PRODUCTS,
      ROUTE_PATHS.CUSTOMERS,
      ROUTE_PATHS.EXPENSES,
      ROUTE_PATHS.REPORTS
    ]
  };
  
  const allowedRoutes = roleRoutes[userRole] || [];
  
  // Check if the route starts with any allowed route pattern
  return allowedRoutes.some(allowedRoute => 
    route === allowedRoute || route.startsWith(allowedRoute + '/')
  );
};

/**
 * Check if a user can access admin panel (updated with new permissions)
 */
export const canAccessAdminPanel = (userRole: UserRole | undefined): boolean => {
  if (!userRole) return false;
  
  // Define roles that can access admin panel (avoiding circular dependency)
  const adminRoles: UserRole[] = ['admin', 'owner', 'manager', 'stock_user', 'production_user', 'commissary_user'];
  return adminRoles.includes(userRole);
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
 * Check if a user can access commissary inventory (updated with new permissions)
 */
export const canAccessCommissary = (userRole: UserRole | undefined): boolean => {
  if (!userRole) return false;
  
  // Define roles that can access commissary inventory
  const commissaryRoles: UserRole[] = ['admin', 'owner', 'stock_user', 'production_user', 'commissary_user'];
  return commissaryRoles.includes(userRole);
};

/**
 * Check if a user can access production management (updated with new permissions)
 */
export const canAccessProduction = (userRole: UserRole | undefined): boolean => {
  if (!userRole) return false;
  
  // Define roles that can access production management
  const productionRoles: UserRole[] = ['admin', 'owner', 'production_user', 'stock_user', 'commissary_user'];
  return productionRoles.includes(userRole);
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
    [ROUTE_PATHS.INVOICE]: 'All authenticated users with store access',
    [ROUTE_PATHS.PRODUCTS]: 'All authenticated users with store access',
    [ROUTE_PATHS.STOCK_ORDERS]: 'Managers and above with store access',
    [ROUTE_PATHS.INVENTORY]: 'Managers and above with store access',
    [ROUTE_PATHS.ORDER_MANAGEMENT]: 'Managers and above with store access',
    [ROUTE_PATHS.CUSTOMERS]: 'All authenticated users with store access',
    [ROUTE_PATHS.EXPENSES]: 'All authenticated users with store access',
    [ROUTE_PATHS.REPORTS]: 'All authenticated users with store access',
    [ROUTE_PATHS.SETTINGS]: 'Managers and above',
    [ROUTE_PATHS.ADMIN_ROOT]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_STORES]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_RECIPES]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_COMMISSARY]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_PRODUCTION]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_ORDER_MANAGEMENT]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_CUSTOMERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_USERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_MANAGERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_CASHIERS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_REPORTS]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_EXPENSES]: 'Admin and owner only',
    [ROUTE_PATHS.ADMIN_ADDONS]: 'Admin and owner only',
    [ROUTE_PATHS.SM_ACCREDITATION_TESTING]: 'Admin and owner only'
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
