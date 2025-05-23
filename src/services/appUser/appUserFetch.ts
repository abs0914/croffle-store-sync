
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all roles");
    
    // First, try using the direct RLS-protected query
    // The RLS policies will handle permissions automatically
    const query = supabase.from('app_users').select('*');
    
    // If a store ID is provided, filter by that store
    if (storeId) {
      query.filter('store_ids', 'cs', `{${storeId}}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching app users:', error);
      throw error;
    }
      
    return mapAppUsers(data || []);
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    throw error;
  }
};
