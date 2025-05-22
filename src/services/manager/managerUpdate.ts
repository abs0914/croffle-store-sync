
import { supabase } from "@/integrations/supabase/client";
import { ManagerFormData } from "@/types/manager";

export async function updateManager({ id, ...data }: ManagerFormData & { id: string }) {
  try {
    const { error } = await supabase
      .from('managers')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        contact_number: data.contactNumber,
        email: data.email,
        store_ids: data.storeIds,
        is_active: data.isActive
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error updating manager:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateManager:', error);
    throw error;
  }
}
