
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Update ingredient stock quantity
export const updateIngredientStock = async (
  id: string,
  newQuantity: number,
  transactionType: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer',
  storeId: string,
  userId: string,
  notes?: string
): Promise<boolean> => {
  try {
    // Get current quantity first
    const { data: ingredient, error: fetchError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", id)
      .single();
    
    if (fetchError) {
      throw new Error(fetchError.message);
    }
    
    const previousQuantity = ingredient?.stock_quantity || 0;
    
    // Update the ingredient quantity
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: newQuantity })
      .eq("id", id);
    
    if (updateError) {
      throw new Error(updateError.message);
    }
    
    // Create inventory transaction record
    const { error: transactionError } = await supabase
      .from("inventory_transactions")
      .insert({
        product_id: id,
        store_id: storeId,
        transaction_type: transactionType,
        quantity: Math.abs(newQuantity - previousQuantity),
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        created_by: userId,
        notes
      });
    
    if (transactionError) {
      throw new Error(transactionError.message);
    }
    
    toast.success("Ingredient stock updated successfully");
    return true;
  } catch (error) {
    console.error("Error updating ingredient stock:", error);
    toast.error("Failed to update ingredient stock");
    return false;
  }
};
