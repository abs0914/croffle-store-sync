
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";

export interface Permission {
  hasPermission: boolean;
  reason?: string;
}

export function usePermissions() {
  const { user } = useAuth();
  const { currentStore } = useStore();

  const hasPermission = (requiredRole: string | string[], requireStoreAccess: boolean = false): Permission => {
    // Check if user is authenticated
    if (!user) {
      return { hasPermission: false, reason: "User not authenticated" };
    }

    // Check if store access is required but no store is selected
    if (requireStoreAccess && !currentStore) {
      return { hasPermission: false, reason: "No store selected" };
    }

    // Admin and owner always have access
    if (user.role === 'admin' || user.role === 'owner') {
      return { hasPermission: true };
    }

    // Check role-based permissions
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(user.role)) {
      return { 
        hasPermission: false, 
        reason: `Requires ${allowedRoles.join(' or ')} role, but user has ${user.role} role` 
      };
    }

    // Check store access for non-admin/owner users
    if (requireStoreAccess && currentStore && !['admin', 'owner'].includes(user.role)) {
      const hasStoreAccess = user.storeIds?.includes(currentStore.id);
      if (!hasStoreAccess) {
        return { 
          hasPermission: false, 
          reason: `User does not have access to store: ${currentStore.name}` 
        };
      }
    }

    return { hasPermission: true };
  };

  return {
    hasPermission,
    // Convenience methods for common permission checks
    canAccessOrderManagement: () => hasPermission(['manager', 'admin', 'owner'], true),
    canAccessExpenses: () => hasPermission(['cashier', 'manager', 'admin', 'owner'], true),
    canAccessReports: () => hasPermission(['manager', 'admin', 'owner'], true),
    canAccessSettings: () => hasPermission(['admin', 'owner'], false),
    canAccessInventory: () => hasPermission(['cashier', 'manager', 'admin', 'owner'], true),
    canAccessProducts: () => hasPermission(['manager', 'admin', 'owner'], true),
    canAccessCustomers: () => hasPermission(['cashier', 'manager', 'admin', 'owner'], true),
  };
}
