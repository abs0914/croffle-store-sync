
import { supabase } from "@/integrations/supabase/client";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { toast } from "sonner";
import { createAppUser, updateAppUser } from "./appUserMutations";
import { User } from '@supabase/supabase-js';

export const createAppUserWithAuth = async (
  data: AppUserFormData & { password: string }
): Promise<AppUser | null> => {
  try {
    // First check if user already exists in auth system
    const { data: existingAuthUsers, error: checkError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    let authUser: User | null = null;
    let existingAuthUser: User | null = null;
    
    // If we successfully got auth users, find if the user already exists
    if (!checkError && existingAuthUsers && existingAuthUsers.users && Array.isArray(existingAuthUsers.users)) {
      // Type assertion to tell TypeScript that users have email property
      existingAuthUser = existingAuthUsers.users.find(user => {
        // Check if user exists and has an email property before comparing
        return user && typeof user.email === 'string' && 
          user.email.toLowerCase() === data.email.toLowerCase();
      }) || null;
    }
    
    // If user already exists in auth
    if (existingAuthUser) {
      console.log('User already exists in auth system:', existingAuthUser.email);
      authUser = existingAuthUser;
      toast.info('User already exists in authentication system');
      
      // Try to sign in to verify credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });
      
      if (signInError) {
        console.error('Error signing in existing user:', signInError);
        toast.error(`Authentication error: ${signInError.message}`);
        return null;
      }
      
      // Successfully signed in, update the user with provided data
      if (signInData?.user) {
        authUser = signInData.user;
      }
    } else {
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
        console.error('Error creating auth user:', authError);
        toast.error(`Failed to create user account: ${authError.message}`);
        return null;
      }
      
      if (!authData?.user) {
        toast.error('Failed to create user account');
        return null;
      }
      
      authUser = authData.user;
    }
    
    if (!authUser) {
      toast.error('Failed to create or access user account');
      return null;
    }
    
    // Check if this auth user already has an app_user record
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
        userId: authUser.id
      });
    } 
    
    // If we have a user with this email, update it
    console.log('Existing user found, updating record');
    return updateAppUser({
      ...data,
      id: existingUsers.id,
      userId: authUser.id
    });
  } catch (error: any) {
    console.error('Error creating user with auth:', error);
    toast.error(`Failed to create user: ${error.message}`);
    return null;
  }
};

export const setUserPassword = async (email: string, password: string): Promise<boolean> => {
  try {
    // First check if user exists in auth system
    const { data: existingUsersData, error: checkError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    if (checkError) {
      console.error('Error checking for existing user:', checkError);
      toast.error(`Authentication error: ${checkError.message}`);
      return false;
    }
    
    // Properly type the users array and check for undefined
    const existingUsers = existingUsersData?.users || [];
    
    // Find the user with the matching email
    const matchingUser = existingUsers.find(user => {
      // Check if user and user.email exist before using them
      return user && typeof user.email === 'string' && 
        user.email.toLowerCase() === email.toLowerCase();
    });
    
    // If user doesn't exist in auth system
    if (!matchingUser) {
      toast.error('User does not exist in authentication system');
      return false;
    }
    
    const userId = matchingUser.id;
    
    // Use admin API to update user password
    const { error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: password }
    );
    
    if (error) {
      console.error('Error updating user password:', error);
      toast.error(`Password update failed: ${error.message}`);
      return false;
    }
    
    toast.success('Password updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating user password:', error);
    toast.error(`Password update failed: ${error.message}`);
    return false;
  }
};
