
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
        
        // Get the existing manager record through a lookup by email
        const { data: managerData, error: managerLookupError } = await supabase
          .from('managers')
          .select('*')
          .eq('email', data.email)
          .single();
        
        if (managerLookupError) {
          console.error('Error finding existing manager:', managerLookupError);
          toast.error(`Unable to link to existing user: ${managerLookupError?.message || 'Manager not found'}`);
          return null;
        }
        
        // Update the existing manager record
        const { data: updatedManagerData, error: managerUpdateError } = await supabase
          .from('managers')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            contact_number: data.contactNumber,
            store_ids: data.storeIds,
            is_active: true
          })
          .eq('email', data.email)
          .select()
          .single();
        
        if (managerUpdateError) {
          console.error('Error updating manager:', managerUpdateError);
          toast.error(`Failed to update manager record: ${managerUpdateError.message}`);
          return null;
        }
        
        toast.success('Manager updated successfully');
        return {
          id: updatedManagerData.id,
          fullName: `${updatedManagerData.first_name} ${updatedManagerData.last_name}`,
          email: updatedManagerData.email,
          contactNumber: updatedManagerData.contact_number,
          storeIds: updatedManagerData.store_ids,
          isActive: updatedManagerData.is_active
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
        is_active: true
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
    // Get the manager's email
    const { data: managerData, error: managerError } = await supabase
      .from('managers')
      .select('email')
      .eq('id', managerId)
      .single();
    
    if (managerError || !managerData?.email) {
      throw new Error(managerError?.message || 'Manager not found');
    }
    
    // Generate a password reset link for the user
    const { error } = await supabase.auth.resetPasswordForEmail(
      managerData.email,
      {
        redirectTo: window.location.origin + '/password-reset'
      }
    );
    
    if (error) {
      throw error;
    }
    
    toast.success('Password reset link has been sent to the manager\'s email');
    return true;
  } catch (error: any) {
    console.error('Error resetting manager password:', error);
    toast.error(`Password reset failed: ${error.message}`);
    return false;
  }
};
