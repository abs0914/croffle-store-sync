
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
        // Handle choice-based ingredients (like "Choose 1: Chocolate Sauce OR Caramel Sauce")
        if (ingredient.commissary_item_name.toLowerCase().includes('choose') || ingredient.commissary_item_name.toLowerCase().includes('or')) {
          console.log(`Processing choice-based ingredient: ${ingredient.commissary_item_name}`);
          
          // For now, create all options as separate ingredients
          // Future enhancement: implement ingredient groups
          const options = ingredient.commissary_item_name.split(/\s+or\s+|\s+OR\s+/i);
          
          for (const option of options) {
            const cleanOption = option.replace(/choose\s+\d+:\s*/i, '').trim();
            if (cleanOption) {
              ingredientInserts.push({
                recipe_template_id: template.id,
                ingredient_name: cleanOption,
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
            ingredient_name: ingredient.commissary_item_name,
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
        console.log(`Inserting ${ingredientInserts.length} ingredients for template ${recipe.name}`);
        
        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error(`Error adding ingredients for template ${recipe.name}:`, ingredientsError);
          console.error('Ingredient data that failed:', ingredientInserts);
          
          // Don't fail the entire template creation if only ingredients fail
          // The template is created successfully, ingredients can be added manually
          console.warn(`Template created but ingredients failed to insert`);
        } else {
          console.log(`Successfully added ${ingredientInserts.length} ingredients to template ${recipe.name}`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`Error in processRecipeUploadAsTemplate for ${recipe.name}:`, error);
    return false;
  }
};
