
import { supabase } from "@/integrations/supabase/client";
import { InventoryStock } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchInventoryStock = async (storeId: string): Promise<InventoryStock[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory stock:', error);
    toast.error('Failed to fetch inventory stock');
    return [];
  }
};
