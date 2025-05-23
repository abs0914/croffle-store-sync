
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all roles");
    
    let data;
    let error;
    
    if (storeId) {
      // Use the RPC function to get users for a specific store
      const response = await supabase.rpc('get_store_app_users', { 
        store_id_param: storeId 
      });
      data = response.data;
      error = response.error;
    } else {
      // Use the RPC function to get all users or just the current user
      const response = await supabase.rpc('get_all_app_users');
      data = response.data;
      error = response.error;
    }
    
    if (error) {
      // If RPC functions fail (they might not exist yet after migration error),
      // fall back to direct query method with error handling
      console.error('RPC function error, falling back to direct query:', error);
      
      const { data: authData } = await supabase.auth.getUser();
      const email = authData?.user?.email;
      
      if (email === 'admin@example.com' || email === 'owner@example.com') {
        // Admin/owner can directly query all users
        const query = supabase.from('app_users').select('*');
        
        if (storeId) {
          query.filter('store_ids', 'cs', `{${storeId}}`);
        }
        
        const fallbackResponse = await query;
        data = fallbackResponse.data;
        error = fallbackResponse.error;
      } else {
        // For non-admins, limit to their own user record
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          const fallbackResponse = await supabase
            .from('app_users')
            .select('*')
            .eq('user_id', userData.user.id);
            
          data = fallbackResponse.data;
          error = fallbackResponse.error;
        } else {
          throw new Error('User not authenticated');
        }
      }
      
      if (error) {
        throw error;
      }
    }
      
    return mapAppUsers(data || []);
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    throw error;
  }
};
