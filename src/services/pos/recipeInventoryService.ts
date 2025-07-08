
import { 
  processRecipeInventoryDeduction,
  checkRecipeAvailability as unifiedCheckRecipeAvailability,
  InventoryDeductionResult
} from "@/services/inventory/unifiedInventoryDeductionService";
import { supabase } from "@/integrations/supabase/client";

export interface RecipeUsageData {
  recipe_id: string;
  quantity_used: number;
  transaction_id?: string;
  notes?: string;
}

/**
 * Deduct inventory based on recipe usage
 * @deprecated Use processRecipeInventoryDeduction from unifiedInventoryDeductionService instead
 */
export const deductInventoryForRecipe = async (
  recipeUsage: RecipeUsageData,
  storeId: string,
  userId: string
): Promise<InventoryDeductionResult> => {
  console.warn('deductInventoryForRecipe is deprecated, use processRecipeInventoryDeduction instead');
  
  return await processRecipeInventoryDeduction(
    recipeUsage.recipe_id,
    recipeUsage.quantity_used,
    storeId,
    userId,
    recipeUsage.transaction_id,
    recipeUsage.notes
  );
};

/**
 * Check if recipe can be made with current inventory
 * @deprecated Use checkRecipeAvailability from unifiedInventoryDeductionService instead
 */
export const checkRecipeAvailabilityLegacy = async (
  recipeId: string,
  quantityNeeded: number,
  storeId: string
): Promise<{
  canMake: boolean;
  maxQuantity: number;
  missingIngredients: string[];
}> => {
  console.warn('checkRecipeAvailabilityLegacy is deprecated, use checkRecipeAvailability from unifiedInventoryDeductionService instead');
  
  const result = await unifiedCheckRecipeAvailability(recipeId, quantityNeeded, storeId);
  
  return {
    canMake: result.canMake,
    maxQuantity: result.maxQuantity,
    missingIngredients: result.missingIngredients
  };
};

/**
 * Get low stock alerts for recipe ingredients
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
