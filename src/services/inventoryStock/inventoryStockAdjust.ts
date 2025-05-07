
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Update inventory stock quantity
export const adjustInventoryStock = async (
  id: string,
  newQuantity: number,
  notes?: string
): Promise<boolean> => {
  try {
    // Get current quantity first
    const { data: stockItem, error: fetchError } = await supabase
      .from("inventory_stock")
      .select("stock_quantity")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    
    const previousQuantity = stockItem?.stock_quantity || 0;
    
    // Update the stock quantity
    const { error: updateError } = await supabase
      .from("inventory_stock")
      .update({ stock_quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq("id", id);
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    // Create inventory transaction record
    const { error: transactionError } = await supabase
      .from("inventory_transactions")
      .insert({
        product_id: id, // Using the inventory stock item's ID
        store_id: (await supabase.from("inventory_stock").select("store_id").eq("id", id).single()).data?.store_id,
        transaction_type: 'adjustment',
        quantity: Math.abs(newQuantity - previousQuantity),
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        notes
      });
    
    if (transactionError) {
      throw new Error(transactionError.message);
    }
    
    toast.success("Inventory stock updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating inventory stock:", error);
    toast.error("Failed to update inventory stock");
    return false;
  }
};
