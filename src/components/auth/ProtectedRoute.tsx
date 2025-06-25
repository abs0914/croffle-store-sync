
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/SimplifiedAuthProvider';
import { useSafeStore } from '@/hooks/useSafeStore';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import { UserRole } from '@/types';
import { authDebugger } from '@/utils/authDebug';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requireStoreAccess?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  requireStoreAccess = false 
}: ProtectedRouteProps) {
  const { user, isLoading: authLoading, isAuthenticated, hasPermission, hasStoreAccess } = useAuth();
  const { currentStore, isLoading: storeLoading, error: storeError } = useSafeStore();
  const location = useLocation();
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  useEffect(() => {
    console.log('🛡️ ProtectedRoute check', {
      pathname: location.pathname,
      authLoading,
      storeLoading,
      isAuthenticated,
      hasUser: !!user,
      hasCurrentStore: !!currentStore,
      requiredRole,
      requireStoreAccess,
      userRole: user?.role,
      userStoreIds: user?.storeIds
    });
    
    authDebugger.log('ProtectedRoute check', {
      pathname: location.pathname,
      authLoading,
      storeLoading,
      isAuthenticated,
      hasUser: !!user,
      hasCurrentStore: !!currentStore,
      requiredRole,
      requireStoreAccess,
      userRole: user?.role,
      userStoreIds: user?.storeIds
    });

    // Reduced timeout to 1 second for faster error display
    const timeout = setTimeout(() => {
      if (authLoading) {
        console.log('🛡️ ProtectedRoute loading timeout reached');
        authDebugger.log('ProtectedRoute loading timeout reached', {
          authLoading,
          storeLoading,
          requireStoreAccess
        }, 'warning');
        setShowTimeoutError(true);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [authLoading, storeLoading, isAuthenticated, user, currentStore, location.pathname, requiredRole, requireStoreAccess]);

  // Show timeout error if loading takes too long
  if (showTimeoutError) {
    console.log('🛡️ Showing timeout error');
    authDebugger.log('Showing timeout error', {}, 'error');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Loading Timeout</h2>
          <p className="text-gray-600 mb-4">
            The application is taking longer than expected to load.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
          >
            Reload Page
          </button>
          <button 
            onClick={() => {
              setShowTimeoutError(false);
              // Force clear loading states
              window.location.href = '/login';
            }} 
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication - with 1 second timeout
  if (authLoading) {
    console.log('🛡️ ProtectedRoute showing auth loading');
    return <LoadingFallback message="Authenticating..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🛡️ Redirecting to login - not authenticated');
    authDebugger.log('Redirecting to login - not authenticated');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based permissions
  if (requiredRole && !hasPermission(requiredRole)) {
    console.log('🛡️ Access denied - insufficient role', { 
      userRole: user?.role, 
      requiredRole 
    });
    authDebugger.log('Access denied - insufficient role', { 
      userRole: user?.role, 
      requiredRole 
    }, 'warning');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required role: {requiredRole} | Your role: {user?.role}
          </p>
        </div>
      </div>
    );
  }

  // Make store loading optional - don't block dashboard access
  if (requireStoreAccess && storeLoading) {
    console.log('🛡️ Store loading, showing brief loading');
    // Only show brief loading, don't block indefinitely
    return <LoadingFallback message="Loading store information..." />;
  }

  // Check store-specific access only if store is available
  if (requireStoreAccess && currentStore && !hasStoreAccess(currentStore.id)) {
    console.log('🛡️ Access denied - no store access', { 
      storeId: currentStore.id, 
      storeName: currentStore.name 
    });
    authDebugger.log('Access denied - no store access', { 
      storeId: currentStore.id, 
      storeName: currentStore.name 
    }, 'warning');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Store Access Required</h2>
          <p className="text-gray-600">You don't have access to this store.</p>
          <p className="text-sm text-gray-500 mt-2">
            Store: {currentStore.name}
          </p>
        </div>
      </div>
    );
  }

  // Allow access even if no store is available (make store loading optional)
  if (requireStoreAccess && !currentStore && !storeLoading) {
    console.log('🛡️ No store available but allowing access');
    authDebugger.log('No store available but allowing access', {}, 'info');
    // Don't block access - let the component handle the no-store case
  }

  console.log('🛡️ ProtectedRoute - access granted', { 
    pathname: location.pathname 
  });
  authDebugger.log('ProtectedRoute - access granted', { 
    pathname: location.pathname 
  });

  return <>{children}</>;
}
