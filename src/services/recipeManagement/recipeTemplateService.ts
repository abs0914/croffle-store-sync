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
  image_url?: string;
}

export interface RecipeTemplateIngredientInput {
  commissary_item_id: string;
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
}

export interface RecipeTemplate {
  id: string;
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  version: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  image_url?: string;
  ingredients: RecipeTemplateIngredient[];
}

export interface RecipeTemplateIngredient {
  id: string;
  recipe_template_id: string;
  commissary_item_id: string;
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  created_at: string;
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

export const getRecipeTemplates = async (): Promise<RecipeTemplate[]> => {
  try {
    const { data, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        recipe_template_ingredients (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category_name: template.category_name,
      instructions: template.instructions,
      yield_quantity: template.yield_quantity,
      serving_size: template.serving_size,
      version: template.version || 1,
      is_active: template.is_active || true,
      created_by: template.created_by || 'system',
      created_at: template.created_at,
      updated_at: template.updated_at,
      image_url: template.image_url,
      ingredients: (template.recipe_template_ingredients || []).map((ing: any) => ({
        id: ing.id,
        recipe_template_id: template.id,
        commissary_item_id: ing.commissary_item_id,
        commissary_item_name: ing.commissary_item_name,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit,
        created_at: ing.created_at
      }))
    })) as RecipeTemplate[];
  } catch (error: any) {
    console.error('Error fetching recipe templates:', error);
    return [];
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

    // Duplicate ingredients
    if (original.recipe_template_ingredients?.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(
          original.recipe_template_ingredients.map((ing: any) => ({
            recipe_template_id: newTemplate.id,
            commissary_item_id: ing.commissary_item_id,
            commissary_item_name: ing.commissary_item_name,
            quantity: ing.quantity,
            unit: ing.unit,
            cost_per_unit: ing.cost_per_unit
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
