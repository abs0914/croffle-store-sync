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
 */
export const deductInventoryForTransaction = async (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; quantity: number }>
): Promise<InventoryDeductionResult> => {
  console.log(`🔄 Starting inventory deduction for transaction ${transactionId}`);
  
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: []
  };

  try {
    for (const item of items) {
      console.log(`📦 Processing item: ${item.productId} x${item.quantity}`);
      
      // Get recipe for this product
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_ingredients (
            ingredient_name,
            quantity,
            inventory_stock_id
          )
        `)
        .eq('product_id', item.productId)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .maybeSingle();

      if (recipeError) {
        console.error(`❌ Error fetching recipe for product ${item.productId}:`, recipeError);
        result.errors.push(`Error fetching recipe for product ${item.productId}`);
        continue;
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
    // Get recipe for this product
    const { data: recipe } = await supabase
      .from('recipes')
      .select(`
        name,
        recipe_ingredients (
          ingredient_name,
          quantity,
          inventory_stock (
            item,
            stock_quantity
          )
        )
      `)
      .eq('product_id', item.productId)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .maybeSingle();

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