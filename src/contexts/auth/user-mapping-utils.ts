
import { supabase } from "@/integrations/supabase/client";
import { User as AppUser, UserRole } from "@/types";
import { mapUserRole } from "./role-utils";
import { handleSpecialCases } from "./special-cases-utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface AppUserData {
  role: string;
  store_ids: string[];
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Maps Supabase user to our app's User type
 */
export const mapSupabaseUser = async (supabaseUser: SupabaseUser): Promise<AppUser> => {
  if (!supabaseUser) {
    throw new Error('No Supabase user provided');
  }
  
  // Get email to determine initial role mapping
  const email = supabaseUser.email || '';
  let role = mapUserRole(email);
  let storeIds: string[] = [];
  
  console.log('🔐 Mapping Supabase user:', supabaseUser.email);
  console.log('🔐 Initial role from mapUserRole:', role);
  
  try {
    // Try to get user info from the app_users table using RPC function
    const { data, error } = await supabase
      .rpc('get_current_user_info', { user_email: email });

    console.log('🔐 Database query result:', { data, error });

    if (error) { 
      console.error('🔐 Error fetching user info from database:', error);
    } 

    // If user exists in app_users, use that data
    if (data && data.length > 0) {
      const appUserData = data[0] as AppUserData;
      console.log('🔐 Found existing app_user record:', {
        email: appUserData.email,
        role: appUserData.role,
        roleType: typeof appUserData.role,
        store_ids: appUserData.store_ids
      });
      
      // Fix role assignment - ensure it's properly typed
      const dbRole = appUserData.role;
      console.log('🔐 Database role before assignment:', dbRole);
      
      role = dbRole as UserRole;
      storeIds = appUserData.store_ids || [];
      
      console.log('🔐 Role after assignment:', role);
      console.log('🔐 StoreIds after assignment:', storeIds);
      
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
      
      console.log('🔐 Final user object being returned:', finalUser);
      
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
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || (supabaseUser.email || '').split('@')[0],
    role: role,
    storeIds: storeIds,
    avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
  };
};
