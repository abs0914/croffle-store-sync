import { UserRole } from "@/types";

// Role-based permissions utility with a clear hierarchy
export const hasPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,   // Admin has all permissions
    owner: 3,   // Owner has permissions of manager and below
    manager: 2, // Manager has permissions of cashier
    cashier: 1  // Cashier has basic permissions
  };
  
  // Admin always has all permissions
  if (userRole === 'admin') return true;
  
  // Otherwise check the role hierarchy
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Store access check utility
export const hasStoreAccess = (userRole: UserRole | undefined, userStoreIds: string[], storeId: string): boolean => {
  if (!userRole) return false;
  
  // Admins have access to all stores
  if (userRole === 'admin') return true;
  
  // Other roles need explicit access
  return userStoreIds.includes(storeId);
};
