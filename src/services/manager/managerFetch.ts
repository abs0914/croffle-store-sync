
import { supabase } from "@/integrations/supabase/client";
import { Manager } from "@/types/manager";

export async function fetchManagers(storeId?: string): Promise<Manager[]> {
  try {
    let query = supabase
      .from('managers')
      .select('*');

    // If storeId is provided, filter by that store
    if (storeId) {
      // Use the contains operator to find managers assigned to this store
      query = query.contains('store_ids', [storeId]);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching managers:', error);
      throw error;
    }
    
    return data.map((manager: any) => ({
      id: manager.id,
      first_name: manager.first_name,
      last_name: manager.last_name,
      fullName: `${manager.first_name} ${manager.last_name}`,
      storeIds: manager.store_ids || [],
      contactNumber: manager.contact_number,
      email: manager.email,
      isActive: manager.is_active
    }));
  } catch (error) {
    console.error('Error in fetchManagers:', error);
    throw error;
  }
}
