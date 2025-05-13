
import { supabase } from "@/integrations/supabase/client";
import { InventoryStock } from "@/types";
import { toast } from "sonner";

// Create a new inventory stock item
export const createInventoryStockItem = async (stockItem: Omit<InventoryStock, "id">): Promise<InventoryStock | null> => {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .insert(stockItem)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Inventory item created successfully");
    return data as InventoryStock;
  } catch (error) {
    console.error("Error creating inventory stock item:", error);
    toast.error("Failed to create inventory item");
    return null;
  }
};
