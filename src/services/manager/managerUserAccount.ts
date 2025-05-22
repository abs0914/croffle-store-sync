
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
        
        // Try to find an existing manager record by email
        const { data: existingManagers, error: lookupError } = await supabase
          .from('managers')
          .select('*')
          .eq('email', data.email);
        
        if (lookupError) {
          console.error('Error finding existing managers:', lookupError);
          toast.error(`Database lookup error: ${lookupError.message}`);
          return null;
        }
        
        // Check if we found any manager records
        if (!existingManagers || existingManagers.length === 0) {
          console.log('No existing manager record found, creating new one');
          
          // Create a new manager record since one doesn't exist
          const { data: newManagerData, error: createError } = await supabase
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
          
          if (createError) {
            console.error('Error creating manager:', createError);
            toast.error(`Failed to create manager record: ${createError.message}`);
            return null;
          }
          
          // Update user metadata to ensure role is set to manager
          try {
            // We can't update other users without admin privileges,
            // but we can log this information for debugging
            console.log('Note: Make sure user has manager role in Supabase Auth console');
          } catch (error: any) {
            console.warn('Could not verify user role:', error);
          }
          
          toast.success('Manager created successfully');
          return {
            id: newManagerData.id,
            fullName: `${newManagerData.first_name} ${newManagerData.last_name}`,
            email: newManagerData.email,
            contactNumber: newManagerData.contact_number,
            storeIds: newManagerData.store_ids,
            isActive: newManagerData.is_active
          };
        } 
        
        // If we have more than one manager with this email, use the first one
        const managerToUpdate = existingManagers[0];
        
        // Update the existing manager record
        const { data: updatedManagerData, error: updateError } = await supabase
          .from('managers')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            contact_number: data.contactNumber,
            store_ids: data.storeIds,
            is_active: true
          })
          .eq('id', managerToUpdate.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating manager:', updateError);
          toast.error(`Failed to update manager record: ${updateError.message}`);
          return null;
        }
        
        // Log information about ensuring user has manager role
        console.log('Note: Make sure user has manager role in Supabase Auth console');
        
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
