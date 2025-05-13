
import { supabase } from "@/integrations/supabase/client";
import { InventoryStock } from "@/types";
import { toast } from "sonner";

// Update an inventory stock item
export const updateInventoryStockItem = async (id: string, updates: Partial<InventoryStock>): Promise<InventoryStock | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Inventory item updated successfully");
    return data as InventoryStock;
  } catch (error) {
    console.error("Error updating inventory stock item:", error);
    toast.error("Failed to update inventory item");
    return null;
  }
};
