
import { User } from '@supabase/supabase-js';
import { AppUserFormData } from "@/types/appUser";
import { createAppUser } from "../appUserMutations";
import { toast } from "sonner";
import { SyncResult, SyncResultItem } from "./types";
import { fetchAppUsers, fetchAuthUsers, mapAppUsersByEmail } from "./fetchUsers";

/**
 * Synchronizes Auth users with app_users table
 * Checks for Auth users that don't have corresponding app_users entries and creates them
 */
export const syncAuthWithAppUsers = async (): Promise<SyncResult> => {
  try {
    // Get all auth users
    const authUsers = await fetchAuthUsers();
    if (authUsers.length === 0) {
      return { created: 0, errors: ["Failed to fetch auth users"] };
    }

    // Get all app_users
    const appUsers = await fetchAppUsers();
    if (appUsers.length === 0 && authUsers.length > 0) {
      // This might be an error state or just a new system
      console.log("No app users found but auth users exist. Will create app users.");
    }

    // Create a map of existing app_users by email for quick lookup
    const existingAppUsersByEmail = mapAppUsersByEmail(appUsers);

    // Find auth users without corresponding app_users (ensuring email exists)
    const missingUsers = authUsers.filter(
      (authUser) => {
        return authUser && typeof authUser.email === 'string' && 
          !existingAppUsersByEmail.has(authUser.email.toLowerCase());
      }
    );

    console.log(`Found ${missingUsers.length} auth users without app_user records`);

    // Create app_user entries for missing users
    const results: SyncResultItem[] = await Promise.all(
      missingUsers.map(async (authUser: User) => {
        try {
          if (!authUser.email) return { success: false, error: "Missing email" };

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
