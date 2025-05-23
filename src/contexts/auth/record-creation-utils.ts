
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";

/**
 * Helper function to create app_user records and avoid duplicate code
 * Now delegates to createAppUserViaRPC
 */
export async function createAppUserRecord(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  storeIds: string[],
  isActive: boolean
): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('create_app_user', {
      user_id: userId,
      user_email: email,
      first_name: firstName,
      last_name: lastName,
      user_role: role,
      store_ids: storeIds,
      is_active: isActive
    });
    
    if (error) {
      console.error('Error creating app_user record via RPC:', error);
    } else {
      console.log('Created new app_user record for:', email);
    }
  } catch (err) {
    console.error('Failed to create app_user:', err);
  }
}
