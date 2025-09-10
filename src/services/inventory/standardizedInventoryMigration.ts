/**
 * Standardized Inventory Migration Service
 * 
 * This service migrates existing inventory services to use the unified audit system.
 * It provides backward compatibility while ensuring consistent audit trails.
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  updateInventoryStockWithAudit, 
  logInventoryMovement, 
  logInventoryTransaction,
  type MovementType,
  type TransactionType 
} from "./unifiedInventoryAuditService";

/**
 * Legacy function wrapper - migrates old logInventoryTransaction calls
 */
export const migrateLogInventoryTransaction = async (data: {
  store_id: string;
  product_id: string;
  variation_id?: string;
  transaction_type: 'sale' | 'return' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'recipe_usage' | 'conversion' | 'restock';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: string;
  notes?: string;
  created_by: string;
}): Promise<boolean> => {
  
  console.log(`📦 Migrating legacy transaction log for product ${data.product_id}`);
  
  // Use the new unified transaction logging
  const result = await logInventoryTransaction({
    store_id: data.store_id,
    product_id: data.product_id,
    variation_id: data.variation_id,
    transaction_type: data.transaction_type as TransactionType,
    quantity: data.quantity,
    previous_quantity: data.previous_quantity,
    new_quantity: data.new_quantity,
    reference_id: data.reference_id,
    notes: data.notes,
    created_by: data.created_by
  });

  if (result.success) {
    console.log(`✅ Migrated transaction log: ${result.id}`);
    return true;
  } else {
    console.error(`❌ Migration failed: ${result.error}`);
    return false;
  }
};

/**
 * Legacy function wrapper - migrates old updateInventoryStock calls
 */
export const migrateUpdateInventoryStock = async (
  stockId: string,
  storeId: string,
  newQuantity: number,
  transactionType: 'sale' | 'return' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'recipe_usage' | 'conversion' | 'restock',
  userId: string,
  referenceId?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  
  console.log(`🔄 Migrating legacy stock update for ${stockId}`);
  
  // Convert transaction types to movement types
  const movementTypeMap: Record<string, MovementType> = {
    'sale': 'sale',
    'return': 'return',
    'adjustment': 'adjustment',
    'transfer_in': 'transfer_in',
    'transfer_out': 'transfer_out',
    'recipe_usage': 'recipe_usage',
    'conversion': 'conversion',
    'restock': 'restock'
  };

  const movementType = movementTypeMap[transactionType] || 'adjustment';

  // Use the new unified update system
  const result = await updateInventoryStockWithAudit(
    stockId,
    newQuantity,
    movementType,
    {
      storeId,
      productId: stockId, // For product-based transactions
      referenceType: 'transaction',
      referenceId,
      notes,
      createdBy: userId
    }
  );

  return { 
    success: result.success, 
    error: result.error 
  };
};

/**
 * Enhanced inventory deduction that uses unified audit system
 */
