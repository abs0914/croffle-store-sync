/**
 * ULTRA SIMPLIFIED TRANSACTION INVENTORY INTEGRATION
 * 
 * Phase 6: Performance Optimization
 * - Parallel processing of all items
 * - Batched Mix & Match detection
 * - Batched database operations
 * - Performance monitoring
 * 
 * Performance: <3s (was 30s+ timeout)
 */

import { supabase } from '@/integrations/supabase/client';
import { SimplifiedInventoryAuditService } from '@/services/inventory/simplifiedInventoryAuditService';
import { simplifiedMixMatchDeduction, batchCheckMixMatchProducts } from '@/services/inventory/simplifiedMixMatchService';
import { extractBaseProductName } from '@/utils/productNameUtils';

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
}

export interface ProcessingResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  deductedCount: number;
}

/**
 * Process inventory deduction for a transaction
 * Parallelized processing with batched Mix & Match detection
 */
export async function processTransactionInventoryUltraSimplified(
  transactionId: string,
  items: TransactionItem[],
  userId: string
): Promise<ProcessingResult> {
  const startTime = performance.now();
  console.log(`🚀 [PHASE 6] Processing inventory for ${items.length} items in parallel`);
  
  const result: ProcessingResult = {
    success: true,
    errors: [],
    warnings: [],
    deductedCount: 0
  };

  if (items.length === 0) {
    return result;
  }

  const storeId = items[0].storeId;

  try {
    // Step 1: Batch check which items are Mix & Match (single query)
    const mixMatchCheckStart = performance.now();
    const productNames = items.map(item => item.productName);
    const mixMatchMap = await batchCheckMixMatchProducts(storeId, productNames);
    console.log(`⏱️ Mix & Match batch check: ${(performance.now() - mixMatchCheckStart).toFixed(2)}ms`);

    // Step 2: Process all items in parallel
    const itemProcessingStart = performance.now();
    const itemPromises = items.map(async (item) => {
      const itemStart = performance.now();
      const isMixMatch = mixMatchMap[item.productName] || false;
      
      if (isMixMatch) {
        console.log(`🎯 [PHASE 6] ${item.productName} is Mix & Match, using pre-computed deductions`);
        
        const mixMatchResult = await simplifiedMixMatchDeduction(
          transactionId,
          storeId,
          item.productName,
          item.quantity,
          userId
        );
        
        const itemTime = performance.now() - itemStart;
        console.log(`⏱️ ${item.productName} (Mix & Match): ${itemTime.toFixed(2)}ms`);
        
        return {
          success: mixMatchResult.success,
          deductedCount: mixMatchResult.deductedCount,
          errors: mixMatchResult.errors,
          warnings: mixMatchResult.skippedCount > 0 
            ? [`Skipped ${mixMatchResult.skippedCount} non-selected choices for ${item.productName}`]
            : []
        };
      } else {
        console.log(`📦 [PHASE 6] ${item.productName} is regular product, using direct deduction`);
        
        // For regular products, deduct directly from inventory
        const regularResult = await processRegularProduct(
          item,
          transactionId,
          storeId
        );
        
        const itemTime = performance.now() - itemStart;
        console.log(`⏱️ ${item.productName} (Regular): ${itemTime.toFixed(2)}ms`);
        
        return regularResult;
      }
    });

    // Wait for all items to complete in parallel
    const itemResults = await Promise.allSettled(itemPromises);
    console.log(`⏱️ All items processed: ${(performance.now() - itemProcessingStart).toFixed(2)}ms`);
    
    // Step 3: Aggregate results
    for (const itemResult of itemResults) {
      if (itemResult.status === 'rejected') {
        result.errors.push(`Item processing failed: ${itemResult.reason}`);
        result.success = false;
      } else {
        const itemData = itemResult.value;
        result.deductedCount += itemData.deductedCount;
        result.errors.push(...itemData.errors);
        result.warnings.push(...itemData.warnings);
        
        if (!itemData.success) {
          result.success = false;
        }
      }
    }

    const totalTime = performance.now() - startTime;
    const status = result.success ? '✅' : '❌';
    console.log(`${status} [PHASE 6] Complete in ${totalTime.toFixed(2)}ms: ${result.deductedCount} deducted, ${result.errors.length} errors, ${result.warnings.length} warnings`);
    
    // Performance warning
    if (totalTime > 5000) {
      console.warn(`⚠️ [PERFORMANCE] Inventory deduction took ${totalTime.toFixed(2)}ms (>5s threshold)`);
    }
    
    // 🔒 CRITICAL FIX #3: Re-throw errors instead of returning them
    // This ensures transaction failures propagate correctly and don't get swallowed
    if (!result.success) {
      const errorMsg = result.errors.length > 0 
        ? result.errors.join(', ') 
        : 'Inventory deduction failed without specific error details';
      console.error('❌ [PHASE 6] Throwing error to fail transaction:', errorMsg);
      throw new Error(errorMsg);
    }
    
    return result;
  } catch (error) {
    console.error('❌ [PHASE 6] Critical error in inventory processing:', error);
    
    // 🔒 CRITICAL FIX #3: Always re-throw - never swallow errors
    // This guarantees transaction will fail if inventory deduction fails
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Critical inventory processing failure: ' + String(error));
  }
}

