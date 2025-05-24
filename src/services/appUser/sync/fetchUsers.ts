
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
 * This uses a secure RPC function instead of admin API
 */
export const fetchAuthUsers = async (): Promise<any[]> => {
  try {
    // Get auth users that need to be synced (those without app_user records)
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Failed to get current user:", error);
      return [];
    }
    
    // We need to check if the user has admin/owner privileges
    if (!data?.user) {
      console.error("No authenticated user");
      return [];
    }
    
    // Now get users that need syncing using our RPC function
    const { data: authUsers, error: authError } = await supabase.rpc('get_users_needing_sync');
    
    if (authError) {
      if (authError.message.includes('structure of query does not match function result type')) {
        console.error("Schema mismatch in get_users_needing_sync function:", authError);
        toast.error("Database function needs updating. Please contact support.");
      } else {
        console.error("Failed to fetch auth users for sync:", authError);
        toast.error("Failed to fetch users for synchronization");
      }
      return [];
    }

    console.log("Users needing sync:", authUsers);
    return authUsers || [];
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
