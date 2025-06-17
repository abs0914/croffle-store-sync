
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  ingredients: RecipeTemplateIngredient[];
}

export interface RecipeTemplateIngredient {
  id: string;
  recipe_template_id: string;
  commissary_item_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  created_at: string;
}

export interface DeploymentResult {
  store_id: string;
  status: 'deployed' | 'failed';
  message: string;
}

export const createRecipeTemplate = async (template: Omit<RecipeTemplate, 'id' | 'created_at' | 'updated_at' | 'ingredients'>, ingredients: Omit<RecipeTemplateIngredient, 'id' | 'recipe_template_id' | 'created_at'>[]): Promise<RecipeTemplate | null> => {
  try {
    const { data: templateData, error: templateError } = await supabase
      .from('recipe_templates')
      .insert(template)
      .select()
      .single();

    if (templateError) throw templateError;

    const ingredientsToInsert = ingredients.map(ingredient => ({
      ...ingredient,
      recipe_template_id: templateData.id
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_template_ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) throw ingredientsError;

    const { data: fullTemplate, error: fetchError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateData.id)
      .single();

    if (fetchError) throw fetchError;

    toast.success('Recipe template created successfully');
    return fullTemplate as RecipeTemplate;
  } catch (error: any) {
    console.error('Error creating recipe template:', error);
    toast.error('Failed to create recipe template');
    return null;
  }
};

export const updateRecipeTemplate = async (id: string, updates: Partial<RecipeTemplate>, ingredients?: Omit<RecipeTemplateIngredient, 'id' | 'recipe_template_id' | 'created_at'>[]): Promise<RecipeTemplate | null> => {
  try {
    const { data: templateData, error: templateError } = await supabase
      .from('recipe_templates')
      .update({
        ...updates,
        version: (updates.version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (templateError) throw templateError;

    if (ingredients) {
      // Delete existing ingredients
      await supabase
        .from('recipe_template_ingredients')
        .delete()
        .eq('recipe_template_id', id);

      // Insert new ingredients
      const ingredientsToInsert = ingredients.map(ingredient => ({
        ...ingredient,
        recipe_template_id: id
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientsToInsert);

      if (ingredientsError) throw ingredientsError;
    }

    const { data: fullTemplate, error: fetchError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    toast.success('Recipe template updated successfully');
    return fullTemplate as RecipeTemplate;
  } catch (error: any) {
    console.error('Error updating recipe template:', error);
    toast.error('Failed to update recipe template');
    return null;
  }
};

export const deleteRecipeTemplate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Recipe template deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting recipe template:', error);
    toast.error('Failed to delete recipe template');
    return false;
  }
};

export const duplicateRecipeTemplate = async (id: string): Promise<RecipeTemplate | null> => {
  try {
    const { data: template, error: fetchError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const duplicatedTemplate = {
      ...template,
      name: `Copy of ${template.name}`,
      version: 1
    };

    delete duplicatedTemplate.id;
    delete duplicatedTemplate.created_at;
    delete duplicatedTemplate.updated_at;

    const ingredients = template.ingredients.map((ingredient: any) => ({
      commissary_item_name: ingredient.commissary_item_name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit
    }));

    return await createRecipeTemplate(duplicatedTemplate, ingredients);
  } catch (error: any) {
    console.error('Error duplicating recipe template:', error);
    toast.error('Failed to duplicate recipe template');
    return null;
  }
};

export const deployRecipeToStores = async (templateId: string, storeIds: string[], deployedBy: string): Promise<DeploymentResult[]> => {
  try {
    const { data, error } = await supabase.rpc('deploy_recipe_to_stores', {
      p_recipe_template_id: templateId,
      p_store_ids: storeIds,
      p_deployed_by: deployedBy
    });

    if (error) throw error;

    const results = data as DeploymentResult[];
    const successCount = results.filter(r => r.status === 'deployed').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    if (failCount === 0) {
      toast.success(`Recipe deployed to ${successCount} store${successCount !== 1 ? 's' : ''} successfully`);
    } else {
      toast.warning(`Recipe deployed to ${successCount} stores. ${failCount} deployment${failCount !== 1 ? 's' : ''} failed.`);
    }

    return results;
  } catch (error: any) {
    console.error('Error deploying recipe:', error);
    toast.error('Failed to deploy recipe');
    return [];
  }
};

export const getRecipeTemplates = async (): Promise<RecipeTemplate[]> => {
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
    return data as RecipeTemplate[];
  } catch (error: any) {
    console.error('Error fetching recipe templates:', error);
    return [];
  }
};

export const getRecipeDeployments = async (templateId?: string): Promise<any[]> => {
  try {
    let query = supabase
      .from('recipe_deployments')
      .select(`
        *,
        recipe:recipes(name),
        store:stores(name)
      `)
      .order('deployed_at', { ascending: false });

    if (templateId) {
      query = query.eq('recipe_id', templateId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching recipe deployments:', error);
    return [];
  }
};
