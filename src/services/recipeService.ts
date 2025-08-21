import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecipeCostCalculation {
  totalCost: number;
  costPerServing: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    percentage: number;
  }>;
}

export interface StoreSpecificRecipe {
  recipeId: string;
  templateId: string;
  storeId: string;
  customIngredients: Array<{
    ingredientName: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    inventoryStockId?: string;
  }>;
}

export interface TemplateDeploymentOptions {
  validateIngredients: boolean;
  createProducts: boolean;
  overwriteExisting: boolean;
  priceMarkup?: number;
}

/**
 * Enhanced recipe service with comprehensive functionality
 */
export class RecipeService {
  
  /**
   * Calculate detailed recipe costs with breakdown
   */
  static async calculateRecipeCost(recipeId: string): Promise<RecipeCostCalculation> {
    try {
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('id', recipeId)
        .single();

      if (recipeError) throw recipeError;

      let totalCost = 0;
      const ingredients = recipe.recipe_ingredients.map((ing: any) => {
        const ingredientTotal = ing.quantity * ing.cost_per_unit;
        totalCost += ingredientTotal;
        
        return {
          name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          unitCost: ing.cost_per_unit,
          totalCost: ingredientTotal,
          percentage: 0 // Will be calculated after total is known
        };
      });

      // Calculate percentages
      ingredients.forEach(ing => {
        ing.percentage = totalCost > 0 ? (ing.totalCost / totalCost) * 100 : 0;
      });

      const costPerServing = recipe.yield_quantity > 0 ? totalCost / recipe.yield_quantity : 0;

      return {
        totalCost,
        costPerServing,
        ingredients
      };
    } catch (error) {
      console.error('Error calculating recipe cost:', error);
      throw error;
    }
  }

