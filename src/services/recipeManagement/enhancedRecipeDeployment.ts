import { supabase } from '@/integrations/supabase/client';
import { 
  findIngredientMatches, 
  normalizeIngredientName, 
  normalizeUnitName,
  IngredientMatch 
} from '@/services/inventory/unitNormalizationService';
import { DeploymentResult, DeploymentOptions } from '@/types/recipeManagement';
import { toast } from 'sonner';

export interface EnhancedDeploymentResult extends DeploymentResult {
  ingredientMatches?: IngredientMatch[];
  unmatchedIngredients?: string[];
  partialMatches?: IngredientMatch[];
}

/**
 * Enhanced recipe deployment with improved ingredient matching
 */
export async function deployRecipeWithEnhancedMatching(
  templateId: string,
  storeId: string,
  options: DeploymentOptions = {}
): Promise<EnhancedDeploymentResult> {
  try {
    // Get template with ingredients
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return {
        success: false,
        storeId,
        storeName: '',
        error: 'Recipe template not found'
      };
    }

    // Get store information
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single();

    const storeName = store?.name || 'Unknown Store';

    if (!template.ingredients || template.ingredients.length === 0) {
      return {
        success: false,
        storeId,
        storeName,
        error: 'Recipe template has no ingredients'
      };
    }

    // Find ingredient matches using enhanced algorithm
    const recipeIngredients = template.ingredients.map((ing: any) => ({
      ingredient_name: ing.ingredient_name,
      unit: ing.unit,
      quantity: ing.quantity
    }));

    console.log('🔍 Finding ingredient matches for:', recipeIngredients);
    const ingredientMatches = await findIngredientMatches(recipeIngredients, storeId);
    console.log('✅ Found matches:', ingredientMatches);

    // Categorize matches
    const perfectMatches = ingredientMatches.filter(m => m.matchedItem && m.matchScore > 0.9);
    const goodMatches = ingredientMatches.filter(m => m.matchedItem && m.matchScore > 0.7 && m.matchScore <= 0.9);
    const partialMatches = ingredientMatches.filter(m => m.matchedItem && m.matchScore > 0.6 && m.matchScore <= 0.7);
    const unmatchedIngredients = ingredientMatches.filter(m => !m.matchedItem).map(m => m.ingredientName);

    // Check if deployment should proceed
    const totalMatched = perfectMatches.length + goodMatches.length;
    const matchPercentage = totalMatched / ingredientMatches.length;

    if (matchPercentage < 0.7) {
      return {
        success: false,
        storeId,
        storeName,
        error: `Insufficient ingredient matches (${Math.round(matchPercentage * 100)}%). Need at least 70% match rate.`,
        ingredientMatches,
        unmatchedIngredients,
        partialMatches
      };
    }

    // Create the recipe
    const recipeData = {
      name: options.customName || template.name,
      description: options.customDescription || template.description,
      instructions: template.instructions || '',
      yield_quantity: template.yield_quantity || 1,
      serving_size: template.serving_size || 1,
      store_id: storeId,
      template_id: templateId,
      is_active: options.isActive ?? true,
      approval_status: 'approved' as const,
      version: 1
    };

    const { data: newRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select()
      .single();

    if (recipeError || !newRecipe) {
      console.error('Recipe creation error:', recipeError);
      return {
        success: false,
        storeId,
        storeName,
        error: `Failed to create recipe: ${recipeError?.message}`
      };
    }

    // Create recipe ingredients with matched inventory items
    const recipeIngredientInserts = [];
    const warnings: string[] = [];

    for (const templateIngredient of template.ingredients) {
      const match = ingredientMatches.find(m => m.ingredientName === templateIngredient.ingredient_name);
      
      if (match && match.matchedItem) {
        // Use matched inventory item
        const inventoryStockId = match.matchedItem.source === 'store' ? match.matchedItem.id : null;
        const commissaryItemId = match.matchedItem.source === 'commissary' ? match.matchedItem.id : null;
        
        // Calculate adjusted quantity if conversion is needed
        let adjustedQuantity = templateIngredient.quantity;
        if (match.conversionNeeded && match.conversionRatio) {
          adjustedQuantity = templateIngredient.quantity * match.conversionRatio;
          warnings.push(`${templateIngredient.ingredient_name}: Applied conversion ratio ${match.conversionRatio}`);
        }

        recipeIngredientInserts.push({
          recipe_id: newRecipe.id,
          ingredient_name: templateIngredient.ingredient_name,
          quantity: adjustedQuantity,
          unit: normalizeUnitName(templateIngredient.unit),
          cost_per_unit: templateIngredient.cost_per_unit || match.matchedItem.cost || match.matchedItem.unit_cost || 0,
          inventory_stock_id: inventoryStockId,
          commissary_item_id: commissaryItemId
        });

        if (match.matchScore < 0.9) {
          warnings.push(`${templateIngredient.ingredient_name}: Fuzzy matched to "${match.matchedItem.item || match.matchedItem.name}" (${Math.round(match.matchScore * 100)}% confidence)`);
        }
      } else {
        // No match found - create ingredient without inventory link
        warnings.push(`${templateIngredient.ingredient_name}: No inventory match found, ingredient added without stock tracking`);
        
        recipeIngredientInserts.push({
          recipe_id: newRecipe.id,
          ingredient_name: templateIngredient.ingredient_name,
          quantity: templateIngredient.quantity,
          unit: templateIngredient.unit,
          cost_per_unit: templateIngredient.cost_per_unit || 0
        });
      }
    }

    // Insert recipe ingredients
    if (recipeIngredientInserts.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(recipeIngredientInserts);

      if (ingredientsError) {
        console.error('Recipe ingredients creation error:', ingredientsError);
        // Clean up created recipe
        await supabase.from('recipes').delete().eq('id', newRecipe.id);
        
        return {
          success: false,
          storeId,
          storeName,
          error: `Failed to create recipe ingredients: ${ingredientsError.message}`
        };
      }
    }

    // Calculate total cost
    const totalCost = recipeIngredientInserts.reduce((sum, ing) => 
      sum + (ing.quantity * ing.cost_per_unit), 0
    );

    // Update recipe with cost information
    await supabase
      .from('recipes')
      .update({
        total_cost: totalCost,
        cost_per_serving: totalCost / (newRecipe.serving_size || 1)
      })
      .eq('id', newRecipe.id);

    const result: EnhancedDeploymentResult = {
      success: true,
      storeId,
      storeName,
      recipeId: newRecipe.id,
      warnings,
      ingredientMatches,
      unmatchedIngredients,
      partialMatches
    };

    // Show success message with match statistics
    const matchStats = `${perfectMatches.length} perfect, ${goodMatches.length} good, ${partialMatches.length} partial, ${unmatchedIngredients.length} unmatched`;
    toast.success(`Recipe deployed successfully! Matches: ${matchStats}`);

    if (warnings.length > 0) {
      console.warn('Deployment warnings:', warnings);
    }

    return result;

  } catch (error) {
    console.error('Enhanced recipe deployment error:', error);
    return {
      success: false,
      storeId,
      storeName: '',
      error: `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validate recipe deployment with enhanced matching
 */
export async function validateRecipeDeploymentEnhanced(
  templateId: string,
  storeId: string
): Promise<{
  isValid: boolean;
  matchingSummary: {
    total: number;
    perfect: number;
    good: number;
    partial: number;
    unmatched: number;
  };
  ingredientMatches: IngredientMatch[];
  errors: string[];
}> {
  try {
    // Get template with ingredients
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return {
        isValid: false,
        matchingSummary: { total: 0, perfect: 0, good: 0, partial: 0, unmatched: 0 },
        ingredientMatches: [],
        errors: ['Recipe template not found']
      };
    }

    if (!template.ingredients || template.ingredients.length === 0) {
      return {
        isValid: false,
        matchingSummary: { total: 0, perfect: 0, good: 0, partial: 0, unmatched: 0 },
        ingredientMatches: [],
        errors: ['Recipe template has no ingredients']
      };
    }

    // Find ingredient matches
    const recipeIngredients = template.ingredients.map((ing: any) => ({
      ingredient_name: ing.ingredient_name,
      unit: ing.unit,
      quantity: ing.quantity
    }));

    const ingredientMatches = await findIngredientMatches(recipeIngredients, storeId);

    // Calculate match statistics
    const perfect = ingredientMatches.filter(m => m.matchedItem && m.matchScore > 0.9).length;
    const good = ingredientMatches.filter(m => m.matchedItem && m.matchScore > 0.7 && m.matchScore <= 0.9).length;
    const partial = ingredientMatches.filter(m => m.matchedItem && m.matchScore > 0.6 && m.matchScore <= 0.7).length;
    const unmatched = ingredientMatches.filter(m => !m.matchedItem).length;
    const total = ingredientMatches.length;

    const matchingSummary = { total, perfect, good, partial, unmatched };
    
    // Validation logic
    const totalMatched = perfect + good;
    const matchPercentage = totalMatched / total;
    const isValid = matchPercentage >= 0.7; // Require 70% match rate

    const errors: string[] = [];
    if (!isValid) {
      errors.push(`Insufficient ingredient matches (${Math.round(matchPercentage * 100)}%). Need at least 70% match rate.`);
    }

    return {
      isValid,
      matchingSummary,
      ingredientMatches,
      errors
    };

  } catch (error) {
    console.error('Enhanced validation error:', error);
    return {
      isValid: false,
      matchingSummary: { total: 0, perfect: 0, good: 0, partial: 0, unmatched: 0 },
      ingredientMatches: [],
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}