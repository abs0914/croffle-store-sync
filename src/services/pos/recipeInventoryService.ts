
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeUsageData {
  recipe_id: string;
  quantity_used: number;
  transaction_id?: string;
  notes?: string;
}

export interface InventoryDeductionResult {
  success: boolean;
  deductions: {
    inventory_stock_id: string;
    item_name: string;
    quantity_deducted: number;
    remaining_stock: number;
    insufficient_stock?: boolean;
  }[];
  errors: string[];
}

/**
 * Deduct inventory based on recipe usage
 */
export const deductInventoryForRecipe = async (
  recipeUsage: RecipeUsageData,
  storeId: string,
  userId: string
): Promise<InventoryDeductionResult> => {
  const result: InventoryDeductionResult = {
    success: false,
    deductions: [],
    errors: []
  };

  try {
    // Fetch the recipe with its ingredients
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('id', recipeUsage.recipe_id)
      .eq('store_id', storeId)
      .single();

    if (recipeError || !recipe) {
      result.errors.push(`Recipe not found: ${recipeUsage.recipe_id}`);
      return result;
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      result.errors.push(`Recipe "${recipe.name}" has no ingredients defined`);
      return result;
    }

    // Process each ingredient deduction
    for (const ingredient of recipe.ingredients) {
      const requiredQuantity = ingredient.quantity * recipeUsage.quantity_used;
      const currentStock = ingredient.inventory_stock?.stock_quantity || 0;
      
      if (currentStock < requiredQuantity) {
        result.errors.push(
          `Insufficient stock for ${ingredient.inventory_stock?.item || 'Unknown item'}: ` +
          `Required ${requiredQuantity} ${ingredient.unit}, Available ${currentStock}`
        );
        result.deductions.push({
          inventory_stock_id: ingredient.inventory_stock_id,
          item_name: ingredient.inventory_stock?.item || 'Unknown',
          quantity_deducted: requiredQuantity,
          remaining_stock: currentStock,
          insufficient_stock: true
        });
      } else {
        try {
          // Update inventory stock using simple subtraction
          const { data: updatedStock, error: updateError } = await supabase
            .from('inventory_stock')
            .update({
              stock_quantity: currentStock - requiredQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', ingredient.inventory_stock_id)
            .eq('store_id', storeId)
            .select()
            .single();

          if (updateError) {
            result.errors.push(`Failed to update stock for ${ingredient.inventory_stock?.item}: ${updateError.message}`);
            continue;
          }

          result.deductions.push({
            inventory_stock_id: ingredient.inventory_stock_id,
            item_name: ingredient.inventory_stock?.item || 'Unknown',
            quantity_deducted: requiredQuantity,
            remaining_stock: updatedStock?.stock_quantity || 0
          });

        } catch (error) {
          console.error(`Error deducting stock for ingredient ${ingredient.inventory_stock_id}:`, error);
          result.errors.push(`Failed to deduct stock for ${ingredient.inventory_stock?.item}: ${error}`);
        }
      }
    }

    // Create recipe usage record
    try {
      await supabase
        .from('recipe_usage_log')
        .insert({
          recipe_id: recipeUsage.recipe_id,
          store_id: storeId,
          quantity_used: recipeUsage.quantity_used,
          used_by: userId,
          transaction_id: recipeUsage.transaction_id,
          notes: recipeUsage.notes,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.warn('Failed to log recipe usage:', error);
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    console.error('Error in deductInventoryForRecipe:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Check if recipe can be made with current inventory
 */
export const checkRecipeAvailability = async (
  recipeId: string,
  quantityNeeded: number,
  storeId: string
): Promise<{
  canMake: boolean;
  maxQuantity: number;
  missingIngredients: string[];
}> => {
  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('id', recipeId)
      .eq('store_id', storeId)
      .single();

    if (error || !recipe) {
      return { canMake: false, maxQuantity: 0, missingIngredients: ['Recipe not found'] };
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return { canMake: false, maxQuantity: 0, missingIngredients: ['No ingredients defined'] };
    }

    let maxQuantity = Infinity;
    const missingIngredients: string[] = [];

    for (const ingredient of recipe.ingredients) {
      const currentStock = ingredient.inventory_stock?.stock_quantity || 0;
      const requiredPerUnit = ingredient.quantity;

      if (currentStock <= 0) {
        missingIngredients.push(ingredient.inventory_stock?.item || 'Unknown ingredient');
        maxQuantity = 0;
      } else {
        const possibleQuantity = Math.floor(currentStock / requiredPerUnit);
        maxQuantity = Math.min(maxQuantity, possibleQuantity);
      }
    }

    const canMake = maxQuantity >= quantityNeeded && missingIngredients.length === 0;
    
    return {
      canMake,
      maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity,
      missingIngredients
    };

  } catch (error) {
    console.error('Error checking recipe availability:', error);
    return { canMake: false, maxQuantity: 0, missingIngredients: ['System error'] };
  }
};

/**
 * Get low stock alerts for recipe ingredients
 * Note: inventory_stock table doesn't have minimum_threshold field,
 * so we'll use a default threshold of 5 units for alerts
 */
export const getRecipeIngredientAlerts = async (storeId: string, lowStockThreshold: number = 5): Promise<{
  item_name: string;
  current_stock: number;
  low_stock_threshold: number;
  affected_recipes: string[];
}[]> => {
  try {
    const { data: lowStockItems, error } = await supabase
      .from('inventory_stock')
      .select(`
        *,
        recipe_ingredients(
          recipe:recipes(name)
        )
      `)
      .eq('store_id', storeId)
      .lte('stock_quantity', lowStockThreshold)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching low stock alerts:', error);
      return [];
    }

    return (lowStockItems || []).map(item => ({
      item_name: item.item,
      current_stock: item.stock_quantity,
      low_stock_threshold: lowStockThreshold,
      affected_recipes: item.recipe_ingredients?.map((ri: any) => ri.recipe?.name).filter(Boolean) || []
    }));

  } catch (error) {
    console.error('Error getting recipe ingredient alerts:', error);
    return [];
  }
};
