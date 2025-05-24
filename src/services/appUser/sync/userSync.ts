
import { AppUserFormData } from "@/types/appUser";
import { createAppUser } from "../appUserMutations";
import { toast } from "sonner";
import { SyncResult, SyncResultItem } from "./types";
import { fetchAppUsers, fetchAuthUsers, mapAppUsersByEmail } from "./fetchUsers";
import { supabase } from "@/integrations/supabase/client";

/**
 * Synchronizes Auth users with app_users table
 * Uses simplified approach that works well for small user bases
 */
export const syncAuthWithAppUsers = async (): Promise<SyncResult> => {
  try {
    // Get current session to check permissions
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      return { created: 0, errors: ["Not authenticated"] };
    }
    
    // Get all app_users using the secure RPC function
    const appUsers = await fetchAppUsers();
    if (!Array.isArray(appUsers)) {
      console.error("Unexpected format for app users data");
      toast.error("Failed to fetch app user data");
      return { created: 0, errors: ["Failed to fetch app user data"] };
    }
    
    // Create a map of existing app_users by email for quick lookup
    const existingAppUsersByEmail = mapAppUsersByEmail(appUsers);
    
    // Get auth users that need to be synced
    const authUsersToSync = await fetchAuthUsers();
    
    if (!authUsersToSync || !Array.isArray(authUsersToSync) || authUsersToSync.length === 0) {
      console.log("No users to synchronize");
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
          const userMetadata = authUser.user_metadata || {};
          const firstName = userMetadata?.name
            ? userMetadata.name.split(' ')[0]
            : authUser.email.split('@')[0];
          
          const lastName = userMetadata?.name && userMetadata.name.includes(' ')
            ? userMetadata.name.split(' ').slice(1).join(' ')
            : "";
          
          // Default to 'cashier' role unless specified in user metadata
          const role = userMetadata?.role || "cashier";
          
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
