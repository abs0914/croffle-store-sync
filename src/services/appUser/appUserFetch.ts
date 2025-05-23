
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all stores");
    
    // Build query - let RLS handle permissions
    let query = supabase.from('app_users').select('*');
    
    // If a store ID is provided, filter by that store
    if (storeId) {
      query = query.filter('store_ids', 'cs', `{${storeId}}`);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      if (error.message.includes('infinite recursion')) {
        console.error('RLS policy recursion error - please contact support');
        throw new Error('Database permission error - please contact support');
      } else {
        console.error('Error fetching app users:', error);
        throw new Error(error.message || 'Failed to load users');
      }
    }

    // Successful query but no results
    if (!data || data.length === 0) {
      console.log('No app_users found in query results');
      return [];
    }
      
    // Map and return the users
    const mappedUsers = mapAppUsers(data);
    console.log(`Successfully mapped ${mappedUsers.length} users`);
    return mappedUsers;
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    throw error; // Let the calling function handle the error display
  }
};
