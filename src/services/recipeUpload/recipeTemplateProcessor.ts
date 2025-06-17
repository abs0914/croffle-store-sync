
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { UploadData } from "./recipeUploadHelpers";
import { createRecipeTemplate, RecipeTemplateData, RecipeTemplateIngredientInput } from "@/services/recipeManagement/recipeTemplateService";

export const processRecipeUploadAsTemplate = async (
  recipe: RecipeUpload, 
  uploadData: UploadData
): Promise<boolean> => {
  try {
    // Get current user for created_by field
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    // Prepare template data
    const templateData: RecipeTemplateData = {
      name: recipe.name,
      description: recipe.description || `Uploaded recipe: ${recipe.name}`,
      category_name: recipe.category,
      instructions: recipe.instructions || 'No specific instructions provided.',
      yield_quantity: recipe.yield_quantity || 1,
      serving_size: recipe.serving_size || 1,
      created_by: user.id,
      is_active: true,
      version: 1
    };

    // Prepare ingredients data
    const ingredients: RecipeTemplateIngredientInput[] = recipe.ingredients.map(ingredient => {
      const commissaryItem = uploadData.commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
      
      if (!commissaryItem) {
        console.warn(`Ingredient "${ingredient.commissary_item_name}" not found in commissary inventory`);
        // Return placeholder data for missing ingredients
        return {
          commissary_item_id: '', // Will be filtered out later
          commissary_item_name: ingredient.commissary_item_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit || 0
        };
      }

      return {
        commissary_item_id: commissaryItem.id,
        commissary_item_name: ingredient.commissary_item_name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit || commissaryItem.unit_cost || 0
      };
    }).filter(ing => ing.commissary_item_id !== ''); // Remove ingredients without valid commissary items

    if (ingredients.length === 0) {
      console.warn(`No valid ingredients found for recipe ${recipe.name}`);
      return false;
    }

    // Create the recipe template
    const result = await createRecipeTemplate(templateData, ingredients);
    
    return result !== null;
  } catch (error) {
    console.error(`Error in processRecipeUploadAsTemplate for ${recipe.name}:`, error);
    return false;
  }
};
