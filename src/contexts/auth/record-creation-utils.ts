
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Helper function to create app_user records and avoid duplicate code
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
    const { error: createError } = await supabase
      .from('app_users')
      .insert({
        user_id: userId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role,
        store_ids: storeIds,
        is_active: isActive
      });
      
    if (createError) {
      console.error('Error creating app_user record:', createError);
    } else {
      console.log('Created new app_user record for:', email);
    }
  } catch (err) {
    console.error('Failed to create app_user:', err);
  }
}