  /**
   * Create store-specific recipe customization
   */
  static async createStoreSpecificRecipe(
    templateId: string, 
    storeId: string, 
    customizations: Partial<StoreSpecificRecipe>
  ): Promise<string> {
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

      if (templateError) throw templateError;

      // Create the recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: template.name,
          description: template.description,
          instructions: template.instructions,
          yield_quantity: template.serving_size,
          template_id: templateId,
          store_id: storeId,
          is_active: true,
          total_cost: 0 // Will be calculated
        })
        .select()
        .single();

      if (recipeError) throw recipeError;

      // Process ingredients (use customizations if provided, otherwise template defaults)
      const ingredientsToInsert = [];
      let totalCost = 0;

      if (customizations.customIngredients?.length) {
        // Use custom ingredients
        for (const ingredient of customizations.customIngredients) {
          const ingredientCost = ingredient.quantity * ingredient.costPerUnit;
          totalCost += ingredientCost;

          ingredientsToInsert.push({
            recipe_id: recipe.id,
            inventory_stock_id: ingredient.inventoryStockId,
            ingredient_name: ingredient.ingredientName,
            quantity: ingredient.quantity,
            unit: ingredient.unit as any, // Cast to avoid type issues
            cost_per_unit: ingredient.costPerUnit
          });
        }
      } else {
        // Use template ingredients but with store-specific inventory mapping
        for (const templateIngredient of template.recipe_template_ingredients) {
          // Try to find matching inventory item in store
          const { data: inventoryItem } = await supabase
            .from('inventory_stock')
            .select('id, cost')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .ilike('item', `%${templateIngredient.ingredient_name}%`)
            .eq('unit', templateIngredient.unit)
            .maybeSingle();

          const costPerUnit = inventoryItem?.cost || templateIngredient.cost_per_unit;
          const ingredientCost = templateIngredient.quantity * costPerUnit;
          totalCost += ingredientCost;

          ingredientsToInsert.push({
            recipe_id: recipe.id,
            inventory_stock_id: inventoryItem?.id,
            ingredient_name: templateIngredient.ingredient_name,
            quantity: templateIngredient.quantity,
            unit: templateIngredient.unit as any, // Cast to avoid type issues
            cost_per_unit: costPerUnit
          });
        }
      }

      // Insert ingredients
      if (ingredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientsToInsert);

        if (ingredientsError) throw ingredientsError;
      }

      // Update recipe total cost
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ 
          total_cost: totalCost,
          cost_per_serving: totalCost / template.serving_size
        })
        .eq('id', recipe.id);

      if (updateError) throw updateError;

      return recipe.id;
    } catch (error) {
      console.error('Error creating store-specific recipe:', error);
      throw error;
    }
  }

  /**
   * Deploy template to multiple stores with options
   */
  static async deployTemplateToStores(
    templateId: string, 
    storeIds: string[], 
    options: TemplateDeploymentOptions = {
      validateIngredients: true,
      createProducts: true,
      overwriteExisting: false
    }
  ) {
    const results = {
      successful: [] as Array<{ storeId: string; storeName: string; recipeId: string; productId?: string }>,
      failed: [] as Array<{ storeId: string; storeName: string; error: string; missingIngredients?: string[] }>,
      warnings: [] as string[]
    };

    // Get store names for reporting
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds);

    const storeMap = new Map(stores?.map(s => [s.id, s.name]) || []);

    for (const storeId of storeIds) {
      const storeName = storeMap.get(storeId) || 'Unknown Store';
      
      try {
        // Check if recipe already exists for this template + store
        if (!options.overwriteExisting) {
          const { data: existingRecipe } = await supabase
            .from('recipes')
            .select('id')
            .eq('template_id', templateId)
            .eq('store_id', storeId)
            .eq('is_active', true)
            .maybeSingle();

          if (existingRecipe) {
            results.warnings.push(`Recipe already exists for ${storeName} - skipped`);
            continue;
          }
        }

        // Deploy using the existing service
        const { InventoryBasedRecipeService } = await import('./inventoryBasedRecipeService');
        const deployResult = await InventoryBasedRecipeService.deployTemplateToStore(templateId, storeId);

        if (deployResult.success) {
          results.successful.push({
            storeId,
            storeName,
            recipeId: deployResult.recipeId!,
            productId: deployResult.productId
          });
        } else {
          results.failed.push({
            storeId,
            storeName,
            error: deployResult.message,
            missingIngredients: deployResult.missingIngredients
          });
        }
      } catch (error) {
        results.failed.push({
          storeId,
          storeName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Sync inventory costs with recipe costs
   */
  static async syncInventoryCosts(storeId: string, recipeId?: string) {
    try {
      let recipesQuery = supabase
        .from('recipes')
        .select(`
          id,
          yield_quantity,
          recipe_ingredients (
            id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            unit,
            cost_per_unit
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (recipeId) {
        recipesQuery = recipesQuery.eq('id', recipeId);
      }

      const { data: recipes, error: recipesError } = await recipesQuery;
      if (recipesError) throw recipesError;

      const updates = [];

      for (const recipe of recipes) {
        let recipeNeedsUpdate = false;
        let newTotalCost = 0;

        for (const ingredient of recipe.recipe_ingredients) {
          if (ingredient.inventory_stock_id) {
            // Get current inventory cost
            const { data: inventoryItem } = await supabase
              .from('inventory_stock')
              .select('cost')
              .eq('id', ingredient.inventory_stock_id)
              .single();

            if (inventoryItem && inventoryItem.cost !== ingredient.cost_per_unit) {
              // Update ingredient cost
              await supabase
                .from('recipe_ingredients')
                .update({ cost_per_unit: inventoryItem.cost })
                .eq('id', ingredient.id);

              newTotalCost += ingredient.quantity * inventoryItem.cost;
              recipeNeedsUpdate = true;
            } else {
              newTotalCost += ingredient.quantity * ingredient.cost_per_unit;
            }
          } else {
            newTotalCost += ingredient.quantity * ingredient.cost_per_unit;
          }
        }

        if (recipeNeedsUpdate) {
          updates.push({
            recipeId: recipe.id,
            newCost: newTotalCost
          });

          // Update recipe total cost
          await supabase
            .from('recipes')
            .update({ 
              total_cost: newTotalCost,
              cost_per_serving: newTotalCost / (recipe.yield_quantity || 1)
            })
            .eq('id', recipe.id);
        }
      }

      return updates;
    } catch (error) {
      console.error('Error syncing inventory costs:', error);
      throw error;
    }
  }

  /**
   * Generate recipe pricing suggestions
   */
  static async generatePricingSuggestions(recipeId: string, storeId: string) {
    try {
      const costCalculation = await this.calculateRecipeCost(recipeId);
      
      // Get store pricing profile
      const { data: pricingProfile } = await supabase
        .from('store_pricing_profiles')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('is_default', true)
        .maybeSingle();

      const baseMarkup = pricingProfile?.base_markup_percentage || 50;
      
      return {
        cost: costCalculation.costPerServing,
        suggestedPrices: {
          conservative: costCalculation.costPerServing * (1 + baseMarkup / 100),
          standard: costCalculation.costPerServing * (1 + (baseMarkup + 10) / 100),
          premium: costCalculation.costPerServing * (1 + (baseMarkup + 25) / 100)
        },
        markup: {
          conservative: baseMarkup,
          standard: baseMarkup + 10,
          premium: baseMarkup + 25
        },
        costBreakdown: costCalculation.ingredients
      };
    } catch (error) {
      console.error('Error generating pricing suggestions:', error);
      throw error;
    }
  }
}