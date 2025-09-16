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
    // Get recipe for this product with ingredient groups
    const { data: productCatalog, error: catalogError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipes!inner (
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
      .eq('id', productId)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .maybeSingle();

    if (catalogError) {
      result.errors.push(`Error fetching recipe for product ${productName}`);
      result.success = false;
      return result;
    }

    const recipe = productCatalog?.recipes;

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

      // CRITICAL: Log inventory transaction BEFORE updating stock to ensure audit trail
      console.log(`🚨 DEBUG: About to log inventory transaction for ${ingredientName}...`);
      
      // First, create audit records in inventory_transactions (primary audit)
      let auditSuccess = false;
      try {
        const { error: transactionLogError } = await supabase
          .from('inventory_transactions')
          .insert({
            store_id: storeId,
            product_id: productId, // Use actual product ID, not inventory stock ID
            transaction_type: 'sale',
            quantity: totalDeduction,
            previous_quantity: stockItem.stock_quantity,
            new_quantity: newStock,
            reference_id: transactionId,
            notes: `Sale deduction: ${ingredientName} for ${recipe.name}`,
            created_by: userId
          });
          
        if (transactionLogError) {
          console.error(`❌ AUDIT FAILED: inventory_transactions insert failed for ${ingredientName}:`, transactionLogError);
          console.error(`❌ AUDIT DETAILS: Store ID: ${storeId}, Product ID: ${productId}, User ID: ${userId}`);
          // Check for common RLS policy issues
          if (transactionLogError.message?.includes('policy')) {
            console.error(`❌ RLS POLICY ISSUE: User ${userId} may not have access to store ${storeId} in user_stores table`);
          }
        } else {
          auditSuccess = true;
          console.log(`✅ AUDIT LOGGED: ${ingredientName} transaction logged in inventory_transactions`);
        }
      } catch (auditError) {
        console.error(`❌ AUDIT ERROR: Failed to create inventory_transactions record for ${ingredientName}:`, auditError);
      }
      
      // Second, create audit records in inventory_movements (legacy compatibility)
      try {
        const { error: rpcError } = await supabase.rpc('insert_inventory_movement_safe', {
          p_inventory_stock_id: ingredient.inventory_stock_id,
          p_movement_type: 'sale',
          p_quantity_change: -totalDeduction,
          p_previous_quantity: stockItem.stock_quantity,
          p_new_quantity: newStock,
          p_reference_type: 'transaction',
          p_reference_id: transactionId,
          p_notes: `Sale deduction: ${ingredientName} for ${recipe.name}`,
          p_created_by: userId
        });
        
        if (rpcError) {
          console.error(`❌ LEGACY AUDIT FAILED: inventory_movements RPC failed for ${ingredientName}:`, rpcError);
        } else {
          console.log(`✅ LEGACY AUDIT LOGGED: ${ingredientName} movement logged in inventory_movements`);
        }
      } catch (rpcError) {
        console.error(`❌ RPC ERROR: insert_inventory_movement_safe failed for ${ingredientName}:`, rpcError);
      }
      
      // Log audit status for debugging
      if (auditSuccess) {
        console.log(`✅ AUDIT STATUS: Complete audit trail created for ${ingredientName}`);
      } else {
        console.warn(`⚠️ AUDIT STATUS: Incomplete audit trail for ${ingredientName} - manual review required`);
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