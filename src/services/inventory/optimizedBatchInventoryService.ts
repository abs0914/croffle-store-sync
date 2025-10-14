/**
 * Optimized Batch Inventory Service - Phase 2 Optimization
 * 
 * Replaces N+1 query pattern with single batch operations:
 * - Single batch SELECT for all inventory items
 * - Single batch UPDATE using PostgreSQL function
 * - Single batch INSERT for audit logs
 * 
 * Expected improvement: -2000ms per transaction
 */

import { supabase } from '@/integrations/supabase/client';

export interface BatchInventoryItem {
  inventoryStockId: string;
  itemName: string;
  quantityToDeduct: number;
  currentStock: number;
}

export interface BatchDeductionResult {
  success: boolean;
  deductedItems: Array<{
    inventoryId: string;
    itemName: string;
    quantityDeducted: number;
    newStock: number;
  }>;
  errors: string[];
  processingTimeMs: number;
}

/**
 * Batch deduct inventory with single queries
 */
export const batchDeductInventory = async (
  transactionId: string,
  storeId: string,
  items: BatchInventoryItem[],
  userId: string
): Promise<BatchDeductionResult> => {
  const startTime = Date.now();
  console.log(`🚀 OPTIMIZED BATCH: Starting deduction for ${items.length} items`);
  
  const result: BatchDeductionResult = {
    success: true,
    deductedItems: [],
    errors: [],
    processingTimeMs: 0
  };

  try {
    // Step 1: Collect all inventory IDs
    const inventoryIds = items.map(item => item.inventoryStockId);
    
    // Step 2: Single batch SELECT
    console.log(`📥 OPTIMIZED BATCH: Fetching ${inventoryIds.length} inventory items in one query`);
    const { data: stockItems, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .in('id', inventoryIds)
      .eq('store_id', storeId);

    if (fetchError) {
      result.errors.push(`Batch fetch failed: ${fetchError.message}`);
      result.success = false;
      return result;
    }

    if (!stockItems || stockItems.length === 0) {
      result.errors.push('No inventory items found');
      result.success = false;
      return result;
    }

    // Step 3: Build update plan in memory
    console.log(`🧮 OPTIMIZED BATCH: Building update plan for ${stockItems.length} items`);
    const updates = items.map(item => {
      const stockItem = stockItems.find(s => s.id === item.inventoryStockId);
      if (!stockItem) {
        result.errors.push(`Stock item not found: ${item.itemName}`);
        return null;
      }

      const newStock = Math.max(0, stockItem.stock_quantity - item.quantityToDeduct);
      
      result.deductedItems.push({
        inventoryId: item.inventoryStockId,
        itemName: item.itemName,
        quantityDeducted: item.quantityToDeduct,
        newStock
      });

      return {
        id: item.inventoryStockId,
        new_quantity: newStock,
        previous_quantity: stockItem.stock_quantity
      };
    }).filter(Boolean);

    // Step 4: Single batch UPDATE using PostgreSQL function
    console.log(`📤 OPTIMIZED BATCH: Executing batch update for ${updates.length} items`);
    const { error: updateError } = await supabase.rpc('batch_update_inventory_stock', {
      p_updates: updates
    });

    if (updateError) {
      console.error('❌ OPTIMIZED BATCH: Batch update failed:', updateError);
      result.errors.push(`Batch update failed: ${updateError.message}`);
      result.success = false;
      return result;
    }

    // Step 5: Single batch INSERT for audit logs (non-blocking)
    console.log(`📋 OPTIMIZED BATCH: Logging ${updates.length} audit records`);
    const auditRecords = updates.map(update => ({
      inventory_stock_id: update!.id,
      movement_type: 'sale' as const,
      quantity_change: -Math.abs(update!.previous_quantity - update!.new_quantity),
      previous_quantity: update!.previous_quantity,
      new_quantity: update!.new_quantity,
      reference_type: 'transaction' as const,
      reference_id: transactionId,
      notes: `Batch deduction for transaction ${transactionId}`,
      created_by: userId
    }));

    // Fire-and-forget audit logging
    supabase
      .from('inventory_movements')
      .insert(auditRecords)
      .then(({ error: auditError }) => {
        if (auditError) {
          console.warn('⚠️ OPTIMIZED BATCH: Audit logging warning:', auditError);
        } else {
          console.log('✅ OPTIMIZED BATCH: Audit logs created');
        }
      });

    result.processingTimeMs = Date.now() - startTime;
    console.log(`✅ OPTIMIZED BATCH: Completed in ${result.processingTimeMs}ms`);
    
    return result;

  } catch (error) {
    console.error('❌ OPTIMIZED BATCH: Critical error:', error);
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    result.processingTimeMs = Date.now() - startTime;
    return result;
  }
};

/**
 * Pre-fetch all recipes for transaction items in one query
 */
export const prefetchRecipeData = async (
  storeId: string,
  productIds: string[]
): Promise<any[]> => {
  console.log(`📥 PREFETCH: Fetching recipes for ${productIds.length} products`);
  
  const { data: recipes, error } = await supabase
    .from('product_catalog')
    .select(`
      id,
      product_name,
      recipe:recipes!recipe_id (
        id,
        name,
        recipe_ingredients (
          inventory_stock_id,
          quantity,
          ingredient_name,
          inventory_stock (
            id,
            item,
            stock_quantity
          )
        )
      )
    `)
    .in('id', productIds)
    .eq('store_id', storeId)
    .eq('is_available', true);

  if (error) {
    console.error('❌ PREFETCH: Failed to fetch recipes:', error);
    return [];
  }

  console.log(`✅ PREFETCH: Fetched ${recipes?.length || 0} recipes`);
  return recipes || [];
};
