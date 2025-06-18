import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";
import { toast } from "sonner";

export interface DeploymentResult {
  storeId: string;
  storeName?: string;
  success: boolean;
  error?: string;
  recipeId?: string;
}

export const deployRecipeToProductCatalog = async (
  template: RecipeTemplate,
  storeId: string
): Promise<DeploymentResult> => {
  try {
    console.log(`Deploying recipe template "${template.name}" to store ${storeId}`);

    // Calculate recipe cost for product pricing
    const totalCost = template.ingredients.reduce((sum, ingredient) => 
      sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
    );

    // First, create the recipe in the recipes table
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size || 1,
        store_id: storeId,
        product_id: null, // Set to null instead of empty string
        category_name: template.category_name,
        approval_status: 'pending_approval',
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

    // Create the product from the recipe template
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
        image_url: template.image_url // Transfer the image from template to product
      })
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      throw productError;
    }

    console.log(`Created product with ID: ${product.id}`);

    // Update the recipe with the product_id
    const { error: updateRecipeError } = await supabase
      .from('recipes')
      .update({ product_id: product.id })
      .eq('id', recipe.id);

    if (updateRecipeError) {
      console.error('Error updating recipe with product_id:', updateRecipeError);
      throw updateRecipeError;
    }

    // Then, create recipe ingredients
    if (template.ingredients && template.ingredients.length > 0) {
      const ingredientInserts = [];

      for (const ingredient of template.ingredients) {
        // Find the corresponding inventory stock item in the target store
        const { data: inventoryStock, error: stockError } = await supabase
          .from('inventory_stock')
          .select('id')
          .eq('store_id', storeId)
          .eq('item', ingredient.commissary_item_name)
          .single();

        if (stockError || !inventoryStock) {
          console.warn(`Inventory item "${ingredient.commissary_item_name}" not found in store ${storeId}`);
          continue;
        }

        ingredientInserts.push({
          recipe_id: recipe.id,
          inventory_stock_id: inventoryStock.id,
          commissary_item_id: ingredient.commissary_item_id,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit || 0
        });
      }

      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error('Error creating recipe ingredients:', ingredientsError);
          throw ingredientsError;
        }
      }
    }

    console.log(`Successfully deployed recipe template to store ${storeId}`);
    
    return {
      storeId,
      success: true,
      recipeId: recipe.id
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

  // Log summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`Deployment complete: ${successCount} successful, ${failCount} failed`);
  
  return results;
};
