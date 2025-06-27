
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConversionRecipeUpload } from "@/utils/csvParser";

export const bulkUploadConversionRecipes = async (recipes: ConversionRecipeUpload[]): Promise<boolean> => {
  try {
    console.log('Starting bulk upload of conversion recipes:', recipes);
    
    // Get commissary items for validation - use the correct table name
    const { data: commissaryItems } = await supabase
      .from('commissary_inventory')
      .select('id, name')
      .eq('is_active', true);

    if (!commissaryItems) {
      toast.error('Failed to load commissary inventory items');
      return false;
    }

    const commissaryMap = new Map(commissaryItems.map(item => [item.name.toLowerCase(), item]));

    const validRecipes = [];
    const errors = [];

    // Validate each recipe
    for (const recipe of recipes) {
      const commissaryItem = commissaryMap.get(recipe.input_item_name.toLowerCase());
      
      if (!commissaryItem) {
        errors.push(`Input item "${recipe.input_item_name}" not found in commissary inventory`);
        continue;
      }

      validRecipes.push({
        ...recipe,
        commissary_item_id: commissaryItem.id
      });
    }

    if (validRecipes.length === 0) {
      toast.error('No valid conversion recipes found. Please check that input items exist in commissary inventory.');
      return false;
    }

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

    // Create conversion recipe ingredients with proper foreign key reference
    const ingredientInserts = [];
    
    for (let i = 0; i < validRecipes.length; i++) {
      const recipe = validRecipes[i];
      const insertedRecipe = insertedRecipes[i];
      
      if (insertedRecipe && recipe.commissary_item_id) {
        ingredientInserts.push({
          conversion_recipe_id: insertedRecipe.id,
          commissary_item_id: recipe.commissary_item_id,
          quantity: recipe.input_quantity
        });
      }
    }

    if (ingredientInserts.length > 0) {
      const { error: ingredientError } = await supabase
        .from('conversion_recipe_ingredients')
        .insert(ingredientInserts);

      if (ingredientError) {
        console.error('Error inserting conversion recipe ingredients:', ingredientError);
        
        // If foreign key constraint error, provide more specific guidance
        if (ingredientError.code === '23503') {
          toast.error('Database constraint error: Please ensure all input items exist in commissary inventory with exact name matching.');
        } else {
          toast.error('Failed to add ingredients to conversion recipes');  
        }
        return false;
      }
    }

    if (errors.length > 0) {
      toast.warning(`Created ${validRecipes.length} conversion recipes. ${errors.length} items skipped due to missing commissary items.`);
      console.warn('Conversion recipe upload errors:', errors);
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
