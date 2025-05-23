
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";
import { toast } from "sonner";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all users");
    
    // Use our functions that provide proper security and avoid RLS recursion
    let { data, error } = storeId
      ? await supabase.rpc('get_store_users', { store_id_param: storeId })
      : await supabase.rpc('get_all_users');
    
    // If we have permission errors or RPC functions aren't working, 
    // fall back to basic query with filters
    if (error) {
      console.warn('RPC function error:', error.message);
      console.log('Falling back to direct query');
      
      // Direct query to app_users table
      const query = supabase.from('app_users').select('*');
      
      // If a store ID is provided, filter by that store
      if (storeId) {
        query.filter('store_ids', 'cs', `{${storeId}}`);
      }
      
      const result = await query;
      data = result.data;
      error = result.error;
    }
    
    if (error) {
      // Handle specific Postgres REST error codes
      if (error.code === 'PGRST116') {
        console.log('No app users found matching criteria');
        return [];
      }
      
      // For 406 errors (Not Acceptable)
      if (error.status === 406) {
        console.log('Query format issue - returning empty results');
        return [];
      }
      
      console.error('Error fetching app users:', error);
      toast.error(`Failed to load users: ${error.message || 'Unknown error'}`);
      return [];
    }

    // If we have no data, check if we need to sync from auth system
    if (!data || data.length === 0) {
      console.log('No app_users found, attempting to sync from auth system');
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      if (authUsers && authUsers.users && authUsers.users.length > 0) {
        console.log(`Found ${authUsers.users.length} auth users to sync`);
        // If we're admin and have access to auth system, we could sync here
        // but this would require separate implementation
      }
    }
      
    return mapAppUsers(data || []);
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    toast.error(`Failed to load users: ${error.message || 'Unknown error'}`);
    return [];
  }
};