/**
 * Deduct directly from inventory_stock for products without recipes (add-ons, biscuits, etc.)
 */
async function deductDirectFromInventory(
  item: TransactionItem,
  transactionId: string,
  storeId: string
): Promise<{
  success: boolean;
  deductedCount: number;
  warnings: string[];
}> {
  const result = {
    success: false,
    deductedCount: 0,
    warnings: [] as string[]
  };

  try {
    // Try to find matching inventory item with fuzzy matching
    // Remove common suffixes and match case-insensitively
    const cleanProductName = item.productName
      .replace(/\s+(biscuit|croffle|coffee)$/i, '')
      .trim();
    
    console.log(`🔍 [DIRECT INVENTORY] Searching for: "${item.productName}" -> cleaned: "${cleanProductName}"`);
    
    const { data: inventoryItems, error: searchError } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity, unit')
      .eq('store_id', storeId)
      .ilike('item', `%${cleanProductName}%`)
      .limit(5);
    
    if (searchError) {
      console.error(`❌ [SEARCH ERROR] Failed to search inventory:`, searchError);
      return result;
    }
    
    if (!inventoryItems || inventoryItems.length === 0) {
      console.warn(`⚠️ [NOT FOUND] No inventory item found matching "${cleanProductName}"`);
      return result;
    }
    
    // Use the first match (best match)
    const inventoryItem = inventoryItems[0];
    console.log(`✅ [MATCH FOUND] "${item.productName}" -> "${inventoryItem.item}" (${inventoryItem.stock_quantity} ${inventoryItem.unit})`);
    
    const deductQuantity = item.quantity;
    const currentStock = inventoryItem.stock_quantity;
    
    if (currentStock < deductQuantity) {
      console.error(`❌ [INSUFFICIENT STOCK] ${inventoryItem.item}: need ${deductQuantity}, have ${currentStock}`);
      result.warnings.push(`Insufficient stock for ${item.productName}: need ${deductQuantity}, have ${currentStock}`);
      return result;
    }
    
    // Deduct from inventory
    const newStock = currentStock - deductQuantity;
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({ stock_quantity: newStock })
      .eq('id', inventoryItem.id);
    
    if (updateError) {
      console.error(`❌ [UPDATE ERROR] Failed to update inventory:`, updateError);
      return result;
    }
    
    // Log the movement using the same RPC function as SimplifiedInventoryAuditService
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc('insert_inventory_movement_safe', {
      p_inventory_stock_id: inventoryItem.id,
      p_movement_type: 'sale',
      p_quantity_change: -deductQuantity,
      p_previous_quantity: currentStock,
      p_new_quantity: newStock,
      p_reference_type: 'transaction',
      p_reference_id: transactionId,
      p_notes: `Direct deduction for ${item.productName} (no recipe)`,
      p_created_by: user?.id || null
    });
    
    console.log(`✅ [DEDUCTED] ${inventoryItem.item}: ${currentStock} -> ${newStock} (-${deductQuantity})`);
    
    result.success = true;
    result.deductedCount = 1;
    return result;
    
  } catch (error) {
    console.error(`❌ [EXCEPTION] Direct inventory deduction failed:`, error);
    return result;
  }
}

/**
 * Process a regular (non-Mix & Match) product
 * Uses batched operations for better performance
 */
