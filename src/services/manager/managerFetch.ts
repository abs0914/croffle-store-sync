
import { supabase } from "@/integrations/supabase/client";
import { Manager } from "@/types/manager";
import { toast } from "sonner";

export async function fetchManagers(storeId?: string): Promise<Manager[]> {
  try {
    console.log("Fetching managers", storeId ? `for store: ${storeId}` : "for all stores");
    
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
      
      // Check for permission errors (403)
      if (error.code === "PGRST301" || error.message.includes("permission denied")) {
        throw new Error("You don't have permission to view managers");
      }
      
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("No managers found");
      return [];
    }
    
    console.log(`Found ${data.length} managers`);
    
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
  } catch (error: any) {
    console.error('Error in fetchManagers:', error);
    throw error;
  }
}
