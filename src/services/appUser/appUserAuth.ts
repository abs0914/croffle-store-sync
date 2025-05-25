
import { supabase } from "@/integrations/supabase/client";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { toast } from "sonner";
import { createAppUser, updateAppUser } from "./appUserMutations";
import { User } from '@supabase/supabase-js';

export const createAppUserWithAuth = async (
  data: AppUserFormData & { password: string }
): Promise<AppUser | null> => {
  try {
    // First check if user already exists by email (using RPC function instead of admin API)
    const { data: existingUsers, error: lookupError } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', data.email)
      .maybeSingle();

    // Initialize variables
    let authUser: User | null = null;

    if (lookupError) {
      console.error('Error checking for existing user:', lookupError);
      toast.error(`Database lookup error: ${lookupError.message}`);
      return null;
    }

    // If we found a matching user in app_users, they might exist in auth
    if (existingUsers && existingUsers.user_id) {
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
        console.log('User already exists in auth system:', data.email);
        toast.info('User already exists in authentication system');
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
    const { data: existingAppUser } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', data.email)
      .maybeSingle();

    // Check if we found a user record
    if (!existingAppUser) {
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
      id: existingAppUser.id,
      userId: authUser.id
    });
  } catch (error: any) {
    console.error('Error creating user with auth:', error);
    // Only show toast for non-RLS policy errors to avoid duplicate creation noise
    if (!error.message?.includes('row-level security policy')) {
      toast.error(`Failed to create user: ${error.message}`);
    }
    return null;
  }
};

export const setUserPassword = async (email: string, password: string): Promise<boolean> => {
  try {
    // Check if the user exists in app_users to get their user_id
    const { data: appUser, error: userError } = await supabase
      .from('app_users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (userError || !appUser || !appUser.user_id) {
      console.error('Error finding user:', userError || 'No user found');
      toast.error('User not found in the system');
      return false;
    }

    // Create a secure password reset instead of directly setting the password
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: window.location.origin + '/reset-password' }
    );

    if (resetError) {
      console.error('Error resetting user password:', resetError);
      toast.error(`Password update failed: ${resetError.message}`);
      return false;
    }

    toast.success('Password reset link sent to the user\'s email');
    return true;
  } catch (error: any) {
    console.error('Error updating user password:', error);
    toast.error(`Password update failed: ${error.message}`);
    return false;
  }
};
