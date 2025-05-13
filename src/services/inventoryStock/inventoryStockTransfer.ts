
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
      .from('inventory_stock')
      .select("stock_quantity, item, unit, store_id")
      .eq("id", sourceId)
      .single();
    
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    
    // Type assertion
    const typedSourceItem = sourceItem as unknown as { 
      stock_quantity: number; 
      item: string; 
      unit: string; 
      store_id: string 
    };
    
    if (!typedSourceItem) {
      throw new Error("Source inventory item not found");
    }
    
    if (typedSourceItem.stock_quantity < quantity) {
      toast.error("Not enough stock available for transfer");
      return false;
    }

    const previousSourceQuantity = typedSourceItem.stock_quantity;
    
    // Get current user for the transaction record
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;
    
    // Call the database function we created during migration
    const { error: transactionError } = await supabase.rpc('transfer_inventory_stock', {
      p_source_id: sourceId,
      p_target_store_id: targetStoreId,
      p_item: typedSourceItem.item,
      p_unit: typedSourceItem.unit,
      p_quantity: quantity,
      p_notes: notes || "Stock transfer",
      p_user_id: userId
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
