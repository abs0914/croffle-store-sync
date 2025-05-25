import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  allowedRoles, 
  fallbackPath = '/dashboard' 
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  const hasAccess = () => {
    if (!user?.role) return false;
    
    // If specific allowed roles are provided, check against them
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(user.role);
    }
    
    // If a required role is specified, check role hierarchy
    if (requiredRole) {
      const roleHierarchy: Record<UserRole, number> = {
        admin: 4,
        owner: 3,
        manager: 2,
        cashier: 1
      };
      
      return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    }
    
    // If no specific requirements, allow access
    return true;
  };

  // Show access denied page if user doesn't have permission
  if (!hasAccess()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 max-w-md">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <div className="text-sm text-gray-500 mt-2">
            Your role: <span className="font-medium capitalize">{user?.role}</span>
          </div>
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
