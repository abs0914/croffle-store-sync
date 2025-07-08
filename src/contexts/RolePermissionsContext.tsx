import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth';
import { hasPermission, RolePermissions } from '@/types/rolePermissions';

interface RolePermissionsContextType {
  permissions: RolePermissions | null;
  hasPermission: (permission: keyof RolePermissions) => boolean;
  canAccessRoute: (routePermission: keyof RolePermissions) => boolean;
  userRole: string | null;
}

const RolePermissionsContext = createContext<RolePermissionsContextType>({
  permissions: null,
  hasPermission: () => false,
  canAccessRoute: () => false,
  userRole: null,
});

export function RolePermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  
  // FIXED: Directly use user.role if available, since the mapping seems to be working
  const userRole = user?.role || null;
  
  // Enhanced debug logging
  console.log('🔐 RolePermissionsProvider - Enhanced Debug:', {
    isLoading,
    userExists: !!user,
    userRole,
    userRoleType: typeof userRole,
    userFromAuth: user,
    directRoleAccess: user?.role
  });
  
  // Debug logging for role permissions context
  console.log('🔐 RolePermissionsProvider - Auth isLoading:', isLoading);
  console.log('🔐 RolePermissionsProvider - User object:', user);
  console.log('🔐 RolePermissionsProvider - User role:', userRole);
  console.log('🔐 RolePermissionsProvider - User exists:', !!user);
  console.log('🔐 RolePermissionsProvider - User role type:', typeof userRole);
  console.log('🔐 RolePermissionsProvider - User.role direct access:', user?.role);
  console.log('🔐 RolePermissionsProvider - User object keys:', user ? Object.keys(user) : 'no user');
  
  const checkPermission = (permission: keyof RolePermissions): boolean => {
    const hasPermissionResult = userRole ? hasPermission(userRole, permission) : false;
    console.log(`🔐 Permission check: ${permission} for role ${userRole} = ${hasPermissionResult}`);
    return hasPermissionResult;
  };

  const canAccessRoute = (routePermission: keyof RolePermissions): boolean => {
    // Don't grant access if still loading or if no role is available
    if (isLoading || !userRole) {
      console.log('🔐 RolePermissionsProvider - Denying access: loading or no role', { isLoading, userRole });
      return false;
    }
    return checkPermission(routePermission);
  };

  const permissions = userRole ? {
    pos: checkPermission('pos'),
    dashboard: checkPermission('dashboard'),
    inventory_management: checkPermission('inventory_management'),
    commissary_inventory: checkPermission('commissary_inventory'),
    production_management: checkPermission('production_management'),
    order_management: checkPermission('order_management'),
    expenses: checkPermission('expenses'),
    recipe_management: checkPermission('recipe_management'),
    reports: checkPermission('reports'),
    settings: checkPermission('settings'),
    user_management: checkPermission('user_management'),
    purchasing: checkPermission('purchasing'),
  } : null;

  return (
    <RolePermissionsContext.Provider
      value={{
        permissions,
        hasPermission: checkPermission,
        canAccessRoute,
        userRole,
      }}
    >
      {children}
    </RolePermissionsContext.Provider>
  );
}

export function useRolePermissions() {
  const context = useContext(RolePermissionsContext);
  if (!context) {
    throw new Error('useRolePermissions must be used within a RolePermissionsProvider');
  }
  return context;
}