
import { supabase } from "@/integrations/supabase/client";
import { RecipeUpload } from "@/types/commissary";
import { UploadData, getUnitMapping, getValidUnits } from "./recipeUploadHelpers";

export const processRecipeUploadAsTemplate = async (
  recipe: RecipeUpload,
  uploadData: UploadData
): Promise<boolean> => {
  try {
    console.log(`Processing recipe template: ${recipe.name}`);
    
    // Create the recipe template
    const { data: templateData, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: recipe.name,
        description: recipe.description || `Recipe template for ${recipe.name}`,
        category_name: recipe.category || 'General',
        instructions: recipe.instructions || `Instructions for preparing ${recipe.name}`,
        yield_quantity: recipe.yield_quantity || 1,
        serving_size: recipe.serving_size || 1,
        version: 1,
        is_active: true,
        created_by: 'system' // We could get the actual user ID if needed
      })
      .select()
      .single();

    if (templateError) {
      console.error(`Error creating template for ${recipe.name}:`, templateError);
      return false;
    }

    console.log(`Created recipe template: ${templateData.id}`);

    // Process ingredients
    const unitMapping = getUnitMapping();
    const validUnits = getValidUnits();
    const ingredientInserts = [];

    for (const ingredient of recipe.ingredients) {
      const commissaryItem = uploadData.commissaryMap.get(ingredient.commissary_item_name.toLowerCase());
      
      if (!commissaryItem) {
        console.warn(`Ingredient "${ingredient.commissary_item_name}" not found in commissary inventory for recipe ${recipe.name}`);
        continue;
      }

      // Ensure unit is mapped to valid enum value
      const mappedUnit = unitMapping[ingredient.unit.toLowerCase()] || ingredient.unit;
      const finalUnit = validUnits.includes(mappedUnit) ? mappedUnit : 'pieces';
      
      ingredientInserts.push({
        recipe_template_id: templateData.id,
        commissary_item_id: commissaryItem.id,
        commissary_item_name: ingredient.commissary_item_name,
        quantity: ingredient.quantity,
        unit: finalUnit,
        cost_per_unit: ingredient.cost_per_unit || commissaryItem.unit_cost || 0
      });
    }

    if (ingredientInserts.length === 0) {
      console.warn(`No valid ingredients found for recipe template ${recipe.name}`);
      // Don't fail the entire upload, just log the warning
      return true;
    }

    // Insert template ingredients
    const { error: ingredientsError } = await supabase
      .from('recipe_template_ingredients')
      .insert(ingredientInserts);

    if (ingredientsError) {
      console.error(`Error adding ingredients for recipe template ${recipe.name}:`, ingredientsError);
      return false;
    }

    console.log(`Successfully created recipe template: ${recipe.name} with ${ingredientInserts.length} ingredients`);
    return true;
  } catch (error) {
    console.error(`Error in processRecipeUploadAsTemplate for ${recipe.name}:`, error);
    return false;
  }
};
