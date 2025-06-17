
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
    // For now, create using the existing recipes table
    const { data: templateData, error: templateError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size,
        version: template.version,
        is_active: template.is_active,
        store_id: '00000000-0000-0000-0000-000000000000', // Template store ID
        product_id: '00000000-0000-0000-0000-000000000000' // Placeholder product ID
      })
      .select()
      .single();

    if (templateError) throw templateError;

    toast.success('Recipe template created successfully');
    return templateData as any;
  } catch (error: any) {
    console.error('Error creating recipe template:', error);
    toast.error('Failed to create recipe template');
    return null;
  }
};

export const updateRecipeTemplate = async (id: string, updates: Partial<RecipeTemplate>, ingredients?: Omit<RecipeTemplateIngredient, 'id' | 'recipe_template_id' | 'created_at'>[]): Promise<RecipeTemplate | null> => {
  try {
    const { data: templateData, error: templateError } = await supabase
      .from('recipes')
      .update({
        name: updates.name,
        description: updates.description,
        instructions: updates.instructions,
        yield_quantity: updates.yield_quantity,
        serving_size: updates.serving_size,
        version: (updates.version || 1) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (templateError) throw templateError;

    toast.success('Recipe template updated successfully');
    return templateData as any;
  } catch (error: any) {
    console.error('Error updating recipe template:', error);
    toast.error('Failed to update recipe template');
    return null;
  }
};

export const deleteRecipeTemplate = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
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
      .from('recipes')
      .select('*')
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

    const { data: newTemplate, error: createError } = await supabase
      .from('recipes')
      .insert(duplicatedTemplate)
      .select()
      .single();

    if (createError) throw createError;

    toast.success('Recipe template duplicated successfully');
    return newTemplate as any;
  } catch (error: any) {
    console.error('Error duplicating recipe template:', error);
    toast.error('Failed to duplicate recipe template');
    return null;
  }
};

export const deployRecipeToStores = async (templateId: string, storeIds: string[], deployedBy: string): Promise<DeploymentResult[]> => {
  try {
    const results: DeploymentResult[] = [];
    
    for (const storeId of storeIds) {
      try {
        const { data: template } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', templateId)
          .single();

        if (template) {
          const { error } = await supabase
            .from('recipes')
            .insert({
              ...template,
              id: undefined,
              store_id: storeId,
              created_at: undefined,
              updated_at: undefined
            });

          if (error) throw error;
          results.push({ store_id: storeId, status: 'deployed', message: 'Success' });
        }
      } catch (error) {
        results.push({ store_id: storeId, status: 'failed', message: 'Failed to deploy' });
      }
    }

    toast.success(`Recipe deployed to ${results.filter(r => r.status === 'deployed').length} stores`);
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
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          id,
          quantity,
          unit,
          cost_per_unit,
          commissary_item_id,
          inventory_stock_id,
          created_at
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      category_name: recipe.category_name,
      instructions: recipe.instructions,
      yield_quantity: recipe.yield_quantity,
      serving_size: recipe.serving_size,
      version: recipe.version || 1,
      is_active: recipe.is_active || true,
      created_by: recipe.created_by || 'system',
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
      ingredients: (recipe.recipe_ingredients || []).map((ing: any) => ({
        id: ing.id,
        recipe_template_id: recipe.id,
        commissary_item_name: 'Unknown Item',
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

export const getRecipeDeployments = async (templateId?: string): Promise<any[]> => {
  try {
    return [];
  } catch (error: any) {
    console.error('Error fetching recipe deployments:', error);
    return [];
  }
};
