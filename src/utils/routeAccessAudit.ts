
import { UserRole } from '@/types';
import { checkRouteAccess, ROUTE_PATHS, getRouteAccessDescription } from '@/contexts/auth/role-utils';

interface RouteAccessTest {
  route: string;
  role: UserRole;
  expected: boolean;
  actual: boolean;
  passed: boolean;
}

interface AccessAuditResult {
  totalTests: number;
  passed: number;
  failed: number;
  tests: RouteAccessTest[];
}

/**
 * Comprehensive route access testing for all roles and routes
 */
export const auditRouteAccess = (): AccessAuditResult => {
  const routes = Object.values(ROUTE_PATHS);
  const roles: UserRole[] = ['admin', 'owner', 'manager', 'cashier'];
  
  const tests: RouteAccessTest[] = [];
  
  // Define expected access patterns
  const expectedAccess: Record<string, UserRole[]> = {
    [ROUTE_PATHS.DASHBOARD]: ['admin', 'owner', 'manager', 'cashier'],
    [ROUTE_PATHS.POS]: ['admin', 'owner', 'manager', 'cashier'],
    [ROUTE_PATHS.PRODUCT_CATALOG]: ['admin', 'owner', 'manager', 'cashier'],
    [ROUTE_PATHS.CUSTOMERS]: ['admin', 'owner', 'manager', 'cashier'],
    [ROUTE_PATHS.REPORTS]: ['admin', 'owner', 'manager'],
    [ROUTE_PATHS.ORDER_MANAGEMENT]: ['admin', 'owner', 'manager'],
    [ROUTE_PATHS.SETTINGS]: ['admin', 'owner', 'manager'],
    [ROUTE_PATHS.INVENTORY]: ['admin', 'owner', 'manager'],
    [ROUTE_PATHS.PRODUCTION]: ['admin', 'owner'],
    [ROUTE_PATHS.COMMISSARY_INVENTORY]: ['admin', 'owner'],
    [ROUTE_PATHS.BULK_UPLOAD]: ['admin', 'owner', 'manager'],
    [ROUTE_PATHS.INVENTORY_CONVERSION]: ['admin', 'owner', 'manager']
  };
  
  // Run tests for each route and role combination
  routes.forEach(route => {
    roles.forEach(role => {
      const expected = expectedAccess[route]?.includes(role) || false;
      const actual = checkRouteAccess(role, route);
      
      tests.push({
        route,
        role,
        expected,
        actual,
        passed: expected === actual
      });
    });
  });
  
  const passed = tests.filter(test => test.passed).length;
  const failed = tests.length - passed;
  
  return {
    totalTests: tests.length,
    passed,
    failed,
    tests
  };
};

/**
 * Log audit results to console (development only)
 */
export const logAuditResults = (results: AccessAuditResult): void => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🔍 Route Access Audit Results');
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.group('❌ Failed Tests');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`${test.route} + ${test.role}: Expected ${test.expected}, Got ${test.actual}`);
      });
    console.groupEnd();
  }
  
  console.groupEnd();
};

/**
 * Generate a route access matrix for documentation
 */
export const generateAccessMatrix = (): string => {
  const routes = Object.values(ROUTE_PATHS);
  const roles: UserRole[] = ['admin', 'owner', 'manager', 'cashier'];
  
  let matrix = 'Route Access Matrix\n';
  matrix += '===================\n\n';
  matrix += 'Route'.padEnd(25) + roles.map(role => role.padEnd(10)).join('') + '\n';
  matrix += '-'.repeat(25 + roles.length * 10) + '\n';
  
  routes.forEach(route => {
    const routeName = route.replace('/', '').padEnd(25);
    const access = roles.map(role => {
      const hasAccess = checkRouteAccess(role, route);
      return (hasAccess ? '✅' : '❌').padEnd(10);
    }).join('');
    
    matrix += routeName + access + '\n';
  });
  
  matrix += '\n\nRoute Descriptions:\n';
  matrix += '==================\n';
  routes.forEach(route => {
    matrix += `${route}: ${getRouteAccessDescription(route)}\n`;
  });
  
  return matrix;
};

/**
 * Test route access for a specific user context
 */
export const testUserRouteAccess = (userRole: UserRole, userStoreIds: string[]): string[] => {
  const routes = Object.values(ROUTE_PATHS);
  const accessibleRoutes: string[] = [];
  
  routes.forEach(route => {
    if (checkRouteAccess(userRole, route)) {
      accessibleRoutes.push(route);
    }
  });
  
  return accessibleRoutes;
};
