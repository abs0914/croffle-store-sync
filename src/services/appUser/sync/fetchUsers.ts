
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
