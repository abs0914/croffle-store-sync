
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface POSRecipeUsage {
  recipe_id: string;
  quantity_sold: number;
  transaction_id: string;
  store_id: string;
}

export interface RecipeInventoryDeduction {
  success: boolean;
  deductions: {
    type: 'store' | 'commissary';
    item_id: string;
    item_name: string;
    quantity_deducted: number;
    remaining_stock: number;
  }[];
  warnings: string[];
  errors: string[];
}

/**
 * Process recipe usage from POS sales - handles both store and commissary deductions
 */
export const processRecipeUsageFromPOS = async (
  usage: POSRecipeUsage,
  userId: string
): Promise<RecipeInventoryDeduction> => {
  const result: RecipeInventoryDeduction = {
    success: false,
    deductions: [],
    warnings: [],
    errors: []
  };

  try {
    // Get the recipe with all its ingredients
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock!inventory_stock_id(*),
          commissary_inventory:commissary_inventory!commissary_item_id(*)
        )
      `)
      .eq('id', usage.recipe_id)
      .eq('store_id', usage.store_id)
      .single();

    if (recipeError || !recipe) {
      result.errors.push(`Recipe not found: ${usage.recipe_id}`);
      return result;
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      result.warnings.push(`Recipe "${recipe.name}" has no ingredients defined`);
      return { ...result, success: true }; // Not an error, just no deductions needed
    }

    // Process each ingredient
    for (const ingredient of recipe.ingredients) {
      const quantityNeeded = ingredient.quantity * usage.quantity_sold;

      // First try to deduct from store inventory
      if (ingredient.inventory_stock) {
        const storeStock = ingredient.inventory_stock.stock_quantity;
        
        if (storeStock >= quantityNeeded) {
          // Sufficient store stock - deduct from store
          const newStoreStock = storeStock - quantityNeeded;
          
          const { error: updateError } = await supabase
            .from('inventory_stock')
            .update({ stock_quantity: newStoreStock })
            .eq('id', ingredient.inventory_stock_id);

          if (updateError) {
            result.errors.push(`Failed to update store stock for ${ingredient.inventory_stock.item}`);
            continue;
          }

          result.deductions.push({
            type: 'store',
            item_id: ingredient.inventory_stock_id,
            item_name: ingredient.inventory_stock.item,
            quantity_deducted: quantityNeeded,
            remaining_stock: newStoreStock
          });

          // Log store inventory movement
          await supabase
            .from('inventory_movements')
            .insert({
              inventory_stock_id: ingredient.inventory_stock_id,
              movement_type: 'sale',
              quantity_change: -quantityNeeded,
              previous_quantity: storeStock,
              new_quantity: newStoreStock,
              created_by: userId,
              reference_type: 'transaction',
              reference_id: usage.transaction_id,
              notes: `Recipe usage: ${recipe.name} (${usage.quantity_sold} units)`
            });

        } else if (ingredient.commissary_item_id && ingredient.commissary_inventory) {
          // Insufficient store stock - try commissary backup
          const commissaryStock = ingredient.commissary_inventory.current_stock;
          
          if (commissaryStock >= quantityNeeded) {
            // Deduct from commissary instead
            const newCommissaryStock = commissaryStock - quantityNeeded;
            
            const { error: commissaryError } = await supabase
              .from('commissary_inventory')
              .update({ current_stock: newCommissaryStock })
              .eq('id', ingredient.commissary_item_id);

            if (commissaryError) {
              result.errors.push(`Failed to update commissary stock for ${ingredient.commissary_inventory.name}`);
              continue;
            }

            result.deductions.push({
              type: 'commissary',
              item_id: ingredient.commissary_item_id,
              item_name: ingredient.commissary_inventory.name,
              quantity_deducted: quantityNeeded,
              remaining_stock: newCommissaryStock
            });

            result.warnings.push(
              `Used commissary stock for ${ingredient.commissary_inventory.name} due to insufficient store inventory`
            );

          } else {
            result.errors.push(
              `Insufficient stock for ${ingredient.inventory_stock.item}: ` +
              `Store: ${storeStock}, Commissary: ${commissaryStock}, Needed: ${quantityNeeded}`
            );
          }
        } else {
          result.errors.push(
            `Insufficient store stock for ${ingredient.inventory_stock.item}: ` +
            `Available: ${storeStock}, Needed: ${quantityNeeded}`
          );
        }
      } else if (ingredient.commissary_item_id && ingredient.commissary_inventory) {
        // Only commissary stock available
        const commissaryStock = ingredient.commissary_inventory.current_stock;
        
        if (commissaryStock >= quantityNeeded) {
          const newCommissaryStock = commissaryStock - quantityNeeded;
          
          const { error: commissaryError } = await supabase
            .from('commissary_inventory')
            .update({ current_stock: newCommissaryStock })
            .eq('id', ingredient.commissary_item_id);

          if (commissaryError) {
            result.errors.push(`Failed to update commissary stock for ${ingredient.commissary_inventory.name}`);
            continue;
          }

          result.deductions.push({
            type: 'commissary',
            item_id: ingredient.commissary_item_id,
            item_name: ingredient.commissary_inventory.name,
            quantity_deducted: quantityNeeded,
            remaining_stock: newCommissaryStock
          });

        } else {
          result.errors.push(
            `Insufficient commissary stock for ${ingredient.commissary_inventory.name}: ` +
            `Available: ${commissaryStock}, Needed: ${quantityNeeded}`
          );
        }
      } else {
        result.warnings.push(`No inventory found for recipe ingredient ID: ${ingredient.id}`);
      }
    }

    // Log recipe usage
    try {
      await supabase
        .from('recipe_usage_log')
        .insert({
          recipe_id: usage.recipe_id,
          store_id: usage.store_id,
          quantity_used: usage.quantity_sold,
          used_by: userId,
          transaction_id: usage.transaction_id,
          notes: `POS Sale - ${usage.quantity_sold} units`,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      result.warnings.push('Failed to log recipe usage');
    }

    result.success = result.errors.length === 0;
    
    // Show appropriate notifications
    if (result.success && result.warnings.length === 0) {
      toast.success(`Recipe ingredients deducted successfully`);
    } else if (result.success && result.warnings.length > 0) {
      toast.warning(`Recipe processed with warnings. Check inventory levels.`);
    }

    return result;

  } catch (error) {
    console.error('Error in processRecipeUsageFromPOS:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Check if a recipe can be fulfilled before processing the sale
 */
export const checkRecipeAvailabilityForPOS = async (
  recipeId: string,
  quantityNeeded: number,
  storeId: string
): Promise<{
  canFulfill: boolean;
  maxQuantity: number;
  availabilityDetails: {
    ingredient_name: string;
    store_stock: number;
    commissary_stock: number;
    total_available: number;
    quantity_needed: number;
  }[];
}> => {
  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock!inventory_stock_id(*),
          commissary_inventory:commissary_inventory!commissary_item_id(*)
        )
      `)
      .eq('id', recipeId)
      .eq('store_id', storeId)
      .single();

    if (error || !recipe) {
      return { canFulfill: false, maxQuantity: 0, availabilityDetails: [] };
    }

    let maxQuantity = Infinity;
    const availabilityDetails: any[] = [];

    for (const ingredient of recipe.ingredients || []) {
      const storeStock = ingredient.inventory_stock?.stock_quantity || 0;
      const commissaryStock = ingredient.commissary_inventory?.current_stock || 0;
      const totalAvailable = storeStock + commissaryStock;
      const quantityNeededPerUnit = ingredient.quantity;
      
      const ingredientName = ingredient.inventory_stock?.item || 
                           ingredient.commissary_inventory?.name || 
                           'Unknown ingredient';

      availabilityDetails.push({
        ingredient_name: ingredientName,
        store_stock: storeStock,
        commissary_stock: commissaryStock,
        total_available: totalAvailable,
        quantity_needed: quantityNeededPerUnit
      });

      if (totalAvailable <= 0) {
        maxQuantity = 0;
      } else {
        const possibleQuantity = Math.floor(totalAvailable / quantityNeededPerUnit);
        maxQuantity = Math.min(maxQuantity, possibleQuantity);
      }
    }

    const canFulfill = maxQuantity >= quantityNeeded;
    
    return {
      canFulfill,
      maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity,
      availabilityDetails
    };

  } catch (error) {
    console.error('Error checking recipe availability for POS:', error);
    return { canFulfill: false, maxQuantity: 0, availabilityDetails: [] };
  }
};

