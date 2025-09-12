/**
 * Enhanced Inventory Deduction Service
 * 
 * Main service that automatically routes to the appropriate deduction method:
 * - Smart Mix & Match deduction for Mix & Match products
 * - Regular deduction for standard products
 */

import { supabase } from '@/integrations/supabase/client';
import { deductMixMatchInventory, SmartDeductionResult } from './smartMixMatchDeductionService';
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
 */
export const deductInventoryForTransactionEnhanced = async (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; productName: string; quantity: number }>
): Promise<EnhancedDeductionResult> => {
  console.log(`🔄 ENHANCED DEDUCTION: Starting for transaction ${transactionId} with ${items.length} items`);
  
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
        
        // Use smart Mix & Match deduction
        const smartResult = await deductMixMatchInventory(
          transactionId,
          storeId,
          item.productId,
          item.productName,
          item.quantity
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
        
        // Use regular deduction for non-Mix & Match products
        const regularResult = await deductRegularProduct(
          transactionId,
          storeId,
          item.productId,
          item.productName,
          item.quantity
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
 * Check if a product is a Mix & Match product
 */
function isMixMatchProduct(productName: string): boolean {
  const name = productName.toLowerCase().trim();
  return name.includes('croffle overload') || name.includes('mini croffle');
}

/**
 * Regular deduction for non-Mix & Match products
 */
async function deductRegularProduct(
  transactionId: string,
  storeId: string,
  productId: string,
  productName: string,
  quantity: number
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: []
  };

  try {
    // Get recipe for this product
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
            inventory_stock_id,
            inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(item)
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

    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Process each ingredient (deduct ALL for regular products)
    for (const ingredient of recipe.recipe_ingredients || []) {
      if (!ingredient.inventory_stock_id) {
        console.log(`⚠️ Ingredient not mapped to inventory, skipping`);
        continue;
      }

      const ingredientName = ingredient.inventory_stock?.item || 'unknown';
      const totalDeduction = ingredient.quantity * quantity;
      console.log(`🔢 Deducting ${totalDeduction} of ${ingredientName}`);

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

      // Log inventory movement
      try {
        await supabase.rpc('insert_inventory_movement_safe', {
          p_inventory_stock_id: ingredient.inventory_stock_id,
          p_movement_type: 'sale',
          p_quantity_change: -totalDeduction,
          p_previous_quantity: stockItem.stock_quantity,
          p_new_quantity: newStock,
          p_reference_type: 'transaction',
          p_reference_id: transactionId,
          p_notes: `Regular deduction: ${ingredientName} for ${recipe.name}`,
          p_created_by: userId || null
        });
      } catch (logError) {
        console.warn(`⚠️ Failed to log movement for ${ingredientName}:`, logError);
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