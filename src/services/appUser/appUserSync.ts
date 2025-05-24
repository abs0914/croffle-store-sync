
import { supabase } from "@/integrations/supabase/client";
import { createAppUser, updateAppUser } from "./appUserMutations";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { toast } from "sonner";

/**
 * Synchronizes Auth users with app_users table
 * Checks for Auth users that don't have corresponding app_users entries and creates them
 */
export const syncAuthWithAppUsers = async (): Promise<{ created: number; errors: string[] }> => {
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Failed to fetch auth users:", authError);
      toast.error("Failed to fetch auth users");
      return { created: 0, errors: [authError.message] };
    }

    // Get all app_users
    const { data: appUsers, error: appUsersError } = await supabase.rpc('get_all_users');
    
    if (appUsersError) {
      console.error("Failed to fetch app_users:", appUsersError);
      toast.error("Failed to fetch app users");
      return { created: 0, errors: [appUsersError.message] };
    }

    // Create a map of existing app_users by email for quick lookup
    const existingAppUsersByEmail = new Map();
    appUsers.forEach((user) => {
      if (user.email) {
        existingAppUsersByEmail.set(user.email.toLowerCase(), user);
      }
    });

    // Find auth users without corresponding app_users
    const missingUsers = authUsers.users.filter(
      (authUser) => authUser.email && !existingAppUsersByEmail.has(authUser.email.toLowerCase())
    );

    console.log(`Found ${missingUsers.length} auth users without app_user records`);

    // Create app_user entries for missing users
    const results = await Promise.all(
      missingUsers.map(async (authUser) => {
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
      .map(result => `User ${result.email}: ${result.error}`);

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

/**
 * Updates app_users table with auth users' metadata
 * This can be used to update names and roles from auth metadata
 */
export const updateAppUsersFromAuthMetadata = async (): Promise<{ updated: number; errors: string[] }> => {
  try {
    // Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Failed to fetch auth users:", authError);
      return { updated: 0, errors: [authError.message] };
    }

    // Get all app_users
    const { data: appUsers, error: appUsersError } = await supabase.rpc('get_all_users');
    
    if (appUsersError) {
      console.error("Failed to fetch app_users:", appUsersError);
      return { updated: 0, errors: [appUsersError.message] };
    }

    // Create a map of app_users by user_id for quick lookup
    const appUsersByUserId = new Map();
    appUsers.forEach((user) => {
      if (user.user_id) {
        appUsersByUserId.set(user.user_id, user);
      }
    });

    // Update app_users with auth metadata
    const results = await Promise.all(
      authUsers.users.map(async (authUser) => {
        try {
          const appUser = appUsersByUserId.get(authUser.id);
          if (!appUser) return { success: false, error: "No matching app_user" };

          // Check if we need to update metadata
          const metadata = authUser.user_metadata || {};
          const needsUpdate = 
            (metadata.name && `${appUser.first_name} ${appUser.last_name}`.trim() !== metadata.name) ||
            (metadata.role && appUser.role !== metadata.role);

          if (!needsUpdate) return { success: true, updated: false };

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
      .map(result => `User ${result.email}: ${result.error}`);

    if (updated > 0) {
      toast.success(`Updated ${updated} app users with auth metadata`);
    }
    
    return { updated, errors };
  } catch (error: any) {
    console.error("Error updating users from metadata:", error);
    return { updated: 0, errors: [error.message] };
  }
};
