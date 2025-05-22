
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
    // First check if user already exists using the sign-up API instead of admin API
    // This will create the user or return an error if it already exists
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
      // If the error indicates user already exists, we can proceed
      if (authError.message.includes('already registered')) {
        toast.info('User already exists, linking manager record to existing user');
        
        // Get the existing user ID through a lookup
        const { data: userData, error: userError } = await supabase
          .from('managers')
          .select('user_id')
          .eq('email', data.email)
          .single();
        
        if (userError || !userData?.user_id) {
          console.error('Error finding existing user:', userError);
          toast.error(`Unable to link to existing user: ${userError?.message || 'User not found'}`);
          return null;
        }
        
        // Use the existing user ID
        const userId = userData.user_id;
        
        // Update the existing manager record or create a new one
        const { data: managerData, error: managerError } = await supabase
          .from('managers')
          .upsert({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            contact_number: data.contactNumber,
            store_ids: data.storeIds,
            is_active: true,
            user_id: userId
          })
          .select()
          .single();
        
        if (managerError) {
          console.error('Error updating manager:', managerError);
          toast.error(`Failed to update manager record: ${managerError.message}`);
          return null;
        }
        
        toast.success('Manager updated successfully');
        return {
          id: managerData.id,
          fullName: `${managerData.first_name} ${managerData.last_name}`,
          email: managerData.email,
          contactNumber: managerData.contact_number,
          storeIds: managerData.store_ids,
          isActive: managerData.is_active
        };
      } else {
        // If the error is not about an existing user, it's a genuine error
        console.error('Error creating auth user:', authError);
        toast.error(`Failed to create manager account: ${authError.message}`);
        return null;
      }
    }

    // If we got here, the user was created successfully
    if (!authData?.user) {
      toast.error('Failed to create user account');
      return null;
    }

    // Get the new user's ID
    const userId = authData.user.id;

    // Create the manager record linked to the user
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

// Update the reset manager password function
export const resetManagerPassword = async (managerId: string, newPassword: string): Promise<boolean> => {
  try {
    // Instead of directly accessing auth.users, we'll use a different approach
    // First, get the user_id associated with this manager
    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .select('user_id')
      .eq('id', managerId)
      .single();
    
    if (managerError || !managerData?.user_id) {
      throw new Error(managerError?.message || 'Manager not found');
    }
    
    // Generate a password reset link for the user
    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: managerData.email,
      options: {
        redirectTo: window.location.origin + '/password-reset'
      }
    });
    
    if (error) {
      throw error;
    }
    
    toast.success('Password reset link has been generated and sent to the manager\'s email');
    return true;
  } catch (error: any) {
    console.error('Error resetting manager password:', error);
    toast.error(`Password reset failed: ${error.message}`);
    return false;
  }
};
