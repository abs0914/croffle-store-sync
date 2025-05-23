
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all users");
    
    // The query will automatically respect RLS policies based on the user's role
    // - Admins/owners will see all users (or filtered by storeId if provided)
    // - Managers will see users in their stores
    // - Regular users will only see themselves
    const query = supabase.from('app_users').select('*');
    
    // If a store ID is provided, filter by that store
    if (storeId) {
      query.filter('store_ids', 'cs', `{${storeId}}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // Handle specific Postgres REST error codes
      if (error.code === 'PGRST116') {
        console.log('No app users found matching criteria');
        return [];
      }
      
      console.error('Error fetching app users:', error);
      throw error;
    }
      
    return mapAppUsers(data || []);
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    if (error.status === 406) { // Not Acceptable error
      console.log('Query format issue - returning empty results');
      return [];
    }
    throw error;
  }
};
