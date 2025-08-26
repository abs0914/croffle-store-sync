
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";

// Simplified interface for template creation
interface TemplateUploadData {
  categoryMap: Map<string, any>;
  commissaryMap: Map<string, any>;
}

export const processRecipeUploadAsTemplate = async (
  recipe: RecipeUpload,
  uploadData: TemplateUploadData
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
        description: recipe.description || `Recipe template for ${recipe.name}`,
        category_name: recipe.category,
        instructions: recipe.instructions || 'Instructions to be added',
        yield_quantity: recipe.yield_quantity || 1,
        serving_size: recipe.serving_size || 1,
        version: 1,
        is_active: true,
        created_by: currentUserId
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
        const ingredientName = ingredient.commissary_item_name;
        
        // Handle choice-based ingredients (like "Choose 1: Chocolate Sauce OR Caramel Sauce")
        if (ingredientName.toLowerCase().includes('choose') || ingredientName.toLowerCase().includes('or')) {
          console.log(`Processing choice-based ingredient: ${ingredientName}`);
          
          // Parse choice-based ingredients: "Choose 1: Option A OR Option B"
          const options = ingredientName.split(/\s+or\s+|\s+OR\s+/i);
          
          for (const option of options) {
            const cleanOption = option.replace(/choose\s+\d+:\s*/i, '').trim();
            if (cleanOption) {
              ingredientInserts.push({
                recipe_template_id: template.id,
                ingredient_name: cleanOption,
                commissary_item_name: cleanOption,
                quantity: ingredient.quantity,
                unit: ingredient.uom,
                cost_per_unit: ingredient.cost_per_unit || 0,
                recipe_unit: ingredient.uom,
                purchase_unit: ingredient.uom,
                conversion_factor: 1,
                location_type: 'all'
              });
            }
          }
        } else {
          // Regular ingredient processing
          ingredientInserts.push({
            recipe_template_id: template.id,
            ingredient_name: ingredientName,
            commissary_item_name: ingredientName,
            quantity: ingredient.quantity,
            unit: ingredient.uom,
            cost_per_unit: ingredient.cost_per_unit || 0,
            recipe_unit: ingredient.uom,
            purchase_unit: ingredient.uom,
            conversion_factor: 1,
            location_type: 'all'
          });
        }
      }

      if (ingredientInserts.length > 0) {
        console.log(`Attempting to insert ${ingredientInserts.length} ingredients for template ${recipe.name}`);
        console.log('Ingredient data:', ingredientInserts);
        
        const { data: insertedIngredients, error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts)
          .select();

        if (ingredientsError) {
          console.error(`Error adding ingredients for template ${recipe.name}:`, ingredientsError);
          console.error('Failed ingredient data:', ingredientInserts);
          
          // Don't fail the entire template creation if only ingredients fail
          console.warn(`Template created but ingredients failed to insert`);
        } else {
          console.log(`Successfully added ${insertedIngredients?.length || ingredientInserts.length} ingredients to template ${recipe.name}`);
          console.log('Inserted ingredients:', insertedIngredients);
        }
      }
    } else {
      console.log(`No ingredients found for recipe ${recipe.name}`);
    }

    return true;
  } catch (error) {
    console.error(`Error in processRecipeUploadAsTemplate for ${recipe.name}:`, error);
    return false;
  }
};
