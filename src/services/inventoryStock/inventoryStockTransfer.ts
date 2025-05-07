
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Transfer inventory stock between stores
export const transferInventoryStock = async (
  sourceId: string, 
  targetStoreId: string, 
  quantity: number,
  notes?: string
): Promise<boolean> => {
  try {
    // Get current stock item first
    const { data: sourceItem, error: fetchError } = await supabase
      .from("inventory_stock")
      .select("stock_quantity, item, unit, store_id")
      .eq("id", sourceId)
      .single();
    
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    
    if (!sourceItem) {
      throw new Error("Source inventory item not found");
    }
    
    if (sourceItem.stock_quantity < quantity) {
      toast.error("Not enough stock available for transfer");
      return false;
    }

    const previousSourceQuantity = sourceItem.stock_quantity;
    const newSourceQuantity = previousSourceQuantity - quantity;
    
    // Begin a transaction for consistency
    const { error: transactionError } = await supabase.rpc('transfer_inventory_stock', {
      p_source_id: sourceId,
      p_target_store_id: targetStoreId,
      p_item: sourceItem.item,
      p_unit: sourceItem.unit,
      p_quantity: quantity,
      p_notes: notes || "Stock transfer",
      p_user_id: (await supabase.auth.getUser()).data.user?.id
    });
    
    if (transactionError) {
      console.error("Transfer error:", transactionError);
      toast.error("Failed to transfer stock: " + transactionError.message);
      return false;
    }
    
    toast.success("Stock transferred successfully");
    return true;
  } catch (error) {
    console.error("Error transferring inventory stock:", error);
    toast.error("Failed to transfer inventory stock");
    return false;
  }
};
