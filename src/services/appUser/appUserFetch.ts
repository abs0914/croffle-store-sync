
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all roles");
    
    // First check if the current user is admin/owner via email
    const { data: userData } = await supabase.auth.getUser();
    const userEmail = userData?.user?.email;
    
    let data;
    let error;
    
    if (userEmail === 'admin@example.com' || userEmail === 'owner@example.com') {
      // Admin/owner can directly query all users
      const query = supabase.from('app_users').select('*');
      
      if (storeId) {
        query.filter('store_ids', 'cs', `{${storeId}}`);
      }
      
      const response = await query;
      data = response.data;
      error = response.error;
    } else {
      // For non-admins, limit to their own user record
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        const response = await supabase
          .from('app_users')
          .select('*')
          .eq('user_id', authData.user.id);
          
        data = response.data;
        error = response.error;
      } else {
        throw new Error('User not authenticated');
      }
    }
    
    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
      
    return mapAppUsers(data || []);
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    throw error;
  }
};
