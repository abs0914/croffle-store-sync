
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Manager } from "@/types/manager";

export interface ManagerSignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  storeIds: string[];
  contactNumber?: string;
}

export const createManagerWithAuth = async (data: ManagerSignupData): Promise<Manager | null> => {
  try {
    // First check if user already exists
    const { data: existingUsers, error: lookupError } = await supabase.auth.admin.listUsers({
      // The filter param is not supported in the TypeScript definition
      // We need to use a different approach to find existing users
    });

    if (lookupError) {
      console.error('Error looking up user:', lookupError);
      toast.error(`Error checking if user exists: ${lookupError.message}`);
      return null;
    }

    // Find user with matching email if they exist
    const existingUser = existingUsers?.users.find(user => 
      user.email?.toLowerCase() === data.email.toLowerCase()
    );
    
    let userId;

    // If user doesn't exist, create them
    if (!existingUser) {
      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: `${data.firstName} ${data.lastName}`,
            role: 'manager'
          },
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        toast.error(`Failed to create manager account: ${authError.message}`);
        return null;
      }

      if (!authData.user) {
        toast.error('Failed to create user account');
        return null;
      }

      userId = authData.user.id;
    } else {
      // User exists, use the existing user ID
      userId = existingUser.id;
      toast.info('User already exists, linking manager record to existing user');
    }

    // Then create the manager record linked to the user
    // Use the service role client for this operation to bypass RLS
    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .insert({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        contact_number: data.contactNumber,
        store_ids: data.storeIds,
        is_active: true,
        user_id: userId  // Link the manager to the auth user
      })
      .select()
      .single();

    if (managerError) {
      console.error('Error creating manager:', managerError);
      toast.error(`Failed to create manager record: ${managerError.message}`);
      return null;
    }

    toast.success('Manager created successfully');
    return {
      id: managerData.id,
      fullName: `${managerData.first_name} ${managerData.last_name}`,
      email: managerData.email,
      contactNumber: managerData.contact_number,
      storeIds: managerData.store_ids,
      isActive: managerData.is_active
    };
  } catch (error: any) {
    console.error('Error creating manager with auth:', error);
    toast.error(`Failed to create manager: ${error.message}`);
    return null;
  }
};

// Add a function to reset manager password
export const resetManagerPassword = async (managerId: string, newPassword: string): Promise<boolean> => {
  try {
    // For security, we don't directly access auth.users
    // Instead we use the admin API which requires the service role key
    const { error } = await supabase.auth.admin.updateUserById(
      managerId,
      { password: newPassword }
    );
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error: any) {
    console.error('Error resetting manager password:', error);
    toast.error(`Password reset failed: ${error.message}`);
    return false;
  }
};
