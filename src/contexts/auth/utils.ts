
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User } from './types';
import { UserRole } from '@/types';

export async function mapSupabaseUser(supabaseUser: SupabaseUser): Promise<User> {
  try {
    // Get user data from app_users table
    const { data: appUser, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('user_id', supabaseUser.id)
      .single();

    if (error) {
      console.error('Error fetching app user:', error);
      throw new Error('Failed to fetch user data');
    }

    if (!appUser) {
      throw new Error('User not found in app_users table');
    }

    const firstName = appUser.first_name || '';
    const lastName = appUser.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || appUser.email?.split('@')[0] || 'User';

    return {
      id: appUser.id,
      email: appUser.email,
      firstName,
      lastName,
      name: fullName,
      role: appUser.role as UserRole,
      storeIds: appUser.store_ids || [],
      isActive: appUser.is_active,
      createdAt: appUser.created_at,
      updatedAt: appUser.updated_at,
    };
  } catch (error) {
    console.error('Error mapping Supabase user:', error);
    throw error;
  }
}

export function checkPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'staff': 1,
    'cashier': 2,
    'manager': 3,
    'owner': 4,
    'admin': 5,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function checkStoreAccess(
  userStoreIds: string[], 
  storeId: string, 
  userRole: UserRole
): boolean {
  // Admins and owners have access to all stores
  if (userRole === 'admin' || userRole === 'owner') {
    return true;
  }

  // Check if user has explicit access to the store
  return userStoreIds.includes(storeId);
}
