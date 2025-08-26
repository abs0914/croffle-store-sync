import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getOrCreatePOSCategory } from './categoryMappingService';

// Helper function to normalize units to match database enum values
const normalizeUnit = (unit: string): string => {
  const unitLower = unit.toLowerCase().trim();
  
  // Map common variations to enum values
  const unitMap: Record<string, string> = {
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

/**
 * Enhanced ingredient name matching with fuzzy logic
 */
const findMatchingInventoryItem = async (ingredientName: string, storeId: string): Promise<any> => {
  const cleanIngredientName = ingredientName.toLowerCase().trim();
  
  // Try exact match first
  let { data: exactMatch } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .ilike('item', cleanIngredientName)
    .maybeSingle();

  if (exactMatch) return exactMatch;

  // Try fuzzy matching with common variations
  const { data: allStoreItems } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!allStoreItems) return null;

  // Fuzzy matching logic
  for (const item of allStoreItems) {
    const itemName = item.item.toLowerCase().trim();
    
    // Remove common prefixes/suffixes for matching
    const cleanItemName = itemName
      .replace(/^(regular|mini|small|large|jumbo)\s+/i, '')
      .replace(/\s+(sauce|syrup|powder|mix)$/i, '');
    
    const cleanIngredient = cleanIngredientName
      .replace(/^(regular|mini|small|large|jumbo)\s+/i, '')
      .replace(/\s+(sauce|syrup|powder|mix)$/i, '');

    // Check for partial matches
    if (
      cleanItemName.includes(cleanIngredient) ||
      cleanIngredient.includes(cleanItemName) ||
      // Handle word variations
      cleanItemName.replace(/s$/, '') === cleanIngredient.replace(/s$/, '')
    ) {
      console.log(`🔍 Fuzzy match found: "${ingredientName}" -> "${item.item}"`);
      return item;
    }
  }

  return null;
};

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
      return 'Add the missing ingredients to store inventory before deployment';
    case 'malformed_data':
      return 'Clean up ingredient data and ensure proper formatting';
    case 'duplicate_recipe':
      return 'Recipe already exists in this store. Use a different name or update existing recipe';
    case 'permission_denied':
      return 'Check user permissions and store access rights';
    case 'product_creation_failed':
      return 'Recipe deployed but product creation failed. Create product manually from recipe';
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
  productId?: string;
  warnings?: string[];
  missingIngredients?: string[];
}

export interface DeploymentOptions {
  actualPrice?: number;
  priceMarkup?: number;
  customName?: string;
  customDescription?: string;
  isActive?: boolean;
  createProduct?: boolean;
  categoryId?: string;
}

/**
 * Deploy a recipe template to multiple stores with enhanced validation
 */
