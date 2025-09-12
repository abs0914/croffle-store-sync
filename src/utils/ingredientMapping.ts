import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Updated interface to match new schema
export interface RecipeIngredientWithNames {
  id: string;
  recipe_id: string;
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
  store_id: string;
}

export interface InventoryStockItem {
  id: string;
  item: string;
  unit: string;
  cost_per_unit: number;
  store_id: string;
  is_active: boolean;
}

export interface IngredientMappingOptions {
  validateInventory?: boolean;
  showProgress?: boolean;
}

/**
 * New FK-based ingredient mapping system
 * Uses direct foreign key relationships instead of name-based mapping
 */

/**
 * Fetch recipe ingredients with inventory stock details via JOIN
 */
export async function fetchRecipeIngredientsWithInventory(
  recipeId: string
): Promise<RecipeIngredientWithNames[]> {
  try {
    // Use the new view for backward compatibility
    const { data, error } = await supabase
      .from('recipe_ingredients_with_names')
      .select('*')
      .eq('recipe_id', recipeId);

    if (error) {
      console.error('Error fetching recipe ingredients:', error);
      toast.error('Failed to fetch recipe ingredients');
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchRecipeIngredientsWithInventory:', error);
    toast.error('Failed to fetch recipe ingredients');
    return [];
  }
}

/**
 * Fetch available inventory stock for a store
 */
export async function fetchInventoryStock(
  storeId: string
): Promise<InventoryStockItem[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('id, item, unit, cost, store_id, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item');

    if (error) {
      console.error('Error fetching inventory stock:', error);
      toast.error('Failed to fetch inventory items');
      return [];
    }

    const mappedData = data.map(item => ({
      ...item,
      cost_per_unit: item.cost // Map cost to cost_per_unit for compatibility
    }));

    return mappedData;
  } catch (error) {
    console.error('Error in fetchInventoryStock:', error);
    toast.error('Failed to fetch inventory items');
    return [];
  }
}

/**
 * Update recipe ingredient mapping using FK relationship
 */
export async function updateRecipeIngredientMapping(
  ingredientId: string,
  inventoryStockId: string,
  options: IngredientMappingOptions = {}
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .update({ 
        inventory_stock_id: inventoryStockId,
        updated_at: new Date().toISOString()
      })
      .eq('id', ingredientId);

    if (error) {
      console.error('Error updating recipe ingredient mapping:', error);
      const message = `Failed to update ingredient mapping: ${error.message}`;
      if (options.showProgress !== false) {
        toast.error(message);
      }
      return { success: false, message };
    }

    const message = 'Ingredient mapping updated successfully';
    if (options.showProgress !== false) {
      toast.success(message);
    }

    return { success: true, message };
  } catch (error) {
    console.error('Error in updateRecipeIngredientMapping:', error);
    const message = 'Failed to update ingredient mapping';
    if (options.showProgress !== false) {
      toast.error(message);
    }
    return { success: false, message };
  }
}

/**
 * Bulk update multiple recipe ingredient mappings
 */
export async function bulkUpdateRecipeIngredientMappings(
  updates: Array<{ ingredientId: string; inventoryStockId: string }>,
  options: IngredientMappingOptions = {}
): Promise<{ 
  success: boolean; 
  successCount: number; 
  errorCount: number; 
  errors: string[] 
}> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  if (options.showProgress !== false) {
    toast.info(`Updating ${updates.length} ingredient mappings...`);
  }

  for (const update of updates) {
    const result = await updateRecipeIngredientMapping(
      update.ingredientId,
      update.inventoryStockId,
      { showProgress: false } // Don't show individual toasts during bulk operation
    );

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
      errors.push(result.message);
    }
  }

  const success = errorCount === 0;
  const message = success 
    ? `Successfully updated ${successCount} ingredient mappings`
    : `Updated ${successCount} mappings, ${errorCount} failed`;

  if (options.showProgress !== false) {
    if (success) {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }

  return { success, successCount, errorCount, errors };
}

/**
 * Create new recipe ingredient with FK mapping
 */
export async function createRecipeIngredient(
  recipeId: string,
  inventoryStockId: string,
  quantity: number,
  unit: string,
  costPerUnit: number
): Promise<{ success: boolean; message: string; ingredientId?: string }> {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert({
        recipe_id: recipeId,
        inventory_stock_id: inventoryStockId,
        quantity,
        unit: unit as any, // Cast to handle unit type
        cost_per_unit: costPerUnit
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating recipe ingredient:', error);
      const message = `Failed to create recipe ingredient: ${error.message}`;
      toast.error(message);
      return { success: false, message };
    }

    const message = 'Recipe ingredient created successfully';
    toast.success(message);
    return { success: true, message, ingredientId: data.id };
  } catch (error) {
    console.error('Error in createRecipeIngredient:', error);
    const message = 'Failed to create recipe ingredient';
    toast.error(message);
    return { success: false, message };
  }
}