/**
 * Get inventory alerts for low stock items that affect recipes
 */
export const getInventoryAlertsForRecipes = async (storeId: string) => {
  try {
    // Get low stock items from store inventory
    const { data: lowStoreStock } = await supabase
      .from('inventory_stock')
      .select(`
        *,
        recipe_ingredients(
          recipe:recipes(name)
        )
      `)
      .eq('store_id', storeId)
      .lte('stock_quantity', 10)
      .eq('is_active', true);

    // Get low stock items from commissary that are used in recipes
    const { data: lowCommissaryStock } = await supabase
      .from('commissary_inventory')
      .select(`
        *,
        recipe_ingredients(
          recipe:recipes(name, store_id)
        )
      `)
      .lte('current_stock', 10)
      .eq('is_active', true);

    const alerts = [
      ...(lowStoreStock || []).map(item => ({
        type: 'store' as const,
        item_name: item.item,
        current_stock: item.stock_quantity,
        affected_recipes: item.recipe_ingredients?.map((ri: any) => ri.recipe?.name).filter(Boolean) || []
      })),
      ...(lowCommissaryStock || []).map(item => ({
        type: 'commissary' as const,
        item_name: item.name,
        current_stock: item.current_stock,
        affected_recipes: item.recipe_ingredients?.map((ri: any) => ri.recipe?.name).filter(Boolean) || []
      }))
    ];

    return alerts;

  } catch (error) {
    console.error('Error getting inventory alerts:', error);
    return [];
  }
};
