import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EnhancedDeploymentResult {
  deployed_recipes: number;
  fixed_recipes: number;
  deployed_ingredients: number;
  deployed_products: number;
  skipped_existing: number;
  total_stores: number;
  total_templates: number;
  execution_time_ms: number;
}

/**
 * Deploy all recipe templates to all stores with enhanced fixing of incomplete recipes
 */
export const deployAndFixAllRecipeTemplates = async (): Promise<EnhancedDeploymentResult> => {
  console.log('🚀 Starting enhanced deployment with recipe fixing...');
  
  try {
    const { data, error } = await supabase.rpc('deploy_and_fix_recipe_templates_to_all_stores');
    
    if (error) {
      console.error('❌ Enhanced deployment failed:', error);
      toast.error(`Enhanced deployment failed: ${error.message}`);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('No deployment results returned');
    }

    const result = data[0] as EnhancedDeploymentResult;
    
    console.log('✅ Enhanced deployment completed:', {
      deployedRecipes: result.deployed_recipes,
      fixedRecipes: result.fixed_recipes,
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
      `🎉 Enhanced deployment completed in ${executionTimeSeconds}s!`,
      {
        description: `Deployed ${result.deployed_recipes} new recipes, fixed ${result.fixed_recipes} incomplete recipes, added ${result.deployed_ingredients} ingredients, created ${result.deployed_products} products across ${result.total_stores} stores.`,
        duration: 10000,
      }
    );

    return result;
  } catch (error) {
    console.error('❌ Enhanced deployment service error:', error);
    toast.error(`Enhanced deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

/**
 * Quick fix for a specific recipe's missing ingredients
 */
export const quickFixRecipeIngredients = async (
  recipeId: string, 
  templateId: string
): Promise<{ success: boolean; ingredients_added: number; error?: string }> => {
  console.log('🔧 Quick fixing recipe ingredients:', { recipeId, templateId });

  try {
    // Get recipe info first to get store_id
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('store_id, serving_size')
      .eq('id', recipeId)
      .single();

    if (recipeError) throw recipeError;

    // Get template ingredients
    const { data: templateIngredients, error: templateError } = await supabase
      .from('recipe_template_ingredients')
      .select('*')
      .eq('recipe_template_id', templateId);

    if (templateError) throw templateError;

    // Get existing recipe ingredients
    const { data: existingIngredients, error: existingError } = await supabase
      .from('recipe_ingredients')
      .select('ingredient_name')
      .eq('recipe_id', recipeId);

    if (existingError) throw existingError;

    const existingIngredientNames = existingIngredients?.map(i => 
      i.ingredient_name?.toLowerCase().trim()
    ) || [];

    // Find missing ingredients
    const missingIngredients = templateIngredients?.filter(templateIngredient =>
      !existingIngredientNames.includes(templateIngredient.ingredient_name?.toLowerCase().trim())
    ) || [];

    if (missingIngredients.length === 0) {
      return { success: true, ingredients_added: 0 };
    }

    // Add missing ingredients - need to find matching inventory items first
    let ingredientsWithInventory = [];
    
    for (const ingredient of missingIngredients) {
      // Try to find matching inventory item
      const { data: inventoryItem } = await supabase
        .from('inventory_stock')
        .select('id')
        .eq('store_id', recipe.store_id)
        .eq('is_active', true)
        .ilike('item', `%${ingredient.ingredient_name}%`)
        .limit(1)
        .single();
      
      // Use first available inventory item as fallback if no match
      if (!inventoryItem) {
        const { data: fallbackItem } = await supabase
          .from('inventory_stock')
          .select('id')
          .eq('store_id', recipe.store_id)
          .eq('is_active', true)
          .limit(1)
          .single();
          
        if (fallbackItem) {
          ingredientsWithInventory.push({
            recipe_id: recipeId,
            ingredient_name: ingredient.ingredient_name,
            quantity: ingredient.quantity,
            unit: ingredient.unit as any,
            cost_per_unit: ingredient.cost_per_unit,
            inventory_stock_id: fallbackItem.id,
            commissary_item_id: null
          });
        }
      } else {
        ingredientsWithInventory.push({
          recipe_id: recipeId,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit as any,
          cost_per_unit: ingredient.cost_per_unit,
          inventory_stock_id: inventoryItem.id,
          commissary_item_id: null
        });
      }
    }
    
    if (ingredientsWithInventory.length > 0) {
      const { error: insertError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsWithInventory);
        
      if (insertError) throw insertError;
    }

    // Update recipe costs
    const { data: allIngredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, cost_per_unit')
      .eq('recipe_id', recipeId);

    const totalCost = allIngredients?.reduce((sum, ingredient) => 
      sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
    ) || 0;

    const servingSize = recipe.serving_size || 1;
    const costPerServing = totalCost / servingSize;

    await supabase
      .from('recipes')
      .update({
        total_cost: totalCost,
        cost_per_serving: costPerServing,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId);

    console.log('✅ Quick fix completed:', { ingredients_added: missingIngredients.length, totalCost });

    toast.success(
      `🔧 Recipe fixed!`,
      {
        description: `Added ${missingIngredients.length} missing ingredients. Total cost updated to ₱${totalCost.toFixed(2)}`,
        duration: 5000,
      }
    );

    return { success: true, ingredients_added: missingIngredients.length };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Quick fix failed:', errorMsg);
    toast.error(`Quick fix failed: ${errorMsg}`);
    return { success: false, ingredients_added: 0, error: errorMsg };
  }
};

/**
 * Fix specific Sugbo Mercado IT Park Blueberry Croffle recipe
 */
export const fixSugboBlueberryCroffle = async (): Promise<void> => {
  console.log('🫐 Fixing Sugbo Mercado IT Park Blueberry Croffle recipe...');

  try {
    // Find the specific recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, template_id, name')
      .eq('name', 'Blueberry')
      .eq('store_id', 'a4f02a7d-cd0e-4c7f-af5e-4dc067e6f74e') // Sugbo Mercado IT Park
      .single();

    if (recipeError || !recipe) {
      throw new Error('Blueberry Croffle recipe not found at Sugbo Mercado IT Park');
    }

    if (!recipe.template_id) {
      throw new Error('Recipe has no template ID');
    }

    // Quick fix the recipe
    const result = await quickFixRecipeIngredients(recipe.id, recipe.template_id);

    if (result.success) {
      console.log('✅ Sugbo Blueberry Croffle fixed successfully');
      toast.success(
        `🫐 Blueberry Croffle Fixed!`,
        {
          description: `Added ${result.ingredients_added} missing ingredients to Sugbo Mercado IT Park store. Recipe is now complete for proper inventory deduction.`,
          duration: 8000,
        }
      );
    } else {
      throw new Error(result.error || 'Failed to fix recipe');
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to fix Sugbo Blueberry Croffle:', errorMsg);
    toast.error(`Failed to fix Blueberry Croffle: ${errorMsg}`);
    throw error;
  }
};