export const deployRecipeToMultipleStores = async (
  templateId: string,
  storeIds: string[],
  options: DeploymentOptions = {}
): Promise<DeploymentResult[]> => {
  const results: DeploymentResult[] = [];

  try {
    console.log('🚀 Starting enhanced deployment for template:', templateId, 'to stores:', storeIds, 'with options:', options);
    
    // Get the template with ingredients and image
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

    console.log('✅ Template fetched:', template.name, 'with', template.ingredients?.length || 0, 'ingredients', 'and image:', template.image_url);

    // Validate template has valid ingredients
    if (!template.ingredients || template.ingredients.length === 0) {
      throw new Error('Template has no valid ingredients');
    }

    // Get store information
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds);

    if (storesError) throw storesError;

    // Process each store deployment with enhanced error handling
    for (const store of stores) {
      try {
        console.log(`🏪 Processing deployment for store: ${store.name}`);
        const result = await deployToSingleStoreWithTransaction(template, store, options);
        results.push(result);
        console.log(`✅ Deployment result for ${store.name}:`, result.success ? 'Success' : `Failed: ${result.error}`);
      } catch (error) {
        console.error(`❌ Deployment failed for store ${store.name}:`, error);
        await logDeploymentError(templateId, store.id, 'deployment_error', 
          error instanceof Error ? error.message : 'Unknown error');
        
        results.push({
          success: false,
          storeId: store.id,
          storeName: store.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log deployment summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    console.log(`📊 Deployment Summary: ${successCount} successful, ${failCount} failed out of ${results.length} stores`);

    return results;
  } catch (error) {
    console.error('❌ Critical error in bulk deployment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log critical error
    await logDeploymentError(templateId, '', 'critical_error', errorMessage);
    
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
 * Enhanced deployment to a single store with transaction handling
 */
const deployToSingleStoreWithTransaction = async (
  template: any,
  store: any,
  options: DeploymentOptions
): Promise<DeploymentResult> => {
  try {
    console.log(`🏪 Starting transactional deployment of "${template.name}" to store: ${store.name}`);
    console.log(`📋 Template data:`, {
      id: template.id,
      name: template.name,
      image_url: template.image_url,
      ingredients_count: template.ingredients?.length || 0,
      actualPrice: options.actualPrice
    });
    
    // Validate template has valid ingredients
    if (!template.ingredients || template.ingredients.length === 0) {
      const error = 'Template has no valid ingredients';
      console.error('❌', error);
      
      await logDeploymentError(template.id, store.id, 'missing_ingredients', error, null);
      throw new Error(error);
    }

    // Clean and validate ingredients
    const validIngredients = await validateAndCleanIngredients(template.ingredients, store.id);
    
    if (validIngredients.length === 0) {
      const error = 'No valid ingredients found after cleaning and validation';
      console.error('❌', error);
      await logDeploymentError(template.id, store.id, 'malformed_data', error, null);
      throw new Error(error);
    }

    console.log(`✅ Validated ingredients for ${template.name}:`, validIngredients.map(i => i.ingredient_name));

    // Calculate recipe cost
    const totalCost = validIngredients.reduce((sum: number, ingredient: any) => {
      return sum + (ingredient.quantity * (ingredient.cost_per_unit || 0));
    }, 0);

    const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;
    
    // Use actualPrice from options if provided, otherwise use template's suggested_price,
    // and only fall back to calculated price if neither is available
    const finalPrice = options.actualPrice || template.suggested_price || (costPerServing * (1 + (options.priceMarkup || 0.5))); // 50% markup by default
    
    console.log(`💰 Pricing calculation:`, {
      totalCost,
      costPerServing,
      templateSuggestedPrice: template.suggested_price,
      actualPrice: options.actualPrice,
      finalPrice,
      priceMarkup: options.priceMarkup
    });

    // Check for existing recipe
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('id, product_id')
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
        success: true, // Consider existing as success
        storeId: store.id,
        storeName: store.name,
        recipeId: existingRecipe.id,
        productId: existingRecipe.product_id,
        warnings: ['Recipe already exists in this store']
      };
    }

    // Create the recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: options.customName || template.name,
        description: options.customDescription || template.description,
        instructions: template.instructions || 'Follow template instructions',
        yield_quantity: template.yield_quantity || 1,
        total_cost: totalCost,
        cost_per_serving: costPerServing,
        suggested_price: finalPrice,
        store_id: store.id,
        template_id: template.id,
        product_id: null,
        is_active: options.isActive !== false,
        approval_status: 'approved' // Auto-approve admin deployments
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Create recipe ingredients with enhanced store mapping
    const ingredientInserts = await Promise.all(
      validIngredients.map(async (ingredient: any) => {
        const normalizedUnit = normalizeUnit(ingredient.unit || 'pieces') as 'pieces' | 'g' | 'kg' | 'liters' | 'ml' | 'boxes' | 'packs';
        
        return {
          recipe_id: recipe.id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity || 1,
          unit: normalizedUnit,
          cost_per_unit: ingredient.cost_per_unit || 0,
          inventory_stock_id: ingredient.inventory_stock_id,
          commissary_item_id: ingredient.commissary_item_id
        };
      })
    );

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientInserts);

    if (ingredientsError) throw ingredientsError;

    console.log(`✅ Successfully deployed recipe "${template.name}" to "${store.name}"`);

    // Create product catalog entry with enhanced options (default: true)
    let productId: string | undefined;
    let productWarnings: string[] = [];

    if (options.createProduct !== false) {
      try {
        console.log(`🛍️ Creating product catalog entry with enhanced options...`);
        const productResult = await createProductCatalogWithTransaction(recipe, template, {
          ...options,
          actualPrice: finalPrice // Ensure we pass the calculated price
        });
        
        if (productResult.success) {
          productId = productResult.productId;
          
          // Update recipe with product reference in a separate transaction
          const { error: updateError } = await supabase
            .from('recipes')
            .update({ product_id: productId })
            .eq('id', recipe.id);
            
          if (updateError) {
            console.warn('⚠️ Failed to update recipe with product_id:', updateError);
          } else {
            console.log(`✅ Recipe updated with product_id: ${productId}`);
          }
          
          console.log(`✅ Product catalog entry created successfully: ${productId}`);
        } else {
          const errorMsg = productResult.error || 'Failed to create product catalog entry';
          productWarnings.push(errorMsg);
          console.error('❌ Product catalog creation failed:', errorMsg);
          await logDeploymentError(template.id, store.id, 'product_creation_failed', errorMsg, null);
        }
      } catch (productError) {
        const errorMsg = productError instanceof Error ? productError.message : 'Product creation failed';
        productWarnings.push(errorMsg);
        console.error('❌ Product creation error:', errorMsg);
        await logDeploymentError(template.id, store.id, 'product_creation_failed', errorMsg, null);
      }
    }

    // Create deployment record
    try {
      await supabase
        .from('recipe_deployments')
        .insert({
          template_id: template.id,
          store_id: store.id,
          recipe_id: recipe.id,
          deployed_by: template.created_by,
          cost_snapshot: totalCost,
          price_snapshot: finalPrice,
          deployment_notes: 'Enhanced admin deployment with product creation'
        });
    } catch (error) {
      console.warn('Failed to create deployment record:', error);
    }

    const allWarnings = [
      ...(validIngredients.length < template.ingredients.length ? 
        [`${template.ingredients.length - validIngredients.length} invalid ingredients were skipped`] : []),
      ...productWarnings
    ];

    return {
      success: true,
      storeId: store.id,
      storeName: store.name,
      recipeId: recipe.id,
      productId,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
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
 * Validate and clean ingredients with enhanced store mapping
 */
const validateAndCleanIngredients = async (ingredients: any[], storeId: string): Promise<any[]> => {
  const validIngredients = [];

  console.log(`🔍 Validating ${ingredients.length} ingredients for store: ${storeId}`);

  for (const ingredient of ingredients) {
    console.log(`📋 Processing ingredient:`, ingredient);

    // Clean up malformed ingredient names
    if (ingredient.ingredient_name && typeof ingredient.ingredient_name === 'string') {
      let cleanName = ingredient.ingredient_name;
      
      // Handle severely malformed JSON strings
      if (cleanName.includes('ingredient_name')) {
        const match = cleanName.match(/ingredient_name[""'\s]*:\s*[""']\s*([^""']+)/);
        if (match) {
          cleanName = match[1].trim();
        }
      }
      
      // Clean up JSON artifacts
      cleanName = cleanName
        .replace(/^"?\[?\{?"?ingredient_name"?: ?"?/, '')
        .replace(/["'}].*$/, '')
        .replace(/[{}\[\]"']/g, '')
        .trim();
      
      // Less strict validation - accept any non-empty ingredient name
      if (cleanName.length > 0) {
        console.log(`✅ Processing valid ingredient: ${cleanName}`);
        
        // Try to find matching store inventory item (optional)
        const storeItem = await findMatchingInventoryItem(cleanName, storeId);
        
        if (storeItem) {
          console.log(`🔗 Found store inventory match for "${cleanName}": ${storeItem.item}`);
        } else {
          console.log(`⚠️ No store inventory match for "${cleanName}" - proceeding anyway`);
        }
        
        const validIngredient = {
          ...ingredient,
          ingredient_name: cleanName,
          inventory_stock_id: storeItem?.id || null,
          commissary_item_id: ingredient.commissary_item_id || null,
          uses_store_inventory: !!storeItem,
          // Ensure we have essential fields with defaults
          quantity: ingredient.quantity || 1,
          unit: ingredient.unit || 'pieces',
          cost_per_unit: ingredient.cost_per_unit || 0
        };
        
        validIngredients.push(validIngredient);
        console.log(`✅ Added valid ingredient: ${cleanName} (${validIngredient.quantity} ${validIngredient.unit})`);
      } else {
        console.warn(`❌ Skipping ingredient with empty name:`, ingredient);
      }
    } else {
      console.warn(`❌ Skipping ingredient with invalid name:`, ingredient);
    }
  }

  console.log(`✅ Validation complete: ${validIngredients.length}/${ingredients.length} ingredients validated`);
  return validIngredients;
};

/**
 * Create product catalog entry with enhanced transaction handling
 */
const createProductCatalogWithTransaction = async (
  recipe: any, 
  template: any, 
  options: DeploymentOptions & { actualPrice?: number }
): Promise<{ success: boolean; productId?: string; error?: string }> => {
  try {
    console.log(`🛍️ Creating product catalog entry for: ${recipe.name}`);
    console.log(`📊 Product details:`, {
      recipeName: recipe.name,
      templateImageUrl: template.image_url,
      actualPrice: options.actualPrice,
      suggestedPrice: recipe.suggested_price,
      totalCost: recipe.total_cost
    });
    
    // Calculate final price - prioritize actualPrice from options
    const finalPrice = options.actualPrice || recipe.suggested_price || (recipe.total_cost * 1.5);
    
    console.log(`💰 Using final price: ₱${finalPrice}`);

    // Get or create the appropriate POS category
    const categoryId = await getOrCreatePOSCategory(template.category_name || 'Other', recipe.store_id);
    console.log(`🏷️ Using category ID: ${categoryId} for template category: ${template.category_name}`);

    // Create product catalog entry for POS system (main entry)
    const { data: catalogProduct, error: catalogError } = await supabase
      .from('product_catalog')
      .insert({
        store_id: recipe.store_id,
        product_name: recipe.name,
        description: recipe.description || template.description || '',
        price: finalPrice,
        is_available: true,
        recipe_id: recipe.id,
        image_url: template.image_url || null,
        category_id: categoryId,
        display_order: 0
      })
      .select()
      .single();

    if (catalogError) {
      console.error('❌ Product catalog creation error:', catalogError);
      return { 
        success: false, 
        error: `Failed to create product catalog entry: ${catalogError.message}` 
      };
    }

    console.log(`✅ Created product catalog entry:`, {
      id: catalogProduct.id,
      name: catalogProduct.product_name,
      price: catalogProduct.price,
      image_url: catalogProduct.image_url,
      store_id: catalogProduct.store_id
    });

    // Get recipe ingredients to create product ingredients
    const { data: recipeIngredients, error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipe.id);

    if (ingredientsError) {
      console.warn('Failed to fetch recipe ingredients for product catalog:', ingredientsError);
    } else if (recipeIngredients && recipeIngredients.length > 0) {
      // Create product ingredients for inventory tracking
      const productIngredients = recipeIngredients.map((ingredient: any) => ({
        product_catalog_id: catalogProduct.id,
        inventory_stock_id: ingredient.inventory_stock_id,
        commissary_item_id: ingredient.commissary_item_id,
        required_quantity: ingredient.quantity,
        unit: ingredient.unit
      })).filter((ing: any) => ing.inventory_stock_id || ing.commissary_item_id);

      if (productIngredients.length > 0) {
        const { error: productIngredientsError } = await supabase
          .from('product_ingredients')
          .insert(productIngredients);

        if (productIngredientsError) {
          console.warn('Failed to create product ingredients:', productIngredientsError);
        }
      }
    }

    // Broadcast cache invalidation to POS system
    try {
      const channel = supabase.channel('recipe_deployment_cache_invalidation');
      await channel.send({
        type: 'broadcast',
        event: 'product_catalog_changed',
        payload: {
          productId: catalogProduct.id,
          storeId: recipe.store_id,
          eventType: 'INSERT',
          timestamp: new Date().toISOString()
        }
      });
      await supabase.removeChannel(channel);
    } catch (error) {
      console.warn('Failed to broadcast cache invalidation:', error);
    }

    console.log(`✅ Successfully created product catalog entry for "${recipe.name}" with ID: ${catalogProduct.id}`);
    return { success: true, productId: catalogProduct.id };
  } catch (error) {
    console.error('Unexpected error creating product:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown product creation error' 
    };
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
        recipeGroup.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const toDelete = recipeGroup.slice(1);

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
        product_id,
        created_at,
        is_active,
        total_cost,
        suggested_price,
        stores:store_id (name)
      `)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching deployment history:', error);
    return [];
  }
};

/**
 * Validate recipe deployment before executing
 */
export const validateRecipeDeployment = async (
  templateId: string,
  storeId: string
): Promise<{ 
  isValid: boolean; 
  errorMessage?: string; 
  missingIngredients?: string[];
  warnings?: string[];
}> => {
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
      return { isValid: false, errorMessage: 'Recipe template not found' };
    }

    if (!template.ingredients || template.ingredients.length === 0) {
      return { isValid: false, errorMessage: 'Recipe template has no ingredients' };
    }

    // Check store exists
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return { isValid: false, errorMessage: 'Store not found' };
    }

    // Validate ingredients availability
    const missingIngredients: string[] = [];
    const warnings: string[] = [];

    for (const ingredient of template.ingredients) {
      const cleanName = ingredient.ingredient_name?.trim();
      if (!cleanName) continue;

      const storeItem = await findMatchingInventoryItem(cleanName, storeId);
      if (!storeItem) {
        missingIngredients.push(cleanName);
      }
    }

    if (missingIngredients.length > 0) {
      return {
        isValid: false,
        errorMessage: `Missing ingredients in store inventory: ${missingIngredients.join(', ')}`,
        missingIngredients
      };
    }

    // Check for existing recipe
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id')
      .eq('template_id', templateId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (existingRecipe) {
      warnings.push('Recipe already deployed to this store');
    }

    return { 
      isValid: true, 
      warnings: warnings.length > 0 ? warnings : undefined 
    };
  } catch (error) {
    console.error('Error validating recipe deployment:', error);
    return { 
      isValid: false, 
      errorMessage: error instanceof Error ? error.message : 'Validation failed' 
    };
  }
};

/**
 * Deploy recipe to product catalog (legacy function for backwards compatibility)
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
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*, store_id, cost_per_serving')
      .eq('id', recipeId)
      .single();

    if (recipeError) throw recipeError;

    const result = await createProductCatalogWithTransaction(recipe, { image_url: productData.image_url }, {
      categoryId: productData.category_id
    });

    if (result.success) {
      await supabase
        .from('recipes')
        .update({ product_id: result.productId })
        .eq('id', recipeId);

      toast.success(`Product "${productData.name}" created successfully`);
      return true;
    } else {
      toast.error(result.error || 'Failed to create product from recipe');
      return false;
    }
  } catch (error) {
    console.error('Error deploying recipe to product catalog:', error);
    toast.error('Failed to create product from recipe');
    return false;
  }
};
