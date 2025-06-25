import { useAuth } from '@/contexts/auth';
import { useStore } from '@/contexts/StoreContext';
import { canPerformAction } from '@/contexts/auth/role-utils';

export function usePermissions() {
  const { user } = useAuth();
  const { currentStore } = useStore();

  const checkPermission = (action: string) => {
    if (!user?.role) {
      return { hasPermission: false, reason: 'No user role' };
    }

    const hasPermission = canPerformAction(user.role, action);
    return { 
      hasPermission, 
      reason: hasPermission ? 'Permission granted' : 'Insufficient permissions' 
    };
  };

  const checkStoreAccess = () => {
    if (!user) return { hasPermission: false, reason: 'No user' };
    if (!currentStore) return { hasPermission: false, reason: 'No store selected' };
    
    // Admin and owner can access all stores
    if (user.role === 'admin' || user.role === 'owner') {
      return { hasPermission: true, reason: 'Admin/Owner access' };
    }
    
    // Other roles need explicit store access
    if (user.storeIds && user.storeIds.includes(currentStore.id)) {
      return { hasPermission: true, reason: 'Store access granted' };
    }
    
    return { hasPermission: false, reason: 'No store access' };
  };

  return {
    canAccessProducts: () => checkPermission('manage_products'),
    canAccessCustomers: () => checkPermission('process_transactions'),
    canAccessInventory: () => checkPermission('manage_inventory'),
    canAccessOrderManagement: () => checkPermission('manage_orders'),
    canAccessExpenses: () => checkPermission('manage_expenses'),
    canAccessReports: () => checkPermission('view_reports'),
    canAccessSettings: () => checkPermission('manage_users'),
    hasStoreAccess: checkStoreAccess,
    checkPermission,
  };
}