export const migrateInventoryDeduction = async (
  transactionId: string,
  storeId: string,
  deductionItems: Array<{
    inventoryStockId: string;
    quantityToDeduct: number;
    ingredientName: string;
    productName?: string;
  }>
): Promise<{ success: boolean; deductedItems: number; errors: string[] }> => {
  
  console.log(`🔄 Migrating inventory deduction for transaction ${transactionId}`);
  
  const errors: string[] = [];
  let deductedItems = 0;

  for (const item of deductionItems) {
    try {
      // Get current stock to calculate new quantity
      const { data: currentStock, error: fetchError } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, serving_ready_quantity, item')
        .eq('id', item.inventoryStockId)
        .single();

      if (fetchError || !currentStock) {
        errors.push(`Failed to fetch stock for ${item.ingredientName}: ${fetchError?.message}`);
        continue;
      }

      const currentQuantity = currentStock.serving_ready_quantity ?? currentStock.stock_quantity ?? 0;
      const newQuantity = Math.max(0, currentQuantity - item.quantityToDeduct);

      // Use unified audit system
      const result = await updateInventoryStockWithAudit(
        item.inventoryStockId,
        newQuantity,
        'sale',
        {
          storeId,
          referenceType: 'transaction',
          referenceId: transactionId,
          notes: `Product sale deduction: ${item.ingredientName}${item.productName ? ` (from ${item.productName})` : ''}`,
        }
      );

      if (result.success) {
        deductedItems++;
        console.log(`✅ Deducted ${item.quantityToDeduct} of ${item.ingredientName}`);
      } else {
        errors.push(`Failed to deduct ${item.ingredientName}: ${result.error}`);
      }

    } catch (error) {
      errors.push(`Exception deducting ${item.ingredientName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const success = errors.length === 0;
  console.log(`✅ Migration completed: ${deductedItems}/${deductionItems.length} items deducted`);

  return { success, deductedItems, errors };
};

/**
 * Inventory adjustment with unified audit
 */
export const migrateInventoryAdjustment = async (
  inventoryStockId: string,
  newQuantity: number,
  reason: string,
  storeId?: string
): Promise<{ success: boolean; error?: string }> => {
  
  console.log(`🔧 Migrating inventory adjustment for ${inventoryStockId}`);
  
  const result = await updateInventoryStockWithAudit(
    inventoryStockId,
    newQuantity,
    'adjustment',
    {
      storeId,
      referenceType: 'manual',
      notes: `Manual adjustment: ${reason}`,
    }
  );

  if (result.success) {
    console.log(`✅ Adjustment completed: ${result.movementId}`);
  } else {
    console.error(`❌ Adjustment failed: ${result.error}`);
  }

  return { success: result.success, error: result.error };
};

/**
 * Inventory transfer with unified audit
 */
export const migrateInventoryTransfer = async (
  sourceInventoryId: string,
  targetStoreId: string,
  quantity: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  
  console.log(`🚚 Migrating inventory transfer: ${sourceInventoryId} -> ${targetStoreId}`);
  
  try {
    // Get source inventory details
    const { data: sourceInventory, error: sourceError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, serving_ready_quantity, store_id, item, unit')
      .eq('id', sourceInventoryId)
      .single();

    if (sourceError || !sourceInventory) {
      return { success: false, error: `Source inventory not found: ${sourceError?.message}` };
    }

    const currentQuantity = sourceInventory.serving_ready_quantity ?? sourceInventory.stock_quantity ?? 0;
    
    if (currentQuantity < quantity) {
      return { success: false, error: `Insufficient stock: need ${quantity}, have ${currentQuantity}` };
    }

    // Create transfer out record
    const transferOutResult = await updateInventoryStockWithAudit(
      sourceInventoryId,
      currentQuantity - quantity,
      'transfer_out',
      {
        storeId: sourceInventory.store_id,
        referenceType: 'transfer',
        notes: `Transfer to store ${targetStoreId}: ${notes || 'Inventory transfer'}`
      }
    );

    if (!transferOutResult.success) {
      return { success: false, error: `Transfer out failed: ${transferOutResult.error}` };
    }

    // Find or create target inventory item
    const { data: targetInventory, error: targetError } = await supabase
      .from('inventory_stock')
      .select('id, stock_quantity, serving_ready_quantity')
      .eq('store_id', targetStoreId)
      .eq('item', sourceInventory.item)
      .eq('unit', sourceInventory.unit)
      .maybeSingle();

    let targetInventoryId = targetInventory?.id;
    let targetCurrentQuantity = 0;

    if (targetInventory) {
      targetCurrentQuantity = targetInventory.serving_ready_quantity ?? targetInventory.stock_quantity ?? 0;
    } else {
      // Create new inventory item in target store
      const { data: newInventory, error: createError } = await supabase
        .from('inventory_stock')
        .insert({
          store_id: targetStoreId,
          item: sourceInventory.item,
          unit: sourceInventory.unit,
          stock_quantity: 0,
          minimum_threshold: 5,
          cost: 0,
          is_active: true
        })
        .select('id')
        .single();

      if (createError || !newInventory) {
        return { success: false, error: `Failed to create target inventory: ${createError?.message}` };
      }
      
      targetInventoryId = newInventory.id;
    }

    // Create transfer in record
    const transferInResult = await updateInventoryStockWithAudit(
      targetInventoryId!,
      targetCurrentQuantity + quantity,
      'transfer_in',
      {
        storeId: targetStoreId,
        referenceType: 'transfer',
        referenceId: transferOutResult.movementId,
        notes: `Transfer from store ${sourceInventory.store_id}: ${notes || 'Inventory transfer'}`
      }
    );

    if (!transferInResult.success) {
      return { success: false, error: `Transfer in failed: ${transferInResult.error}` };
    }

    console.log(`✅ Transfer completed: ${quantity} units of ${sourceInventory.item}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Transfer migration error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Batch migration utility for existing inventory operations
 */
export const batchMigrateInventoryOperations = async (
  operations: Array<{
    type: 'deduction' | 'adjustment' | 'transfer';
    data: any;
  }>
): Promise<{ success: boolean; results: Array<{ success: boolean; error?: string }> }> => {
  
  console.log(`🔄 Batch migrating ${operations.length} inventory operations`);
  
  const results = [];
  
  for (const operation of operations) {
    let result;
    
    switch (operation.type) {
      case 'deduction':
        result = await migrateInventoryDeduction(
          operation.data.transactionId,
          operation.data.storeId,
          operation.data.items
        );
        break;
        
      case 'adjustment':
        result = await migrateInventoryAdjustment(
          operation.data.inventoryStockId,
          operation.data.newQuantity,
          operation.data.reason,
          operation.data.storeId
        );
        break;
        
      case 'transfer':
        result = await migrateInventoryTransfer(
          operation.data.sourceInventoryId,
          operation.data.targetStoreId,
          operation.data.quantity,
          operation.data.notes
        );
        break;
        
      default:
        result = { success: false, error: 'Unknown operation type' };
    }
    
    results.push(result);
  }
  
  const successful = results.filter(r => r.success).length;
  console.log(`✅ Batch migration completed: ${successful}/${operations.length} successful`);
  
  return { 
    success: successful === operations.length, 
    results 
  };
};