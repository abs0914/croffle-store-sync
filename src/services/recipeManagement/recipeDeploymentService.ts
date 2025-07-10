import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Log deployment errors for monitoring and debugging
 */
const logDeploymentError = async (
  templateId: string,
  storeId: string,
  errorType: string,
  errorMessage: string,
  ingredientName?: string | null
) => {
  try {
    await supabase
      .from('recipe_deployment_errors')
      .insert({
        template_id: templateId,
        store_id: storeId,
        error_type: errorType,
        error_message: errorMessage,
        ingredient_name: ingredientName,
        suggested_solution: getSuggestedSolution(errorType)
      });
  } catch (error) {
    console.warn('Failed to log deployment error:', error);
  }
};

/**
 * Get suggested solution based on error type
 */
const getSuggestedSolution = (errorType: string): string => {
  switch (errorType) {
    case 'missing_ingredients':
      return 'Add at least one ingredient to the recipe template before deployment';
    case 'malformed_data':
      return 'Clean up ingredient data and ensure proper formatting';
    case 'duplicate_recipe':
      return 'Recipe already exists in this store. Use a different name or update existing recipe';
    case 'permission_denied':
      return 'Check user permissions and store access rights';
    default:
      return 'Review deployment configuration and try again';
  }
};

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  error?: string;
  recipeId?: string;
  warnings?: string[];
  missingIngredients?: string[];
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
    console.log('🚀 Starting deployment for template:', templateId, 'to stores:', storeIds);
    
    // Get the template with ingredients
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error('❌ Failed to fetch template:', templateError);
      throw templateError;
    }

    console.log('✅ Template fetched:', template.name, 'with', template.ingredients?.length || 0, 'ingredients');

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
    console.log(`🏪 Deploying "${template.name}" to store: ${store.name}`);
    
    // Validate template has valid ingredients
    if (!template.ingredients || template.ingredients.length === 0) {
      const error = 'Template has no valid ingredients';
      console.error('❌', error);
      
      // Log deployment error
      await logDeploymentError(template.id, store.id, 'missing_ingredients', error, null);
      throw new Error(error);
    }

    // Filter out invalid ingredients and clean ingredient names
    const validIngredients = template.ingredients.filter((ingredient: any) => {
      // Clean up malformed ingredient names
      if (ingredient.ingredient_name && typeof ingredient.ingredient_name === 'string') {
        let cleanName = ingredient.ingredient_name;
        
        // Handle severely malformed JSON strings like "[{\"ingredient_name\": \"REGULAR CROISSANT\""
        if (cleanName.includes('ingredient_name')) {
          // Extract the actual ingredient name from malformed JSON
          const match = cleanName.match(/ingredient_name[""'\s]*:\s*[""']\s*([^""']+)/);
          if (match) {
            cleanName = match[1].trim();
          }
        }
        
        // Clean up any remaining JSON artifacts and quotes
        cleanName = cleanName
          .replace(/^"?\[?\{?"?ingredient_name"?: ?"?/, '')
          .replace(/["'}].*$/, '')
          .replace(/[{}\[\]"']/g, '')
          .trim();
        
        ingredient.ingredient_name = cleanName;
        return cleanName.length > 0 && !cleanName.includes('{') && !cleanName.includes('"');
      }
      return false;
    });

    if (validIngredients.length === 0) {
      const error = 'No valid ingredients found after cleaning';
      console.error('❌', error);
      await logDeploymentError(template.id, store.id, 'malformed_data', error, null);
      throw new Error(error);
    }

    console.log(`✅ Cleaned ingredients for ${template.name}:`, validIngredients.map(i => i.ingredient_name));

    // Calculate recipe cost using valid ingredients only
    const totalCost = validIngredients.reduce((sum: number, ingredient: any) => {
      const cost = ingredient.quantity * (ingredient.cost_per_unit || 0);
      return sum + cost;
    }, 0);

    const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;
    const suggestedPrice = costPerServing * (1 + (options.priceMarkup || 0.5)); // 50% markup by default

    // Check if recipe already exists in this store
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('id')
      .eq('name', options.customName || template.name)
      .eq('store_id', store.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingRecipe) {
      const error = 'Recipe already exists in this store';
      console.warn('⚠️', error, `- Recipe "${template.name}" in store "${store.name}"`);
      await logDeploymentError(template.id, store.id, 'duplicate_recipe', error, null);
      return {
        success: false,
        storeId: store.id,
        storeName: store.name,
        error
      };
    }

    // Create the recipe in the store
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: options.customName || template.name,
        description: options.customDescription || template.description,
        instructions: template.instructions || 'No instructions provided',
        yield_quantity: template.yield_quantity || 1,
        total_cost: totalCost,
        cost_per_serving: costPerServing,
        store_id: store.id,
        template_id: template.id,
        product_id: null,
        is_active: options.isActive !== false,
        approval_status: 'approved', // Auto-approve admin deployments
        created_by: template.created_by
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Create recipe ingredients using cleaned ingredient data
    const ingredientInserts = validIngredients.map((ingredient: any) => ({
      recipe_id: recipe.id,
      ingredient_name: ingredient.ingredient_name,
      quantity: ingredient.quantity || 1,
      unit: ingredient.unit || 'piece',
      cost_per_unit: ingredient.cost_per_unit || 0,
      uses_store_inventory: true,
      location_type: 'store'
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientInserts);

    if (ingredientsError) throw ingredientsError;

    console.log(`✅ Successfully deployed "${template.name}" to "${store.name}" with ${validIngredients.length} ingredients`);

    // Create deployment record if table exists
    try {
      const { error: deploymentError } = await supabase
        .from('recipe_deployments')
        .insert({
          template_id: template.id,
          store_id: store.id,
          recipe_id: recipe.id,
          deployed_by: template.created_by,
          cost_snapshot: totalCost,
          price_snapshot: suggestedPrice,
          deployment_notes: 'Admin deployment'
        });

      if (deploymentError) {
        console.warn('Failed to create deployment record:', deploymentError);
        // Don't fail the whole deployment for this
      }
    } catch (error) {
      console.warn('Deployment record table may not exist:', error);
    }

    return {
      success: true,
      storeId: store.id,
      storeName: store.name,
      recipeId: recipe.id,
      warnings: validIngredients.length < template.ingredients.length ? 
        [`${template.ingredients.length - validIngredients.length} invalid ingredients were skipped`] : undefined
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
        sku: `RCP-${productData.name.toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`,
        description: productData.description,
        price: productData.price,
        cost: recipe.cost_per_serving,
        category_id: productData.category_id,
        image_url: productData.image_url,
        store_id: recipe.store_id,
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
      .eq('name', `${templateId}%`)
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
      .ilike('name', `%${templateId}%`);

    if (recipesError) throw recipesError;

    // Update suggested price for each recipe
    for (const recipe of recipes || []) {
      const newPrice = recipe.cost_per_serving * (1 + newMarkup);
      
      // Note: suggested_price field doesn't exist in recipes table
      // This functionality may need to be implemented differently
      console.log(`Would update recipe ${recipe.id} price to ${newPrice}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating recipe pricing:', error);
    return false;
  }
};
