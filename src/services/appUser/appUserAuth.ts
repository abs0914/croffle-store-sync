
import { supabase } from "@/integrations/supabase/client";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { toast } from "sonner";
import { createAppUser, updateAppUser } from "./appUserMutations";

export const createAppUserWithAuth = async (
  data: AppUserFormData & { password: string }
): Promise<AppUser | null> => {
  try {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: `${data.firstName} ${data.lastName}`,
          role: data.role
        },
      }
    });

    if (authError) {
      // If the error indicates user already exists, we can proceed
      if (authError.message.includes('already registered')) {
        toast.info('User already exists, linking to existing user account');
        
        // Try to find an existing app_user record by email
        const { data: existingUsers, error: lookupError } = await supabase.rpc(
          'get_current_user_info',
          { user_email: data.email }
        );
        
        if (lookupError) {
          console.error('Error finding existing users:', lookupError);
          toast.error(`Database lookup error: ${lookupError.message}`);
          return null;
        }
        
        // Check if we found any user records
        if (!existingUsers || existingUsers.length === 0) {
          console.log('No existing user record found, creating new one');
          
          return createAppUser(data);
        } 
        
        // If we have a user with this email, update it
        const userToUpdate = existingUsers[0];
        
        return updateAppUser({
          ...data,
          id: userToUpdate.id
        });
      } else {
        // If the error is not about an existing user, it's a genuine error
        console.error('Error creating auth user:', authError);
        toast.error(`Failed to create user account: ${authError.message}`);
        return null;
      }
    }

    if (!authData?.user) {
      toast.error('Failed to create user account');
      return null;
    }

    // Then create the app user record linked to the auth user
    return createAppUser({
      ...data,
      userId: authData.user.id
    });
  } catch (error: any) {
    console.error('Error creating user with auth:', error);
    toast.error(`Failed to create user: ${error.message}`);
    return null;
  }
};

export const setUserPassword = async (email: string, password: string): Promise<boolean> => {
  try {
    // For security, this should only be allowed by admins or the user themselves
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      throw error;
    }
    
    toast.success('Password updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating user password:', error);
    toast.error(`Password update failed: ${error.message}`);
    return false;
  }
};
