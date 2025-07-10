import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  DeploymentResult, 
  DeploymentProgress, 
  EnhancedDeploymentConfig,
  PricingProfile,
  IngredientSubstitution 
} from '@/types/recipeManagement';

export function useRecipeDeployment() {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress[]>([]);
  const [pricingProfiles, setPricingProfiles] = useState<PricingProfile[]>([]);

  // Fetch pricing profiles for stores
  const fetchPricingProfiles = useCallback(async (storeIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('store_pricing_profiles')
        .select('*')
        .in('store_id', storeIds)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPricingProfiles(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching pricing profiles:', error);
      toast.error('Failed to load pricing profiles');
      return [];
    }
  }, []);

  // Check ingredient availability across stores
  const checkIngredientAvailability = useCallback(async (
    templateId: string, 
    storeIds: string[]
  ) => {
    try {
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          ingredients:recipe_template_ingredients(*)
        `)
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const availabilityByStore: Record<string, { available: string[]; missing: string[] }> = {};

      for (const storeId of storeIds) {
        const { data: inventory, error: inventoryError } = await supabase
          .from('inventory_stock')
          .select('item')
          .eq('store_id', storeId)
          .eq('is_active', true);

        if (inventoryError) throw inventoryError;

        const availableItems = new Set(inventory?.map(i => i.item.toLowerCase()) || []);
        const available: string[] = [];
        const missing: string[] = [];

        template.ingredients?.forEach((ingredient: any) => {
          const ingredientName = ingredient.ingredient_name.toLowerCase();
          if (availableItems.has(ingredientName)) {
            available.push(ingredient.ingredient_name);
          } else {
            missing.push(ingredient.ingredient_name);
          }
        });

        availabilityByStore[storeId] = { available, missing };
      }

      return availabilityByStore;
    } catch (error) {
      console.error('Error checking ingredient availability:', error);
      toast.error('Failed to check ingredient availability');
      return {};
    }
  }, []);

  // Enhanced deployment with progress tracking
  const deployRecipeEnhanced = useCallback(async (config: EnhancedDeploymentConfig) => {
    setIsDeploying(true);
    
    // Initialize progress tracking
    const initialProgress = config.selectedStores.map(store => ({
      storeId: store.id,
      storeName: store.name,
      status: 'pending' as const,
      progress: 0
    }));
    setDeploymentProgress(initialProgress);

    const results: DeploymentResult[] = [];

    try {
      // Get template with ingredients
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          ingredients:recipe_template_ingredients(*)
        `)
        .eq('id', config.templateId)
        .single();

      if (templateError) throw templateError;

      // Check ingredient availability if required
      let ingredientAvailability: Record<string, { available: string[]; missing: string[] }> = {};
      if (config.validateIngredients) {
        ingredientAvailability = await checkIngredientAvailability(
          config.templateId, 
          config.selectedStores.map(s => s.id)
        );
      }

      // Deploy to each store
      for (let i = 0; i < config.selectedStores.length; i++) {
        const store = config.selectedStores[i];
        
        // Update progress to in-progress
        setDeploymentProgress(prev => prev.map(p => 
          p.storeId === store.id 
            ? { ...p, status: 'in-progress', progress: 25 }
            : p
        ));

        try {
          // Calculate pricing
          const profile = pricingProfiles.find(p => p.store_id === store.id && p.is_default);
          const markup = config.deploymentOptions.priceMarkup || profile?.base_markup_percentage || 50;

          // Apply ingredient substitutions
          const processedIngredients = template.ingredients?.map((ingredient: any) => {
            const substitution = config.ingredientSubstitutions.find(
              sub => sub.originalIngredientName === ingredient.ingredient_name
            );
            
            return substitution ? {
              ...ingredient,
              ingredient_name: substitution.substituteIngredientName,
              cost_per_unit: substitution.substituteCostPerUnit
            } : ingredient;
          });

          // Calculate total cost
          const totalCost = processedIngredients?.reduce((sum: number, ingredient: any) => {
            return sum + (ingredient.quantity * (ingredient.cost_per_unit || 0));
          }, 0) || 0;

          const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;
          const suggestedPrice = costPerServing * (1 + markup / 100);

          // Update progress
          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, progress: 50 }
              : p
          ));

          // Create the recipe
          const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({
              name: config.deploymentOptions.customName || template.name,
              store_id: store.id,
              template_id: config.templateId,
              product_id: null, // Required field, set to null initially
              total_cost: totalCost,
              cost_per_serving: costPerServing,
              yield_quantity: template.yield_quantity,
              instructions: template.instructions,
              is_active: config.deploymentOptions.isActive !== false
            })
            .select()
            .single();

          if (recipeError) throw recipeError;

          // Update progress
          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, progress: 75 }
              : p
          ));

          // Create recipe ingredients
          if (processedIngredients && processedIngredients.length > 0) {
            const ingredientInserts = processedIngredients.map((ingredient: any) => ({
              recipe_id: recipe.id,
              ingredient_name: ingredient.ingredient_name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              cost_per_unit: ingredient.cost_per_unit || 0,
              inventory_stock_id: ingredient.inventory_stock_id || null,
              uses_direct_inventory: true
            }));

            const { error: ingredientsError } = await supabase
              .from('recipe_ingredients')
              .insert(ingredientInserts);

            if (ingredientsError) throw ingredientsError;
          }

          // Create deployment record
          const { error: deploymentError } = await supabase
            .from('recipe_deployments')
            .insert({
              template_id: config.templateId,
              store_id: store.id,
              recipe_id: recipe.id,
              deployed_by: (await supabase.auth.getUser()).data.user?.id,
              cost_snapshot: totalCost,
              price_snapshot: suggestedPrice,
              deployment_notes: `Enhanced deployment with ${config.ingredientSubstitutions.length} substitutions`
            });

          if (deploymentError) throw deploymentError;

          // Create product if requested
          if (config.createProducts) {
            await supabase
              .from('products')
              .insert({
                name: recipe.name,
                description: recipe.description,
                sku: `RCP-${recipe.name.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`,
                price: suggestedPrice,
                cost: costPerServing,
                store_id: store.id,
                is_active: true,
                stock_quantity: 0
              });
          }

          // Success
          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, status: 'success', progress: 100 }
              : p
          ));

          const warnings = [];
          if (ingredientAvailability[store.id]?.missing.length > 0) {
            warnings.push(`Missing ingredients: ${ingredientAvailability[store.id].missing.join(', ')}`);
          }

          results.push({
            success: true,
            storeId: store.id,
            storeName: store.name,
            recipeId: recipe.id,
            warnings,
            missingIngredients: ingredientAvailability[store.id]?.missing || []
          });

        } catch (error) {
          console.error(`Error deploying to store ${store.name}:`, error);
          
          // Log error to database
          await supabase
            .from('recipe_deployment_errors')
            .insert({
              template_id: config.templateId,
              store_id: store.id,
              error_type: 'deployment_failure',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              suggested_solution: 'Check ingredient availability and store configuration'
            });

          setDeploymentProgress(prev => prev.map(p => 
            p.storeId === store.id 
              ? { ...p, status: 'error', progress: 100, error: error instanceof Error ? error.message : 'Unknown error' }
              : p
          ));

          results.push({
            success: false,
            storeId: store.id,
            storeName: store.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in enhanced deployment:', error);
      toast.error('Deployment failed');
      return [];
    } finally {
      setIsDeploying(false);
    }
  }, [pricingProfiles, checkIngredientAvailability]);

  // Get deployment history for a template
  const getDeploymentHistory = useCallback(async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('recipe_deployments')
        .select(`
          *,
          recipe:recipes(name, is_active),
          store:stores(name)
        `)
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching deployment history:', error);
      return [];
    }
  }, []);

  return {
    isDeploying,
    deploymentProgress,
    pricingProfiles,
    deployRecipeEnhanced,
    fetchPricingProfiles,
    checkIngredientAvailability,
    getDeploymentHistory
  };
}