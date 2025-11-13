/**
 * Transaction Deletion Service
 * 
 * Safely deletes transactions and reverses inventory deductions
 * 
 * CRITICAL: This service:
 * 1. Reverses all inventory deductions (adds stock back)
 * 2. Deletes inventory movements
 * 3. Deletes transaction items
 * 4. Deletes the transaction
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventoryMovement {
  id: string;
  inventory_stock_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  inventory_item_name: string;
}

interface DeletionResult {
  success: boolean;
  error?: string;
  inventoryReversed: number;
}

/**
 * Delete a transaction and reverse all inventory deductions
 */
export async function deleteTransaction(
  transactionId: string,
  receiptNumber: string
): Promise<DeletionResult> {
  console.log(`🗑️ [DELETE] Starting deletion for transaction ${receiptNumber}`);
  
  try {
    // Step 1: Get all inventory movements for this transaction
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select(`
        id,
        inventory_stock_id,
        quantity_change,
        previous_quantity,
        new_quantity,
        inventory_stock!inner(item)
      `)
      .eq('reference_id', transactionId)
      .eq('movement_type', 'sale');

    if (movementsError) {
      console.error('❌ [DELETE] Failed to fetch inventory movements:', movementsError);
      throw new Error(`Failed to fetch inventory movements: ${movementsError.message}`);
    }

    console.log(`📦 [DELETE] Found ${movements?.length || 0} inventory movements to reverse`);

    // Step 2: Reverse inventory deductions (add stock back)
    if (movements && movements.length > 0) {
      for (const movement of movements) {
        const inventoryStockItem = movement.inventory_stock as any;
        const itemName = inventoryStockItem?.item || 'Unknown';
        const amountToRestore = Math.abs(movement.quantity_change);
        
        console.log(`♻️ [REVERSE] Restoring ${amountToRestore} units of ${itemName}`);
        console.log(`   Previous: ${movement.new_quantity} → Restoring to: ${movement.previous_quantity}`);

        // Restore the stock to its previous quantity
        const { error: restoreError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: movement.previous_quantity,
            serving_ready_quantity: movement.previous_quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', movement.inventory_stock_id);

        if (restoreError) {
          console.error(`❌ [REVERSE] Failed to restore ${itemName}:`, restoreError);
          throw new Error(`Failed to restore inventory for ${itemName}: ${restoreError.message}`);
        }

        console.log(`✅ [REVERSE] Restored ${itemName}: ${movement.new_quantity} → ${movement.previous_quantity}`);
      }
    }

    // Step 3: Delete inventory movements
    if (movements && movements.length > 0) {
      const { error: deleteMovementsError } = await supabase
        .from('inventory_movements')
        .delete()
        .eq('reference_id', transactionId);

      if (deleteMovementsError) {
        console.error('❌ [DELETE] Failed to delete inventory movements:', deleteMovementsError);
        throw new Error(`Failed to delete inventory movements: ${deleteMovementsError.message}`);
      }

      console.log(`✅ [DELETE] Deleted ${movements.length} inventory movements`);
    }

    // Step 4: Delete transaction items
    const { error: deleteItemsError } = await supabase
      .from('transaction_items')
      .delete()
      .eq('transaction_id', transactionId);

    if (deleteItemsError) {
      console.error('❌ [DELETE] Failed to delete transaction items:', deleteItemsError);
      throw new Error(`Failed to delete transaction items: ${deleteItemsError.message}`);
    }

    console.log(`✅ [DELETE] Deleted transaction items`);

    // Step 5: Delete the transaction
    const { error: deleteTransactionError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (deleteTransactionError) {
      console.error('❌ [DELETE] Failed to delete transaction:', deleteTransactionError);
      throw new Error(`Failed to delete transaction: ${deleteTransactionError.message}`);
    }

    console.log(`✅ [DELETE] Transaction ${receiptNumber} deleted successfully`);

    toast.success(`Transaction ${receiptNumber} deleted and inventory restored`);

    return {
      success: true,
      inventoryReversed: movements?.length || 0
    };

  } catch (error) {
    console.error('❌ [DELETE] Transaction deletion failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to delete transaction: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage,
      inventoryReversed: 0
    };
  }
}

/**
 * Check if a transaction can be deleted
 * (Add business logic rules here if needed)
 */
export async function canDeleteTransaction(transactionId: string): Promise<{
  canDelete: boolean;
  reason?: string;
}> {
  // For now, allow all deletions
  // You can add business rules here like:
  // - Don't allow deletion of transactions older than X days
  // - Don't allow deletion if tied to accounting records
  // - Require special permissions for certain transaction types
  
  return { canDelete: true };
}
