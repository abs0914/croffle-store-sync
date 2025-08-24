import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeAuditResult {
  recipe_id: string;
  recipe_name: string;
  store_name: string;
  store_id: string;
  template_id: string;
  template_ingredients_count: number;
  recipe_ingredients_count: number;
  missing_ingredients: string[];
  status: 'complete' | 'incomplete';
}

export interface RecipeRepairResult {
  success: boolean;
  recipe_id: string;
  recipe_name: string;
  store_name: string;
  ingredients_added: number;
  ingredients_mapped: number;
  error?: string;
}

export interface BulkRepairSummary {
  total_recipes_audited: number;
  incomplete_recipes_found: number;
  recipes_repaired: number;
  total_ingredients_added: number;
  total_mappings_created: number;
  errors: string[];
}

/**
 * Audit all recipes to find incomplete ingredient lists compared to templates
 */
export const auditRecipeCompleteness = async (): Promise<RecipeAuditResult[]> => {
  console.log('🔍 Starting recipe completeness audit...');

  try {
    const { data, error } = await supabase.rpc('audit_recipe_completeness');
    
    if (error) {
      console.error('❌ Recipe audit failed:', error);
      throw error;
    }

    console.log('✅ Recipe audit completed:', data?.length || 0, 'recipes analyzed');
    return data || [];
  } catch (error) {
    console.error('❌ Recipe audit error:', error);
    throw error;
  }
};

/**
 * Repair a single incomplete recipe by adding missing ingredients
 */
