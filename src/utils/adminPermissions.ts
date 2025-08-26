/**
 * Admin Section Permissions
 * 
 * This module defines which user roles can access specific admin sections,
 * allowing for granular access control beyond just admin/non-admin.
 */

import { UserRole } from "@/types";

// Define admin sections
export type AdminSection = 
  | 'dashboard'
  | 'stores' 
  | 'recipes'
  | 'commissary-inventory'
  | 'production-management'
  | 'order-management'
  | 'customers'
  | 'users'
  | 'expenses'
  | 'reports'
  | 'addons';

// Map admin sections to allowed roles
export const ADMIN_SECTION_PERMISSIONS: Record<AdminSection, UserRole[]> = {
  'dashboard': ['admin', 'owner', 'manager', 'stock_user', 'production_user'],
  'stores': ['admin', 'owner'],
  'recipes': ['admin', 'owner', 'production_user'],
  'commissary-inventory': ['admin', 'owner', 'stock_user', 'production_user'],
  'production-management': ['admin', 'owner', 'production_user', 'stock_user'],
  'order-management': ['admin', 'owner', 'stock_user'],
  'customers': ['admin', 'owner', 'manager'],
  'users': ['admin', 'owner'],
  'expenses': ['admin', 'owner', 'manager'],
  'reports': ['admin', 'owner', 'manager', 'stock_user'],
  'addons': ['admin', 'owner']
};

/**
 * Check if a user role has access to a specific admin section
 */
export const hasAdminSectionAccess = (
  userRole: UserRole | undefined, 
  section: AdminSection
): boolean => {
  if (!userRole) return false;
  
  const allowedRoles = ADMIN_SECTION_PERMISSIONS[section];
  return allowedRoles.includes(userRole);
};

/**
 * Get admin section from route path
 */
export const getAdminSectionFromPath = (path: string): AdminSection | null => {
  // Remove /admin prefix and get the first segment
  const adminPath = path.replace(/^\/admin\/?/, '');
  
  // Handle root admin path
  if (!adminPath || adminPath === '') return 'dashboard';
  
  // Map route paths to sections
  const pathToSectionMap: Record<string, AdminSection> = {
    '': 'dashboard',
    'stores': 'stores',
    'recipes': 'recipes',
    'commissary-inventory': 'commissary-inventory', 
    'production-management': 'production-management',
    'order-management': 'order-management',
    'customers': 'customers',
    'users': 'users',
    'managers': 'users',
    'cashiers': 'users',
    'expenses': 'expenses',
    'reports': 'reports',
    'add-ons': 'addons'
  };
  
  // Get the first segment of the path
  const firstSegment = adminPath.split('/')[0];
  return pathToSectionMap[firstSegment] || null;
};

/**
 * Check if a user can access any admin section
 */
export const hasAnyAdminAccess = (userRole: UserRole | undefined): boolean => {
  if (!userRole) return false;
  
  // Check if user has access to any admin section
  return Object.values(ADMIN_SECTION_PERMISSIONS).some(allowedRoles => 
    allowedRoles.includes(userRole)
  );
};

/**
 * Get all admin sections a user has access to
 */
export const getUserAdminSections = (userRole: UserRole | undefined): AdminSection[] => {
  if (!userRole) return [];
  
  return Object.entries(ADMIN_SECTION_PERMISSIONS)
    .filter(([_, allowedRoles]) => allowedRoles.includes(userRole))
    .map(([section, _]) => section as AdminSection);
};

/**
 * Debug function for development
 */
export const debugAdminAccess = (userRole: UserRole | undefined, path: string): void => {
  if (process.env.NODE_ENV === 'development') {
    const section = getAdminSectionFromPath(path);
    console.group(`🔐 Admin Access Check: ${path}`);
    console.log(`User Role: ${userRole || 'undefined'}`);
    console.log(`Admin Section: ${section || 'unknown'}`);
    console.log(`Has Access: ${section ? hasAdminSectionAccess(userRole, section) : false}`);
    console.log(`Available Sections: ${getUserAdminSections(userRole).join(', ')}`);
    console.groupEnd();
  }
};