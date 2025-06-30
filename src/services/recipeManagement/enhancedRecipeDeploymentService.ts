
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  deployRecipeWithMapping, 
  validateRecipeDeployment,
  getDeploymentPreview,
  type DeploymentValidation 
} from "./recipeInventoryMappingService";

export interface EnhancedDeploymentResult {
  storeId: string;
  storeName?: string;
  success: boolean;
  error?: string;
  recipeId?: string;
  productId?: string;
  validation?: DeploymentValidation;
  warnings: string[];
}

/**
 * Enhanced recipe deployment with smart inventory mapping
 */
export const deployRecipeTemplateEnhanced = async (
  templateId: string,
  storeId: string
): Promise<EnhancedDeploymentResult> => {
  try {
    console.log(`Enhanced deployment: Recipe template "${templateId}" to store ${storeId}`);

    // Get store info
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single();

    // Validate deployment first
    const validation = await validateRecipeDeployment(templateId, storeId);
    
    const warnings: string[] = [];
    if (validation.lowStockIngredients.length > 0) {
      warnings.push(`Low stock ingredients: ${validation.lowStockIngredients.join(', ')}`);
    }

    if (!validation.canDeploy) {
      return {
        storeId,
        storeName: store?.name,
        success: false,
        error: `Cannot deploy: ${validation.mappingIssues.join('; ')}`,
        validation,
        warnings
      };
    }

    // Check if recipe already exists
    const { data: template } = await supabase
      .from('recipe_templates')
      .select('name')
      .eq('id', templateId)
      .single();

    if (template) {
      const { data: existingRecipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', template.name)
        .eq('store_id', storeId)
        .maybeSingle();

      if (existingRecipe) {
        return {
          storeId,
          storeName: store?.name,
          success: false,
          error: `Recipe "${template.name}" already exists in this store`,
          validation,
          warnings
        };
      }
    }

    // Deploy with smart mapping
    const deploymentResult = await deployRecipeWithMapping(templateId, storeId);

    if (deploymentResult.success) {
      return {
        storeId,
        storeName: store?.name,
        success: true,
        recipeId: deploymentResult.recipeId,
        productId: deploymentResult.productId,
        validation,
        warnings
      };
    } else {
      return {
        storeId,
        storeName: store?.name,
        success: false,
        error: deploymentResult.errors.join('; '),
        validation,
        warnings
      };
    }

  } catch (error: any) {
    console.error(`Error in enhanced deployment to store ${storeId}:`, error);
    return {
      storeId,
      storeName: '',
      success: false,
      error: error.message || 'Unknown error occurred',
      warnings: []
    };
  }
};

/**
 * Deploy recipe template to multiple stores with enhanced validation
 */
export const deployRecipeToMultipleStoresEnhanced = async (
  templateId: string,
  storeIds: string[]
): Promise<EnhancedDeploymentResult[]> => {
  console.log(`Enhanced deployment: Recipe template "${templateId}" to ${storeIds.length} stores`);
  
  const results: EnhancedDeploymentResult[] = [];
  
  // Deploy to each store sequentially
  for (const storeId of storeIds) {
    const result = await deployRecipeTemplateEnhanced(templateId, storeId);
    results.push(result);
  }

  // Log summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const warningCount = results.filter(r => r.warnings.length > 0).length;
  
  console.log(`Enhanced deployment complete: ${successCount} successful, ${failCount} failed, ${warningCount} with warnings`);
  
  // Show summary toast
  if (successCount > 0) {
    toast.success(`Successfully deployed to ${successCount} store(s)`);
  }
  if (failCount > 0) {
    toast.error(`Failed to deploy to ${failCount} store(s)`);
  }
  if (warningCount > 0) {
    toast.warning(`${warningCount} deployment(s) completed with warnings`);
  }
  
  return results;
};

/**
 * Batch validate multiple stores for recipe deployment
 */
export const batchValidateDeployment = async (
  templateId: string,
  storeIds: string[]
): Promise<Record<string, DeploymentValidation & { storeName: string }>> => {
  const validations: Record<string, DeploymentValidation & { storeName: string }> = {};
  
  // Get store names
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .in('id', storeIds);

  const storeMap = new Map(stores?.map(s => [s.id, s.name]) || []);

  // Validate each store
  for (const storeId of storeIds) {
    try {
      const validation = await validateRecipeDeployment(templateId, storeId);
      validations[storeId] = {
        ...validation,
        storeName: storeMap.get(storeId) || 'Unknown Store'
      };
    } catch (error) {
      validations[storeId] = {
        canDeploy: false,
        missingIngredients: [],
        lowStockIngredients: [],
        mappingIssues: ['Validation failed'],
        storeName: storeMap.get(storeId) || 'Unknown Store'
      };
    }
  }

  return validations;
};

/**
 * Get comprehensive deployment preview for multiple stores
 */
export const getMultiStoreDeploymentPreview = async (
  templateId: string,
  storeIds: string[]
) => {
  const previews = [];
  
  for (const storeId of storeIds) {
    try {
      const preview = await getDeploymentPreview(templateId, storeId);
      const { data: store } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();
      
      previews.push({
        storeId,
        storeName: store?.name || 'Unknown Store',
        ...preview
      });
    } catch (error) {
      console.error(`Error getting preview for store ${storeId}:`, error);
    }
  }
  
  return previews;
};
