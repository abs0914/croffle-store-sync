
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Re-export the ingredient input type using export type for isolated modules
export type { RecipeTemplateIngredientInput } from './types';

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

// Enhanced interfaces for metrics and analytics
export interface RecipeTemplateWithMetrics {
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
  ingredients: any[];
  // Metrics
  deploymentCount: number;
  averageCost: number;
  profitMargin: number;
  popularityScore: number;
  totalRevenue: number;
}

export interface TemplateDeploymentSummary {
  templateId: string;
  storesDeployed: number;
  successfulDeployments: number;
  failedDeployments: number;
  averageRating: number;
  totalRevenue: number;
  lastDeployment: string;
}

export const createRecipeTemplate = async (
  templateData: RecipeTemplateData,
  ingredients: any[]
): Promise<any> => {
  try {
    // Create the recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .insert(templateData)
      .select()
      .single();

    if (templateError) throw templateError;

    // Insert ingredients with simplified data structure (no purchase_unit or conversion_factor required)
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
        // Set default values for backward compatibility but don't require them
        purchase_unit: ingredient.purchase_unit || ingredient.unit,
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
  ingredients: any[]
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

    // Insert updated ingredients with simplified data structure
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
        // Set default values for backward compatibility but don't require them
        purchase_unit: ingredient.purchase_unit || ingredient.unit,
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

// Alias for backward compatibility
export const getRecipeTemplates = fetchRecipeTemplates;

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

// Enhanced functions for metrics and analytics
export const getRecipeTemplatesWithMetrics = async (): Promise<RecipeTemplateWithMetrics[]> => {
  try {
    const templates = await fetchRecipeTemplates();
    
    // For now, return templates with mock metrics - this would be enhanced with real analytics
    return templates.map(template => ({
      ...template,
      deploymentCount: Math.floor(Math.random() * 10),
      averageCost: Math.random() * 100,
      profitMargin: Math.random() * 50 + 25,
      popularityScore: Math.floor(Math.random() * 100),
      totalRevenue: Math.random() * 1000
    }));
  } catch (error) {
    console.error('Error fetching templates with metrics:', error);
    return [];
  }
};

export const getTemplateDeploymentSummary = async (templateId: string): Promise<TemplateDeploymentSummary> => {
  try {
    // Mock implementation - this would query actual deployment data
    return {
      templateId,
      storesDeployed: Math.floor(Math.random() * 5) + 1,
      successfulDeployments: Math.floor(Math.random() * 8) + 2,
      failedDeployments: Math.floor(Math.random() * 2),
      averageRating: Math.random() * 2 + 3, // 3-5 star rating
      totalRevenue: Math.random() * 5000,
      lastDeployment: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching deployment summary:', error);
    throw error;
  }
};

export const cloneRecipeTemplate = async (templateId: string, newName: string): Promise<any> => {
  try {
    // Get the current user ID first
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get the original template
    const { data: originalTemplate, error: fetchError } = await supabase
      .from('recipe_templates')
      .select('*, ingredients:recipe_template_ingredients(*)')
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;

    // Create new template data with proper created_by field
    const newTemplateData: RecipeTemplateData = {
      name: newName,
      description: originalTemplate.description,
      category_name: originalTemplate.category_name,
      instructions: originalTemplate.instructions,
      yield_quantity: originalTemplate.yield_quantity,
      serving_size: originalTemplate.serving_size,
      image_url: originalTemplate.image_url,
      created_by: user.id, // Use current user's ID instead of original template's created_by
      is_active: true,
      version: 1
    };

    // Map ingredients
    const ingredients: any[] = originalTemplate.ingredients.map((ing: any) => ({
      ingredient_name: ing.ingredient_name,
      ingredient_category: ing.ingredient_category,
      ingredient_type: ing.ingredient_type,
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      purchase_unit: ing.purchase_unit,
      conversion_factor: ing.conversion_factor
    }));

    // Create the cloned template
    const clonedTemplate = await createRecipeTemplate(newTemplateData, ingredients);
    
    toast.success(`Template "${newName}" cloned successfully`);
    return clonedTemplate;
  } catch (error) {
    console.error('Error cloning recipe template:', error);
    toast.error('Failed to clone template');
    throw error;
  }
};

// Updated duplicateRecipeTemplate to match expected signature
export const duplicateRecipeTemplate = async (template: any): Promise<any> => {
  const newName = `${template.name} (Copy)`;
  return cloneRecipeTemplate(template.id, newName);
};
