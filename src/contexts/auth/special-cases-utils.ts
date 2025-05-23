
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
  
  // If it's a known admin or test account, set appropriate values
  if (email === 'admin@example.com') {
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
  // Add more special cases as needed
  else if (email.includes('owner')) {
    role = 'owner';
    // Similar logic for owners
  }
  
  // Create the user record if it doesn't exist yet
  if (!userData?.app_user_id && email) {
    try {
      const firstName = email.split('@')[0].split('.')[0] || '';
      const lastName = email.split('@')[0].split('.')[1] || '';
      
      // Use insert directly instead of RPC
      const { data, error } = await supabase
        .from('app_users')
        .insert({
          user_id: userData?.id || null,
          email: email,
          first_name: firstName,
          last_name: lastName,
          role: role,
          store_ids: storeIds,
          is_active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating app_user record:', error);
      } else {
        console.log('Created new app_user record for:', email, data);
      }
    } catch (error) {
      console.error('Exception creating app_user record:', error);
    }
  }
  
  return { role, storeIds };
};
