
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EnhancedRecipeIngredient, BulkInventoryMapping } from './types';
import { validateUnit } from './utils';

/**
 * Save enhanced recipe ingredients with conversion factors
 */
export const saveEnhancedRecipeIngredients = async (
  recipeId: string,
  ingredients: EnhancedRecipeIngredient[],
  bulkMappings: BulkInventoryMapping[]
): Promise<boolean> => {
  try {
    // Delete existing ingredients
    await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', recipeId);

    // Insert new ingredients - using existing schema fields with proper typing
    const ingredientData = ingredients.map(ingredient => ({
      recipe_id: recipeId,
      inventory_stock_id: ingredient.commissary_item_id || '', // Required field
      quantity: ingredient.quantity,
      unit: validateUnit(ingredient.recipe_unit), // Ensure valid enum value
      cost_per_unit: ingredient.cost_per_unit || 0,
      commissary_item_id: ingredient.commissary_item_id,
      ingredient_name: ingredient.ingredient_name,
      recipe_unit: ingredient.recipe_unit,
      purchase_unit: ingredient.purchase_unit,
      conversion_factor: ingredient.conversion_factor || 1,
      cost_per_recipe_unit: ingredient.cost_per_recipe_unit || 0
    }));

    const { error: ingredientError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientData);

    if (ingredientError) throw ingredientError;

    // Save bulk mappings to inventory conversion mappings table
    if (bulkMappings.length > 0) {
      // Delete existing mappings for these ingredients
      await supabase
        .from('inventory_conversion_mappings')
        .delete()
        .in('recipe_ingredient_name', bulkMappings.map(m => m.recipe_ingredient_name));

      // Insert new mappings
      const mappingData = bulkMappings.map(mapping => ({
        inventory_stock_id: mapping.bulk_item_id,
        recipe_ingredient_name: mapping.recipe_ingredient_name,
        recipe_ingredient_unit: mapping.recipe_unit,
        conversion_factor: mapping.conversion_factor,
        notes: `Maps ${mapping.recipe_ingredient_name} to bulk item ${mapping.bulk_item_name}`
      }));

      const { error: mappingError } = await supabase
        .from('inventory_conversion_mappings')
        .insert(mappingData);

      if (mappingError) throw mappingError;
    }

    toast.success('Enhanced recipe ingredients saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving enhanced recipe ingredients:', error);
    toast.error('Failed to save enhanced recipe ingredients');
    return false;
  }
};

/**
 * Save enhanced recipe template ingredients
 */
export const saveEnhancedTemplateIngredients = async (
  templateId: string,
  ingredients: EnhancedRecipeIngredient[]
): Promise<boolean> => {
  try {
    // Delete existing template ingredients
    await supabase
      .from('recipe_template_ingredients')
      .delete()
      .eq('recipe_template_id', templateId);

    // Insert new template ingredients - using existing schema fields
    const ingredientData = ingredients.map(ingredient => ({
      recipe_template_id: templateId,
      ingredient_name: ingredient.ingredient_name,
      quantity: ingredient.quantity,
      unit: ingredient.recipe_unit,
      cost_per_unit: ingredient.cost_per_unit || 0,
      ingredient_category: 'ingredient',
      ingredient_type: 'raw_material',
      commissary_item_id: ingredient.commissary_item_id,
      recipe_unit: ingredient.recipe_unit,
      purchase_unit: ingredient.purchase_unit,
      conversion_factor: ingredient.conversion_factor || 1,
      cost_per_recipe_unit: ingredient.cost_per_recipe_unit || 0
    }));

    const { error: ingredientError } = await supabase
      .from('recipe_template_ingredients')
      .insert(ingredientData);

    if (ingredientError) throw ingredientError;

    toast.success('Enhanced template ingredients saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving enhanced template ingredients:', error);
    toast.error('Failed to save enhanced template ingredients');
    return false;
  }
};
