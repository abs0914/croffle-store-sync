
import { supabase } from "@/integrations/supabase/client";
import { AppUser } from "@/types/appUser";
import { mapAppUsers } from "./appUserHelpers";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all stores");
    
    let data;
    let error;
    
    // Use direct queries instead of RPC functions
    if (storeId) {
      // Query for users with access to specific store
      const response = await supabase
        .from('app_users')
        .select('*')
        .containedBy('store_ids', [storeId]);
      data = response.data;
      error = response.error;
    } else {
      // Query for all users (admin access)
      const response = await supabase
        .from('app_users')
        .select('*');
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
    
    // Direct query instead of RPC function
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.error('Error fetching current user info:', error);
      throw new Error(error.message || 'Failed to load user information');
    }
    
    if (!data) {
      console.log('No user found with the provided email');
      return null;
    }
    
    // Map and return the user
    const mappedUsers = mapAppUsers([data]);
    return mappedUsers[0];
  } catch (error: any) {
    console.error('Error in fetchCurrentUserInfo:', error);
    throw error;
  }
};
