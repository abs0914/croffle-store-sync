
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/SimplifiedAuthProvider';
import { useStore } from '@/contexts/StoreContext';
import { LoadingFallback } from '@/components/ui/LoadingFallback';
import { UserRole } from '@/types';

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
  const { user, isLoading, isAuthenticated, hasPermission, hasStoreAccess } = useAuth();
  const { currentStore } = useStore(); // Use currentStore instead of selectedStore
  const location = useLocation();

  if (isLoading) {
    return <LoadingFallback message="Verifying access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based permissions
  if (requiredRole && !hasPermission(requiredRole)) {
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

  // Check store-specific access
  if (requireStoreAccess && currentStore && !hasStoreAccess(currentStore.id)) {
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

  return <>{children}</>;
}
