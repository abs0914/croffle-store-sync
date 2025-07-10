import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  error?: string;
  recipeId?: string;
}

export interface DeploymentOptions {
  priceMarkup?: number;
  customName?: string;
  customDescription?: string;
  isActive?: boolean;
}

/**
 * Deploy a recipe template to multiple stores using the new direct inventory system
 */
export const deployRecipeToMultipleStores = async (
  templateId: string,
  storeIds: string[],
  options: DeploymentOptions = {}
): Promise<DeploymentResult[]> => {
  const results: DeploymentResult[] = [];

  try {
    // Get the template with ingredients
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    // Get store information
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds);

    if (storesError) throw storesError;

    for (const store of stores) {
      try {
        const result = await deployToSingleStore(template, store, options);
        results.push(result);
      } catch (error) {
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
    console.error('Error in bulk deployment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return failed results for all stores
    return storeIds.map(storeId => ({
      success: false,
      storeId,
      storeName: 'Unknown',
      error: errorMessage
    }));
  }
};

/**
 * Deploy template to a single store
 */
const deployToSingleStore = async (
  template: any,
  store: any,
  options: DeploymentOptions
): Promise<DeploymentResult> => {
  try {
    // Calculate recipe cost using direct inventory
    const totalCost = template.ingredients.reduce((sum: number, ingredient: any) => {
      return sum + (ingredient.quantity * (ingredient.cost_per_unit || 0));
    }, 0);

    const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;
    const suggestedPrice = costPerServing * (1 + (options.priceMarkup || 0.5)); // 50% markup by default

    // Create the recipe in the store
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: options.customName || template.name,
        description: options.customDescription || template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        total_cost: totalCost,
        cost_per_serving: costPerServing,
        suggested_price: suggestedPrice,
        recipe_template_id: template.id,
        store_id: store.id,
        created_by: template.created_by,
        is_active: options.isActive !== false
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Create recipe ingredients using direct inventory mapping
    const ingredientInserts = template.ingredients.map((ingredient: any) => ({
      recipe_id: recipe.id,
      ingredient_name: ingredient.ingredient_name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      cost_per_unit: ingredient.cost_per_unit || 0,
      inventory_stock_id: ingredient.inventory_stock_id,
      uses_direct_inventory: true
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientInserts);

    if (ingredientsError) throw ingredientsError;

    return {
      success: true,
      storeId: store.id,
      storeName: store.name,
      recipeId: recipe.id
    };
  } catch (error) {
    console.error(`Error deploying to store ${store.name}:`, error);
    return {
      success: false,
      storeId: store.id,
      storeName: store.name,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Deploy recipe to product catalog (create a sellable product)
 */
export const deployRecipeToProductCatalog = async (
  recipeId: string,
  productData: {
    name: string;
    description?: string;
    price: number;
    category_id?: string;
    image_url?: string;
  }
): Promise<boolean> => {
  try {
    // Get recipe details
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*, store_id, cost_per_serving')
      .eq('id', recipeId)
      .single();

    if (recipeError) throw recipeError;

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        cost: recipe.cost_per_serving,
        category_id: productData.category_id,
        image_url: productData.image_url,
        store_id: recipe.store_id,
        recipe_id: recipeId,
        is_active: true,
        stock_quantity: 0 // Recipe-based products start with 0 stock
      })
      .select()
      .single();

    if (productError) throw productError;

    // Update recipe with product reference
    await supabase
      .from('recipes')
      .update({ product_id: product.id })
      .eq('id', recipeId);

    toast.success(`Product "${productData.name}" created successfully`);
    return true;
  } catch (error) {
    console.error('Error deploying recipe to product catalog:', error);
    toast.error('Failed to create product from recipe');
    return false;
  }
};

/**
 * Clean up duplicate recipes (utility function)
 */
export const cleanupDuplicateRecipes = async (storeId?: string): Promise<number> => {
  try {
    let query = supabase
      .from('recipes')
      .select('id, name, store_id, created_at')
      .order('created_at', { ascending: true });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: recipes, error } = await query;

    if (error) throw error;

    // Group by name and store
    const groups = new Map<string, any[]>();
    recipes?.forEach(recipe => {
      const key = `${recipe.name}-${recipe.store_id}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(recipe);
    });

    let deletedCount = 0;

    // For each group, keep the newest and delete the rest
    for (const [, recipeGroup] of groups) {
      if (recipeGroup.length > 1) {
        // Sort by created_at descending, keep the first (newest)
        recipeGroup.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const toDelete = recipeGroup.slice(1); // All except the first (newest)

        for (const recipe of toDelete) {
          const { error: deleteError } = await supabase
            .from('recipes')
            .delete()
            .eq('id', recipe.id);

          if (!deleteError) {
            deletedCount++;
          }
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up duplicate recipes:', error);
    return 0;
  }
};

/**
 * Get deployment history for a template
 */
export const getTemplateDeploymentHistory = async (templateId: string) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        created_at,
        is_active,
        stores:store_id (name)
      `)
      .eq('recipe_template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching deployment history:', error);
    return [];
  }
};

/**
 * Update recipe pricing across stores
 */
export const updateRecipePricing = async (
  templateId: string,
  newMarkup: number
): Promise<boolean> => {
  try {
    // Get all recipes for this template
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, cost_per_serving')
      .eq('recipe_template_id', templateId);

    if (recipesError) throw recipesError;

    // Update suggested price for each recipe
    for (const recipe of recipes || []) {
      const newPrice = recipe.cost_per_serving * (1 + newMarkup);
      
      await supabase
        .from('recipes')
        .update({ suggested_price: newPrice })
        .eq('id', recipe.id);
    }

    return true;
  } catch (error) {
    console.error('Error updating recipe pricing:', error);
    return false;
  }
};
