import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Recipe-Product Integration Service
 * Handles the connection between recipe templates and product catalog
 */

export interface RecipeProductStatus {
  productId: string;
  productName: string;
  status: 'ready_to_sell' | 'setup_needed' | 'direct_product' | 'missing_template';
  recipeId?: string;
  templateId?: string;
  availableIngredients: number;
  totalIngredients: number;
  missingIngredients: string[];
  canProduce: boolean;
  maxProduction: number;
}

export interface RecipeAvailabilityStatus {
  recipeId: string;
  recipeName: string;
  status: 'ready_to_sell' | 'setup_needed' | 'missing_ingredients';
  availableIngredients: number;
  totalIngredients: number;
  missingIngredients: string[];
  canProduce: boolean;
  maxProduction: number;
  isLinkedToProduct: boolean;
  productId?: string;
  totalCost: number;
  costPerServing: number;
}

/**
 * Get comprehensive status for products based on recipe and inventory availability
 */
export const getProductRecipeStatus = async (storeId: string): Promise<RecipeProductStatus[]> => {
  try {
    const { data: products, error } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        is_available,
        recipe_id,
        unified_recipes!left (
          id,
          name,
          unified_recipe_ingredients (
            ingredient_name,
            quantity,
            unit,
            inventory_stock_id,
            inventory_stock!left (
              stock_quantity,
              item
            )
          )
        )
      `)
      .eq('store_id', storeId);

    if (error) throw error;

    const statusResults: RecipeProductStatus[] = [];

    for (const product of products) {
      const status = await analyzeProductStatus(product, storeId);
      statusResults.push(status);
    }

    return statusResults;
  } catch (error) {
    console.error('Error getting product recipe status:', error);
    return [];
  }
};

/**
 * Analyze individual product status
 */
const analyzeProductStatus = async (product: any, storeId: string): Promise<RecipeProductStatus> => {
  // No recipe - direct product
  if (!product.recipe_id || !product.unified_recipes) {
    return {
      productId: product.id,
      productName: product.product_name,
      status: 'direct_product',
      availableIngredients: 0,
      totalIngredients: 0,
      missingIngredients: [],
      canProduce: true,
      maxProduction: Infinity
    };
  }

  const recipe = product.unified_recipes;

  // Recipe exists but no ingredients - setup needed
  if (!recipe.unified_recipe_ingredients || recipe.unified_recipe_ingredients.length === 0) {
    return {
      productId: product.id,
      productName: product.product_name,
      status: 'setup_needed',
      recipeId: recipe.id,
      availableIngredients: 0,
      totalIngredients: 0,
      missingIngredients: ['No ingredients configured for recipe'],
      canProduce: false,
      maxProduction: 0
    };
  }

  // Analyze ingredient availability
  const ingredients = recipe.unified_recipe_ingredients;
  let availableCount = 0;
  let maxProduction = Infinity;
  const missingIngredients: string[] = [];

  for (const ingredient of ingredients) {
    const inventoryItem = ingredient.inventory_stock;
    
    if (!inventoryItem) {
      missingIngredients.push(`${ingredient.ingredient_name} (not in inventory)`);
      continue;
    }

    const available = inventoryItem.stock_quantity || 0;
    const required = ingredient.quantity || 0;

    if (available >= required) {
      availableCount++;
      if (required > 0) {
        const possibleQuantity = Math.floor(available / required);
        maxProduction = Math.min(maxProduction, possibleQuantity);
      }
    } else {
      missingIngredients.push(`${ingredient.ingredient_name} (need ${required}, have ${available})`);
    }
  }

  const canProduce = missingIngredients.length === 0;
  const status: RecipeProductStatus['status'] = canProduce ? 'ready_to_sell' : 'setup_needed';

  return {
    productId: product.id,
    productName: product.product_name,
    status,
    recipeId: recipe.id,
    availableIngredients: availableCount,
    totalIngredients: ingredients.length,
    missingIngredients,
    canProduce,
    maxProduction: maxProduction === Infinity ? 999 : maxProduction
  };
};

/**
 * Sync product catalog status based on recipe availability
 */
export const syncProductCatalogWithRecipes = async (storeId: string): Promise<{
  updated: number;
  results: RecipeProductStatus[];
}> => {
  try {
    console.log('🔄 Starting product catalog sync with recipes for store:', storeId);
    
    const statuses = await getProductRecipeStatus(storeId);
    let updatedCount = 0;

    for (const status of statuses) {
      const shouldBeAvailable = status.canProduce;
      const productStatus = getProductStatusFromRecipeStatus(status.status);

      const { error: updateError } = await supabase
        .from('product_catalog')
        .update({
          is_available: shouldBeAvailable,
          product_status: productStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', status.productId);

      if (!updateError) {
        updatedCount++;
      } else {
        console.error('Failed to update product:', status.productName, updateError);
      }
    }

    console.log(`✅ Product catalog sync completed: ${updatedCount} products updated`);
    
    if (updatedCount > 0) {
      toast.success(`Updated ${updatedCount} products based on recipe availability`);
    }

    return {
      updated: updatedCount,
      results: statuses
    };
  } catch (error) {
    console.error('Error syncing product catalog with recipes:', error);
    toast.error('Failed to sync product catalog');
    return {
      updated: 0,
      results: []
    };
  }
};

/**
 * Convert recipe status to product status
 */
const getProductStatusFromRecipeStatus = (recipeStatus: RecipeProductStatus['status']): string => {
  switch (recipeStatus) {
    case 'ready_to_sell':
      return 'available';
    case 'setup_needed':
      return 'temporarily_unavailable';
    case 'direct_product':
      return 'available';
    case 'missing_template':
      return 'temporarily_unavailable';
    default:
      return 'available';
  }
};

/**
 * Create recipes for products that have matching templates but no recipe
 */
export const createMissingRecipes = async (storeId: string): Promise<number> => {
  try {
    console.log('🔧 Creating missing recipes for store:', storeId);

    // Find products without recipes
    const { data: orphanedProducts, error } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        store_id
      `)
      .eq('store_id', storeId)
      .is('recipe_id', null);

    if (error || !orphanedProducts) return 0;

    let createdCount = 0;

    for (const product of orphanedProducts) {
      // Create basic unified recipe for this product
      const { data: newRecipe, error: recipeError } = await supabase
        .from('unified_recipes')
        .insert({
          name: product.product_name,
          store_id: storeId,
          is_active: true,
          serving_size: 1,
          total_cost: 0,
          cost_per_serving: 0,
          instructions: `Auto-generated recipe for ${product.product_name}. Please add ingredients.`
        })
        .select()
        .single();

      if (!recipeError && newRecipe) {
        // Link product to recipe
        await supabase
          .from('product_catalog')
          .update({ recipe_id: newRecipe.id })
          .eq('id', product.id);

        createdCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`✅ Created ${createdCount} missing recipes`);
      toast.success(`Created ${createdCount} missing recipes`);
    }

    return createdCount;
  } catch (error) {
    console.error('Error creating missing recipes:', error);
    return 0;
  }
};

