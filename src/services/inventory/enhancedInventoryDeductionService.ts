/**
 * Enhanced Inventory Deduction Service
 * 
 * Main service that automatically routes to the appropriate deduction method:
 * - Smart Mix & Match deduction for Mix & Match products
 * - Regular deduction for standard products
 */

import { supabase } from '@/integrations/supabase/client';
import { deductMixMatchInventory, deductMixMatchInventoryWithAuth, SmartDeductionResult } from './smartMixMatchDeductionService';
import { InventoryDeductionResult } from './simpleInventoryService';

export interface EnhancedDeductionResult {
  success: boolean;
  deductedItems: Array<{
    inventoryId: string;
    itemName: string;
    quantityDeducted: number;
    newStock: number;
    category?: 'base' | 'choice' | 'packaging';
  }>;
  skippedItems?: string[];
  errors: string[];
  isMixMatch: boolean;
  debugInfo?: any;
}

/**
 * Enhanced inventory deduction that automatically detects and handles Mix & Match products
 * Now with proper authentication context
 */
export const deductInventoryForTransactionEnhancedWithAuth = async (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; productName: string; quantity: number }>,
  userId: string
): Promise<EnhancedDeductionResult> => {
  console.log(`🔄 ENHANCED DEDUCTION: Starting for transaction ${transactionId} with ${items.length} items, user ${userId}`);
  
  const result: EnhancedDeductionResult = {
    success: true,
    deductedItems: [],
    skippedItems: [],
    errors: [],
    isMixMatch: false
  };

  // Validate transaction ID format
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
  if (!isValidUUID) {
    console.error(`❌ DEBUG: Invalid transaction ID format: ${transactionId}`);
    result.success = false;
    result.errors.push(`Invalid transaction ID format: ${transactionId}`);
    return result;
  }

  try {
    // 🚀 PHASE 2 OPTIMIZATION: Separate Mix & Match from regular products
    const mixMatchItems: typeof items = [];
    const regularItems: typeof items = [];
    
    for (const item of items) {
      if (isMixMatchProduct(item.productName)) {
        mixMatchItems.push(item);
        result.isMixMatch = true;
      } else {
        regularItems.push(item);
      }
    }
    
    console.log(`📊 BATCH SPLIT: ${mixMatchItems.length} Mix & Match, ${regularItems.length} regular products`);
    
    // 🚀 Process regular products in batch
    if (regularItems.length > 0) {
      console.log(`🚀 BATCH DEDUCTION: Processing ${regularItems.length} regular products...`);
      const batchResult = await deductRegularProductsBatch(
        transactionId,
        storeId,
        regularItems,
        userId
      );
      
      result.deductedItems.push(...batchResult.deductedItems.map(item => ({
        ...item,
        category: undefined
      })));
      result.errors.push(...batchResult.errors);
      
      if (!batchResult.success) {
        result.success = false;
      }
    }
    
    // Process Mix & Match products individually (they require special handling)
    for (const item of mixMatchItems) {
      console.log(`🎯 ENHANCED DEDUCTION: ${item.productName} detected as Mix & Match, using smart deduction`);
      
      const smartResult = await deductMixMatchInventoryWithAuth(
        transactionId,
        storeId,
        item.productId,
        item.productName,
        item.quantity,
        userId
      );
      
      result.deductedItems.push(...smartResult.deductedItems);
      if (smartResult.skippedItems) {
        result.skippedItems = [...(result.skippedItems || []), ...smartResult.skippedItems];
      }
      result.errors.push(...smartResult.errors);
      result.debugInfo = smartResult.debugInfo;
      
      if (!smartResult.success) {
        result.success = false;
      }
    }

    console.log(`✅ ENHANCED DEDUCTION: Completed for transaction ${transactionId}. Success: ${result.success}, Deducted: ${result.deductedItems.length}, Errors: ${result.errors.length}`);
    
    return result;

  } catch (error) {
    console.error('❌ ENHANCED DEDUCTION: Unexpected error:', error);
    result.success = false;
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * PHASE 1 OPTIMIZATION: Auth circuit breaker removed
 * Auth session is now cached in AuthSessionContext
 * userId is passed as parameter from cached session
 */

/**
 * PHASE 1 OPTIMIZATION: Legacy method now requires userId
 * Callers must provide userId from cached session
 */
export const deductInventoryForTransactionEnhanced = async (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; productName: string; quantity: number }>,
  userId: string
): Promise<EnhancedDeductionResult> => {
  console.log('✅ OPTIMIZED: deductInventoryForTransactionEnhanced with cached userId');
  return deductInventoryForTransactionEnhancedWithAuth(transactionId, storeId, items, userId);
};

/**
 * Check if a product is a Mix & Match product - Updated with combo expansion support
 */
function isMixMatchProduct(productName: string): boolean {
  const name = productName.toLowerCase().trim();
  
  // Extract original product name from combo expansion format
  // "Mini Croffle (from Mini Croffle with Choco Flakes + Americano Iced)" → "Mini Croffle with Choco Flakes"
  let actualProductName = name;
  const comboMatch = name.match(/^(.+)\s*\(from\s+(.+?)\s*\+/);
  if (comboMatch) {
    actualProductName = comboMatch[2].toLowerCase().trim();
    console.log(`🔍 MIX & MATCH DETECTION: Extracted "${actualProductName}" from combo format "${name}"`);
  }
  
  // Check for Mix & Match indicators first
  if (actualProductName.includes('with ') || actualProductName.includes(' and ')) {
    // Then verify it's actually a Mix & Match product by checking for base products
    return actualProductName.includes('croffle overload') || actualProductName.includes('mini croffle');
  }
  
  // Direct check for base products
  return actualProductName.includes('croffle overload') || actualProductName.includes('mini croffle');
}

/**
 * 🚀 PHASE 2 OPTIMIZATION: Batch deduction for regular products
 * Processes multiple products with a single inventory fetch and batch updates
 */
async function deductRegularProductsBatch(
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; productName: string; quantity: number }>,
  userId: string
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: []
  };

  try {
    // Step 1: Fetch all product recipes in one query
    console.log(`🔍 BATCH: Fetching recipes for ${items.length} products...`);
    
    const productIds = items.map(i => i.productId).filter(id => id && id !== 'undefined');
    const productNames = items.filter(i => !i.productId || i.productId === 'undefined').map(i => i.productName);
    
    let query = supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipe:recipes!recipe_id (
          id,
          name,
          recipe_ingredients (
            quantity,
            ingredient_group_name,
            is_optional,
            inventory_stock_id,
            inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
              id,
              item,
              stock_quantity
            )
          )
        )
      `)
      .eq('store_id', storeId)
      .eq('is_available', true);
    
    if (productIds.length > 0) {
      query = query.in('id', productIds);
    } else if (productNames.length > 0) {
      query = query.in('product_name', productNames);
    }
    
    const { data: products, error: catalogError } = await query;
    
    if (catalogError) {
      result.errors.push(`Error fetching recipes: ${catalogError.message}`);
      result.success = false;
      return result;
    }
    
    console.log(`✅ BATCH: Fetched ${products?.length || 0} product recipes`);
    
    // Step 2: Calculate all deductions
    interface DeductionPlan {
      inventoryStockId: string;
      itemName: string;
      totalDeduction: number;
      currentStock: number;
      productName: string;
      recipeName: string;
      groupName: string;
    }
    
    const deductionMap = new Map<string, DeductionPlan>();
    const inventoryStockIds = new Set<string>();
    
    for (const item of items) {
      const product = products?.find(p => 
        p.id === item.productId || p.product_name === item.productName
      );
      
      if (!product?.recipe) {
        console.log(`ℹ️ No recipe found for ${item.productName}, skipping`);
        continue;
      }
      
      const recipe = product.recipe;
      console.log(`📝 Processing recipe: ${recipe.name} with ${recipe.recipe_ingredients?.length || 0} ingredients for ${item.productName} x${item.quantity}`);
      
      for (const ingredient of recipe.recipe_ingredients || []) {
        if (!ingredient.inventory_stock_id || ingredient.is_optional) {
          continue;
        }
        
        inventoryStockIds.add(ingredient.inventory_stock_id);
        const deduction = ingredient.quantity * item.quantity;
        const itemName = ingredient.inventory_stock?.item || 'unknown';
        
        const existing = deductionMap.get(ingredient.inventory_stock_id);
        if (existing) {
          existing.totalDeduction += deduction;
        } else {
          deductionMap.set(ingredient.inventory_stock_id, {
            inventoryStockId: ingredient.inventory_stock_id,
            itemName,
            totalDeduction: deduction,
            currentStock: ingredient.inventory_stock?.stock_quantity || 0,
            productName: item.productName,
            recipeName: recipe.name,
            groupName: ingredient.ingredient_group_name || 'base'
          });
        }
      }
    }
    
    console.log(`📊 BATCH: Calculated ${deductionMap.size} unique inventory deductions`);
    
    // Step 3: Fetch current stock for all items (SINGLE QUERY)
    if (inventoryStockIds.size === 0) {
      console.log(`ℹ️ No inventory items to deduct`);
      return result;
    }
    
    const { data: stockItems, error: stockError } = await supabase
      .from('inventory_stock')
      .select('*')
      .in('id', Array.from(inventoryStockIds));
    
    if (stockError) {
      result.errors.push(`Error fetching stock: ${stockError.message}`);
      result.success = false;
      return result;
    }
    
    console.log(`✅ BATCH: Fetched ${stockItems?.length || 0} inventory stock items`);
    
    // Step 4: Perform all updates (BATCH UPDATE)
    const updates = [];
    
    for (const [stockId, plan] of deductionMap.entries()) {
      const stockItem = stockItems?.find(s => s.id === stockId);
      if (!stockItem) {
        result.errors.push(`Stock item not found: ${plan.itemName}`);
        continue;
      }
      
      const newStock = Math.max(0, stockItem.stock_quantity - plan.totalDeduction);
      updates.push({ id: stockId, stock_quantity: newStock });
      
      result.deductedItems.push({
        inventoryId: stockId,
        itemName: plan.itemName,
        quantityDeducted: plan.totalDeduction,
        newStock
      });
      
      console.log(`📦 BATCH: Deducting ${plan.totalDeduction} of ${plan.itemName}, new stock: ${newStock}`);
    }
    
    // Execute batch update
    if (updates.length > 0) {
      console.log(`🚀 BATCH UPDATE: Updating ${updates.length} inventory items...`);
      
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: update.stock_quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (updateError) {
          result.errors.push(`Error updating stock: ${updateError.message}`);
          result.success = false;
        }
      }
      
      console.log(`✅ BATCH UPDATE: Completed ${updates.length} inventory updates`);
    }
    
    if (result.errors.length > 0) {
      result.success = false;
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Batch deduction failed:', error);
    result.success = false;
    result.errors.push('Unexpected error during batch deduction');
    return result;
  }
}

/**
 * Regular deduction for non-Mix & Match products with auth context
 * Now includes support for ingredient groups and structured addon tracking
 */
async function deductRegularProductWithAuth(
  transactionId: string,
  storeId: string,
  productId: string,
  productName: string,
  quantity: number,
  userId: string
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: []
  };

  try {
    // Build query based on whether we have productId or need to use productName
    let query = supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipe:recipes!recipe_id (
          id,
          name,
          recipe_ingredients (
            quantity,
            ingredient_group_name,
            is_optional,
            inventory_stock_id,
            inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
              id,
              item,
              stock_quantity
            )
          )
        )
      `)
      .eq('store_id', storeId)
      .eq('is_available', true);

    // Use productId if available, otherwise fall back to productName
    if (productId && productId !== 'undefined') {
      query = query.eq('id', productId);
    } else {
      console.log(`🔍 No valid productId provided for ${productName}, searching by name`);
      query = query.eq('product_name', productName);
    }

    const { data: productCatalog, error: catalogError } = await query.maybeSingle();

    if (catalogError) {
      result.errors.push(`Error fetching recipe for product ${productName}: ${catalogError.message}`);
      result.success = false;
      return result;
    }

    const recipe = productCatalog?.recipe;

    if (!recipe) {
      console.log(`ℹ️ No recipe found for product ${productName}, skipping deduction`);
      return result;
    }

    console.log(`📝 Found recipe: ${recipe.name} with ${recipe.recipe_ingredients?.length || 0} ingredients`);

    // Process each ingredient with group-aware logic
    for (const ingredient of recipe.recipe_ingredients || []) {
      if (!ingredient.inventory_stock_id) {
        console.log(`⚠️ Ingredient ${ingredient.ingredient_group_name || 'unknown'} not mapped to inventory, skipping`);
        continue;
      }

      const ingredientName = ingredient.inventory_stock?.item || 'unknown';
      const groupName = ingredient.ingredient_group_name || 'base';
      const isOptional = ingredient.is_optional || false;
      
      // For regular products, deduct all non-optional ingredients
      // Optional ingredients are only deducted if specifically selected (for future addon support)
      if (isOptional) {
        console.log(`⏭️ Skipping optional ingredient ${ingredientName} (${groupName}) - not selected`);
        continue;
      }

      const totalDeduction = ingredient.quantity * quantity;
      console.log(`🔢 Deducting ${totalDeduction} of ${ingredientName} (${groupName})`);

      // Get current stock
      const { data: stockItem, error: stockError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('id', ingredient.inventory_stock_id)
        .single();

      if (stockError) {
        result.errors.push(`Error fetching stock for ${ingredientName}`);
        continue;
      }

      const newStock = Math.max(0, stockItem.stock_quantity - totalDeduction);
      
      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredient.inventory_stock_id);

      if (updateError) {
        result.errors.push(`Error updating stock for ${ingredientName}`);
        result.success = false;
        continue;
      }

      // **EMERGENCY FIX**: Enhanced audit logging with correct foreign key reference
      console.log(`🚨 AUDIT: Creating comprehensive audit trail for ${ingredientName}...`);
      
      const validInventoryStockId = ingredient.inventory_stock_id;
      
      if (validInventoryStockId) {
        try {
          // Use safe audit logging function with proper inventory stock ID
          const auditId = await supabase.rpc('log_inventory_deduction_audit_safe', {
            p_transaction_id: transactionId,
            p_store_id: storeId,
            p_operation_type: 'regular_deduction',
            p_status: 'success',
            p_items_processed: 1,
            p_metadata: {
              inventory_stock_id: validInventoryStockId, // **FIX**: Use correct FK reference
              product_catalog_id: productCatalog?.id || productId, // Store catalog reference in metadata
              ingredient_name: ingredientName,
              quantity_deducted: totalDeduction,
              previous_quantity: stockItem.stock_quantity,
              new_quantity: newStock,
              recipe_name: recipe.name,
              ingredient_group: groupName,
              deduction_timestamp: new Date().toISOString()
            }
          });
          
          if (auditId.data) {
            console.log(`✅ ENHANCED AUDIT LOGGED: Audit ID ${auditId.data} for ${ingredientName}`);
          } else {
            console.warn(`⚠️ ENHANCED AUDIT: Function returned null for ${ingredientName} - check audit logs`);
            // **EMERGENCY FIX**: Don't fail silently, but don't fail the transaction either
            result.errors.push(`Audit logging warning for ${ingredientName}: Function returned null`);
          }
        } catch (auditError) {
          const errorMsg = `Audit exception for ${ingredientName}: ${auditError instanceof Error ? auditError.message : 'Unknown error'}`;
          console.error(`❌ AUDIT EXCEPTION: ${errorMsg}`);
          // **EMERGENCY FIX**: Proper error propagation - add to errors but don't fail the deduction
          result.errors.push(errorMsg);
        }
      } else {
        const warningMsg = `No valid inventory_stock_id for audit logging: ${ingredientName}`;
        console.warn(`⚠️ AUDIT SKIPPED: ${warningMsg}`);
        result.errors.push(warningMsg); // **EMERGENCY FIX**: Track missing inventory stock IDs as errors
      }

      // Record the deduction
      result.deductedItems.push({
        inventoryId: ingredient.inventory_stock_id,
        itemName: ingredientName,
        quantityDeducted: totalDeduction,
        newStock
      });

      console.log(`✅ Successfully deducted ${totalDeduction} of ${ingredientName}, new stock: ${newStock}`);
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;

  } catch (error) {
    console.error('❌ Regular deduction failed:', error);
    result.success = false;
    result.errors.push('Unexpected error during regular deduction');
    return result;
  }
}

/**
 * Legacy regular deduction method - maintained for backward compatibility
 */
async function deductRegularProduct(
  transactionId: string,
  storeId: string,
  productId: string,
  productName: string,
  quantity: number
): Promise<InventoryDeductionResult> {
  console.warn('⚠️ LEGACY CALL: deductRegularProduct called without user context');
  
  // Try to get user from current session
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  if (!userId) {
    console.error('❌ LEGACY CALL: No user context available');
    return {
      success: false,
      deductedItems: [],
      errors: ['No user context available for regular deduction']
    };
  }
  
  return deductRegularProductWithAuth(transactionId, storeId, productId, productName, quantity, userId);
}