
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
  
  // Try to fetch user role and store assignments from app_users table
  let storeIds: string[] = [];
  
  try {
    // First check if the user exists in app_users table
    const { data } = await supabase
      .from('app_users')
      .select('id, role, store_ids, first_name, last_name')
      .eq('email', supabaseUser.email)
      .maybeSingle();
    
    if (data) {
      // User found in app_users table
      role = data.role;
      storeIds = data.store_ids || [];
      
      // Use the name from app_users if available
      const name = `${data.first_name} ${data.last_name}`.trim();
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: name || supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
        role: role,
        storeIds: storeIds,
        avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
      };
    }
  } catch (error) {
    console.error('Error checking app_users table:', error);
  }

  // If no data found in app_users or error occurred, try legacy tables
  if (role === 'cashier') {
    try {
      const { data: cashierData } = await supabase
        .from('cashiers')
        .select('store_id')
        .eq('user_id', supabaseUser.id);
      
      if (cashierData && cashierData.length > 0) {
        storeIds = cashierData.map(item => item.store_id);
      }
    } catch (error) {
      console.error('Error fetching cashier store assignments:', error);
    }
  } else if (role === 'manager') {
    try {
      const { data: managerData } = await supabase
        .from('managers')
        .select('store_ids')
        .eq('email', supabaseUser.email)
        .single();
      
      if (managerData && managerData.store_ids) {
        storeIds = managerData.store_ids;
      }
    } catch (error) {
      console.error('Error fetching manager store assignments:', error);
    }
  } else if (role === 'admin' || role === 'owner') {
    try {
      const { data: storesData } = await supabase
        .from('stores')
        .select('id');
        
      if (storesData && storesData.length > 0) {
        storeIds = storesData.map(store => store.id);
      }
    } catch (error) {
      console.error('Error fetching store IDs:', error);
    }
  }

  // Return the user with the determined role and store access
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
