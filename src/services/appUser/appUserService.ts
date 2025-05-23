
import { supabase } from "@/integrations/supabase/client";
import { AppUser, AppUserFormData } from "@/types/appUser";
import { toast } from "sonner";

export const fetchAppUsers = async (storeId?: string): Promise<AppUser[]> => {
  try {
    console.log("Fetching app users", storeId ? `for store: ${storeId}` : "for all roles");
    
    // Use direct database query instead of RPC until TypeScript types are updated
    let query;
    
    if (storeId) {
      console.log(`Fetching users for store: ${storeId} using direct query`);
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .filter('store_ids', 'cs', `{${storeId}}`);
      
      if (error) {
        console.error('Error fetching store users with direct query:', error);
        throw error;
      }
      
      return mapAppUsers(data || []);
    } else {
      console.log('Fetching all users using direct query');
      const { data, error } = await supabase
        .from('app_users')
        .select('*');
      
      if (error) {
        console.error('Error fetching all users with direct query:', error);
        // Alternative attempt with another approach if the first fails
        const { data: directData, error: directError } = await supabase
          .from('app_users')
          .select('*');
          
        if (directError) {
          console.error('Direct query also failed:', directError);
          throw directError;
        }
        
        return mapAppUsers(directData || []);
      }
      
      return mapAppUsers(data || []);
    }
  } catch (error: any) {
    console.error('Error in fetchAppUsers:', error);
    throw error;
  }
};

// Helper function to map app users from database result
const mapAppUsers = (data: any[]): AppUser[] => {
  console.log(`Mapping ${data.length} app users`);
  return data.map((user): AppUser => ({
    id: user.id,
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    email: user.email,
    contactNumber: user.contact_number,
    role: user.role,
    storeIds: user.store_ids || [],
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
};

// Helper function to map app users from RPC result (column names might be different)
const mapAppUsersFromRPC = (data: any[]): AppUser[] => {
  console.log(`Mapping ${data.length} app users from RPC`);
  return data.map((user): AppUser => ({
    id: user.id,
    userId: user.user_id,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    email: user.email,
    contactNumber: user.contact_number,
    role: user.role,
    storeIds: user.store_ids || [],
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }));
};

export const createAppUser = async (data: AppUserFormData): Promise<AppUser | null> => {
  try {
    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        user_id: data.userId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        role: data.role,
        store_ids: data.storeIds,
        is_active: data.isActive
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating app user:', error);
      toast.error(`Failed to create user: ${error.message}`);
      return null;
    }

    toast.success('User created successfully');
    return {
      id: newUser.id,
      userId: newUser.user_id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      fullName: `${newUser.first_name} ${newUser.last_name}`,
      email: newUser.email,
      contactNumber: newUser.contact_number,
      role: newUser.role,
      storeIds: newUser.store_ids || [],
      isActive: newUser.is_active,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };
  } catch (error: any) {
    console.error('Error in createAppUser:', error);
    toast.error(`Failed to create user: ${error.message}`);
    return null;
  }
};

export const updateAppUser = async (data: AppUserFormData): Promise<AppUser | null> => {
  try {
    if (!data.id) {
      toast.error('User ID is required for update');
      return null;
    }

    const { data: updatedUser, error } = await supabase
      .from('app_users')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        role: data.role,
        store_ids: data.storeIds,
        is_active: data.isActive
      })
      .eq('id', data.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating app user:', error);
      toast.error(`Failed to update user: ${error.message}`);
      return null;
    }

    toast.success('User updated successfully');
    return {
      id: updatedUser.id,
      userId: updatedUser.user_id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      fullName: `${updatedUser.first_name} ${updatedUser.last_name}`,
      email: updatedUser.email,
      contactNumber: updatedUser.contact_number,
      role: updatedUser.role,
      storeIds: updatedUser.store_ids || [],
      isActive: updatedUser.is_active,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };
  } catch (error: any) {
    console.error('Error in updateAppUser:', error);
    toast.error(`Failed to update user: ${error.message}`);
    return null;
  }
};

export const deleteAppUser = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting app user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
      return false;
    }

    toast.success('User deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error in deleteAppUser:', error);
    toast.error(`Failed to delete user: ${error.message}`);
    return false;
  }
};

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
        const { data: existingUsers, error: lookupError } = await supabase
          .from('app_users')
          .select('*')
          .eq('email', data.email);
        
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

export const resetAppUserPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin + '/password-reset'
      }
    );
    
    if (error) {
      throw error;
    }
    
    toast.success('Password reset link has been sent to the user\'s email');
    return true;
  } catch (error: any) {
    console.error('Error resetting user password:', error);
    toast.error(`Password reset failed: ${error.message}`);
    return false;
  }
};
