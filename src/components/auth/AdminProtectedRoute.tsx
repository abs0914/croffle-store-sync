
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  hasAdminSectionAccess, 
  getAdminSectionFromPath, 
  hasAnyAdminAccess,
  debugAdminAccess,
  AdminSection 
} from '@/utils/adminPermissions';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  section?: AdminSection;
  fallbackPath?: string;
  // Legacy prop for backwards compatibility
  requireStrictAdmin?: boolean;
}

export function AdminProtectedRoute({ 
  children, 
  section,
  fallbackPath = '/dashboard',
  requireStrictAdmin = false
}: AdminProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log('🛡️ AdminProtectedRoute render:', {
    path: location.pathname,
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    section
  });

  // Show loading state while authentication is being checked
  if (isLoading) {
    console.log('🛡️ AdminProtectedRoute: Showing loading state');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-croffle-accent"></div>
      </div>
    );
  }

  // Redirect to login page if not authenticated
  if (!isAuthenticated) {
    console.log('🛡️ AdminProtectedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Legacy strict admin check (backwards compatibility)
  if (requireStrictAdmin) {
    const hasStrictAdminAccess = user?.role === 'admin';
    console.log('🛡️ AdminProtectedRoute: Strict admin check:', hasStrictAdminAccess);
    
    if (!hasStrictAdminAccess) {
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
    
    console.log('🛡️ AdminProtectedRoute: Rendering children (strict mode)');
    return <>{children}</>;
  }

  // New section-based permission system
  const adminSection = section || getAdminSectionFromPath(location.pathname);
  
  console.log('🛡️ AdminProtectedRoute: Section-based check:', {
    adminSection,
    hasAnyAccess: hasAnyAdminAccess(user?.role),
    hasSectionAccess: adminSection ? hasAdminSectionAccess(user?.role, adminSection) : true
  });
  
  // Debug access in development
  debugAdminAccess(user?.role, location.pathname);

  // Check if user has any admin access at all
  if (!hasAnyAdminAccess(user?.role)) {
    console.log('🛡️ AdminProtectedRoute: No admin access');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="text-2xl font-semibold text-gray-900">Admin Access Required</h2>
          <p className="text-gray-600 max-w-md">
            This area is restricted to users with administrative permissions. Please contact your system administrator if you need access.
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

  // Check section-specific access
  if (adminSection && !hasAdminSectionAccess(user?.role, adminSection)) {
    console.log('🛡️ AdminProtectedRoute: No section access');
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 p-6">
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 text-orange-400 mx-auto" />
          <h2 className="text-2xl font-semibold text-gray-900">Section Access Restricted</h2>
          <p className="text-gray-600 max-w-md">
            You don't have permission to access the <strong>{adminSection}</strong> section. 
            Contact your administrator if you need access to this area.
          </p>
          <div className="text-sm text-gray-500 mt-2">
            Your role: <span className="font-medium capitalize">{user?.role}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={fallbackPath}>
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Render the protected admin content
  console.log('🛡️ AdminProtectedRoute: Rendering children');
  return <>{children}</>;
}
