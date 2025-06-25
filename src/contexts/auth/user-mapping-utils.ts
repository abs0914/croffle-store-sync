
import { User } from './types';
import { UserRole } from '@/types';

export function createUserFromSupabaseData(userData: any, supabaseUser: any): User {
  const firstName = userData?.first_name || '';
  const lastName = userData?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || supabaseUser?.email?.split('@')[0] || 'User';

  return {
    id: userData?.id || supabaseUser?.id,
    email: userData?.email || supabaseUser?.email || '',
    firstName,
    lastName,
    name: fullName,
    role: (userData?.role as UserRole) || 'staff',
    storeIds: userData?.store_ids || [],
    avatar: userData?.avatar || supabaseUser?.user_metadata?.avatar_url,
    isActive: userData?.is_active !== false,
    createdAt: userData?.created_at || new Date().toISOString(),
    updatedAt: userData?.updated_at || new Date().toISOString(),
  };
}

export function updateUserProfile(existingUser: User, updates: Partial<User>): User {
  const updatedUser = { ...existingUser, ...updates };
  
  // Recompute full name if firstName or lastName changed
  if (updates.firstName !== undefined || updates.lastName !== undefined) {
    updatedUser.name = `${updatedUser.firstName} ${updatedUser.lastName}`.trim() || updatedUser.email.split('@')[0] || 'User';
  }
  
  return updatedUser;
}

export function validateUserData(userData: any): boolean {
  return !!(
    userData &&
    userData.id &&
    userData.email &&
    userData.role &&
    Array.isArray(userData.store_ids)
  );
}

export function getUserInitials(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  
  if (user.name) {
    const nameParts = user.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }
  
  return user.email.substring(0, 2).toUpperCase();
}

export function formatUserDisplayName(user: User): string {
  return user.name || `${user.firstName} ${user.lastName}`.trim() || user.email;
}
