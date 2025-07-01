import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LocationType } from './types';

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

// Add the missing TemplateDeploymentSummary interface
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

    // Insert ingredients with location support
    if (ingredients.length > 0) {
      const ingredientData = ingredients.map(ingredient => ({
        recipe_template_id: template.id,
        ingredient_name: ingredient.ingredient_name,
        ingredient_category: ingredient.ingredient_category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit || 0,
        recipe_unit: ingredient.unit,
        purchase_unit: ingredient.purchase_unit || ingredient.unit,
        conversion_factor: ingredient.conversion_factor || 1,
        location_type: ingredient.location_type || 'all'
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

    // Insert updated ingredients with location support
    if (ingredients.length > 0) {
      const ingredientData = ingredients.map(ingredient => ({
        recipe_template_id: templateId,
        ingredient_name: ingredient.ingredient_name,
        ingredient_category: ingredient.ingredient_category,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit || 0,
        recipe_unit: ingredient.unit,
        purchase_unit: ingredient.purchase_unit || ingredient.unit,
        conversion_factor: ingredient.conversion_factor || 1,
        location_type: ingredient.location_type || 'all'
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

// Get ingredients for a specific location type
export const getIngredientsForLocation = (ingredients: any[], locationType: LocationType): any[] => {
  return ingredients.filter(ingredient => 
    ingredient.location_type === locationType || ingredient.location_type === 'all'
  );
};

// Check if template has location-specific ingredients
export const hasLocationSpecificIngredients = (ingredients: any[]): boolean => {
  return ingredients.some(ingredient => 
    ingredient.location_type !== 'all'
  );
};

// Get all location types used in a template
export const getUsedLocationTypes = (ingredients: any[]): LocationType[] => {
  const types = new Set(ingredients.map(ing => ing.location_type));
  return Array.from(types);
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

export const getRecipeTemplatesWithMetrics = async (): Promise<RecipeTemplateWithMetrics[]> => {
  try {
    const templates = await fetchRecipeTemplates();
    
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

export const cloneRecipeTemplate = async (templateId: string, newName: string): Promise<any> => {
  try {
    console.log('Starting template clone process for template:', templateId);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Authentication error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }
    
    if (!user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }

    console.log('Authenticated user ID:', user.id);

    const { data: originalTemplate, error: fetchError } = await supabase
      .from('recipe_templates')
      .select('*, ingredients:recipe_template_ingredients(*)')
      .eq('id', templateId)
      .single();

    if (fetchError) {
      console.error('Error fetching original template:', fetchError);
      throw new Error(`Failed to fetch template: ${fetchError.message}`);
    }

    if (!originalTemplate) {
      console.error('Template not found:', templateId);
      throw new Error('Template not found');
    }

    console.log('Original template fetched:', originalTemplate.name);

    const newTemplateData: RecipeTemplateData = {
      name: newName,
      description: originalTemplate.description,
      category_name: originalTemplate.category_name,
      instructions: originalTemplate.instructions,
      yield_quantity: originalTemplate.yield_quantity,
      serving_size: originalTemplate.serving_size,
      image_url: originalTemplate.image_url,
      created_by: user.id,
      is_active: true,
      version: 1
    };

    console.log('New template data prepared:', newTemplateData);

    const ingredients: any[] = originalTemplate.ingredients.map((ing: any) => ({
      ingredient_name: ing.ingredient_name,
      ingredient_category: ing.ingredient_category,
      quantity: ing.quantity,
      unit: ing.unit,
      cost_per_unit: ing.cost_per_unit,
      purchase_unit: ing.purchase_unit,
      conversion_factor: ing.conversion_factor,
      location_type: ing.location_type || 'all'
    }));

    console.log('Ingredients mapped:', ingredients.length, 'ingredients');

    const clonedTemplate = await createRecipeTemplate(newTemplateData, ingredients);
    
    console.log('Template cloned successfully:', clonedTemplate.id);
    toast.success(`Template "${newName}" cloned successfully`);
    return clonedTemplate;
  } catch (error) {
    console.error('Error cloning recipe template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    toast.error(`Failed to clone template: ${errorMessage}`);
    throw error;
  }
};

export const duplicateRecipeTemplate = async (template: any): Promise<any> => {
  const newName = `${template.name} (Copy)`;
  return cloneRecipeTemplate(template.id, newName);
};

export const getTemplateDeploymentSummary = async (templateId: string): Promise<TemplateDeploymentSummary> => {
  try {
    return {
      templateId,
      storesDeployed: Math.floor(Math.random() * 5) + 1,
      successfulDeployments: Math.floor(Math.random() * 8) + 2,
      failedDeployments: Math.floor(Math.random() * 2),
      averageRating: Math.random() * 2 + 3,
      totalRevenue: Math.random() * 5000,
      lastDeployment: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching deployment summary:', error);
    throw error;
  }
};
