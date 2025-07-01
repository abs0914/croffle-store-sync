
import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";
import { toast } from "sonner";

export interface DeploymentResult {
  storeId: string;
  storeName?: string;
  success: boolean;
  error?: string;
  recipeId?: string;
  warnings?: string[];
  missingIngredients?: string[];
}

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

    // Calculate recipe cost for product pricing
    const totalCost = template.ingredients.reduce((sum, ingredient) => 
      sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
    );

    // Get current user for approval tracking
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User authentication required');
    }

    // Create the product in products table first (required for recipe foreign key)
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
        image_url: template.image_url // Include image from template
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
        price: totalCost * 1.5, // 50% markup as default
        store_id: storeId,
        is_available: true, // Immediately available since deployed by admin
        display_order: 0,
        image_url: template.image_url // Include image from template
      })
      .select()
      .single();

    if (catalogError) {
      console.error('Error creating product catalog entry:', catalogError);
      throw catalogError;
    }

    console.log(`Created product catalog entry with ID: ${catalogProduct.id}`);

    // Create the recipe with APPROVED status since it's deployed by admin
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size || 1,
        store_id: storeId,
        product_id: product.id, // Reference the products table entry
        category_name: template.category_name,
        approval_status: 'approved', // Auto-approve admin deployed recipes
        approved_by: user.id, // Set the admin as approver
        approved_at: new Date().toISOString(), // Set approval timestamp
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

    // Process ingredients - allow deployment even if some ingredients are missing
    const warnings: string[] = [];
    const missingIngredients: string[] = [];
    
    if (template.ingredients && template.ingredients.length > 0) {
      const ingredientInserts = [];
      const productIngredientInserts = [];

      for (const ingredient of template.ingredients) {
        // Try to find the corresponding inventory stock item in the target store
        const { data: inventoryStock, error: stockError } = await supabase
          .from('inventory_stock')
          .select('id')
          .eq('store_id', storeId)
          .eq('item', ingredient.commissary_item_name)
          .maybeSingle();

        if (stockError) {
          console.warn(`Error checking inventory for "${ingredient.commissary_item_name}":`, stockError);
          continue;
        }

        if (!inventoryStock) {
          console.warn(`Inventory item "${ingredient.commissary_item_name}" not found in store ${storeId} - skipping ingredient mapping`);
          missingIngredients.push(ingredient.commissary_item_name);
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

      // Insert recipe ingredients (only for found inventory items)
      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error('Error creating recipe ingredients:', ingredientsError);
          warnings.push(`Some recipe ingredients could not be linked: ${ingredientsError.message}`);
        }
      }

      // Insert product catalog ingredients (only for found inventory items)
      if (productIngredientInserts.length > 0) {
        const { error: productIngredientsError } = await supabase
          .from('product_ingredients')
          .insert(productIngredientInserts);

        if (productIngredientsError) {
          console.error('Error creating product ingredients:', productIngredientsError);
          warnings.push(`Some product ingredients could not be linked: ${productIngredientsError.message}`);
        }
      }

      // Add warnings about missing ingredients
      if (missingIngredients.length > 0) {
        warnings.push(`Missing inventory items: ${missingIngredients.join(', ')}`);
        warnings.push('These ingredients will need to be added to store inventory for accurate availability tracking');
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
        description: "Check deployment results for missing ingredient details"
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
