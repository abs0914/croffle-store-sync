
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RecipeTemplateIngredientInput } from './types';

export interface RecipeTemplateData {
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  image_url?: string;
  created_by: string;
  is_active: boolean;
  version: number;
}

export const createRecipeTemplate = async (
  templateData: RecipeTemplateData,
  ingredients: RecipeTemplateIngredientInput[]
): Promise<any> => {
  try {
    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert(templateData)
      .select()
      .single();

    if (templateError) throw templateError;

    // Insert ingredients with cost data
    if (ingredients.length > 0) {
      const ingredientData = ingredients.map(ingredient => ({
        recipe_template_id: template.id,
        ingredient_name: ingredient.ingredient_name,
        ingredient_category: ingredient.ingredient_category,
        ingredient_type: ingredient.ingredient_type,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit || 0,
        recipe_unit: ingredient.unit,
        purchase_unit: ingredient.purchase_unit,
        conversion_factor: ingredient.conversion_factor || 1
      }));

      const { error: ingredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientData);

      if (ingredientError) throw ingredientError;
    }

    return template;
  } catch (error) {
    console.error('Error creating recipe template:', error);
    throw error;
  }
};

export const updateRecipeTemplate = async (
  templateId: string,
  templateData: RecipeTemplateData,
  ingredients: RecipeTemplateIngredientInput[]
): Promise<any> => {
  try {
    // Update the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .update(templateData)
      .eq('id', templateId)
      .select()
      .single();

    if (templateError) throw templateError;

    // Delete existing ingredients
    await supabase
      .from('recipe_template_ingredients')
      .delete()
      .eq('recipe_template_id', templateId);

    // Insert updated ingredients with cost data
    if (ingredients.length > 0) {
      const ingredientData = ingredients.map(ingredient => ({
        recipe_template_id: templateId,
        ingredient_name: ingredient.ingredient_name,
        ingredient_category: ingredient.ingredient_category,
        ingredient_type: ingredient.ingredient_type,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit || 0,
        recipe_unit: ingredient.unit,
        purchase_unit: ingredient.purchase_unit,
        conversion_factor: ingredient.conversion_factor || 1
      }));

      const { error: ingredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientData);

      if (ingredientError) throw ingredientError;
    }

    return template;
  } catch (error) {
    console.error('Error updating recipe template:', error);
    throw error;
  }
};

export const fetchRecipeTemplates = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recipe templates:', error);
    return [];
  }
};

export const deleteRecipeTemplate = async (templateId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_templates')
      .update({ is_active: false })
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting recipe template:', error);
    return false;
  }
};
