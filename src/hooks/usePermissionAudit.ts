
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { useStore } from '@/contexts/StoreContext';
import { UserRole } from '@/types/user';

interface PermissionAuditResult {
  userId: string | null;
  userRole: UserRole | null;
  userStoreIds: string[] | null;
  currentStoreId: string | null;
  hasStoreAccess: boolean;
  permissionChecks: {
    canAccessOrderManagement: boolean;
    canAccessExpenses: boolean;
    canAccessReports: boolean;
    canAccessSettings: boolean;
    canAccessInventory: boolean;
    canAccessProducts: boolean;
    canAccessCustomers: boolean;
  };
  potentialIssues: string[];
}

export function usePermissionAudit() {
  const { user, isAuthenticated } = useAuth();
  const { currentStore } = useStore();
  const [auditResult, setAuditResult] = useState<PermissionAuditResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAuditResult(null);
      return;
    }

    const potentialIssues: string[] = [];

    // Check for basic user data issues
    if (!user.id) potentialIssues.push('User ID is missing');
    if (!user.role) potentialIssues.push('User role is missing');
    if (!user.email) potentialIssues.push('User email is missing');

    // Check store access issues
    const hasStoreAccess = currentStore ? 
      (user.role === 'admin' || user.role === 'owner' || 
       (user.storeIds && user.storeIds.includes(currentStore.id))) : false;

    if (currentStore && !hasStoreAccess) {
      potentialIssues.push(`User does not have access to current store: ${currentStore.name}`);
    }

    if (user.role !== 'admin' && user.role !== 'owner' && (!user.storeIds || user.storeIds.length === 0)) {
      potentialIssues.push('Non-admin user has no assigned stores');
    }

    // Permission checks based on role hierarchy
    const permissionChecks = {
      canAccessOrderManagement: ['manager', 'admin', 'owner'].includes(user.role),
      canAccessExpenses: ['cashier', 'manager', 'admin', 'owner'].includes(user.role),
      canAccessReports: ['manager', 'admin', 'owner'].includes(user.role),
      canAccessSettings: ['admin', 'owner'].includes(user.role),
      canAccessInventory: ['cashier', 'manager', 'admin', 'owner'].includes(user.role),
      canAccessProducts: ['manager', 'admin', 'owner'].includes(user.role),
      canAccessCustomers: ['cashier', 'manager', 'admin', 'owner'].includes(user.role),
    };

    // Check for role-specific issues
    if (user.role === 'cashier' && !permissionChecks.canAccessExpenses) {
      potentialIssues.push('Cashier role should have access to expenses');
    }

    if (user.role === 'manager' && !permissionChecks.canAccessOrderManagement) {
      potentialIssues.push('Manager role should have access to order management');
    }

    setAuditResult({
      userId: user.id,
      userRole: user.role,
      userStoreIds: user.storeIds,
      currentStoreId: currentStore?.id || null,
      hasStoreAccess,
      permissionChecks,
      potentialIssues
    });
  }, [user, isAuthenticated, currentStore]);

  const logAuditResults = () => {
    if (!auditResult) {
      console.log('🔍 Permission Audit: No user authenticated');
      return;
    }

    console.group('🔍 Permission System Audit');
    console.log('User ID:', auditResult.userId);
    console.log('Role:', auditResult.userRole);
    console.log('Store IDs:', auditResult.userStoreIds);
    console.log('Current Store:', auditResult.currentStoreId);
    console.log('Has Store Access:', auditResult.hasStoreAccess);
    
    console.group('Permission Checks');
    Object.entries(auditResult.permissionChecks).forEach(([permission, hasAccess]) => {
      console.log(`${permission}: ${hasAccess ? '✅' : '❌'}`);
    });
    console.groupEnd();

    if (auditResult.potentialIssues.length > 0) {
      console.group('⚠️ Potential Issues');
      auditResult.potentialIssues.forEach(issue => console.warn(issue));
      console.groupEnd();
    } else {
      console.log('✅ No issues detected');
    }
    
    console.groupEnd();
  };

  return {
    auditResult,
    logAuditResults,
    hasIssues: auditResult ? auditResult.potentialIssues.length > 0 : false
  };
}