export const repairIncompleteRecipe = async (
  recipeId: string,
  templateId: string,
  storeId: string
): Promise<RecipeRepairResult> => {
  console.log('🔧 Repairing incomplete recipe:', { recipeId, templateId, storeId });

  try {
    // Get recipe and template details
    const [recipeResult, templateIngredientsResult] = await Promise.all([
      supabase
        .from('recipes')
        .select(`
          *,
          stores!inner(name),
          recipe_ingredients(*)
        `)
        .eq('id', recipeId)
        .single(),
      supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', templateId)
    ]);

    if (recipeResult.error || templateIngredientsResult.error) {
      throw recipeResult.error || templateIngredientsResult.error;
    }

    const recipe = recipeResult.data;
    const templateIngredients = templateIngredientsResult.data;
    const existingIngredients = recipe.recipe_ingredients || [];

    // Find missing ingredients
    const existingIngredientNames = existingIngredients.map(i => 
      i.ingredient_name.toLowerCase().trim()
    );

    const missingIngredients = templateIngredients.filter(templateIngredient =>
      !existingIngredientNames.includes(templateIngredient.ingredient_name.toLowerCase().trim())
    );

    console.log('📋 Missing ingredients found:', missingIngredients.length);

    let ingredientsAdded = 0;
    let ingredientsMapped = 0;

    // Add missing ingredients to recipe
    for (const ingredient of missingIngredients) {
      const { error: insertError } = await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipeId,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit
        });

      if (insertError) {
        console.warn('⚠️ Failed to add ingredient:', ingredient.ingredient_name, insertError);
        continue;
      }

      ingredientsAdded++;

      // Try to create inventory mapping
      const mappingResult = await createIngredientMapping(
        recipeId,
        ingredient.ingredient_name,
        storeId
      );

      if (mappingResult) {
        ingredientsMapped++;
      }
    }

    // Update recipe costs
    await updateRecipeCosts(recipeId);

    const result: RecipeRepairResult = {
      success: true,
      recipe_id: recipeId,
      recipe_name: recipe.name,
      store_name: recipe.stores.name,
      ingredients_added: ingredientsAdded,
      ingredients_mapped: ingredientsMapped
    };

    console.log('✅ Recipe repair completed:', result);
    return result;

  } catch (error) {
    console.error('❌ Recipe repair failed:', error);
    return {
      success: false,
      recipe_id: recipeId,
      recipe_name: 'Unknown',
      store_name: 'Unknown',
      ingredients_added: 0,
      ingredients_mapped: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Create ingredient mapping to inventory items
 */
const createIngredientMapping = async (
  recipeId: string,
  ingredientName: string,
  storeId: string
): Promise<boolean> => {
  try {
    // Find matching inventory item with fuzzy matching
    const { data: inventoryItems, error } = await supabase
      .from('inventory_stock')
      .select('id, item, unit')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error || !inventoryItems) {
      return false;
    }

    // Try exact match first
    let matchedItem = inventoryItems.find(item => 
      item.item.toLowerCase().trim() === ingredientName.toLowerCase().trim()
    );

    // Try partial match if no exact match
    if (!matchedItem) {
      const ingredientWords = ingredientName.toLowerCase().split(/\s+/);
      matchedItem = inventoryItems.find(item => {
        const itemWords = item.item.toLowerCase().split(/\s+/);
        return ingredientWords.some(word => 
          itemWords.some(itemWord => itemWord.includes(word) || word.includes(itemWord))
        );
      });
    }

    if (!matchedItem) {
      console.log('📝 No inventory match found for:', ingredientName);
      return false;
    }

    // Check if mapping already exists
    const { data: existingMapping } = await supabase
      .from('recipe_ingredient_mappings')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('ingredient_name', ingredientName)
      .eq('inventory_stock_id', matchedItem.id)
      .single();

    if (existingMapping) {
      return true; // Already mapped
    }

    // Create mapping
    const { error: mappingError } = await supabase
      .from('recipe_ingredient_mappings')
      .insert({
        recipe_id: recipeId,
        ingredient_name: ingredientName,
        inventory_stock_id: matchedItem.id,
        conversion_factor: 1.0
      });

    if (mappingError) {
      console.warn('⚠️ Failed to create mapping:', mappingError);
      return false;
    }

    console.log('🔗 Created mapping:', ingredientName, '→', matchedItem.item);
    return true;

  } catch (error) {
    console.warn('⚠️ Mapping creation error:', error);
    return false;
  }
};

/**
 * Update recipe costs based on ingredients
 */
const updateRecipeCosts = async (recipeId: string): Promise<void> => {
  try {
    const { data: ingredients, error } = await supabase
      .from('recipe_ingredients')
      .select('quantity, cost_per_unit')
      .eq('recipe_id', recipeId);

    if (error || !ingredients) {
      return;
    }

    const totalCost = ingredients.reduce((sum, ingredient) => 
      sum + (ingredient.quantity * ingredient.cost_per_unit), 0
    );

    // Get serving size
    const { data: recipe } = await supabase
      .from('recipes')
      .select('serving_size')
      .eq('id', recipeId)
      .single();

    const servingSize = recipe?.serving_size || 1;
    const costPerServing = totalCost / servingSize;

    await supabase
      .from('recipes')
      .update({
        total_cost: totalCost,
        cost_per_serving: costPerServing,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId);

    console.log('💰 Updated recipe costs:', { totalCost, costPerServing });

  } catch (error) {
    console.warn('⚠️ Failed to update recipe costs:', error);
  }
};

/**
 * Bulk repair all incomplete recipes
 */
export const bulkRepairIncompleteRecipes = async (): Promise<BulkRepairSummary> => {
  console.log('🚀 Starting bulk recipe repair...');

  const summary: BulkRepairSummary = {
    total_recipes_audited: 0,
    incomplete_recipes_found: 0,
    recipes_repaired: 0,
    total_ingredients_added: 0,
    total_mappings_created: 0,
    errors: []
  };

  try {
    // First audit all recipes
    const auditResults = await auditRecipeCompleteness();
    summary.total_recipes_audited = auditResults.length;

    const incompleteRecipes = auditResults.filter(r => r.status === 'incomplete');
    summary.incomplete_recipes_found = incompleteRecipes.length;

    console.log(`📊 Found ${incompleteRecipes.length} incomplete recipes out of ${auditResults.length} total`);

    // Repair each incomplete recipe
    for (const incompleteRecipe of incompleteRecipes) {
      try {
        const repairResult = await repairIncompleteRecipe(
          incompleteRecipe.recipe_id,
          incompleteRecipe.template_id,
          incompleteRecipe.store_id
        );

        if (repairResult.success) {
          summary.recipes_repaired++;
          summary.total_ingredients_added += repairResult.ingredients_added;
          summary.total_mappings_created += repairResult.ingredients_mapped;
        } else {
          summary.errors.push(
            `Failed to repair ${repairResult.recipe_name}: ${repairResult.error}`
          );
        }

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const errorMsg = `Failed to repair recipe ${incompleteRecipe.recipe_name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        summary.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    console.log('✅ Bulk repair completed:', summary);

    // Show summary toast
    if (summary.recipes_repaired > 0) {
      toast.success(
        `🎉 Recipe repair completed!`,
        {
          description: `Fixed ${summary.recipes_repaired} recipes, added ${summary.total_ingredients_added} ingredients, created ${summary.total_mappings_created} inventory mappings.`,
          duration: 8000,
        }
      );
    } else if (summary.incomplete_recipes_found === 0) {
      toast.success('✅ All recipes are already complete!');
    } else {
      toast.warning(`⚠️ Found issues with ${summary.errors.length} recipes. Check console for details.`);
    }

    return summary;

  } catch (error) {
    const errorMsg = `Bulk repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    summary.errors.push(errorMsg);
    console.error('❌', errorMsg);
    toast.error(errorMsg);
    return summary;
  }
};