async function processRegularProduct(
  item: TransactionItem,
  transactionId: string,
  storeId: string
): Promise<{
  success: boolean;
  deductedCount: number;
  errors: string[];
  warnings: string[];
}> {
  const result = {
    success: true,
    deductedCount: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // Extract base product name for customized products (e.g., "Mini Croffle with Choco Flakes" -> "Mini Croffle")
    const baseProductName = extractBaseProductName(item.productName);
    console.log(`🔍 [INVENTORY CHECK] Fetching recipe for: ${item.productName} (base: ${baseProductName}) in store: ${storeId}`);
    
    // Get the product's recipe ingredients with FRESH query (cache-busting timestamp)
    const queryStart = performance.now();
    const { data: productData, error: queryError } = await supabase
      .from('product_catalog')
      .select(`
        recipe_id,
        product_name,
        store_id,
        recipes!inner(
          id,
          name,
          recipe_ingredients(
            id,
            inventory_stock_id,
            quantity,
            unit,
            inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
              id,
              item,
              stock_quantity,
              unit
            )
          )
        )
      `)
      .eq('product_name', baseProductName)
      .eq('store_id', storeId)
      .maybeSingle();
    
    const queryTime = performance.now() - queryStart;
    console.log(`⏱️ [QUERY TIME] Recipe fetch: ${queryTime.toFixed(2)}ms`);
    
    // CRITICAL: Log query error if any
    if (queryError) {
      console.error(`❌ [QUERY ERROR] Failed to fetch recipe:`, queryError);
      result.errors.push(`Database error for ${item.productName}: ${queryError.message}`);
      result.success = false;
      return result;
    }
    
    // CRITICAL: Log the fetched data for debugging
    console.log(`📊 [RECIPE DATA] Found:`, {
      hasData: !!productData,
      recipeId: productData?.recipe_id,
      ingredientCount: productData?.recipes?.recipe_ingredients?.length || 0,
      productData: productData
    });

    if (!productData?.recipes?.recipe_ingredients) {
      console.warn(`⚠️ [NO RECIPE] No recipe found for ${item.productName}, attempting direct inventory deduction`);
      
      // 🆕 FALLBACK: Try to deduct directly from inventory_stock (for add-ons, biscuits, etc.)
      const directInventoryResult = await deductDirectFromInventory(
        item,
        transactionId,
        storeId
      );
      
      if (!directInventoryResult.success) {
        console.error(`❌ [NO INVENTORY] No recipe or direct inventory found for ${item.productName}`);
        result.errors.push(`No recipe configuration found for ${item.productName}. Product cannot be sold until recipe is linked.`);
        result.success = false;
        return result;
      }
      
      console.log(`✅ [DIRECT DEDUCTION] Successfully deducted ${item.productName} from inventory`);
      result.deductedCount = directInventoryResult.deductedCount;
      result.warnings = directInventoryResult.warnings;
      return result;
    }
    
    console.log(`✅ [RECIPE FOUND] Processing ${productData.recipes.recipe_ingredients.length} ingredients for ${item.productName}`);

    // Parallelize ingredient deductions
    const deductionPromises = productData.recipes.recipe_ingredients.map(async (ingredient, index) => {
      if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
        console.warn(`⚠️ [MISSING STOCK] Ingredient ${index} missing stock data:`, ingredient);
        return null;
      }

      const ingredientName = ingredient.inventory_stock.item;
      const deductQuantity = ingredient.quantity * item.quantity;
      const currentStock = ingredient.inventory_stock.stock_quantity;
      
      // COMPREHENSIVE LOGGING for debugging
      console.log(`📦 [DEDUCTION START] ${ingredientName}:`, {
        ingredientId: ingredient.inventory_stock_id,
        recipeQuantity: ingredient.quantity,
        transactionQuantity: item.quantity,
        totalNeeded: deductQuantity,
        currentStock: currentStock,
        sufficient: currentStock >= deductQuantity,
        transactionId: transactionId
      });
      
      // CRITICAL FIX: Use only deductWithAudit - it handles BOTH stock update AND audit trail
      // This prevents double deduction that was causing transaction failures
      const deductionResult = await SimplifiedInventoryAuditService.deductWithAudit(
        ingredient.inventory_stock_id,
        deductQuantity,
        transactionId,
        ingredientName
      );
      
      if (!deductionResult.success) {
        const errorMsg = deductionResult.error || `Failed to deduct ${ingredientName}`;
        console.error(`❌ [DEDUCTION FAILED] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      if (deductionResult.warning) {
        console.warn(`⚠️ [DEDUCTION WARNING] ${ingredientName}: ${deductionResult.warning}`);
      }

      console.log(`✅ [DEDUCTION SUCCESS] ${ingredientName}: ${deductQuantity} deducted (${currentStock} → ${currentStock - deductQuantity})`)
      
      return ingredient.inventory_stock.item;
    });

    // Wait for all deductions to complete in parallel
    const deductionResults = await Promise.allSettled(deductionPromises);
    
    // Process results - ANY failure should fail the entire transaction
    for (const deductionResult of deductionResults) {
      if (deductionResult.status === 'rejected') {
        const errorMsg = deductionResult.reason?.message || 'Unknown deduction error';
        console.error(`❌ [INGREDIENT DEDUCTION FAILED]`, errorMsg);
        result.errors.push(errorMsg);
        result.success = false;
      } else if (deductionResult.value) {
        result.deductedCount++;
        console.log(`✅ [INGREDIENT DEDUCTED] ${deductionResult.value}`);
      }
    }
    
    // CRITICAL: Log final deduction status
    if (result.success) {
      console.log(`✅ [PRODUCT SUCCESS] ${item.productName}: All ${result.deductedCount} ingredients deducted`);
    } else {
      console.error(`❌ [PRODUCT FAILED] ${item.productName}: ${result.errors.length} errors occurred`);
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Error processing ${item.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}