/**
 * Get recipe availability status directly from recipes (recipe-first approach)
 */
export const getRecipeAvailabilityStatus = async (storeId: string): Promise<RecipeAvailabilityStatus[]> => {
  try {
    const { data: recipes, error } = await supabase
      .from('unified_recipes')
      .select(`
        id,
        name,
        store_id,
        total_cost,
        cost_per_serving,
        unified_recipe_ingredients (
          ingredient_name,
          quantity,
          unit,
          cost_per_unit,
          inventory_stock_id,
          inventory_stock (
            id,
            stock_quantity,
            item,
            unit
          )
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;

    const statusResults: RecipeAvailabilityStatus[] = [];

    for (const recipe of recipes || []) {
      // Check if recipe is linked to any product
      const { data: linkedProduct } = await supabase
        .from('product_catalog')
        .select('id')
        .eq('recipe_id', recipe.id)
        .maybeSingle();

      const status = await analyzeRecipeAvailability(recipe, linkedProduct?.id);
      statusResults.push(status);
    }

    return statusResults;
  } catch (error) {
    console.error('Error getting recipe availability status:', error);
    return [];
  }
};

/**
 * Analyze individual recipe availability
 */
const analyzeRecipeAvailability = async (recipe: any, productId?: string): Promise<RecipeAvailabilityStatus> => {
  // Recipe exists but no ingredients - setup needed
  if (!recipe.unified_recipe_ingredients || recipe.unified_recipe_ingredients.length === 0) {
    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      status: 'setup_needed',
      availableIngredients: 0,
      totalIngredients: 0,
      missingIngredients: ['No ingredients configured for recipe'],
      canProduce: false,
      maxProduction: 0,
      isLinkedToProduct: !!productId,
      productId,
      totalCost: recipe.total_cost || 0,
      costPerServing: recipe.cost_per_serving || 0
    };
  }

  // Analyze ingredient availability
  const ingredients = recipe.unified_recipe_ingredients;
  let availableCount = 0;
  let maxProduction = Infinity;
  const missingIngredients: string[] = [];

  for (const ingredient of ingredients) {
    const inventoryItem = ingredient.inventory_stock;
    
    if (!inventoryItem) {
      missingIngredients.push(`${ingredient.ingredient_name} (not in inventory)`);
      continue;
    }

    const available = inventoryItem.stock_quantity || 0;
    const required = ingredient.quantity || 0;

    if (available >= required) {
      availableCount++;
      if (required > 0) {
        const possibleQuantity = Math.floor(available / required);
        maxProduction = Math.min(maxProduction, possibleQuantity);
      }
    } else {
      missingIngredients.push(`${ingredient.ingredient_name} (need ${required}, have ${available})`);
    }
  }

  const canProduce = missingIngredients.length === 0;
  const status: RecipeAvailabilityStatus['status'] = canProduce ? 'ready_to_sell' : 'missing_ingredients';

  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    status,
    availableIngredients: availableCount,
    totalIngredients: ingredients.length,
    missingIngredients,
    canProduce,
    maxProduction: maxProduction === Infinity ? 999 : maxProduction,
    isLinkedToProduct: !!productId,
    productId,
    totalCost: recipe.total_cost || 0,
    costPerServing: recipe.cost_per_serving || 0
  };
};

/**
 * Real-time monitoring setup
 */
export const setupRecipeProductMonitoring = (storeId: string): (() => void) => {
  console.log('🔄 Setting up recipe-product monitoring for store:', storeId);

  // Monitor inventory changes
  const inventoryChannel = supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_stock',
        filter: `store_id=eq.${storeId}`
      },
      async () => {
        console.log('📦 Inventory change detected, syncing products...');
        await syncProductCatalogWithRecipes(storeId);
      }
    )
    .subscribe();

  // Monitor unified recipe changes
  const recipeChannel = supabase
    .channel('recipe-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'unified_recipes',
        filter: `store_id=eq.${storeId}`
      },
      async () => {
        console.log('📋 Recipe change detected, syncing products...');
        await syncProductCatalogWithRecipes(storeId);
      }
    )
    .subscribe();

  // Monitor recipe ingredient changes
  const ingredientChannel = supabase
    .channel('ingredient-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'unified_recipe_ingredients'
      },
      async () => {
        console.log('🥘 Recipe ingredient change detected, syncing products...');
        await syncProductCatalogWithRecipes(storeId);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(inventoryChannel);
    supabase.removeChannel(recipeChannel);
    supabase.removeChannel(ingredientChannel);
  };
};