/**
 * Delete recipe ingredient
 */
export async function deleteRecipeIngredient(
  ingredientId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', ingredientId);

    if (error) {
      console.error('Error deleting recipe ingredient:', error);
      const message = `Failed to delete recipe ingredient: ${error.message}`;
      toast.error(message);
      return { success: false, message };
    }

    const message = 'Recipe ingredient deleted successfully';
    toast.success(message);
    return { success: true, message };
  } catch (error) {
    console.error('Error in deleteRecipeIngredient:', error);
    const message = 'Failed to delete recipe ingredient';
    toast.error(message);
    return { success: false, message };
  }
}

/**
 * Validate that all recipe ingredients have valid inventory mappings
 */
export async function validateRecipeIngredientMappings(
  recipeId: string
): Promise<{
  isValid: boolean;
  unmappedCount: number;
  totalCount: number;
  unmappedIngredients: string[];
}> {
  try {
    const ingredients = await fetchRecipeIngredientsWithInventory(recipeId);
    
    const unmappedIngredients = ingredients.filter(ingredient => 
      !ingredient.inventory_stock_id || !ingredient.ingredient_name
    );

    return {
      isValid: unmappedIngredients.length === 0,
      unmappedCount: unmappedIngredients.length,
      totalCount: ingredients.length,
      unmappedIngredients: unmappedIngredients.map(ing => ing.ingredient_name || 'Unknown')
    };
  } catch (error) {
    console.error('Error validating recipe ingredient mappings:', error);
    return {
      isValid: false,
      unmappedCount: 0,
      totalCount: 0,
      unmappedIngredients: []
    };
  }
}

/**
 * Get recipe cost calculation based on mapped ingredients
 */
export async function calculateRecipeCost(recipeId: string): Promise<number> {
  try {
    const ingredients = await fetchRecipeIngredientsWithInventory(recipeId);
    
    return ingredients.reduce((total, ingredient) => {
      return total + (ingredient.quantity * ingredient.cost_per_unit);
    }, 0);
  } catch (error) {
    console.error('Error calculating recipe cost:', error);
    return 0;
  }
}

/**
 * Get recipe ingredients for a product across all recipes
 */
export async function fetchProductRecipeIngredients(
  productId: string,
  storeId: string
): Promise<RecipeIngredientWithNames[]> {
  try {
    // Use the new view to get ingredients with names via JOIN
    const { data, error } = await supabase
      .from('recipe_ingredients_with_names')
      .select(`
        *,
        recipes!inner(
          id,
          product_id,
          store_id
        )
      `)
      .eq('recipes.product_id', productId)
      .eq('recipes.store_id', storeId);

    if (error) {
      console.error('Error fetching product recipe ingredients:', error);
      toast.error('Failed to fetch product ingredients');
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchProductRecipeIngredients:', error);
    toast.error('Failed to fetch product ingredients');
    return [];
  }
}

/**
 * Auto-map ingredients based on exact name matches
 */
export async function autoMapIngredients(
  recipeId: string,
  storeId: string
): Promise<{ success: boolean; mappedCount: number; message: string }> {
  try {
    // Get unmapped ingredients
    const ingredients = await fetchRecipeIngredientsWithInventory(recipeId);
    const unmappedIngredients = ingredients.filter(ing => !ing.inventory_stock_id);

    if (unmappedIngredients.length === 0) {
      return { success: true, mappedCount: 0, message: 'All ingredients already mapped' };
    }

    // Get inventory items for exact matching
    const inventoryItems = await fetchInventoryStock(storeId);
    
    const updates: Array<{ ingredientId: string; inventoryStockId: string }> = [];

    unmappedIngredients.forEach(ingredient => {
      // Find exact match (case-insensitive)
      const match = inventoryItems.find(item => 
        item.item.toLowerCase().trim() === ingredient.ingredient_name.toLowerCase().trim()
      );
      
      if (match) {
        updates.push({
          ingredientId: ingredient.id,
          inventoryStockId: match.id
        });
      }
    });

    if (updates.length === 0) {
      return { success: false, mappedCount: 0, message: 'No exact matches found for auto-mapping' };
    }

    const result = await bulkUpdateRecipeIngredientMappings(updates, { showProgress: false });
    
    return {
      success: result.success,
      mappedCount: result.successCount,
      message: result.success 
        ? `Auto-mapped ${result.successCount} ingredients`
        : `Auto-mapped ${result.successCount} ingredients, ${result.errorCount} failed`
    };

  } catch (error) {
    console.error('Error in autoMapIngredients:', error);
    return { success: false, mappedCount: 0, message: 'Failed to auto-map ingredients' };
  }
}

// Export legacy functions for backward compatibility during transition
export const updateIngredientMappings = bulkUpdateRecipeIngredientMappings;
export const getRecipeIngredients = fetchRecipeIngredientsWithInventory;