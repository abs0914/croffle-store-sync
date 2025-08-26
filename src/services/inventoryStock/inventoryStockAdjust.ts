
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Enhanced retry logic for inventory operations
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on permission or validation errors
      if (error?.code === 'PGRST301' || error?.code === '42501' || error?.message?.includes('permission')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.log(`Inventory operation attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
};

// Update inventory stock quantity with enhanced reliability
export const adjustInventoryStock = async (
  id: string,
  newQuantity: number,
  notes?: string
): Promise<boolean> => {
  try {
    return await retryOperation(async () => {
      // Get current quantity first
      const { data: stockItem, error: fetchError } = await supabase
        .from("inventory_stock")
        .select("stock_quantity, store_id")
        .eq("id", id)
        .single();
      
      if (fetchError) {
        throw new Error(`Failed to fetch current stock: ${fetchError.message}`);
      }
      
      const previousQuantity = stockItem?.stock_quantity || 0;
      const storeId = stockItem?.store_id;
      
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update the stock quantity
      const { error: updateError } = await supabase
        .from("inventory_stock")
        .update({ 
          stock_quantity: newQuantity, 
          serving_ready_quantity: newQuantity, // Also update serving ready quantity
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);
      
      if (updateError) {
        throw new Error(`Failed to update stock: ${updateError.message}`);
      }
      
      // Create inventory transaction record for audit trail
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: id,
          store_id: storeId,
          transaction_type: 'adjustment',
          quantity: Math.abs(newQuantity - previousQuantity),
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          created_by: user?.id,
          notes: notes || `Inventory adjusted from ${previousQuantity} to ${newQuantity}`
        });
      
      if (transactionError) {
        console.warn("Failed to create transaction record:", transactionError);
        // Don't fail the entire operation for audit log issues
      }
      
      // Log sync result for debugging
      try {
        await supabase.rpc('log_inventory_sync_result', {
          p_transaction_id: crypto.randomUUID(),
          p_sync_status: 'success',
          p_items_processed: 1,
          p_affected_inventory_items: JSON.stringify([{
            item_id: id,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity
          }])
        });
      } catch (logError) {
        console.warn("Failed to log sync result:", logError);
        // Don't fail the entire operation for logging issues
      }
      
      toast.success("Inventory stock updated successfully");
      return true;
    });
  } catch (error: any) {
    console.error("Error updating inventory stock:", error);
    
    // Enhanced error messages
    if (error?.message?.includes('permission')) {
      toast.error("Permission denied: Unable to update inventory");
    } else if (error?.message?.includes('network')) {
      toast.error("Network error: Please check your connection and try again");
    } else {
      toast.error("Failed to update inventory stock");
    }
    
    return false;
  } finally {
    // Success message is shown by the calling component
    console.log(`Inventory adjustment completed for item ${id}: ${newQuantity} units`);
  }
};
