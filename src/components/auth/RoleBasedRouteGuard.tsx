import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useRolePermissions } from '@/contexts/RolePermissionsContext';
import { RolePermissions } from '@/types/rolePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleBasedRouteGuardProps {
  children: ReactNode;
  requiredPermission: keyof RolePermissions;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

export function RoleBasedRouteGuard({
  children,
  requiredPermission,
  fallbackPath = '/dashboard',
  showAccessDenied = true
}: RoleBasedRouteGuardProps) {
  const { canAccessRoute, userRole } = useRolePermissions();

  const hasAccess = canAccessRoute(requiredPermission);

  if (!hasAccess) {
    if (!showAccessDenied) {
      return <Navigate to={fallbackPath} replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Lock className="h-8 w-8 text-destructive" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Access Denied</h2>
                <p className="text-sm text-muted-foreground">
                  Your current role ({userRole || 'Unknown'}) doesn't have permission to access this section.
                </p>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Required permission: {requiredPermission.replace('_', ' ')}</span>
                </div>
              </div>

              <Button 
                onClick={() => window.history.back()} 
                variant="outline" 
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}