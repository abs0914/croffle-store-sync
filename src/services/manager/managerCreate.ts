
import { supabase } from "@/integrations/supabase/client";
import { ManagerFormData } from "@/types/manager";

export async function createManager(data: ManagerFormData) {
  try {
    const { error } = await supabase.from('managers').insert({
      first_name: data.firstName,
      last_name: data.lastName,
      contact_number: data.contactNumber,
      email: data.email,
      store_ids: data.storeIds,
      is_active: data.isActive
    });
    
    if (error) {
      console.error('Error creating manager:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in createManager:', error);
    throw error;
  }
}
