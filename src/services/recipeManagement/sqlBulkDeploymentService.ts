import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BulkDeploymentResult {
  deployed_recipes: number;
  deployed_ingredients: number;
  deployed_products: number;
  skipped_existing: number;
  total_stores: number;
  total_templates?: number;
  execution_time_ms: number;
}

export interface SingleTemplateDeploymentResult {
  deployed_recipes: number;
  deployed_ingredients: number;
  deployed_products: number;
  skipped_existing: number;
  total_stores: number;
  execution_time_ms: number;
}

/**
 * Deploy all recipe templates to all stores using SQL bulk operation
 * This is much faster than individual API calls (seconds vs minutes)
 */
export const deployAllRecipeTemplatesToAllStores = async (): Promise<BulkDeploymentResult> => {
  console.log('🚀 Starting SQL bulk deployment of all recipe templates...');
  
  try {
    const { data, error } = await supabase.rpc('deploy_all_recipe_templates_to_all_stores');
    
    if (error) {
      console.error('❌ SQL bulk deployment failed:', error);
      toast.error(`Deployment failed: ${error.message}`);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No deployment results returned');
    }

    const result = data[0] as BulkDeploymentResult;
    
    console.log('✅ SQL bulk deployment completed:', {
      deployedRecipes: result.deployed_recipes,
      deployedIngredients: result.deployed_ingredients,
      deployedProducts: result.deployed_products,
      skippedExisting: result.skipped_existing,
      totalStores: result.total_stores,
      totalTemplates: result.total_templates,
      executionTimeMs: result.execution_time_ms
    });

    // Show detailed success message
    const executionTimeSeconds = (result.execution_time_ms / 1000).toFixed(2);
    toast.success(
      `🎉 Bulk deployment completed in ${executionTimeSeconds}s!`,
      {
        description: `Deployed ${result.deployed_recipes} recipes, ${result.deployed_products} products across ${result.total_stores} stores. Skipped ${result.skipped_existing} existing recipes.`,
        duration: 8000,
      }
    );

    return result;
  } catch (error) {
    console.error('❌ Bulk deployment service error:', error);
    toast.error(`Bulk deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Deploy a specific recipe template to all stores using SQL bulk operation
 */
export const deployRecipeTemplateToAllStores = async (
  templateId: string
): Promise<SingleTemplateDeploymentResult> => {
  console.log('🚀 Starting SQL template deployment to all stores...', { templateId });
  
  try {
    const { data, error } = await supabase.rpc('deploy_recipe_template_to_all_stores', {
      template_id_param: templateId
    });
    
    if (error) {
      console.error('❌ SQL template deployment failed:', error);
      toast.error(`Template deployment failed: ${error.message}`);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No deployment results returned');
    }

    const result = data[0] as SingleTemplateDeploymentResult;
    
    console.log('✅ SQL template deployment completed:', {
      templateId,
      deployedRecipes: result.deployed_recipes,
      deployedIngredients: result.deployed_ingredients,
      deployedProducts: result.deployed_products,
      skippedExisting: result.skipped_existing,
      totalStores: result.total_stores,
      executionTimeMs: result.execution_time_ms
    });

    // Show success message
    const executionTimeSeconds = (result.execution_time_ms / 1000).toFixed(2);
    toast.success(
      `🎉 Template deployment completed in ${executionTimeSeconds}s!`,
      {
        description: `Deployed to ${result.deployed_recipes} stores, created ${result.deployed_products} products. Skipped ${result.skipped_existing} existing recipes.`,
        duration: 6000,
      }
    );

    return result;
  } catch (error) {
    console.error('❌ Template deployment service error:', error);
    toast.error(`Template deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Get deployment statistics before bulk deployment
 */
export const getDeploymentStats = async () => {
  try {
    const [storesResult, templatesResult] = await Promise.all([
      supabase.from('stores').select('id, name').eq('is_active', true),
      supabase.from('recipe_templates').select('id, name').eq('is_active', true)
    ]);

    if (storesResult.error) throw storesResult.error;
    if (templatesResult.error) throw templatesResult.error;

    return {
      totalStores: storesResult.data?.length || 0,
      totalTemplates: templatesResult.data?.length || 0,
      estimatedRecipes: (storesResult.data?.length || 0) * (templatesResult.data?.length || 0),
      stores: storesResult.data || [],
      templates: templatesResult.data || []
    };
  } catch (error) {
    console.error('❌ Failed to get deployment stats:', error);
    throw error;
  }
};