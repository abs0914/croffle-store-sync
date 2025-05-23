
import { supabase } from "@/integrations/supabase/client";
import { User as AppUser } from "@/types";
import { mapUserRole } from "./role-utils";
import { handleSpecialCases } from "./special-cases-utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";

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
  
  console.log('Mapping Supabase user:', supabaseUser.email);
  
  try {
    // Try to get user info from the app_users table
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

    if (error && error.code !== 'PGRST116') { // Ignoring "no rows returned" error
      console.error('Error fetching user info from database:', error);
    } 

    // If user exists in app_users, use that data
    if (data) {
      const appUserData = data as AppUserData;
      console.log('Found existing app_user record:', appUserData.email);
      role = appUserData.role as any;
      storeIds = appUserData.store_ids || [];
      
      // Use the name from app_users if available
      const name = `${appUserData.first_name} ${appUserData.last_name}`.trim();
      
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: name || supabaseUser.user_metadata?.name || (supabaseUser.email || '').split('@')[0],
        role: role,
        storeIds: storeIds,
        avatar: supabaseUser.user_metadata?.avatar_url || 'https://github.com/shadcn.png',
      };
    } 
  } catch (error) {
    console.error('Error checking app_users data:', error);
  }

  // Handle special cases and create default app_user record if needed
  const result = await handleSpecialCases(supabaseUser, email, role);
  role = result.role;
  storeIds = result.storeIds;

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
