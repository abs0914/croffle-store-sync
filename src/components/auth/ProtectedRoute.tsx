
import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkRouteAccess, debugRouteAccess, getRouteAccessDescription, ROUTE_PATHS } from '@/contexts/auth/role-utils';

// Cache for route access decisions to prevent repeated calculations
const routeAccessCache = new Map<string, { decision: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
  requireStoreAccess?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  allowedRoles, 
  fallbackPath = ROUTE_PATHS.DASHBOARD,
  requireStoreAccess = false
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-croffle-accent"></div>
      </div>
    );
  }

  // Redirect to login page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Memoized access checks with caching
  const { roleAccess, storeAccess } = useMemo(() => {
    if (!user?.role) return { roleAccess: false, storeAccess: false };
    
    const currentPath = window.location.pathname;
    const cacheKey = `${user.id}-${currentPath}-${requiredRole}-${allowedRoles?.join(',')}-${requireStoreAccess}`;
    
    // Check cache
    const cached = routeAccessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return { roleAccess: cached.decision, storeAccess: cached.decision };
    }
    
    // Check role-based access
    let hasRoleAccess = false;
    
    // If specific allowed roles are provided, check against them
    if (allowedRoles && allowedRoles.length > 0) {
      hasRoleAccess = allowedRoles.includes(user.role);
    }
    // If a required role is specified, check role hierarchy
    else if (requiredRole) {
      const roleHierarchy: Record<UserRole, number> = {
        admin: 7,
        owner: 6,
        commissary_user: 5,
        stock_user: 4,
        manager: 3,
        production_user: 2,
        cashier: 1
      };
      hasRoleAccess = roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    }
    // Check route-based access using current path
    else {
      hasRoleAccess = checkRouteAccess(user.role, currentPath);
    }
    
    // Check store access if required
    let hasStoreAccess = true;
    if (requireStoreAccess) {
      // Admin and owner have access to all stores
      if (user.role === 'admin' || user.role === 'owner') {
        hasStoreAccess = true;
      } else {
        // For other roles, check if they have at least one store assigned
        hasStoreAccess = !!(user.storeIds && user.storeIds.length > 0);
      }
    }
    
    const finalDecision = hasRoleAccess && hasStoreAccess;
    
    // Cache the decision
    routeAccessCache.set(cacheKey, {
      decision: finalDecision,
      timestamp: Date.now()
    });
    
    return { roleAccess: hasRoleAccess, storeAccess: hasStoreAccess };
  }, [user?.id, user?.role, user?.storeIds, requiredRole, allowedRoles, requireStoreAccess]);

  const currentPath = window.location.pathname;

  // Show access denied page if user doesn't have permission
  if (!roleAccess || !storeAccess) {
    const accessDescription = getRouteAccessDescription(currentPath);
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 max-w-md">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="text-sm text-gray-500 mt-4 space-y-1">
            <div>Your role: <span className="font-medium capitalize">{user?.role}</span></div>
            <div>Required access: <span className="font-medium">{accessDescription}</span></div>
          </div>
          {requireStoreAccess && (!user?.storeIds || user.storeIds.length === 0) && (
            <div className="text-sm text-red-500 mt-2">
              No store access assigned. Please contact your administrator.
            </div>
          )}
          {!roleAccess && (
            <div className="text-sm text-red-500 mt-2">
              Insufficient role permissions for this route.
            </div>
          )}
        </div>
        <Button asChild variant="outline">
          <Link to={fallbackPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  // Render the protected content
  return <>{children}</>;
}
