
import { UserRole } from "@/types";

// Role-based permissions utility with a clear hierarchy
export const hasPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  // Admin always has all permissions regardless of hierarchy
  if (userRole === 'admin') return true;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,   // Admin has all permissions
    owner: 3,   // Owner has permissions of manager and below
    manager: 2, // Manager has permissions of cashier
    cashier: 1  // Cashier has basic permissions
  };
  
  // Check the role hierarchy for other roles
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Store access check utility
export const hasStoreAccess = (userRole: UserRole | undefined, userStoreIds: string[], storeId: string): boolean => {
  if (!userRole) return false;
  
  // Admins have access to all stores
  if (userRole === 'admin') return true;
  
  // Owners only have access to stores in their storeIds array
  return userStoreIds.includes(storeId);
};
