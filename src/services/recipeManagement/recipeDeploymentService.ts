import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";
import { toast } from "sonner";
import type { LocationType } from "./types";

export interface DeploymentResult {
  storeId: string;
  storeName?: string;
  success: boolean;
  error?: string;
  recipeId?: string;
  warnings?: string[];
  missingIngredients?: string[];
}

// Get ingredients for specific store location
const getIngredientsForStore = async (template: RecipeTemplate, storeId: string) => {
  // Get store's location type
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('location_type')
    .eq('id', storeId)
    .single();

  if (storeError) {
    console.error('Error fetching store location:', storeError);
    // Default to all ingredients if we can't determine location
    return template.ingredients.filter(ing => !ing.location_type || ing.location_type === 'all');
  }

  const storeLocationType = store?.location_type as LocationType || 'all';
  
  console.log(`Store ${storeId} location type: ${storeLocationType}`);

  // Filter ingredients based on store location
  const applicableIngredients = template.ingredients.filter(ingredient => {
    const ingLocation = ingredient.location_type || 'all';
    return ingLocation === 'all' || ingLocation === storeLocationType;
  });

  console.log(`Filtered ${applicableIngredients.length} ingredients for location ${storeLocationType}`);
  
  return applicableIngredients;
};

export const deployRecipeToProductCatalog = async (
  template: RecipeTemplate,
  storeId: string
): Promise<DeploymentResult> => {
  try {
    console.log(`Deploying recipe template "${template.name}" to store ${storeId}`);

    // CRITICAL: Check if recipe already exists in this store using both name AND store_id
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('id, name, store_id, created_at')
      .eq('name', template.name)
      .eq('store_id', storeId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing recipe:', checkError);
      throw checkError;
    }

    if (existingRecipe) {
      console.log(`Recipe "${template.name}" already exists in store ${storeId} (ID: ${existingRecipe.id})`);
      return {
        storeId,
        success: false,
        error: `Recipe "${template.name}" already exists in this store (deployed on ${new Date(existingRecipe.created_at).toLocaleDateString()})`
      };
    }

    // Get location-specific ingredients
    const storeIngredients = await getIngredientsForStore(template, storeId);
    
    // Calculate recipe cost based on location-specific ingredients
    const totalCost = storeIngredients.reduce((sum, ingredient) => 
      sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
    );

    // Get current user for approval tracking
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User authentication required');
    }

    // Generate unique SKU to prevent conflicts
    const timestamp = Date.now();
    const uniqueSku = `RCP-${template.name.replace(/\s+/g, '-').toUpperCase()}-${storeId.substring(0, 8)}-${timestamp}`;

    // Create the product in products table first
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: template.name,
        description: template.description,
        sku: uniqueSku,
        price: totalCost, // Use cost directly without markup
        cost: totalCost,
        stock_quantity: 0,
        store_id: storeId,
        is_active: true,
        image_url: template.image_url
      })
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      throw productError;
    }

    console.log(`Created product with ID: ${product.id}`);

    // Create the product catalog entry
    const { data: catalogProduct, error: catalogError } = await supabase
      .from('product_catalog')
      .insert({
        product_name: template.name,
        description: template.description,
        price: totalCost,
        store_id: storeId,
        is_available: true,
        display_order: 0,
        image_url: template.image_url
      })
      .select()
      .single();

    if (catalogError) {
      console.error('Error creating product catalog entry:', catalogError);
      // Don't throw here, continue with recipe creation
      console.warn('Product catalog entry failed but continuing with recipe creation');
    } else {
      console.log(`Created product catalog entry with ID: ${catalogProduct.id}`);
    }

    // Create the recipe with location-appropriate ingredients
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size || 1,
        store_id: storeId,
        product_id: product.id,
        category_name: template.category_name,
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        is_active: true,
        version: template.version || 1
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Error creating recipe:', recipeError);
      
      // Clean up the product if recipe creation fails
      await supabase.from('products').delete().eq('id', product.id);
      if (catalogProduct?.id) {
        await supabase.from('product_catalog').delete().eq('id', catalogProduct.id);
      }
      
      throw recipeError;
    }

    console.log(`Created recipe with ID: ${recipe.id}`);

    // Update the product catalog with the recipe_id if it was created
    if (catalogProduct?.id) {
      const { error: updateCatalogError } = await supabase
        .from('product_catalog')
        .update({ recipe_id: recipe.id })
        .eq('id', catalogProduct.id);

      if (updateCatalogError) {
        console.error('Error linking recipe to product catalog:', updateCatalogError);
        // Don't fail deployment for this
      }
    }

    // Process location-specific ingredients
    const warnings: string[] = [];
    const missingIngredients: string[] = [];
    
    if (storeIngredients && storeIngredients.length > 0) {
      const ingredientInserts = [];
      const productIngredientInserts = [];

      for (const ingredient of storeIngredients) {
        // Try to find the corresponding inventory stock item in the target store
        const { data: inventoryStock, error: stockError } = await supabase
          .from('inventory_stock')
          .select('id')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .maybeSingle();

        if (stockError) {
          console.warn(`Error checking inventory for "${ingredient.ingredient_name}":`, stockError);
          continue;
        }

        if (!inventoryStock) {
          console.warn(`Inventory item "${ingredient.ingredient_name}" not found in store ${storeId}`);
          missingIngredients.push(ingredient.ingredient_name);
          continue;
        }

        // Create recipe ingredient entry
        ingredientInserts.push({
          recipe_id: recipe.id,
          inventory_stock_id: inventoryStock.id,
          commissary_item_id: ingredient.commissary_item_id,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit || 0
        });

        // Create product catalog ingredient entry if catalog was created
        if (catalogProduct?.id) {
          productIngredientInserts.push({
            product_catalog_id: catalogProduct.id,
            inventory_stock_id: inventoryStock.id,
            commissary_item_id: ingredient.commissary_item_id,
            required_quantity: ingredient.quantity,
            unit: ingredient.unit
          });
        }
      }

      // Insert recipe ingredients
      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error('Error creating recipe ingredients:', ingredientsError);
          warnings.push(`Some recipe ingredients could not be linked: ${ingredientsError.message}`);
        } else {
          console.log(`Successfully linked ${ingredientInserts.length} recipe ingredients`);
        }
      }

      // Insert product catalog ingredients if catalog exists
      if (productIngredientInserts.length > 0 && catalogProduct?.id) {
        const { error: productIngredientsError } = await supabase
          .from('product_ingredients')
          .insert(productIngredientInserts);

        if (productIngredientsError) {
          console.error('Error creating product ingredients:', productIngredientsError);
          warnings.push(`Some product ingredients could not be linked: ${productIngredientsError.message}`);
        }
      }

      // Add location-specific warnings
      if (missingIngredients.length > 0) {
        warnings.push(`Missing inventory items: ${missingIngredients.join(', ')}`);
      }

      // Add location-specific deployment info
      const { data: store } = await supabase
        .from('stores')
        .select('location_type')
        .eq('id', storeId)
        .single();
        
      if (store?.location_type) {
        warnings.push(`Deployed with ${store.location_type.replace('_', ' ')} specific ingredients`);
      }
    }

    const successMessage = `Successfully deployed recipe template to store ${storeId}`;
    if (warnings.length > 0) {
      console.warn(`${successMessage} with warnings:`, warnings);
    } else {
      console.log(successMessage);
    }
    
    return {
      storeId,
      success: true,
      recipeId: recipe.id,
      warnings: warnings.length > 0 ? warnings : undefined,
      missingIngredients: missingIngredients.length > 0 ? missingIngredients : undefined
    };

  } catch (error: any) {
    console.error(`Error deploying recipe to store ${storeId}:`, error);
    return {
      storeId,
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

export const deployRecipeToMultipleStores = async (
  template: RecipeTemplate,
  storeIds: string[]
): Promise<DeploymentResult[]> => {
  console.log(`Deploying recipe template "${template.name}" to ${storeIds.length} stores`);
  
  const results: DeploymentResult[] = [];
  
  // Get store names for better error reporting
  const { data: stores } = await supabase
    .from('stores')
    .select('id, name')
    .in('id', storeIds);

  const storeMap = new Map(stores?.map(s => [s.id, s.name]) || []);

  // Deploy to each store sequentially to avoid overwhelming the database
  for (const storeId of storeIds) {
    const result = await deployRecipeToProductCatalog(template, storeId);
    result.storeName = storeMap.get(storeId);
    results.push(result);
    
    // Add a small delay between deployments to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Log summary with warnings
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const warningCount = results.filter(r => r.success && r.warnings && r.warnings.length > 0).length;
  
  console.log(`Deployment complete: ${successCount} successful, ${failCount} failed, ${warningCount} with warnings`);
  
  // Show toast notifications for deployment results
  if (successCount > 0) {
    if (warningCount > 0) {
      toast.success(`Deployed to ${successCount} stores with ${warningCount} warnings`, {
        description: "Check deployment results for location-specific ingredient details"
      });
    } else {
      toast.success(`Successfully deployed to ${successCount} stores`);
    }
  }
  
  if (failCount > 0) {
    const duplicateErrors = results.filter(r => !r.success && r.error?.includes('already exists')).length;
    if (duplicateErrors === failCount) {
      toast.warning(`Recipe already exists in ${failCount} store(s)`, {
        description: "No new deployments were made"
      });
    } else {
      toast.error(`Failed to deploy to ${failCount} stores`, {
        description: "Check deployment results for error details"
      });
    }
  }
  
  return results;
};

// New function to clean up duplicate recipes
export const cleanupDuplicateRecipes = async (storeId?: string): Promise<{ cleaned: number; errors: string[] }> => {
  try {
    console.log('Starting cleanup of duplicate recipes...');
    
    let query = supabase
      .from('recipes')
      .select('id, name, store_id, created_at')
      .order('created_at', { ascending: true });
    
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    
    const { data: recipes, error } = await query;
    
    if (error) {
      throw error;
    }
    
    if (!recipes || recipes.length === 0) {
      return { cleaned: 0, errors: [] };
    }
    
    // Group recipes by name and store
    const duplicateGroups = recipes.reduce((acc: any, recipe: any) => {
      const key = `${recipe.name}-${recipe.store_id}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(recipe);
      return acc;
    }, {});
    
    // Find groups with duplicates (keep the oldest, remove the rest)
    const toDelete: string[] = [];
    const errors: string[] = [];
    
    for (const [key, group] of Object.entries(duplicateGroups)) {
      const typedGroup = group as any[];
      if (typedGroup.length > 1) {
        // Keep the first (oldest) and mark the rest for deletion
        const [keep, ...duplicates] = typedGroup;
        console.log(`Found ${duplicates.length} duplicates for "${keep.name}" in store ${keep.store_id}`);
        toDelete.push(...duplicates.map(d => d.id));
      }
    }
    
    if (toDelete.length === 0) {
      console.log('No duplicates found');
      return { cleaned: 0, errors: [] };
    }
    
    console.log(`Cleaning up ${toDelete.length} duplicate recipes...`);
    
    // Delete recipe ingredients first
    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .in('recipe_id', toDelete);
    
    if (ingredientsError) {
      errors.push(`Error deleting recipe ingredients: ${ingredientsError.message}`);
    }
    
    // Delete the duplicate recipes
    const { error: recipesError } = await supabase
      .from('recipes')
      .delete()
      .in('id', toDelete);
    
    if (recipesError) {
      errors.push(`Error deleting recipes: ${recipesError.message}`);
      return { cleaned: 0, errors };
    }
    
    console.log(`Successfully cleaned up ${toDelete.length} duplicate recipes`);
    return { cleaned: toDelete.length, errors };
    
  } catch (error: any) {
    console.error('Error cleaning up duplicates:', error);
    return { cleaned: 0, errors: [error.message] };
  }
};
