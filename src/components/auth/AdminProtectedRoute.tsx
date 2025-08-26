
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  fallbackPath?: string;
}

export function AdminProtectedRoute({ 
  children, 
  fallbackPath = '/dashboard' 
}: AdminProtectedRouteProps) {
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

  // Check if user has admin role specifically
  const hasAdminAccess = user?.role === 'admin';

  // Show access denied page if user doesn't have admin permission
  if (!hasAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Admin Access Required</h2>
          <p className="text-gray-600 max-w-md">
            This area is restricted to administrators only. Please contact your system administrator if you need access.
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

  // Render the protected admin content
  return <>{children}</>;
}
