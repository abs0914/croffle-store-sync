import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateRecipeDeployment } from '@/services/recipeUploadService';

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

  const deployRecipeToStores = async (
    templateId: string,
    stores: Array<{ id: string; name: string }>,
    options: {
      checkDuplicates?: boolean;
      createProducts?: boolean;
      validateIngredients?: boolean;
    } = {}
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

    const results: DeploymentResult[] = [];

    try {
      // Get template data
  const { data: template, error: templateError } = await supabase
    .from('recipe_templates')
    .select(`
      *,
      recipe_template_ingredients (*)
    `)
    .eq('id', templateId)
    .single();

      if (templateError || !template) {
        throw new Error('Recipe template not found');
      }

      // Process each store
      for (const store of stores) {
        await logDeploymentStep(templateId, store.id, 'started');
        
        setDeploymentProgress(prev => prev.map(p => 
          p.storeId === store.id 
            ? { ...p, status: 'validating', progress: 10 }
            : p
        ));

        try {
          // Check for existing deployment
          if (options.checkDuplicates !== false) {
            const { data: existingRecipe } = await supabase
              .from('recipes')
              .select('id, product_id')
              .eq('template_id', templateId)
              .eq('store_id', store.id)
              .maybeSingle();

            if (existingRecipe) {
              const result: DeploymentResult = {
                success: true,
                storeId: store.id,
                storeName: store.name,
                recipeId: existingRecipe.id,
                productId: existingRecipe.product_id,
                warnings: ['Recipe already deployed to this store']
              };
              results.push(result);
              
              setDeploymentProgress(prev => prev.map(p => 
                p.storeId === store.id 
                  ? { ...p, status: 'success', progress: 100, warnings: result.warnings }
                  : p
              ));
              continue;
            }
          }

          // Validate deployment if requested
          if (options.validateIngredients !== false) {
            const validation = await validateRecipeDeployment(templateId, store.id);
            if (!validation.isValid) {
              throw new Error(validation.errorMessage || 'Validation failed');
            }
          }

          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, status: 'deploying', progress: 30 }
              : p
          ));

          // Generate unique SKU for this deployment
          const { data: skuData, error: skuError } = await supabase
            .rpc('generate_recipe_sku', {
              recipe_name: template.name,
              recipe_type: template.recipe_type || 'regular'
            });

          if (skuError) {
            throw new Error(`Failed to generate SKU: ${skuError.message}`);
          }

          // Create deployed recipe
          const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              template_id: templateId,
              store_id: store.id,
              name: template.name,
              recipe_type: template.recipe_type,
              description: template.description,
              instructions: template.instructions || 'Follow template instructions',
              sku: skuData,
              total_cost: (template as any).total_cost || 0,
              suggested_price: (template as any).suggested_price || 0,
              cost_per_serving: ((template as any).total_cost || 0) / Math.max((template as any).serving_size || 1, 1),
              preparation_time: template.preparation_time,
              serving_size: template.serving_size,
              is_active: true
            })
            .select()
            .single();

          if (recipeError) {
            throw new Error(`Failed to create recipe: ${recipeError.message}`);
          }

          await logDeploymentStep(templateId, store.id, 'recipe_created', { recipeId: recipe.id }, recipe.id);

          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, progress: 50, recipeId: recipe.id }
              : p
          ));

          // Add recipe ingredients with normalized units
          const ingredientInserts = template.recipe_template_ingredients.map((ingredient: any) => ({
            recipe_id: recipe.id,
            ingredient_name: ingredient.ingredient_name,
            quantity: ingredient.quantity,
            unit: normalizeUnit(ingredient.unit || 'pieces'),
            cost_per_unit: ingredient.cost_per_unit || 0,
            commissary_item_id: ingredient.commissary_item_id,
            inventory_stock_id: null,
            notes: ingredient.notes
          }));

          const { error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .insert(ingredientInserts);

          if (ingredientsError) {
            throw new Error(`Failed to add ingredients: ${ingredientsError.message}`);
          }

          await logDeploymentStep(templateId, store.id, 'ingredients_added', { 
            ingredientCount: ingredientInserts.length 
          }, recipe.id);

          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, progress: 70 }
              : p
          ));

          let productId: string | undefined;

          // Create product if requested
          if (options.createProducts !== false) {
            try {
              const { data: product, error: productError } = await supabase
                .from('products')
                .insert({
                  name: template.name,
                  description: template.description,
                  sku: recipe.sku,
                  price: (template as any).suggested_price || ((template as any).total_cost * 1.5) || 50,
                  cost: (template as any).total_cost || 0,
                  category_id: null, // Will need to be mapped from template category
                  store_id: store.id,
                  stock_quantity: 0,
                  is_active: true
                })
                .select()
                .single();

              if (productError) {
                console.warn(`Failed to create product: ${productError.message}`);
              } else {
                productId = product.id;
                
                // Link recipe to product
                await supabase
                  .from('recipes')
                  .update({ product_id: productId })
                  .eq('id', recipe.id);

                await logDeploymentStep(templateId, store.id, 'product_created', { 
                  productId 
                }, recipe.id, productId);
              }
            } catch (productError) {
              console.warn('Product creation failed but recipe deployment continues:', productError);
            }
          }

          await logDeploymentStep(templateId, store.id, 'completed', {
            recipeId: recipe.id,
            productId,
            totalCost: (template as any).total_cost,
            suggestedPrice: (template as any).suggested_price
          }, recipe.id, productId);

          const result: DeploymentResult = {
            success: true,
            storeId: store.id,
            storeName: store.name,
            recipeId: recipe.id,
            productId
          };
          
          results.push(result);

          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { 
                  ...p, 
                  status: 'success', 
                  progress: 100, 
                  recipeId: recipe.id,
                  productId 
                }
              : p
          ));

        } catch (error) {
          console.error(`Deployment failed for store ${store.name}:`, error);
          
          await logDeploymentStep(templateId, store.id, 'failed', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          const result: DeploymentResult = {
            success: false,
            storeId: store.id,
            storeName: store.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
          
          results.push(result);

          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, status: 'error', error: result.error }
              : p
          ));
        }
      }

      // Show summary
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully deployed recipe to ${successCount} store(s)`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Deployed to ${successCount} store(s), ${failCount} failed`);
      } else {
        toast.error(`Deployment failed for all ${failCount} store(s)`);
      }

      return results;

    } catch (error) {
      console.error('Deployment error:', error);
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

  const clearProgress = () => {
    setDeploymentProgress([]);
  };

  return {
    deployRecipeToStores,
    deploymentProgress,
    isDeploying,
    clearProgress
  };
};