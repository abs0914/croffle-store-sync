
import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate, RecipeTemplateIngredient } from "./types";
import { toast } from "sonner";

export interface RecipeTemplateWithMetrics extends RecipeTemplate {
  deploymentCount: number;
  totalRevenue: number;
  averageCost: number;
  profitMargin: number;
  popularityScore: number;
}

export interface TemplateDeploymentSummary {
  templateId: string;
  templateName: string;
  storesDeployed: number;
  successfulDeployments: number;
  failedDeployments: number;
  totalRevenue: number;
  averageRating: number;
}

export const getRecipeTemplatesWithMetrics = async (): Promise<RecipeTemplateWithMetrics[]> => {
  try {
    const { data: templates, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*),
        deployments:recipes(
          id,
          store_id,
          created_at,
          total_cost
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const templatesWithMetrics: RecipeTemplateWithMetrics[] = (templates || []).map(template => {
      const deploymentCount = template.deployments?.length || 0;
      const totalCost = template.ingredients?.reduce((sum, ing) => 
        sum + (ing.quantity * (ing.cost_per_unit || 0)), 0) || 0;
      
      // Calculate popularity based on deployment frequency
      const popularityScore = deploymentCount * 10 + (template.ingredients?.length || 0);
      
      return {
        ...template,
        ingredients: template.ingredients || [],
        deploymentCount,
        totalRevenue: deploymentCount * totalCost * 2, // Estimated revenue
        averageCost: totalCost,
        profitMargin: totalCost > 0 ? ((totalCost * 1.5 - totalCost) / (totalCost * 1.5)) * 100 : 0,
        popularityScore
      };
    });

    return templatesWithMetrics;
  } catch (error) {
    console.error('Error fetching recipe templates with metrics:', error);
    toast.error('Failed to load recipe templates');
    return [];
  }
};

export const getTemplateDeploymentSummary = async (templateId: string): Promise<TemplateDeploymentSummary | null> => {
  try {
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select('name')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    const { data: deployments, error: deploymentsError } = await supabase
      .from('recipes')
      .select(`
        id,
        store_id,
        total_cost,
        approval_status,
        stores(name)
      `)
      .eq('name', template.name);

    if (deploymentsError) throw deploymentsError;

    const successfulDeployments = deployments?.filter(d => d.approval_status === 'approved').length || 0;
    const failedDeployments = (deployments?.length || 0) - successfulDeployments;
    const totalRevenue = deployments?.reduce((sum, d) => sum + ((d.total_cost || 0) * 2), 0) || 0;

    return {
      templateId,
      templateName: template.name,
      storesDeployed: new Set(deployments?.map(d => d.store_id)).size,
      successfulDeployments,
      failedDeployments,
      totalRevenue,
      averageRating: 4.2 // Mock rating - could be calculated from actual reviews
    };
  } catch (error) {
    console.error('Error getting template deployment summary:', error);
    return null;
  }
};

export const cloneRecipeTemplate = async (
  templateId: string,
  newName: string,
  modifications?: Partial<RecipeTemplate>
): Promise<RecipeTemplate | null> => {
  try {
    // Get original template with ingredients
    const { data: original, error: fetchError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;

    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: newName,
        description: modifications?.description || `${original.description} (Clone)`,
        instructions: modifications?.instructions || original.instructions,
        yield_quantity: modifications?.yield_quantity || original.yield_quantity,
        serving_size: modifications?.serving_size || original.serving_size,
        category_name: modifications?.category_name || original.category_name,
        version: 1,
        is_active: true,
        created_by: original.created_by,
        image_url: modifications?.image_url || original.image_url
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Clone ingredients
    if (original.ingredients?.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(
          original.ingredients.map((ing: any) => ({
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

    toast.success(`Recipe template "${newName}" cloned successfully`);
    return {
      ...newTemplate,
      ingredients: []
    };
  } catch (error) {
    console.error('Error cloning recipe template:', error);
    toast.error('Failed to clone recipe template');
    return null;
  }
};

export const getRecipeTemplateVersions = async (templateName: string): Promise<RecipeTemplate[]> => {
  try {
    const { data: versions, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('name', templateName)
      .order('version', { ascending: false });

    if (error) throw error;

    return (versions || []).map(version => ({
      ...version,
      ingredients: version.ingredients || []
    }));
  } catch (error) {
    console.error('Error fetching recipe template versions:', error);
    return [];
  }
};

export const createRecipeTemplateVersion = async (
  originalTemplateId: string,
  changes: Partial<RecipeTemplate>
): Promise<RecipeTemplate | null> => {
  try {
    // Get original template
    const { data: original, error: fetchError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', originalTemplateId)
      .single();

    if (fetchError) throw fetchError;

    // Get highest version number
    const { data: versions, error: versionsError } = await supabase
      .from('recipe_templates')
      .select('version')
      .eq('name', original.name)
      .order('version', { ascending: false })
      .limit(1);

    if (versionsError) throw versionsError;

    const nextVersion = (versions?.[0]?.version || 0) + 1;

    // Deactivate previous versions
    await supabase
      .from('recipe_templates')
      .update({ is_active: false })
      .eq('name', original.name);

    // Create new version
    const { data: newVersion, error: versionError } = await supabase
      .from('recipe_templates')
      .insert({
        name: original.name,
        description: changes.description || original.description,
        instructions: changes.instructions || original.instructions,
        yield_quantity: changes.yield_quantity || original.yield_quantity,
        serving_size: changes.serving_size || original.serving_size,
        category_name: changes.category_name || original.category_name,
        version: nextVersion,
        is_active: true,
        created_by: original.created_by,
        image_url: changes.image_url || original.image_url
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Copy ingredients (can be modified in changes)
    if (original.ingredients?.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(
          original.ingredients.map((ing: any) => ({
            recipe_template_id: newVersion.id,
            commissary_item_id: ing.commissary_item_id,
            commissary_item_name: ing.commissary_item_name,
            quantity: ing.quantity,
            unit: ing.unit,
            cost_per_unit: ing.cost_per_unit
          }))
        );

      if (ingredientsError) throw ingredientsError;
    }

    toast.success(`Created version ${nextVersion} of "${original.name}"`);
    return {
      ...newVersion,
      ingredients: []
    };
  } catch (error) {
    console.error('Error creating recipe template version:', error);
    toast.error('Failed to create new version');
    return null;
  }
};
