
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
 * Log inventory transaction with standardized format (MIGRATED TO UNIFIED SYSTEM)
 */
export const logInventoryTransaction = async (data: TransactionLogData): Promise<boolean> => {
  // Import the unified service dynamically to avoid circular dependencies
  const { logInventoryTransaction: unifiedLogTransaction } = await import('./inventory/unifiedInventoryAuditService');
  
  console.log('📦 Using unified inventory transaction logging');
  
  // Map legacy transaction types to unified types
  let mappedTransactionType: 'sale' | 'return' | 'adjustment' | 'transfer' | 'recipe_usage' | 'conversion' | 'restock';
  
  switch (data.transaction_type) {
    case 'transfer_in':
    case 'transfer_out':
      mappedTransactionType = 'transfer';
      break;
    default:
      mappedTransactionType = data.transaction_type as any;
  }
  
  const result = await unifiedLogTransaction({
    store_id: data.store_id,
    product_id: data.product_id,
    variation_id: data.variation_id,
    transaction_type: mappedTransactionType,
    quantity: data.quantity,
    previous_quantity: data.previous_quantity,
    new_quantity: data.new_quantity,
    reference_id: data.reference_id,
    notes: data.notes,
    created_by: data.created_by
  });

  return result.success;
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
 * Update inventory stock quantity with transaction logging (MIGRATED TO UNIFIED SYSTEM)
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
  // Import the unified service dynamically to avoid circular dependencies
  const { migrateUpdateInventoryStock } = await import('./inventory/standardizedInventoryMigration');
  
  console.log('🔄 Using unified inventory stock update');
  
  const result = await migrateUpdateInventoryStock(
    stockId,
    storeId,
    newQuantity,
    transactionType,
    userId,
    referenceId,
    notes
  );
  
  return result;
};
