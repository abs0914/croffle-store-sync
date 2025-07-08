
/**
 * Special case handling for authentication
 */

import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";

interface SpecialCaseResult {
  role: UserRole;
  storeIds: string[];
}

/**
 * Handle special cases for authentication like admin access, test users, etc.
 * @param userData Optional user data from Supabase
 * @param email User's email address
 * @param initialRole Initial role determined from email
 * @returns Object with resolved role and storeIds
 */
export const handleSpecialCases = async (userData: any = null, email: string = '', initialRole: UserRole = 'cashier'): Promise<SpecialCaseResult> => {
  let role = initialRole;
  let storeIds: string[] = [];

  // Handle admin users - both specific email and pattern matching
  if (email === 'admin@example.com' || email.includes('admin') || email.match(/\.admin@/)) {
    role = 'admin';

    // Admins get access to all stores
    try {
      const { data, error } = await supabase.from('stores').select('id').eq('is_active', true);
      if (!error && data) {
        storeIds = data.map(store => store.id);
      }
    } catch (error) {
      console.error('Error fetching stores for admin:', error);
    }
  }
  // Handle owner users
  else if (email === 'owner@example.com' || email.includes('owner') || email.match(/\.owner@/)) {
    role = 'owner';
    
    // Owners get access to all stores
    try {
      const { data, error } = await supabase.from('stores').select('id').eq('is_active', true);
      if (!error && data) {
        storeIds = data.map(store => store.id);
      }
    } catch (error) {
      console.error('Error fetching stores for owner:', error);
    }
  }

  // Create the user record if it doesn't exist yet
  if (!userData?.app_user_id && email) {
    try {
      // First check if an app_user record already exists for this email
      const { data: existingUser, error: checkError } = await supabase
        .from('app_users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking for existing app_user:', checkError);
        return { role, storeIds };
      }

      // Only create if no existing user found
      if (!existingUser) {
        const firstName = email.split('@')[0].split('.')[0] || '';
        const lastName = email.split('@')[0].split('.')[1] || '';

        // Call the create_app_user function to avoid ambiguous column error
        const { data, error } = await supabase.rpc('create_app_user', {
          p_user_id: userData?.id || null,
          p_user_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_user_role: role,
          p_store_ids: storeIds,
          p_is_active: true
        });

        if (error) {
          console.error('Error creating app_user record in special-cases-utils:', error);
          // Don't show toast for RLS errors as they're expected in some cases
          if (!error.message?.includes('row-level security policy')) {
            console.error('Unexpected error in special-cases-utils:', error.message);
          }
        } else {
          console.log('Created new app_user record for:', email, data);
        }
      } else {
        console.log('App_user record already exists for:', email, '- skipping creation');
      }
    } catch (error) {
      console.error('Exception creating app_user record:', error);
    }
  }

  return { role, storeIds };
};
