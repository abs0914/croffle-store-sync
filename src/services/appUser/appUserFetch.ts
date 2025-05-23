
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";
import { toast } from "sonner";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all stores");
    
    // Build query - use the authenticated user's permissions via RLS
    let query = supabase.from('app_users').select('*');
    
    // If a store ID is provided, filter by that store
    if (storeId) {
      query = query.filter('store_ids', 'cs', `{${storeId}}`);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching app users:', error);
      throw new Error(error.message || 'Failed to load users');
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
    // Don't show toast here - let the calling component handle the error
    return [];
  }
};
