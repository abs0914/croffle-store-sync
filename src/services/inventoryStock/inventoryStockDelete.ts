
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Delete an inventory stock item
export const deleteInventoryStockItem = async (id: string): Promise<boolean> => {
  try {
    // Use type assertion to handle the inventory_stock table
    const { error } = await supabase
      .from('inventory_stock')
      .delete()
      .eq("id", id);
    
    if (error) {
      throw new Error(error.message);
    }
    
    toast.success("Inventory item deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting inventory stock item:", error);
    toast.error("Failed to delete inventory item");
    return false;
  }
};
