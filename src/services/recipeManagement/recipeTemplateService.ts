
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecipeTemplateData {
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  created_by: string;
  is_active: boolean;
  version: number;
}

export interface RecipeTemplateIngredientInput {
  commissary_item_id: string;
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
}

export const createRecipeTemplate = async (
  templateData: RecipeTemplateData,
  ingredients: RecipeTemplateIngredientInput[]
) => {
  try {
    // Create recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert(templateData)
      .select()
      .single();

    if (templateError) throw templateError;

    // Create ingredients with commissary_item_id
    if (ingredients.length > 0) {
      const ingredientsWithTemplate = ingredients.map(ing => ({
        recipe_template_id: template.id,
        commissary_item_id: ing.commissary_item_id,
        commissary_item_name: ing.commissary_item_name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit || 0
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientsWithTemplate);

      if (ingredientsError) throw ingredientsError;
    }

    toast.success('Recipe template created successfully');
    return template;
  } catch (error: any) {
    console.error('Error creating recipe template:', error);
    toast.error(`Failed to create recipe template: ${error.message}`);
    return null;
  }
};

export const updateRecipeTemplate = async (
  templateId: string,
  templateData: RecipeTemplateData,
  ingredients: RecipeTemplateIngredientInput[]
) => {
  try {
    // Update recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .update(templateData)
      .eq('id', templateId)
      .select()
      .single();

    if (templateError) throw templateError;

    // Delete existing ingredients
    const { error: deleteError } = await supabase
      .from('recipe_template_ingredients')
      .delete()
      .eq('recipe_template_id', templateId);

    if (deleteError) throw deleteError;

    // Create new ingredients
    if (ingredients.length > 0) {
      const ingredientsWithTemplate = ingredients.map(ing => ({
        recipe_template_id: templateId,
        commissary_item_id: ing.commissary_item_id,
        commissary_item_name: ing.commissary_item_name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit || 0
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientsWithTemplate);

      if (ingredientsError) throw ingredientsError;
    }

    toast.success('Recipe template updated successfully');
    return template;
  } catch (error: any) {
    console.error('Error updating recipe template:', error);
    toast.error(`Failed to update recipe template: ${error.message}`);
    return null;
  }
};
