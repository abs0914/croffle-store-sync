
import { AppUserFormData } from "@/types/appUser";
import { createAppUser } from "../appUserMutations";
import { toast } from "sonner";
import { SyncResult, SyncResultItem } from "./types";
import { fetchAppUsers } from "./fetchUsers";
import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronizes Auth users with app_users table
 * Uses standard auth API instead of admin APIs
 */
export const syncAuthWithAppUsers = async (): Promise<SyncResult> => {
  try {
    // Get current session to check permissions
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      return { created: 0, errors: ["Not authenticated"] };
    }
    
    // Get all app_users using the secure RPC function
    const { data: appUsers, error: appUsersError } = await supabase.rpc('get_all_users');
    
    if (appUsersError) {
      console.error("Error fetching app users:", appUsersError);
      toast.error("Error fetching app users");
      return { created: 0, errors: [appUsersError.message] };
    }
    
    // Create a map of existing app_users by email for quick lookup
    const existingAppUsersByEmail = new Map<string, any>();
    if (Array.isArray(appUsers)) {
      appUsers.forEach((user) => {
        if (user.email) {
          existingAppUsersByEmail.set(user.email.toLowerCase(), user);
        }
      });
    }
    
    // Get auth users that we need to sync (using a secure RPC function)
    const { data: authUsersToSync, error: authError } = await supabase.rpc(
      'get_users_needing_sync'
    );
    
    if (authError) {
      console.error("Error fetching auth users to sync:", authError);
      toast.error("Failed to fetch users that need synchronization");
      return { created: 0, errors: [authError.message] };
    }
    
    if (!authUsersToSync || !Array.isArray(authUsersToSync) || authUsersToSync.length === 0) {
      console.log("No users to synchronize");
      toast.success("All users are already synchronized");
      return { created: 0, errors: [] };
    }
    
    console.log(`Found ${authUsersToSync.length} auth users that need app_user records`);
    
    // Create app_user entries for users that need sync
    const results: SyncResultItem[] = await Promise.all(
      authUsersToSync.map(async (authUser: any) => {
        try {
          if (!authUser.email) return { success: false, error: "Missing email" };
          if (existingAppUsersByEmail.has(authUser.email.toLowerCase())) {
            return { success: true, email: authUser.email, error: null };
          }

          // Extract user metadata
          const firstName = authUser.user_metadata?.name
            ? authUser.user_metadata.name.split(' ')[0]
            : authUser.email.split('@')[0];
          
          const lastName = authUser.user_metadata?.name && authUser.user_metadata.name.includes(' ')
            ? authUser.user_metadata.name.split(' ').slice(1).join(' ')
            : "";
          
          // Default to 'cashier' role unless specified in user metadata
          const role = authUser.user_metadata?.role || "cashier";
          
          // Create new app user
          const userData: AppUserFormData = {
            userId: authUser.id,
            firstName,
            lastName,
            email: authUser.email,
            contactNumber: "",
            role: role as any,
            storeIds: [],
            isActive: true
          };

          const newUser = await createAppUser(userData);
          
          return {
            success: !!newUser,
            email: authUser.email,
            error: null
          };
        } catch (error: any) {
          return {
            success: false,
            email: authUser.email,
            error: error.message
          };
        }
      })
    );

    // Count successes and collect errors
    const created = results.filter(result => result.success).length;
    const errors = results
      .filter(result => !result.success && result.error)
      .map(result => `User ${result.email || 'unknown'}: ${result.error}`);

    if (created > 0) {
      toast.success(`Created ${created} missing app user records`);
    }
    
    return { created, errors };
  } catch (error: any) {
    console.error("Error synchronizing users:", error);
    toast.error("Error synchronizing users");
    return { created: 0, errors: [error.message] };
  }
};
