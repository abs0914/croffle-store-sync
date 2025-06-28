
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversionRecipeUpload } from "@/utils/csvParser";

export const bulkUploadConversionRecipes = async (recipes: ConversionRecipeUpload[]): Promise<boolean> => {
  try {
    console.log('Starting bulk upload of conversion recipes:', recipes);
    
    // Get commissary items for validation
    const { data: commissaryData, error: commissaryError } = await supabase
      .from('commissary_inventory')
      .select('id, name')
      .eq('is_active', true);

    if (commissaryError || !commissaryData) {
      console.error('Error fetching commissary inventory:', commissaryError);
      toast.error('Failed to load commissary inventory for validation');
      return false;
    }

    const commissaryMap = new Map(commissaryData.map(item => [item.name.toLowerCase().trim(), item]));
    console.log('Available commissary items:', commissaryData.map(item => item.name));

    const validRecipes = [];
    const errors = [];

    // Validate each recipe with strict matching only
    for (const recipe of recipes) {
      const inputItemKey = recipe.input_item_name.toLowerCase().trim();
      const inventoryItem = commissaryMap.get(inputItemKey);
      
      if (!inventoryItem) {
        errors.push(`Input item "${recipe.input_item_name}" not found in commissary inventory. Available items: ${Array.from(commissaryMap.keys()).slice(0, 10).join(', ')}${commissaryMap.size > 10 ? '...' : ''}`);
        console.warn(`Skipping recipe "${recipe.name}" - input item "${recipe.input_item_name}" not found`);
        continue;
      }

      validRecipes.push({
        ...recipe,
        commissary_item_id: inventoryItem.id
      });
    }

    if (validRecipes.length === 0) {
      console.log('No valid conversion recipes found after validation');
      console.log('Validation errors:', errors);
      toast.error(`No valid conversion recipes found. All ${recipes.length} recipes had missing ingredients. Please ensure input items exist in commissary inventory.`);
      
      // Show first few errors to help user understand what's missing
      if (errors.length > 0) {
        const firstErrors = errors.slice(0, 3);
        firstErrors.forEach(error => console.error(error));
        toast.error(`Missing ingredients: ${firstErrors.map(e => e.split('"')[1]).join(', ')}`);
      }
      
      return false;
    }

    console.log(`Found ${validRecipes.length} valid recipes out of ${recipes.length} total`);

    // Get current user for created_by field
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData.user?.id;

    if (!currentUserId) {
      toast.error('Authentication required');
      return false;
    }

    // Create conversion recipe templates
    const conversionRecipeInserts = validRecipes.map(recipe => ({
      name: recipe.name,
      description: recipe.description,
      finished_item_name: recipe.output_product_name,
      finished_item_unit: recipe.output_unit,
      yield_quantity: recipe.output_quantity,
      instructions: recipe.instructions,
      is_active: true,
      created_by: currentUserId
    }));

    const { data: insertedRecipes, error: recipeError } = await supabase
      .from('conversion_recipes')
      .insert(conversionRecipeInserts)
      .select('id, name');

    if (recipeError) {
      console.error('Error inserting conversion recipes:', recipeError);
      toast.error('Failed to create conversion recipes');
      return false;
    }

    if (!insertedRecipes || insertedRecipes.length === 0) {
      toast.error('No conversion recipes were created');
      return false;
    }

    console.log('Created conversion recipes:', insertedRecipes);

    // Create conversion recipe ingredients with proper validation
    const ingredientInserts = [];
    
    for (let i = 0; i < validRecipes.length; i++) {
      const recipe = validRecipes[i];
      const insertedRecipe = insertedRecipes[i];
      
      if (insertedRecipe && recipe.commissary_item_id) {
        ingredientInserts.push({
          conversion_recipe_id: insertedRecipe.id,
          commissary_item_id: recipe.commissary_item_id,
          quantity: recipe.input_quantity,
          unit: recipe.input_unit
        });
      }
    }

    if (ingredientInserts.length > 0) {
      console.log('Inserting conversion recipe ingredients:', ingredientInserts);
      
      const { error: ingredientError } = await supabase
        .from('conversion_recipe_ingredients')
        .insert(ingredientInserts);

      if (ingredientError) {
        console.error('Error inserting conversion recipe ingredients:', ingredientError);
        
        // Provide more specific error information
        if (ingredientError.code === '23503') {
          toast.error('Database constraint error: Invalid commissary item reference');
        } else if (ingredientError.code === '42703') {
          toast.error('Database error: Column does not exist in conversion_recipe_ingredients table');
        } else {
          toast.error(`Failed to add ingredients to conversion recipes: ${ingredientError.message}`);
        }
        return false;
      }
    }

    console.log('Conversion recipes created successfully');

    // Provide detailed success/warning message
    if (errors.length > 0) {
      const skippedCount = recipes.length - validRecipes.length;
      toast.warning(`Created ${validRecipes.length} conversion recipes successfully. ${skippedCount} recipes were skipped due to missing commissary items.`);
      console.warn('Skipped recipes due to missing ingredients:', errors);
    } else {
      toast.success(`Successfully created ${validRecipes.length} conversion recipe templates`);
    }

    return true;

  } catch (error) {
    console.error('Bulk upload error:', error);
    toast.error('Failed to upload conversion recipes');
    return false;
  }
};
