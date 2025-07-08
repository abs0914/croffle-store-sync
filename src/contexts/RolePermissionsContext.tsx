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
  
  // Get user role directly from auth user object
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
    // Don't grant access if still loading
    if (isLoading) {
      console.log('🔐 RolePermissionsProvider - Denying access: still loading');
      return false;
    }
    
    // FIXED: Use user.role directly if userRole is null but user exists
    const effectiveRole = userRole || user?.role;
    
    if (!effectiveRole) {
      console.log('🔐 RolePermissionsProvider - Denying access: no effective role', { userRole, userFromAuth: user?.role });
      return false;
    }
    
    const hasAccess = hasPermission(effectiveRole, routePermission);
    console.log('🔐 canAccessRoute check:', { routePermission, effectiveRole, hasAccess });
    return hasAccess;
  };

  // FIXED: Use effective role (fallback to user.role if userRole is null)
  const effectiveRole = userRole || user?.role;
  
  const permissions = effectiveRole ? {
    pos: hasPermission(effectiveRole, 'pos'),
    dashboard: hasPermission(effectiveRole, 'dashboard'),
    inventory_management: hasPermission(effectiveRole, 'inventory_management'),
    commissary_inventory: hasPermission(effectiveRole, 'commissary_inventory'),
    production_management: hasPermission(effectiveRole, 'production_management'),
    order_management: hasPermission(effectiveRole, 'order_management'),
    expenses: hasPermission(effectiveRole, 'expenses'),
    recipe_management: hasPermission(effectiveRole, 'recipe_management'),
    reports: hasPermission(effectiveRole, 'reports'),
    settings: hasPermission(effectiveRole, 'settings'),
    user_management: hasPermission(effectiveRole, 'user_management'),
    purchasing: hasPermission(effectiveRole, 'purchasing'),
  } : null;

  // Enhanced check permission function
  const enhancedCheckPermission = (permission: keyof RolePermissions): boolean => {
    const roleToCheck = effectiveRole;
    const hasPermissionResult = roleToCheck ? hasPermission(roleToCheck, permission) : false;
    console.log(`🔐 Enhanced Permission check: ${permission} for role ${roleToCheck} = ${hasPermissionResult}`);
    return hasPermissionResult;
  };

  return (
    <RolePermissionsContext.Provider
      value={{
        permissions,
        hasPermission: enhancedCheckPermission,
        canAccessRoute,
        userRole: effectiveRole, // Use effective role
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