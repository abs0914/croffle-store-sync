
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

/**
 * Fetches all app users from the database using secure RPC function
 * This replaces the direct admin API call which requires service role key
 */
export const fetchAppUsers = async (): Promise<any[]> => {
  try {
    const { data: appUsers, error: appUsersError } = await supabase.rpc('get_all_users');
    
    if (appUsersError) {
      console.error("Failed to fetch app_users:", appUsersError);
      toast.error("Failed to fetch app users");
      return [];
    }

    return appUsers || [];
  } catch (error: any) {
    console.error("Error fetching app users:", error);
    toast.error("Error fetching app users");
    return [];
  }
};

/**
 * Fetches auth users that need to be synced to app_users table
 * This uses a simple approach that works for small user bases
 */
export const fetchAuthUsers = async (): Promise<User[]> => {
  try {
    // Get current user to verify permissions
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.error("Failed to get current user or not authenticated:", userError);
      return [];
    }
    
    // Get app users to compare with auth users
    const appUsers = await fetchAppUsers();
    const existingUserIds = new Set(appUsers.map(user => user.user_id).filter(Boolean));
    
    // We'll use the admin user's session to list all users
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error("Failed to list auth users:", error);
      toast.error("Failed to fetch users for synchronization");
      return [];
    }
    
    if (!data || !data.users) {
      console.error("Unexpected response format from auth.admin.listUsers");
      return [];
    }
    
    // Explicitly type the users array as User[] to fix the 'never' issue
    const authUsers = data.users as User[];
    
    // Filter to only users that don't have app_user records
    const usersToSync = authUsers.filter(user => !existingUserIds.has(user.id));
    console.log(`Found ${usersToSync.length} auth users that need app_user records`);
    
    return usersToSync;
  } catch (error: any) {
    console.error("Error fetching auth users:", error);
    toast.error("Error fetching auth users");
    return [];
  }
};

/**
 * Creates a map of existing app users by email for quick lookup
 */
export const mapAppUsersByEmail = (appUsers: any[]): Map<string, any> => {
  const existingAppUsersByEmail = new Map<string, any>();
  appUsers.forEach((user) => {
    if (user.email) {
      existingAppUsersByEmail.set(user.email.toLowerCase(), user);
    }
  });
  return existingAppUsersByEmail;
};

/**
 * Creates a map of existing app users by user_id for quick lookup
 */
export const mapAppUsersByUserId = (appUsers: any[]): Map<string, any> => {
  const appUsersByUserId = new Map<string, any>();
  appUsers.forEach((user) => {
    if (user.user_id) {
      appUsersByUserId.set(user.user_id, user);
    }
  });
  return appUsersByUserId;
};
