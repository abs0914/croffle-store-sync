
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
    // First create the auth user
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

    // Then create the manager record linked to the user
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
