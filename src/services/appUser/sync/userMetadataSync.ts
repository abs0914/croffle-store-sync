
import { User } from '@supabase/supabase-js';
import { AppUserFormData } from "@/types/appUser";
import { updateAppUser } from "../appUserMutations";
import { toast } from "sonner";
import { UpdateResult, UpdateResultItem } from "./types";
import { fetchAppUsers, fetchAuthUsers, mapAppUsersByUserId } from "./fetchUsers";

/**
 * Updates app_users table with auth users' metadata
 * This can be used to update names and roles from auth metadata
 */
export const updateAppUsersFromAuthMetadata = async (): Promise<UpdateResult> => {
  try {
    // Get all auth users
    const authUsers = await fetchAuthUsers();
    if (authUsers.length === 0) {
      return { updated: 0, errors: ["Failed to fetch auth users"] };
    }

    // Get all app_users
    const appUsers = await fetchAppUsers();
    if (appUsers.length === 0) {
      return { updated: 0, errors: ["No app users found"] };
    }

    // Create a map of app_users by user_id for quick lookup
    const appUsersByUserId = mapAppUsersByUserId(appUsers);

    // Update app_users with auth metadata
    const results: UpdateResultItem[] = await Promise.all(
      authUsers.map(async (authUser: User) => {
        try {
          const appUser = appUsersByUserId.get(authUser.id);
          if (!appUser) return { success: false, updated: false, error: "No matching app_user" };

          // Check if we need to update metadata
          const metadata = authUser.user_metadata || {};
          const needsUpdate = 
            (metadata.name && `${appUser.first_name} ${appUser.last_name}`.trim() !== metadata.name) ||
            (metadata.role && appUser.role !== metadata.role);

          if (!needsUpdate) return { success: true, updated: false, error: null };

          // Update app_user with auth metadata
          const updatedData: AppUserFormData = {
            id: appUser.id,
            userId: appUser.user_id,
            firstName: metadata.name ? metadata.name.split(' ')[0] : appUser.first_name,
            lastName: metadata.name && metadata.name.includes(' ')
              ? metadata.name.split(' ').slice(1).join(' ')
              : appUser.last_name,
            email: appUser.email || "",
            contactNumber: appUser.contact_number || "",
            role: metadata.role || appUser.role,
            storeIds: appUser.store_ids || [],
            isActive: appUser.is_active
          };

          const updated = await updateAppUser(updatedData);
          
          return {
            success: !!updated,
            updated: true,
            email: appUser.email,
            error: null
          };
        } catch (error: any) {
          return {
            success: false,
            updated: false,
            email: authUser.email,
            error: error.message
          };
        }
      })
    );

    // Count successes and collect errors
    const updated = results.filter(result => result.success && result.updated).length;
    const errors = results
      .filter(result => !result.success && result.error)
      .map(result => `User ${result.email || 'unknown'}: ${result.error}`);

    if (updated > 0) {
      toast.success(`Updated ${updated} app users with auth metadata`);
    }
    
    return { updated, errors };
  } catch (error: any) {
    console.error("Error updating users from metadata:", error);
    return { updated: 0, errors: [error.message] };
  }
};
