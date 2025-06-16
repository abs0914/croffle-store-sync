import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommissaryDeductionResult {
  success: boolean;
  commissary_deductions: {
    commissary_item_id: string;
    item_name: string;
    quantity_deducted: number;
    remaining_stock: number;
    conversion_ratio: number;
  }[];
  errors: string[];
}

export interface RecipeCommissaryMapping {
  recipe_ingredient_id: string;
  inventory_stock_id: string;
  commissary_item_id: string;
  conversion_ratio: number; // How much commissary item is needed per store item
  item_name: string;
}

/**
 * Get commissary mappings for recipe ingredients
 * This function finds which commissary items correspond to store inventory items used in recipes
 */
export const getRecipeCommissaryMappings = async (
  recipeId: string,
  storeId: string
): Promise<RecipeCommissaryMapping[]> => {
  try {
    const { data: mappings, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        inventory_stock_id,
        inventory_stock:inventory_stock(
          id,
          item
        )
      `)
      .eq('recipe_id', recipeId);

    if (error) throw error;

    const commissaryMappings: RecipeCommissaryMapping[] = [];

    // For each recipe ingredient, find the corresponding commissary item via conversions
    for (const ingredient of mappings || []) {
      const { data: conversions, error: conversionError } = await supabase
        .from('inventory_conversions')
        .select(`
          commissary_item_id,
          raw_material_quantity,
          finished_goods_quantity,
          commissary_item:commissary_inventory(
            id,
            name
          )
        `)
        .eq('store_id', storeId)
        .eq('inventory_stock_id', ingredient.inventory_stock_id)
        .order('conversion_date', { ascending: false })
        .limit(1);

      if (!conversionError && conversions && conversions.length > 0) {
        const conversion = conversions[0];
        const conversionRatio = conversion.raw_material_quantity / conversion.finished_goods_quantity;
        
        commissaryMappings.push({
          recipe_ingredient_id: ingredient.id,
          inventory_stock_id: ingredient.inventory_stock_id,
          commissary_item_id: conversion.commissary_item_id,
          conversion_ratio: conversionRatio,
          item_name: conversion.commissary_item?.name || ingredient.inventory_stock?.item || 'Unknown'
        });
      }
    }

    return commissaryMappings;
  } catch (error) {
    console.error('Error getting recipe commissary mappings:', error);
    return [];
  }
};

/**
 * Deduct commissary inventory based on recipe usage
 * This function is called after store-level deduction to maintain commissary accuracy
 */
export const deductCommissaryForRecipe = async (
  recipeId: string,
  quantityUsed: number,
  storeId: string,
  userId: string,
  transactionId?: string
): Promise<CommissaryDeductionResult> => {
  const result: CommissaryDeductionResult = {
    success: false,
    commissary_deductions: [],
    errors: []
  };

  try {
    // Get commissary mappings for this recipe
    const mappings = await getRecipeCommissaryMappings(recipeId, storeId);
    
    if (mappings.length === 0) {
      result.errors.push('No commissary mappings found for this recipe');
      return result;
    }

    // Get recipe ingredients to calculate quantities
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          id,
          quantity,
          inventory_stock_id
        )
      `)
      .eq('id', recipeId)
      .single();

    if (recipeError || !recipe) {
      result.errors.push('Recipe not found');
      return result;
    }

    // Process each commissary deduction
    for (const mapping of mappings) {
      const recipeIngredient = recipe.ingredients.find(
        ing => ing.id === mapping.recipe_ingredient_id
      );

      if (!recipeIngredient) continue;

      const storeQuantityUsed = recipeIngredient.quantity * quantityUsed;
      const commissaryQuantityNeeded = storeQuantityUsed * mapping.conversion_ratio;

      try {
        // Check current commissary stock
        const { data: commissaryItem, error: fetchError } = await supabase
          .from('commissary_inventory')
          .select('current_stock')
          .eq('id', mapping.commissary_item_id)
          .single();

        if (fetchError) {
          result.errors.push(`Failed to fetch commissary item ${mapping.item_name}: ${fetchError.message}`);
          continue;
        }

        const currentStock = commissaryItem.current_stock;
        
        if (currentStock < commissaryQuantityNeeded) {
          result.errors.push(
            `Insufficient commissary stock for ${mapping.item_name}: ` +
            `Required ${commissaryQuantityNeeded}, Available ${currentStock}`
          );
          continue;
        }

        // Update commissary stock
        const newStock = currentStock - commissaryQuantityNeeded;
        const { error: updateError } = await supabase
          .from('commissary_inventory')
          .update({
            current_stock: newStock
          })
          .eq('id', mapping.commissary_item_id);

        if (updateError) {
          result.errors.push(`Failed to update commissary stock for ${mapping.item_name}: ${updateError.message}`);
          continue;
        }

        // Log commissary transaction (if inventory_transactions supports commissary items)
        // Note: This might need a separate commissary_transactions table
        try {
          await supabase
            .from('inventory_transactions')
            .insert({
              product_id: mapping.commissary_item_id, // This might need adjustment based on schema
              store_id: storeId,
              transaction_type: 'commissary_recipe_usage',
              quantity: -commissaryQuantityNeeded,
              previous_quantity: currentStock,
              new_quantity: newStock,
              created_by: userId,
              notes: `Commissary deduction for recipe: ${recipe.name} (${quantityUsed} units)`,
              reference_id: transactionId
            });
        } catch (logError) {
          console.warn('Failed to log commissary transaction:', logError);
          // Don't fail the entire operation for logging issues
        }

        result.commissary_deductions.push({
          commissary_item_id: mapping.commissary_item_id,
          item_name: mapping.item_name,
          quantity_deducted: commissaryQuantityNeeded,
          remaining_stock: newStock,
          conversion_ratio: mapping.conversion_ratio
        });

      } catch (error) {
        console.error(`Error processing commissary deduction for ${mapping.item_name}:`, error);
        result.errors.push(`Failed to process commissary deduction for ${mapping.item_name}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    console.error('Error in deductCommissaryForRecipe:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Check commissary availability for recipe production
 */
export const checkCommissaryAvailabilityForRecipe = async (
  recipeId: string,
  quantityNeeded: number,
  storeId: string
): Promise<{
  canMake: boolean;
  maxQuantity: number;
  commissaryConstraints: string[];
}> => {
  try {
    const mappings = await getRecipeCommissaryMappings(recipeId, storeId);
    
    if (mappings.length === 0) {
      return { 
        canMake: false, 
        maxQuantity: 0, 
        commissaryConstraints: ['No commissary mappings found'] 
      };
    }

    // Get recipe ingredients
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        ingredients:recipe_ingredients(
          id,
          quantity,
          inventory_stock_id
        )
      `)
      .eq('id', recipeId)
      .single();

    if (error || !recipe) {
      return { 
        canMake: false, 
        maxQuantity: 0, 
        commissaryConstraints: ['Recipe not found'] 
      };
    }

    let maxQuantity = Infinity;
    const commissaryConstraints: string[] = [];

    for (const mapping of mappings) {
      const recipeIngredient = recipe.ingredients.find(
        ing => ing.id === mapping.recipe_ingredient_id
      );

      if (!recipeIngredient) continue;

      // Get current commissary stock
      const { data: commissaryItem, error: fetchError } = await supabase
        .from('commissary_inventory')
        .select('current_stock')
        .eq('id', mapping.commissary_item_id)
        .single();

      if (fetchError) {
        commissaryConstraints.push(`Cannot check stock for ${mapping.item_name}`);
        maxQuantity = 0;
        continue;
      }

      const currentStock = commissaryItem.current_stock;
      const requiredPerUnit = recipeIngredient.quantity * mapping.conversion_ratio;
      
      if (currentStock <= 0) {
        commissaryConstraints.push(`${mapping.item_name} out of stock in commissary`);
        maxQuantity = 0;
      } else {
        const possibleQuantity = Math.floor(currentStock / requiredPerUnit);
        maxQuantity = Math.min(maxQuantity, possibleQuantity);
      }
    }

    const canMake = maxQuantity >= quantityNeeded && commissaryConstraints.length === 0;
    
    return {
      canMake,
      maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity,
      commissaryConstraints
    };

  } catch (error) {
    console.error('Error checking commissary availability:', error);
    return { 
      canMake: false, 
      maxQuantity: 0, 
      commissaryConstraints: ['System error'] 
    };
  }
};

/**
 * Get commissary stock alerts that affect recipe production
 */
export const getCommissaryRecipeAlerts = async (storeId: string): Promise<{
  commissary_item_name: string;
  current_stock: number;
  minimum_threshold: number;
  affected_recipes: string[];
  affected_store_items: string[];
}[]> => {
  try {
    // Get low stock commissary items
    const { data: lowStockItems, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .lt('current_stock', supabase.raw('minimum_threshold'))
      .gt('minimum_threshold', 0)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching commissary alerts:', error);
      return [];
    }

    const alerts = [];

    for (const item of lowStockItems || []) {
      // Find which store items this commissary item converts to
      const { data: conversions } = await supabase
        .from('inventory_conversions')
        .select(`
          inventory_stock:inventory_stock(
            id,
            item
          )
        `)
        .eq('commissary_item_id', item.id)
        .eq('store_id', storeId);

      const storeItems = conversions?.map(c => c.inventory_stock?.item).filter(Boolean) || [];

      // Find which recipes use these store items
      const affectedRecipes = [];
      for (const storeItem of storeItems) {
        const { data: recipes } = await supabase
          .from('recipe_ingredients')
          .select(`
            recipe:recipes(name)
          `)
          .in('inventory_stock_id', 
            conversions?.map(c => c.inventory_stock?.id).filter(Boolean) || []
          );

        const recipeNames = recipes?.map(r => r.recipe?.name).filter(Boolean) || [];
        affectedRecipes.push(...recipeNames);
      }

      alerts.push({
        commissary_item_name: item.name,
        current_stock: item.current_stock,
        minimum_threshold: item.minimum_threshold,
        affected_recipes: [...new Set(affectedRecipes)], // Remove duplicates
        affected_store_items: storeItems
      });
    }

    return alerts;

  } catch (error) {
    console.error('Error getting commissary recipe alerts:', error);
    return [];
  }
};
