
import { supabase } from "@/integrations/supabase/client";
import { RecipeTemplate } from "./types";
import { toast } from "sonner";

export interface RecipeDeploymentResult {
  storeId: string;
  success: boolean;
  productId?: string;
  error?: string;
}

export const deployRecipeToProductCatalog = async (
  template: RecipeTemplate,
  storeId: string,
  pricing?: { price: number; markup?: number }
): Promise<RecipeDeploymentResult> => {
  try {
    // Calculate base cost from ingredients
    const totalCost = template.ingredients.reduce((sum, ingredient) => 
      sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
    );

    // Calculate price (use provided price or apply markup)
    const productPrice = pricing?.price || (totalCost * (pricing?.markup || 1.5));

    // Create product in catalog
    const { data: product, error: productError } = await supabase
      .from('product_catalog')
      .insert({
        store_id: storeId,
        recipe_id: null, // Will be linked after recipe creation
        product_name: template.name,
        description: template.description,
        price: productPrice,
        is_available: false, // Start as unavailable until ingredients are mapped
        display_order: 0
      })
      .select()
      .single();

    if (productError) throw productError;

    // Create recipe for the store
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size,
        store_id: storeId,
        product_id: product.id,
        category_name: template.category_name,
        is_active: true,
        approval_status: 'pending_approval',
        version: 1
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Link recipe to product
    await supabase
      .from('product_catalog')
      .update({ recipe_id: recipe.id })
      .eq('id', product.id);

    // Create recipe ingredients and map to store inventory
    const ingredientInserts = [];
    const productIngredientInserts = [];

    for (const ingredient of template.ingredients) {
      // Find or create inventory stock item for this store
      let { data: inventoryItem, error: inventoryFindError } = await supabase
        .from('inventory_stock')
        .select('id')
        .eq('store_id', storeId)
        .eq('item', ingredient.commissary_item_name)
        .maybeSingle();

      if (!inventoryItem) {
        // Create inventory stock item
        const { data: newInventoryItem, error: inventoryCreateError } = await supabase
          .from('inventory_stock')
          .insert({
            store_id: storeId,
            item: ingredient.commissary_item_name,
            unit: ingredient.unit,
            stock_quantity: 0,
            cost: ingredient.cost_per_unit || 0,
            is_active: true,
            minimum_threshold: 10,
            maximum_capacity: 1000
          })
          .select()
          .single();

        if (inventoryCreateError) throw inventoryCreateError;
        inventoryItem = newInventoryItem;
      }

      // Add recipe ingredient
      ingredientInserts.push({
        recipe_id: recipe.id,
        inventory_stock_id: inventoryItem.id,
        commissary_item_id: ingredient.commissary_item_id,
        quantity: ingredient.quantity,
        unit: ingredient.unit as any,
        cost_per_unit: ingredient.cost_per_unit || 0
      });

      // Add product ingredient mapping
      productIngredientInserts.push({
        product_catalog_id: product.id,
        inventory_stock_id: inventoryItem.id,
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

      if (ingredientsError) throw ingredientsError;
    }

    // Insert product ingredients
    if (productIngredientInserts.length > 0) {
      const { error: productIngredientsError } = await supabase
        .from('product_ingredients')
        .insert(productIngredientInserts);

      if (productIngredientsError) throw productIngredientsError;
    }

    return {
      storeId,
      success: true,
      productId: product.id
    };

  } catch (error) {
    console.error(`Error deploying recipe to store ${storeId}:`, error);
    return {
      storeId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const deployRecipeToMultipleStores = async (
  template: RecipeTemplate,
  storeIds: string[],
  pricing?: { price: number; markup?: number }
): Promise<RecipeDeploymentResult[]> => {
  const results: RecipeDeploymentResult[] = [];

  for (const storeId of storeIds) {
    const result = await deployRecipeToProductCatalog(template, storeId, pricing);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  if (successCount > 0) {
    toast.success(`Recipe deployed to ${successCount} store${successCount !== 1 ? 's' : ''} (pending approval)`);
  }

  if (failCount > 0) {
    toast.error(`Failed to deploy to ${failCount} store${failCount !== 1 ? 's' : ''}`);
  }

  return results;
};
