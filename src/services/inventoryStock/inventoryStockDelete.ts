
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Delete an inventory stock item (or deactivate if referenced)
export const deleteInventoryStockItem = async (id: string): Promise<boolean> => {
  try {
    // First check if this item is referenced in purchase orders
    const { data: purchaseOrderItems } = await supabase
      .from('purchase_order_items')
      .select('id')
      .eq('inventory_stock_id', id)
      .limit(1);

    if (purchaseOrderItems && purchaseOrderItems.length > 0) {
      // Item is referenced, deactivate instead of delete
      const { error } = await supabase
        .from('inventory_stock')
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success("Inventory item deactivated (cannot delete - referenced in purchase orders)");
      return true;
    }

    // No references found, safe to delete
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
