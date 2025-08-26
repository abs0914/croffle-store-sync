import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  deployRecipeToMultipleStores, 
  validateRecipeDeployment,
  DeploymentResult as ServiceDeploymentResult,
  DeploymentOptions
} from '@/services/recipeManagement/recipeDeploymentService';

// Helper function to normalize units to match database enum values
const normalizeUnit = (unit: string): 'pieces' | 'g' | 'kg' | 'liters' | 'ml' | 'boxes' | 'packs' => {
  const unitLower = unit.toLowerCase().trim();
  
  // Map common variations to enum values
  const unitMap: Record<string, 'pieces' | 'g' | 'kg' | 'liters' | 'ml' | 'boxes' | 'packs'> = {
    'piece': 'pieces',
    'pieces': 'pieces',
    'pcs': 'pieces',
    'pc': 'pieces',
    'serving': 'pieces', // Default serving to pieces for recipes
    'servings': 'pieces',
    'portion': 'pieces', // Default portion to pieces for recipes  
    'portions': 'pieces',
    'box': 'boxes',
    'boxes': 'boxes',
    'pack': 'packs',
    'packs': 'packs',
    'gram': 'g',
    'grams': 'g',
    'g': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'kg': 'kg',
    'liter': 'liters',
    'liters': 'liters',
    'l': 'liters',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'ml': 'ml'
  };
  
  return unitMap[unitLower] || 'pieces'; // Default to pieces if unknown
};

export interface DeploymentProgress {
  storeId: string;
  storeName: string;
  status: 'pending' | 'validating' | 'deploying' | 'success' | 'error';
  progress: number;
  error?: string;
  warnings?: string[];
  recipeId?: string;
  productId?: string;
}

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  recipeId?: string;
  productId?: string;
  error?: string;
  warnings?: string[];
  missingIngredients?: string[];
}

export interface EnhancedDeploymentOptions {
  checkDuplicates?: boolean;
  createProducts?: boolean;
  validateIngredients?: boolean;
  priceMarkup?: number;
  customName?: string;
  customDescription?: string;
  categoryId?: string;
  isActive?: boolean;
}

export const useRecipeDeployment = () => {
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);

  const logDeploymentStep = async (
    templateId: string,
    storeId: string,
    status: string,
    details: any = {},
    recipeId?: string,
    productId?: string
  ) => {
    try {
      await supabase.from('recipe_deployment_logs').insert({
        template_id: templateId,
        store_id: storeId,
        recipe_id: recipeId || null,
        product_id: productId || null,
        deployment_status: status,
        step_details: details
      });
    } catch (error) {
      console.error('Failed to log deployment step:', error);
    }
  };

  /**
   * Enhanced recipe deployment with validation and product creation
   */
  const deployRecipeToStores = async (
    templateId: string,
    stores: Array<{ id: string; name: string }>,
    options: EnhancedDeploymentOptions = {}
  ): Promise<DeploymentResult[]> => {
    setIsDeploying(true);
    
    // Initialize progress tracking
    const initialProgress: DeploymentProgress[] = stores.map(store => ({
      storeId: store.id,
      storeName: store.name,
      status: 'pending',
      progress: 0
    }));
    setDeploymentProgress(initialProgress);

    try {
      console.log('🚀 Starting enhanced deployment with options:', options);

      // Pre-deployment validation if requested
      if (options.validateIngredients !== false) {
        console.log('🔍 Pre-validating deployments...');
        
        let hasValidationErrors = false;
        const validationResults = await Promise.all(
          stores.map(async (store) => {
            const validation = await validateRecipeDeployment(templateId, store.id);
            
            setDeploymentProgress(prev => prev.map(p => 
              p.storeId === store.id 
                ? { 
                    ...p, 
                    status: validation.isValid ? 'validating' : 'error',
                    progress: validation.isValid ? 20 : 0,
                    error: validation.errorMessage,
                    warnings: validation.warnings
                  }
                : p
            ));

            if (!validation.isValid) {
              hasValidationErrors = true;
            }

            return { storeId: store.id, validation };
          })
        );

        if (hasValidationErrors) {
          const results: DeploymentResult[] = validationResults.map(({ storeId, validation }) => {
            const store = stores.find(s => s.id === storeId)!;
            return {
              success: validation.isValid,
              storeId,
              storeName: store.name,
              error: validation.errorMessage,
              warnings: validation.warnings,
              missingIngredients: validation.missingIngredients
            };
          });

          setIsDeploying(false);
          return results;
        }
      }

      // Convert options to service format
      const serviceOptions: DeploymentOptions = {
        priceMarkup: options.priceMarkup,
        customName: options.customName,
        customDescription: options.customDescription,
        isActive: options.isActive,
        createProduct: options.createProducts,
        categoryId: options.categoryId
      };

      // Use the enhanced deployment service
      const results = await deployRecipeToMultipleStores(templateId, stores.map(s => s.id), serviceOptions);

      // Update progress based on results
      results.forEach((result) => {
        setDeploymentProgress(prev => prev.map(p => 
          p.storeId === result.storeId 
            ? { 
                ...p, 
                status: result.success ? 'success' : 'error',
                progress: result.success ? 100 : 0,
                error: result.error,
                warnings: result.warnings,
                recipeId: result.recipeId,
                productId: result.productId
              }
            : p
        ));
      });

      // Show summary toast
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully deployed recipe to ${successCount} store(s)`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Deployed to ${successCount} store(s), ${failCount} failed`);
      } else {
        toast.error(`Deployment failed for all ${failCount} store(s)`);
      }

      return results.map((result): DeploymentResult => ({
        success: result.success,
        storeId: result.storeId,
        storeName: result.storeName,
        recipeId: result.recipeId,
        productId: result.productId,
        error: result.error,
        warnings: result.warnings,
        missingIngredients: result.missingIngredients
      }));

    } catch (error) {
      console.error('Enhanced deployment error:', error);
      toast.error('Recipe deployment failed');
      
      setDeploymentProgress(prev => prev.map(p => ({ 
        ...p, 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error'
      })));

      return stores.map(store => ({
        success: false,
        storeId: store.id,
        storeName: store.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    } finally {
      setIsDeploying(false);
    }
  };

  /**
   * Legacy deployment method for backwards compatibility
   */
  const deployRecipeToStoresLegacy = async (
    templateId: string,
    stores: Array<{ id: string; name: string }>,
    options: {
      checkDuplicates?: boolean;
      createProducts?: boolean;
      validateIngredients?: boolean;
    } = {}
  ): Promise<DeploymentResult[]> => {
    return deployRecipeToStores(templateId, stores, {
      checkDuplicates: options.checkDuplicates,
      createProducts: options.createProducts,
      validateIngredients: options.validateIngredients
    });
  };

  /**
   * Validate deployment before executing
   */
  const validateDeployment = async (
    templateId: string,
    storeIds: string[]
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      for (const storeId of storeIds) {
        const validation = await validateRecipeDeployment(templateId, storeId);
        
        if (!validation.isValid) {
          errors.push(`Store ${storeId}: ${validation.errorMessage}`);
        }
        
        if (validation.warnings) {
          warnings.push(...validation.warnings.map(w => `Store ${storeId}: ${w}`));
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating deployment:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings
      };
    }
  };

  const clearProgress = () => {
    setDeploymentProgress([]);
  };

  return {
    deployRecipeToStores,
    deployRecipeToStoresLegacy,
    validateDeployment,
    deploymentProgress,
    isDeploying,
    clearProgress
  };
};