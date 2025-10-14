
import { supabase } from "@/integrations/supabase/client";
import { User as AppUser, UserRole } from "@/types";
import { mapUserRole } from "./role-utils";
import { handleSpecialCases } from "./special-cases-utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Memoization cache for user mappings to prevent repeated database calls
const userMappingCache = new Map<string, { user: AppUser; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface AppUserData {
  role: string;
  store_ids: string[];
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Maps Supabase user to our app's User type with caching
 */
export const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<AppUser> => {
  if (!supabaseUser) {
    throw new Error('No Supabase user provided');
  }
  
  // Check cache first to prevent repeated database calls
  const cached = userMappingCache.get(supabaseUser.id);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.user;
  }
  
  // Get email to determine initial role mapping
  const email = supabaseUser.email || '';
  let role = mapUserRole(email);
  let storeIds: string[] = [];
  
  try {
    // Try to get user info from the app_users table using RPC function
    const { data, error } = await supabase
      .rpc('get_current_user_info', { user_email: email });

    if (error) { 
      console.error('🔐 Error fetching user info from database:', error);
    } 

    // If user exists in app_users, use that data
    if (data && data.length > 0) {
      const appUserData = data[0] as AppUserData;
      
      // Fix role assignment - ensure it's properly typed
      const dbRole = appUserData.role;
      
      role = dbRole as UserRole;
      storeIds = appUserData.store_ids || [];
      
      // Use the name from app_users if available
      const name = `${appUserData.first_name} ${appUserData.last_name}`.trim();
      
      const finalUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: name || supabaseUser.user_metadata?.name || (supabaseUser.email || '').split('@')[0],
        role: role,
        storeIds: storeIds,
        avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
      };
      
      // Cache the user mapping
      userMappingCache.set(supabaseUser.id, {
        user: finalUser,
        timestamp: Date.now()
      });
      
      return finalUser;
    }
  } catch (error) {
    console.error('Error checking app_users data:', error);
  }

  // Handle special cases and create default app_user record if needed
  const specialCaseResult = await handleSpecialCases(supabaseUser, email, role);
  role = specialCaseResult.role;
  storeIds = specialCaseResult.storeIds;

  // Return the user with the determined role and store access
  const finalUser = {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || (supabaseUser.email || '').split('@')[0],
    role: role,
    storeIds: storeIds,
    avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
  };
  
  // Cache the user mapping
  userMappingCache.set(supabaseUser.id, {
    user: finalUser,
    timestamp: Date.now()
  });
  
  return finalUser;
};

/**
 * Clear the user mapping cache (call on logout)
 */
export const clearUserMappingCache = () => {
  userMappingCache.clear();
};
