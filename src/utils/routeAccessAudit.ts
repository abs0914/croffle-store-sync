
import { UserRole } from '@/types';
import { ROUTE_PATHS, checkRouteAccess } from '@/contexts/auth/role-utils';

interface RouteAccessTest {
  route: string;
  description: string;
  allowedRoles: UserRole[];
  requiresStoreAccess: boolean;
}

/**
 * Comprehensive route access audit for debugging and documentation
 */
export const auditRouteAccess = () => {
  const routes: RouteAccessTest[] = [
    {
      route: ROUTE_PATHS.DASHBOARD,
      description: 'Main dashboard - accessible to all authenticated users',
      allowedRoles: ['admin', 'owner', 'manager', 'cashier'],
      requiresStoreAccess: false
    },
    {
      route: ROUTE_PATHS.POS,
      description: 'Point of Sale - accessible to all with store access',
      allowedRoles: ['admin', 'owner', 'manager', 'cashier'],
      requiresStoreAccess: true
    },
    {
      route: ROUTE_PATHS.PRODUCTS,
      description: 'Product management - accessible to all with store access',
      allowedRoles: ['admin', 'owner', 'manager', 'cashier'],
      requiresStoreAccess: true
    },
    {
      route: ROUTE_PATHS.CUSTOMERS,
      description: 'Customer management - accessible to all with store access',
      allowedRoles: ['admin', 'owner', 'manager', 'cashier'],
      requiresStoreAccess: true
    },
    {
      route: ROUTE_PATHS.REPORTS,
      description: 'Reports - accessible to managers and above with store access',
      allowedRoles: ['admin', 'owner', 'manager'],
      requiresStoreAccess: true
    },
    {
      route: ROUTE_PATHS.ORDER_MANAGEMENT,
      description: 'Order management - accessible to managers and above with store access',
      allowedRoles: ['admin', 'owner', 'manager'],
      requiresStoreAccess: true
    },
    {
      route: ROUTE_PATHS.SETTINGS,
      description: 'Settings - accessible to all authenticated users (role-specific tabs)',
      allowedRoles: ['admin', 'owner', 'manager', 'cashier'],
      requiresStoreAccess: false
    },
    {
      route: ROUTE_PATHS.INVENTORY,
      description: 'Store inventory - accessible to managers and above with store access',
      allowedRoles: ['admin', 'owner', 'manager'],
      requiresStoreAccess: true
    },
    {
      route: ROUTE_PATHS.ADMIN_PRODUCTION,
      description: 'Production management - accessible to owners and admins only',
      allowedRoles: ['admin', 'owner'],
      requiresStoreAccess: false
    },
    {
      route: ROUTE_PATHS.ADMIN_COMMISSARY,
      description: 'Commissary inventory - accessible to owners and admins only',
      allowedRoles: ['admin', 'owner'],
      requiresStoreAccess: false
    },
    {
      route: ROUTE_PATHS.STOCK_ORDERS,
      description: 'Stock orders - accessible to managers and above with store access',
      allowedRoles: ['admin', 'owner', 'manager'],
      requiresStoreAccess: true
    }
  ];

  return routes;
};

/**
 * Test route access for a specific user role and store access
 */
export const testUserRouteAccess = (userRole: UserRole, storeIds: string[]) => {
  const routes = auditRouteAccess();
  const accessibleRoutes: string[] = [];

  routes.forEach(route => {
    const hasRoleAccess = route.allowedRoles.includes(userRole);
    const hasStoreAccess = !route.requiresStoreAccess || storeIds.length > 0;
    
    if (hasRoleAccess && hasStoreAccess) {
      accessibleRoutes.push(route.route);
    }
  });

  return accessibleRoutes;
};

/**
 * Log comprehensive audit results
 */
export const logAuditResults = (routes: RouteAccessTest[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.group('🔐 Route Access Audit Results');
    routes.forEach(route => {
      console.log(`${route.route}: ${route.description}`);
      console.log(`  Allowed roles: ${route.allowedRoles.join(', ')}`);
      console.log(`  Requires store access: ${route.requiresStoreAccess}`);
    });
    console.groupEnd();
  }
};

/**
 * Validate route access configuration
 */
export const validateRouteAccess = () => {
  const routes = auditRouteAccess();
  const errors: string[] = [];

  routes.forEach(route => {
    // Check if route exists in ROUTE_PATHS
    const routeExists = Object.values(ROUTE_PATHS).includes(route.route as any);
    if (!routeExists) {
      errors.push(`Route ${route.route} not found in ROUTE_PATHS`);
    }

    // Check if allowed roles are valid
    const validRoles: UserRole[] = ['admin', 'owner', 'manager', 'cashier'];
    route.allowedRoles.forEach(role => {
      if (!validRoles.includes(role)) {
        errors.push(`Invalid role ${role} for route ${route.route}`);
      }
    });
  });

  if (errors.length > 0) {
    console.error('🚨 Route Access Configuration Errors:', errors);
  }

  return errors;
};
