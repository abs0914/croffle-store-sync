
/**
 * Special case handling for authentication
 */

import { mapSupabaseUser } from './user-mapping-utils';

/**
 * Handle special cases for authentication like admin access, test users, etc.
 */
export const handleSpecialCases = (userData: any = null) => {
  // Simple implementation to avoid deep type instantiation
  const user = userData ? mapSupabaseUser(userData) : null;
  return { user };
};
