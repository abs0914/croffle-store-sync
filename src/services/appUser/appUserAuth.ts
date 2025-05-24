
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
        
        // Instead of directly querying app_users, use auth sign-in to get the user details
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (signInError) {
          console.error('Error signing in existing user:', signInError);
          toast.error(`Authentication error: ${signInError.message}`);
          return null;
        }
        
        if (signInData?.user) {
          // Now check if this auth user already has an app_user record
          const { data: existingUsers, error: lookupError } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', data.email)
            .maybeSingle();
          
          if (lookupError) {
            console.error('Error finding existing users:', lookupError);
            toast.error(`Database lookup error: ${lookupError.message}`);
            return null;
          }
          
          // Check if we found a user record
          if (!existingUsers) {
            console.log('No existing user record found, creating new one');
            
            // Create a new app_user record linked to the auth user
            return createAppUser({
              ...data,
              userId: signInData.user.id
            });
          } 
          
          // If we have a user with this email, update it
          console.log('Existing user found, updating record');
          return updateAppUser({
            ...data,
            id: existingUsers.id,
            userId: signInData.user.id
          });
        } else {
          toast.error('Failed to retrieve user information');
          return null;
        }
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
    // Retrieve the admin API key for privileged operations
    const { data: adminData, error: adminError } = await supabase.auth.getSession();
    
    if (adminError || !adminData.session) {
      console.error('Error getting admin session:', adminError);
      toast.error('You must be logged in to change user passwords');
      return false;
    }
    
    // Admin user updates password for another user
    const { error } = await supabase.auth.admin.updateUserById(
      email, // Using email as ID (not strictly correct but needed for our implementation)
      { password: password }
    );
    
    if (error) {
      // Fall back to regular user update if admin update fails
      const { error: userUpdateError } = await supabase.auth.updateUser({
        password: password
      });
      
      if (userUpdateError) {
        console.error('Error updating user password:', userUpdateError);
        toast.error(`Password update failed: ${userUpdateError.message}`);
        return false;
      }
    }
    
    toast.success('Password updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating user password:', error);
    toast.error(`Password update failed: ${error.message}`);
    return false;
  }
};
