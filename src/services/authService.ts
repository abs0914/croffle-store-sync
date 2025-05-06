
import { UserRole } from "@/types";

// Role-based permissions utility
export const hasPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    owner: 3,
    manager: 2,
    cashier: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Store access check utility
export const hasStoreAccess = (userRole: UserRole | undefined, userStoreIds: string[], storeId: string): boolean => {
  if (!userRole) return false;
  
  // Admins have access to all stores
  if (userRole === 'admin') return true;
  
  return userStoreIds.includes(storeId);
};
