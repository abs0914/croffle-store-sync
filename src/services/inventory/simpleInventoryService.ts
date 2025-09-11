import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Simple, clean inventory deduction service
 * Single responsibility: deduct inventory when products are sold
 */

export interface InventoryDeductionResult {
  success: boolean;
  deductedItems: Array<{
    inventoryId: string;
    itemName: string;
    quantityDeducted: number;
    newStock: number;
  }>;
  errors: string[];
}

/**
 * Deduct inventory for a completed transaction
 * Finds recipe ingredients and maps them to inventory stock items
 * Enhanced with proper UUID validation and inventory movement logging
 */
export const deductInventoryForTransaction = async (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<InventoryDeductionResult> => {
  console.log(`🔄 Starting inventory deduction for transaction ${transactionId}`);
  
  // Validate transaction ID is a proper UUID
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transactionId);
  if (!isValidUUID) {
    console.error(`❌ Invalid transaction ID format: ${transactionId}`);
    return {
      success: false,
      deductedItems: [],
      errors: [`Invalid transaction ID format: ${transactionId}`]
    };
  }
  
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: []
  };

  try {
    // Get current user for audit trail
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    for (const item of items) {
      console.log(`📦 Processing item: ${item.productId} x${item.quantity}`);
      
      // Get recipe for this product - query via product_catalog relationship
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
              ingredient_name,
              quantity,
              inventory_stock_id
            )
          )
        `)
        .eq('id', item.productId)
        .eq('store_id', storeId)
        .eq('is_available', true)
        .maybeSingle();

      if (catalogError) {
        console.error(`❌ Error fetching recipe for product ${item.productId}:`, catalogError);
        result.errors.push(`Error fetching recipe for product ${item.productId}`);
        continue;
      }

      const recipe = productCatalog?.recipes;

      if (!recipe) {
      }

      if (!recipe) {
        console.log(`ℹ️ No recipe found for product ${item.productId}, skipping`);
        continue;
      }

      console.log(`📝 Found recipe: ${recipe.name} with ${recipe.recipe_ingredients?.length || 0} ingredients`);

      // Process each ingredient
      for (const ingredient of recipe.recipe_ingredients || []) {
        if (!ingredient.inventory_stock_id) {
          console.log(`⚠️ Ingredient ${ingredient.ingredient_name} not mapped to inventory, skipping`);
          continue;
        }

        const totalDeduction = ingredient.quantity * item.quantity;
        console.log(`🔢 Deducting ${totalDeduction} of ${ingredient.ingredient_name}`);

        // Get current stock
        const { data: stockItem, error: stockError } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('id', ingredient.inventory_stock_id)
          .single();

        if (stockError) {
          console.error(`❌ Error fetching stock for ${ingredient.ingredient_name}:`, stockError);
          result.errors.push(`Error fetching stock for ${ingredient.ingredient_name}`);
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
          console.error(`❌ Error updating stock for ${ingredient.ingredient_name}:`, updateError);
          result.errors.push(`Error updating stock for ${ingredient.ingredient_name}`);
          result.success = false;
          continue;
        }

        // Log inventory movement with enhanced error handling using safe UUID function
        try {
          const { error: movementError } = await supabase.rpc('insert_inventory_movement_safe', {
            p_inventory_stock_id: ingredient.inventory_stock_id,
            p_movement_type: 'sale',
            p_quantity_change: -totalDeduction,
            p_previous_quantity: stockItem.stock_quantity,
            p_new_quantity: newStock,
            p_reference_type: 'transaction',
            p_reference_id: transactionId,
            p_notes: `Transaction deduction: ${ingredient.ingredient_name} for ${recipe.name}`,
            p_created_by: userId || null
          });

          if (movementError) {
            console.error(`⚠️ Failed to log inventory movement for ${ingredient.ingredient_name}:`, {
              error: movementError.message,
              code: movementError.code,
              transactionId: transactionId,
              ingredient: ingredient.ingredient_name
            });
            // Don't fail the entire transaction for movement logging issues
            result.errors.push(`Failed to log movement for ${ingredient.ingredient_name}: ${movementError.message}`);
          } else {
            console.log(`📋 Logged inventory movement for ${ingredient.ingredient_name}`);
          }
        } catch (logError) {
          console.error(`⚠️ Error logging movement for ${ingredient.ingredient_name}:`, logError);
          result.errors.push(`Error logging movement for ${ingredient.ingredient_name}: ${logError instanceof Error ? logError.message : 'Unknown error'}`);
        }

        // Record the deduction
        result.deductedItems.push({
          inventoryId: ingredient.inventory_stock_id,
          itemName: ingredient.ingredient_name,
          quantityDeducted: totalDeduction,
          newStock
        });

        console.log(`✅ Successfully deducted ${totalDeduction} of ${ingredient.ingredient_name}, new stock: ${newStock}`);
      }
    }

    console.log(`🎯 Inventory deduction completed. Deducted ${result.deductedItems.length} items, ${result.errors.length} errors`);
    
    if (result.errors.length > 0) {
      result.success = false;
    }

    return result;
  } catch (error) {
    console.error('❌ Inventory deduction failed:', error);
    result.success = false;
    result.errors.push('Unexpected error during inventory deduction');
    return result;
  }
};

/**
 * Validate if products have sufficient inventory
 */
export const validateInventoryAvailability = async (
  storeId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<{ available: boolean; insufficientItems: string[] }> => {
  const insufficientItems: string[] = [];

  for (const item of items) {
    // FIXED: Get recipe through product catalog relationship (recipes don't have product_id)
    const { data: productCatalog } = await supabase
      .from('product_catalog')
      .select(`
        recipe_id,
        recipes!inner (
          name,
          recipe_ingredients (
            ingredient_name,
            quantity,
            inventory_stock (
              item,
              stock_quantity
            )
          )
        )
      `)
      .eq('id', item.productId)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .eq('recipes.is_active', true)
      .not('recipe_id', 'is', null)
      .maybeSingle();

    const recipe = productCatalog?.recipes;

    if (!recipe?.recipe_ingredients) continue;

    for (const ingredient of recipe.recipe_ingredients) {
      if (!ingredient.inventory_stock) continue;
      
      const requiredQuantity = ingredient.quantity * item.quantity;
      const availableQuantity = ingredient.inventory_stock.stock_quantity;

      if (availableQuantity < requiredQuantity) {
        insufficientItems.push(`${ingredient.inventory_stock.item} (need ${requiredQuantity}, have ${availableQuantity})`);
      }
    }
  }

  return {
    available: insufficientItems.length === 0,
    insufficientItems
  };
};