
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all stores");
    
    let data;
    let error;
    
    // Use the appropriate RPC function based on the parameters
    if (storeId) {
      // Use get_store_users RPC function for store-specific users
      const response = await supabase.rpc('get_store_users', { store_id_param: storeId });
      data = response.data;
      error = response.error;
    } else {
      // Use get_all_users RPC function for all users (admin access)
      const response = await supabase.rpc('get_all_users');
      data = response.data;
      error = response.error;
    }
    
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
    throw error; // Let the calling function handle the error display
  }
};

// For fetching a single user (e.g., current user)
export const fetchCurrentUserInfo = async (email: string): Promise<AppUser | null> => {
  try {
    console.log(`Fetching user info for: ${email}`);
    
    // Use get_current_user_info RPC function
    const { data, error } = await supabase.rpc('get_current_user_info', { user_email: email });
    
    if (error) {
      console.error('Error fetching current user info:', error);
      throw new Error(error.message || 'Failed to load user information');
    }
    
    if (!data || data.length === 0) {
      console.log('No user found with the provided email');
      return null;
    }
    
    // Map and return the user
    const mappedUsers = mapAppUsers(data);
    return mappedUsers[0];
  } catch (error: any) {
    console.error('Error in fetchCurrentUserInfo:', error);
    throw error;
  }
};
