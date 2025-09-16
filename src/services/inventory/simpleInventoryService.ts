/**
 * Simple Inventory Service
 * Updated to use new schema structure with inventory_stock_id
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SimplifiedInventoryService } from "./phase4InventoryService";

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
 * Deduct inventory for a list of products
 */
export const deductInventoryForProducts = async (
  transactionId: string,
  storeId: string,
  products: Array<{ productId: string; productName: string; quantity: number }>
): Promise<InventoryDeductionResult> => {
  console.log('🔄 Simple inventory deduction starting');
  
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: []
  };

  try {
    for (const product of products) {
      const productResult = await deductInventoryForSingleProduct(
        transactionId,
        storeId,
        product.productId,
        product.productName,
        product.quantity
      );
      
      if (!productResult.success) {
        result.success = false;
        result.errors.push(...productResult.errors);
      } else {
        result.deductedItems.push(...productResult.deductedItems);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Simple inventory deduction failed:', error);
    result.success = false;
    result.errors.push(`Deduction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Deduct inventory for a single product
 */
export const deductInventoryForSingleProduct = async (
  transactionId: string,
  storeId: string,
  productId: string,
  productName: string,
  quantity: number
): Promise<InventoryDeductionResult> => {
  console.log(`🔄 Deducting inventory for ${productName} (${quantity}x)`);
  
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
        recipe:recipes!recipe_id (
          id,
          name,
          recipe_ingredients (
            inventory_stock_id,
            quantity,
            unit,
            inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
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
      result.errors.push(`Error fetching recipe for product ${productName}: ${catalogError.message}`);
      result.success = false;
      return result;
    }

    const recipe = productCatalog?.recipe;

    if (!recipe) {
      console.log(`ℹ️ No recipe found for product ${productName}, skipping`);
      return result;
    }

    console.log(`📝 Found recipe: ${recipe.name} with ${recipe.recipe_ingredients?.length || 0} ingredients`);

    // Process each ingredient
    for (const ingredient of recipe.recipe_ingredients || []) {
      if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
        console.log(`⚠️ Ingredient not mapped to inventory, skipping`);
        continue;
      }

      const ingredientName = ingredient.inventory_stock.item;
      const totalDeduction = ingredient.quantity * quantity;
      console.log(`🔢 Deducting ${totalDeduction} of ${ingredientName}`);

      // Get current stock
      const { data: stockItem, error: stockError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('id', ingredient.inventory_stock_id)
        .single();

      if (stockError) {
        result.errors.push(`Error fetching stock for ${ingredientName}: ${stockError.message}`);
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
        result.errors.push(`Error updating stock for ${ingredientName}: ${updateError.message}`);
        result.success = false;
        continue;
      }

      // Log inventory movement
      try {
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: ingredient.inventory_stock_id,
            reference_id: transactionId,
            reference_type: 'transaction',
            movement_type: 'outbound',
            quantity_change: -totalDeduction,
            new_quantity: newStock,
            previous_quantity: stockItem.stock_quantity,
            notes: `Simple deduction: ${ingredientName} for ${recipe.name}`,
            created_by: 'system'
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
    console.error('❌ Simple inventory deduction failed:', error);
    result.success = false;
    result.errors.push(`Deduction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Enhanced inventory deduction with detailed tracking
 */
export const performSimpleInventoryDeduction = async (
  transactionId: string,
  storeId: string,
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>
): Promise<InventoryDeductionResult> => {
  console.log(`🔄 Performing simple inventory deduction for ${items.length} items`);
  
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
      console.log(`📦 Processing ${item.productName} x${item.quantity}`);
      
      // Get recipe ingredients using the new schema
      const { data: recipeData, error: recipeError } = await supabase
        .from('product_catalog')
        .select(`
          recipe_id,
          recipe:recipes!recipe_id (
            id,
            name,
            recipe_ingredients (
              inventory_stock_id,
              quantity,
              unit,
              inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
                id,
                item,
                stock_quantity,
                unit
              )
            )
          )
        `)
        .eq('id', item.productId)
        .eq('store_id', storeId)
        .eq('is_available', true)
        .maybeSingle();

      if (recipeError) {
        console.error(`❌ Recipe query failed for ${item.productName}:`, recipeError);
        result.errors.push(`Failed to get recipe for ${item.productName}: ${recipeError.message}`);
        continue;
      }

      if (!recipeData || !recipeData.recipe) {
        console.log(`⚠️ No recipe found for ${item.productName}, skipping`);
        continue;
      }

      const recipe = recipeData.recipe;
      const ingredients = recipe.recipe_ingredients || [];

      console.log(`📝 Found ${ingredients.length} ingredients for ${item.productName}`);

      // Process each recipe ingredient
      for (const ingredient of ingredients) {
        if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
          console.log(`⚠️ Ingredient not mapped to inventory stock, skipping`);
          continue;
        }

        const ingredientName = ingredient.inventory_stock.item;
        const quantityNeeded = ingredient.quantity * item.quantity;

        console.log(`🔢 Processing ${ingredientName}: need ${quantityNeeded}`);

        // Validate sufficient stock
        if (ingredient.inventory_stock.stock_quantity < quantityNeeded) {
          result.errors.push(
            `Insufficient ${ingredientName}: need ${quantityNeeded}, have ${ingredient.inventory_stock.stock_quantity}`
          );
          result.success = false;
          continue;
        }

        const newStock = ingredient.inventory_stock.stock_quantity - quantityNeeded;

        // Update inventory
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', ingredient.inventory_stock_id);

        if (updateError) {
          console.error(`❌ Failed to update ${ingredientName}:`, updateError);
          result.errors.push(`Failed to update ${ingredientName}: ${updateError.message}`);
          result.success = false;
          continue;
        }

        // Create movement record
        try {
          await supabase
            .from('inventory_movements')
            .insert({
              inventory_stock_id: ingredient.inventory_stock_id,
              reference_id: transactionId,
              reference_type: 'transaction',
              movement_type: 'outbound',
              quantity_change: -quantityNeeded,
              new_quantity: newStock,
              previous_quantity: ingredient.inventory_stock.stock_quantity,
              notes: `Deduction for ${item.productName} (${item.quantity}x)`,
              created_by: userId || 'system'
            });
        } catch (movementError) {
          console.warn(`⚠️ Movement logging failed for ${ingredientName}:`, movementError);
        }

        result.deductedItems.push({
          inventoryId: ingredient.inventory_stock_id,
          itemName: ingredientName,
          quantityDeducted: quantityNeeded,
          newStock
        });

        console.log(`✅ Deducted ${quantityNeeded} ${ingredientName}, new stock: ${newStock}`);
      }
    }

    console.log(`✅ Simple inventory deduction completed. Success: ${result.success}`);
    return result;

  } catch (error) {
    console.error('❌ Simple inventory deduction failed:', error);
    result.success = false;
    result.errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

export const validateInventoryAvailability = async (
  storeId: string,
  validationItems: Array<{ productId: string; quantity: number }>
): Promise<{ available: boolean; insufficientItems: string[] }> => {
  const items = validationItems.map(v => ({
    productId: v.productId,
    productName: '',
    quantity: v.quantity,
    storeId
  }));
  const res = await SimplifiedInventoryService.validateInventoryAvailability(items as any);
  return {
    available: res.canProceed,
    insufficientItems: (res.insufficientItems || []).map((i: any) => i.ingredient)
  };
};