import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate, RecipeTemplateIngredient } from "./types";
import { toast } from "sonner";

export const createRecipeTemplate = async (
  templateData: Omit<RecipeTemplate, 'id' | 'created_at' | 'updated_at' | 'ingredients'>,
  ingredients: Omit<RecipeTemplateIngredient, 'id' | 'recipe_template_id' | 'created_at'>[]
): Promise<RecipeTemplate | null> => {
  try {
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: templateData.name,
        description: templateData.description,
        instructions: templateData.instructions,
        yield_quantity: templateData.yield_quantity,
        serving_size: templateData.serving_size,
        category_name: templateData.category_name,
        version: templateData.version,
        is_active: templateData.is_active,
        created_by: templateData.created_by,
        image_url: templateData.image_url
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Insert ingredients without the ingredient_category field
    if (ingredients.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(
          ingredients.map(ing => ({
            recipe_template_id: template.id,
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            commissary_item_id: ing.commissary_item_id,
            commissary_item_name: ing.commissary_item_name,
            cost_per_unit: ing.cost_per_unit,
            location_type: ing.location_type || 'all'
          }))
        );

      if (ingredientsError) throw ingredientsError;
    }

    // Create the complete RecipeTemplate object with ingredients
    const completeTemplate: RecipeTemplate = {
      ...template,
      ingredients: []
    };

    toast.success('Recipe template created successfully');
    return completeTemplate;
  } catch (error: any) {
    console.error('Error creating recipe template:', error);
    toast.error('Failed to create recipe template');
    return null;
  }
};

export const updateRecipeTemplate = async (
  templateId: string,
  updates: Partial<RecipeTemplate>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_templates')
      .update({
        name: updates.name,
        description: updates.description,
        instructions: updates.instructions,
        yield_quantity: updates.yield_quantity,
        serving_size: updates.serving_size,
        category_name: updates.category_name,
        is_active: updates.is_active,
        image_url: updates.image_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId);

    if (error) throw error;

    toast.success('Recipe template updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating recipe template:', error);
    toast.error('Failed to update recipe template');
    return false;
  }
};

export const deleteRecipeTemplate = async (templateId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    toast.success('Recipe template deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting recipe template:', error);
    toast.error('Failed to delete recipe template');
    return false;
  }
};

export const duplicateRecipeTemplate = async (templateId: string): Promise<boolean> => {
  try {
    // Get the original template with ingredients
    const { data: original, error: fetchError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        recipe_template_ingredients (*)
      `)
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;

    // Create duplicate template
    const { data: newTemplate, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: `${original.name} (Copy)`,
        description: original.description,
        instructions: original.instructions,
        yield_quantity: original.yield_quantity,
        serving_size: original.serving_size,
        category_name: original.category_name,
        version: 1,
        is_active: false,
        created_by: original.created_by,
        image_url: original.image_url
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Duplicate ingredients without ingredient_category field
    if (original.recipe_template_ingredients?.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(
          original.recipe_template_ingredients.map((ing: any) => ({
            recipe_template_id: newTemplate.id,
            ingredient_name: ing.ingredient_name || ing.commissary_item_name,
            quantity: ing.quantity,
            unit: ing.unit,
            commissary_item_id: ing.commissary_item_id,
            commissary_item_name: ing.commissary_item_name,
            cost_per_unit: ing.cost_per_unit,
            location_type: ing.location_type || 'all'
          }))
        );

      if (ingredientsError) throw ingredientsError;
    }

    toast.success('Recipe template duplicated successfully');
    return true;
  } catch (error: any) {
    console.error('Error duplicating recipe template:', error);
    toast.error('Failed to duplicate recipe template');
    return false;
  }
};
