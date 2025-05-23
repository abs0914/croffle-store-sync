
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "@/types";

/**
 * Maps a user email to a role (temporary solution, to be replaced with database roles)
 */
export const mapUserRole = (email: string): UserRole => {
  if (email === 'admin@example.com') return 'admin';
  if (email === 'owner@example.com') return 'owner';
  if (email.includes('manager') || email === 'rbsons.north.manager@croffle.com') return 'manager';
  if (email === 'marasabaras@croffle.com' || email === 'robinsons.north@croffle.com') return 'cashier';
  return 'cashier'; // Default role
};

/**
 * Maps Supabase user to our app's User type
 */
export const mapSupabaseUser = async (supabaseUser: any): Promise<User> => {
  // Get email to determine initial role mapping
  const email = supabaseUser.email;
  let role: UserRole = mapUserRole(email);
  
  // For cashier users, fetch associated store IDs from the cashiers table
  let storeIds: string[] = ['1']; // Default store ID
  
  if (role === 'cashier') {
    try {
      const { data } = await supabase
        .from('cashiers')
        .select('store_id')
        .eq('user_id', supabaseUser.id);
      
      if (data && data.length > 0) {
        storeIds = data.map(item => item.store_id);
      }
    } catch (error) {
      console.error('Error fetching cashier store assignments:', error);
    }
  } else if (role === 'manager') {
    // For managers, fetch assigned stores from the managers table
    try {
      const { data } = await supabase
        .from('managers')
        .select('store_ids')
        .eq('email', supabaseUser.email)
        .single();
      
      if (data && data.store_ids) {
        storeIds = data.store_ids;
      }
    } catch (error) {
      console.error('Error fetching manager store assignments:', error);
    }
  } else {
    // For admins and owners, fetch from all stores
    try {
      const { data } = await supabase
        .from('stores')
        .select('id');
        
      if (data && data.length > 0) {
        storeIds = data.map(store => store.id);
      }
    } catch (error) {
      console.error('Error fetching store IDs:', error);
    }
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
    role: role,
    storeIds: storeIds,
    avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
  };
};

/**
 * Checks if a user has permission based on role hierarchy
 */
export const checkPermission = (userRole: UserRole | undefined, requiredRole: UserRole): boolean => {
  if (!userRole) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    owner: 3,
    manager: 2,
    cashier: 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Checks if a user has access to a specific store
 */
export const checkStoreAccess = (userStoreIds: string[] | undefined, storeId: string): boolean => {
  if (!userStoreIds) return false;
  return userStoreIds.includes(storeId);
};
