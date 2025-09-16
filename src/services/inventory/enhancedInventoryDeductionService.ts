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
  
  // **CRITICAL DEBUG**: Check if this function is even being called
  console.log(`🚨 🚀 ENHANCED DEDUCTION FUNCTION CALLED! 🚀`);
  console.log(`🚨 📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🚨 📋 Transaction ID: ${transactionId}`);
  console.log(`🚨 🏪 Store ID: ${storeId}`);
  console.log(`🚨 👤 User ID: ${userId}`);
  console.log(`🚨 📦 Items count: ${items.length}`);
  console.log(`🚨 📊 Items detail:`, JSON.stringify(items, null, 2));
  
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
    for (const item of items) {
      console.log(`📦 ENHANCED DEDUCTION: Processing ${item.productName} x${item.quantity}`);
      
      // Check if this is a Mix & Match product
      const isMixMatch = isMixMatchProduct(item.productName);
      
      if (isMixMatch) {
        console.log(`🎯 ENHANCED DEDUCTION: ${item.productName} detected as Mix & Match, using smart deduction`);
        result.isMixMatch = true;
        
        // Use smart Mix & Match deduction with auth context
        const smartResult = await deductMixMatchInventoryWithAuth(
          transactionId,
          storeId,
          item.productId,
          item.productName,
          item.quantity,
          userId // Pass authenticated user ID
        );
        
        // Merge results
        result.deductedItems.push(...smartResult.deductedItems);
        if (smartResult.skippedItems) {
          result.skippedItems = [...(result.skippedItems || []), ...smartResult.skippedItems];
        }
        result.errors.push(...smartResult.errors);
        result.debugInfo = smartResult.debugInfo;
        
        if (!smartResult.success) {
          result.success = false;
        }
        
      } else {
        console.log(`📋 ENHANCED DEDUCTION: ${item.productName} is standard product, using regular deduction`);
        
        // Use regular deduction for non-Mix & Match products with auth context
        const regularResult = await deductRegularProductWithAuth(
          transactionId,
          storeId,
          item.productId,
          item.productName,
          item.quantity,
          userId // Pass authenticated user ID
        );
        
        // Merge results
        result.deductedItems.push(...regularResult.deductedItems.map(item => ({
          ...item,
          category: undefined // Regular products don't have categories
        })));
        result.errors.push(...regularResult.errors);
        
        if (!regularResult.success) {
          result.success = false;
        }
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
 * Legacy method - maintained for backward compatibility
 */
export const deductInventoryForTransactionEnhanced = async (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; productName: string; quantity: number }>
): Promise<EnhancedDeductionResult> => {
  console.warn('⚠️ LEGACY CALL: deductInventoryForTransactionEnhanced called without user context');
  
  // Try to get user from current session
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  if (!userId) {
    console.error('❌ LEGACY CALL: No user context available');
    return {
      success: false,
      deductedItems: [],
      skippedItems: [],
      errors: ['No user context available for inventory deduction'],
      isMixMatch: false
    };
  }
  
  return deductInventoryForTransactionEnhancedWithAuth(transactionId, storeId, items, userId);
};

/**
 * Check if a product is a Mix & Match product - Updated with better detection
 */
function isMixMatchProduct(productName: string): boolean {
  const name = productName.toLowerCase().trim();
  
  // Check for Mix & Match indicators first
  if (name.includes('with ') || name.includes(' and ')) {
    // Then verify it's actually a Mix & Match product by checking for base products
    return name.includes('croffle overload') || name.includes('mini croffle');
  }
  
  // Direct check for base products
  return name.includes('croffle overload') || name.includes('mini croffle');
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

      // CRITICAL: Log inventory audit using the new comprehensive audit function
      console.log(`🚨 DEBUG: About to log inventory audit for ${ingredientName}...`);
      
      // Use the actual product catalog ID for logging, with proper validation
      const actualProductId = productCatalog?.id || (productId && productId !== 'undefined' ? productId : null);
      
      if (actualProductId) {
        try {
          // Use the new comprehensive audit logging function
          const { error: auditError } = await supabase.rpc('log_inventory_deduction_audit', {
            p_transaction_id: transactionId,
            p_store_id: storeId,
            p_product_id: actualProductId,
            p_inventory_stock_id: ingredient.inventory_stock_id,
            p_ingredient_name: ingredientName,
            p_quantity_deducted: totalDeduction,
            p_previous_quantity: stockItem.stock_quantity,
            p_new_quantity: newStock,
            p_recipe_name: recipe.name,
            p_user_id: userId
          });
          
          if (auditError) {
            console.error(`❌ COMPREHENSIVE AUDIT FAILED for ${ingredientName}:`, auditError);
            console.warn(`⚠️ Inventory deduction will continue but audit trail may be incomplete`);
          } else {
            console.log(`✅ COMPREHENSIVE AUDIT LOGGED: Complete audit trail created for ${ingredientName}`);
          }
        } catch (auditError) {
          console.error(`❌ AUDIT EXCEPTION: Failed to create comprehensive audit for ${ingredientName}:`, auditError);
          console.warn(`⚠️ Inventory deduction will continue but audit trail may be incomplete`);
        }
      } else {
        console.warn(`⚠️ AUDIT SKIPPED: No valid product ID for ${ingredientName} - Product Catalog ID: ${productCatalog?.id}, Original Product ID: ${productId}`);
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