
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { auditRouteAccess, logAuditResults, testUserRouteAccess } from '@/utils/routeAccessAudit';

/**
 * Hook to audit route access and provide debugging information
 */
export const useRouteAccessAudit = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Run comprehensive audit on mount
      const auditResults = auditRouteAccess();
      logAuditResults(auditResults);

      // Log current user's accessible routes
      if (user?.role) {
        const accessibleRoutes = testUserRouteAccess(user.role, user.storeIds || []);
        console.group(`🔐 Routes accessible to ${user.role}`);
        accessibleRoutes.forEach(route => console.log(`✅ ${route}`));
        console.groupEnd();
      }
    }
  }, [user]);

  return {
    runAudit: auditRouteAccess,
    getUserAccessibleRoutes: (role: string, storeIds: string[]) => 
      testUserRouteAccess(role as any, storeIds)
  };
};
