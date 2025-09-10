
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TransactionType = 
  | 'sale' 
  | 'return' 
  | 'adjustment' 
  | 'transfer_in' 
  | 'transfer_out' 
  | 'recipe_usage'
  | 'conversion'
  | 'restock';

export interface TransactionLogData {
  store_id: string;
  product_id: string;
  variation_id?: string;
  transaction_type: TransactionType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by: string;
}

/**
 * Log inventory transaction with standardized format
 */
export const logInventoryTransaction = async (data: TransactionLogData): Promise<boolean> => {
  try {
    // Validate reference_id if provided - ensure it's a valid UUID
    let validatedReferenceId: string | null = null;
    if (data.reference_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(data.reference_id)) {
        validatedReferenceId = data.reference_id;
      } else {
        console.warn(`Invalid reference_id UUID format: ${data.reference_id}`);
        validatedReferenceId = null;
      }
    }

    const { error } = await supabase
      .from('inventory_transactions')
      .insert({
        store_id: data.store_id,
        product_id: data.product_id,
        variation_id: data.variation_id,
        transaction_type: data.transaction_type,
        quantity: data.quantity,
        previous_quantity: data.previous_quantity,
        new_quantity: data.new_quantity,
        reference_id: validatedReferenceId,
        notes: data.notes,
        created_by: data.created_by,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging inventory transaction:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception logging inventory transaction:', error);
    return false;
  }
};

/**
 * Log recipe usage with standardized format
 */
export const logRecipeUsage = async (
  recipeId: string,
  storeId: string,
  quantityUsed: number,
  usedBy: string,
  transactionId?: string,
  notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_usage_log')
      .insert({
        recipe_id: recipeId,
        store_id: storeId,
        quantity_used: quantityUsed,
        used_by: usedBy,
        transaction_id: transactionId,
        notes: notes,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging recipe usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception logging recipe usage:', error);
    return false;
  }
};

/**
 * Update inventory stock quantity with transaction logging
 */
export const updateInventoryStock = async (
  stockId: string,
  storeId: string,
  newQuantity: number,
  transactionType: TransactionType,
  userId: string,
  referenceId?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current stock
    const { data: currentStock, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity')
      .eq('id', stockId)
      .eq('store_id', storeId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const previousQuantity = currentStock.stock_quantity;
    const quantityChange = Math.abs(newQuantity - previousQuantity);

    // Update stock
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', stockId)
      .eq('store_id', storeId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log transaction
    const logSuccess = await logInventoryTransaction({
      store_id: storeId,
      product_id: stockId,
      transaction_type: transactionType,
      quantity: quantityChange,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reference_id: referenceId,
      notes: notes,
      created_by: userId
    });

    if (!logSuccess) {
      console.warn('Inventory updated but transaction logging failed');
    }

    return { success: true };

  } catch (error) {
    console.error('Exception updating inventory stock:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
