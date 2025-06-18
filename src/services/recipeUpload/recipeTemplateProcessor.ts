
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { UploadData } from "./recipeUploadHelpers";

export const processRecipeUploadAsTemplate = async (
  recipe: RecipeUpload,
  uploadData: UploadData
): Promise<boolean> => {
  try {
    console.log(`Processing recipe template: ${recipe.name}`);
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;
    
    if (!currentUserId) {
      console.error('No authenticated user found');
      return false;
    }

    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.name,
        description: recipe.description,
        category_name: recipe.category,
        instructions: recipe.instructions,
        yield_quantity: recipe.yield_quantity,
        serving_size: recipe.serving_size || 1,
        version: 1,
        is_active: true,
        created_by: currentUserId // Use actual user ID instead of "system"
      })
      .select()
      .single();

    if (templateError) {
      console.error(`Error creating recipe template:`, templateError);
      return false;
    }

    console.log(`Created recipe template with ID: ${template.id}`);

    // Process ingredients if they exist
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const ingredientInserts = [];

      for (const ingredient of recipe.ingredients) {
        // Find the commissary item
        const commissaryItem = uploadData.commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
        
        if (!commissaryItem) {
          console.warn(`Ingredient "${ingredient.commissary_item_name}" not found in commissary inventory`);
          continue;
        }

        ingredientInserts.push({
          recipe_template_id: template.id,
          commissary_item_id: commissaryItem.id,
          commissary_item_name: ingredient.commissary_item_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit || commissaryItem.unit_cost || 0
        });
      }

      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error(`Error adding ingredients for template ${recipe.name}:`, ingredientsError);
          return false;
        }

        console.log(`Added ${ingredientInserts.length} ingredients to template ${recipe.name}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error in processRecipeUploadAsTemplate for ${recipe.name}:`, error);
    return false;
  }
};
