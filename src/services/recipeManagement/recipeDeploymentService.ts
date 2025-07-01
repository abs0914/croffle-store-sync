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

    // Check if recipe already exists in this store
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('id')
      .eq('name', template.name)
      .eq('store_id', storeId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing recipe:', checkError);
      throw checkError;
    }

    if (existingRecipe) {
      console.log(`Recipe "${template.name}" already exists in store ${storeId}`);
      return {
        storeId,
        success: false,
        error: `Recipe "${template.name}" already exists in this store`
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

    // Create the product in products table first
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: template.name,
        description: template.description,
        sku: `RCP-${template.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`,
        price: totalCost * 1.5, // 50% markup as default
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
        price: totalCost * 1.5,
        store_id: storeId,
        is_available: true,
        display_order: 0,
        image_url: template.image_url
      })
      .select()
      .single();

    if (catalogError) {
      console.error('Error creating product catalog entry:', catalogError);
      throw catalogError;
    }

    console.log(`Created product catalog entry with ID: ${catalogProduct.id}`);

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
      throw recipeError;
    }

    console.log(`Created recipe with ID: ${recipe.id}`);

    // Update the product catalog with the recipe_id
    const { error: updateCatalogError } = await supabase
      .from('product_catalog')
      .update({ recipe_id: recipe.id })
      .eq('id', catalogProduct.id);

    if (updateCatalogError) {
      console.error('Error linking recipe to product catalog:', updateCatalogError);
      throw updateCatalogError;
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

        // Create product catalog ingredient entry
        productIngredientInserts.push({
          product_catalog_id: catalogProduct.id,
          inventory_stock_id: inventoryStock.id,
          commissary_item_id: ingredient.commissary_item_id,
          required_quantity: ingredient.quantity,
          unit: ingredient.unit
        });
      }

      // Insert recipe ingredients
      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error('Error creating recipe ingredients:', ingredientsError);
          warnings.push(`Some recipe ingredients could not be linked: ${ingredientsError.message}`);
        }
      }

      // Insert product catalog ingredients
      if (productIngredientInserts.length > 0) {
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
    toast.error(`Failed to deploy to ${failCount} stores`, {
      description: "Check deployment results for error details"
    });
  }
  
  return results;
};
