
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/SimplifiedAuthProvider';
import { useStore } from '@/contexts/StoreContext';
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
  const { currentStore, isLoading: storeLoading, error: storeError } = useStore();
  const location = useLocation();
  const [showTimeoutError, setShowTimeoutError] = useState(false);

  useEffect(() => {
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

    // Set a reasonable timeout for loading
    const timeout = setTimeout(() => {
      if (authLoading && !isAuthenticated) {
        authDebugger.log('Auth loading timeout reached', {}, 'warning');
        setShowTimeoutError(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [authLoading, storeLoading, isAuthenticated, user, currentStore, location.pathname, requiredRole, requireStoreAccess]);

  // Show timeout error if loading takes too long
  if (showTimeoutError) {
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
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show store error if there's an issue loading stores
  if (storeError && requireStoreAccess) {
    authDebugger.log('Showing store error', { storeError }, 'error');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Store Access Error</h2>
          <p className="text-gray-600 mb-4">
            Unable to load store information: {storeError}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (authLoading) {
    return <LoadingFallback message="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    authDebugger.log('Redirecting to login - not authenticated');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based permissions
  if (requiredRole && !hasPermission(requiredRole)) {
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

  // Show loading while checking store access (but only briefly)
  if (requireStoreAccess && storeLoading) {
    return <LoadingFallback message="Loading store information..." />;
  }

  // Check store-specific access
  if (requireStoreAccess && currentStore && !hasStoreAccess(currentStore.id)) {
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

  // Show message if store access is required but no store is available
  if (requireStoreAccess && !currentStore && !storeLoading) {
    authDebugger.log('No store available for store-required route', {}, 'warning');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Store Access</h2>
          <p className="text-gray-600">No store is currently available for your account.</p>
          <p className="text-sm text-gray-500 mt-2">
            Please contact your administrator to assign you to a store.
          </p>
        </div>
      </div>
    );
  }

  authDebugger.log('ProtectedRoute - access granted', { 
    pathname: location.pathname 
  });

  return <>{children}</>;
}
