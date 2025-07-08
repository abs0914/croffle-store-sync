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
  
  const userRole = user?.role || null;
  
  // Debug logging for role permissions context
  console.log('🔐 RolePermissionsProvider - Auth isLoading:', isLoading);
  console.log('🔐 RolePermissionsProvider - User object:', user);
  console.log('🔐 RolePermissionsProvider - User role:', userRole);
  console.log('🔐 RolePermissionsProvider - User exists:', !!user);
  console.log('🔐 RolePermissionsProvider - User role type:', typeof userRole);
  
  const checkPermission = (permission: keyof RolePermissions): boolean => {
    if (!userRole) return false;
    return hasPermission(userRole, permission);
  };

  const canAccessRoute = (routePermission: keyof RolePermissions): boolean => {
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