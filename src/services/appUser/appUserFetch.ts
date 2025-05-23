
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";
import { toast } from "sonner";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all users");
    
    // Use standard query instead of RPC functions to avoid type issues
    const query = supabase.from('app_users').select('*');
    
    // If a store ID is provided, filter by that store
    if (storeId) {
      query.filter('store_ids', 'cs', `{${storeId}}`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching app users:', error);
      toast.error(`Failed to load users: ${error.message || 'Unknown error'}`);
      return [];
    }

    // If we have no data, check if we need to sync from auth system
    if (!data || data.length === 0) {
      console.log('No app_users found, could attempt to sync from auth system');
      // We're simplifying by not attempting to access auth system
    }
      
    return mapAppUsers(data || []);
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    toast.error(`Failed to load users: ${error.message || 'Unknown error'}`);
    return [];
  }
};
