
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User, UserRole } from "@/types";

export interface AppUserData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string;
  role: UserRole;
  store_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Map Supabase user to application user format
 */
export const mapSupabaseUser = (
  supabaseUser: SupabaseUser,
  appUserData?: AppUserData
): User => {
  const displayName = appUserData 
    ? `${appUserData.first_name} ${appUserData.last_name}`.trim()
    : supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: displayName,
    role: appUserData?.role || 'cashier',
    storeIds: appUserData?.store_ids || [],
    // Remove isActive as it's not part of the User type
    // lastSignIn and createdAt are also not part of the User type based on the interface
  };
};

/**
 * Fetch app user data from database
 */
export const fetchAppUserData = async (email: string): Promise<AppUserData | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_current_user_info', { user_email: email });

    if (error) {
      console.error('Error fetching app user data:', error);
      return null;
    }

    // Ensure the returned data includes all required AppUserData fields
    const userData = data?.[0] as any;
    if (userData) {
      return {
        id: userData.id,
        user_id: userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        contact_number: userData.contact_number,
        role: userData.role as UserRole,
        store_ids: userData.store_ids,
        is_active: userData.is_active,
        created_at: userData.created_at || new Date().toISOString(),
        updated_at: userData.updated_at || new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Exception fetching app user data:', error);
    return null;
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 6,
    owner: 5,
    stock_user: 4,
    manager: 3,
    production_user: 2,
    cashier: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Check if user has access to specific store
 */
export const hasStoreAccess = (user: User, storeId: string): boolean => {
  if (user.role === 'admin' || user.role === 'owner') {
    return true;
  }
  return user.storeIds.includes(storeId);
};

/**
 * Get user's accessible stores
 */
export const getAccessibleStores = async (user: User): Promise<string[]> => {
  if (user.role === 'admin' || user.role === 'owner') {
    // Fetch all store IDs for admin/owner
    try {
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching stores:', error);
        return user.storeIds;
      }

      return stores.map(store => store.id);
    } catch (error) {
      console.error('Exception fetching stores:', error);
      return user.storeIds;
    }
  }

  return user.storeIds;
};

/**
 * Refresh user session
 */
export const refreshUserSession = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh error:', error);
      return false;
    }
    return !!data.session;
  } catch (error) {
    console.error('Exception during session refresh:', error);
    return false;
  }
};
