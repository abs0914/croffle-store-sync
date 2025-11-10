/**
 * PRODUCT-RECIPE LINKAGE REPAIR SERVICE
 * 
 * Fixes critical sync issues between products and recipes tables
 * This is a production emergency fix for the Crushed Oreo inventory deduction issue
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LinkageRepairResult {
  success: boolean;
  productsLinked: number;
  recipesLinked: number;
  errors: string[];
  details: {
    productName: string;
    storeId: string;
    productId: string;
    recipeId: string;
    action: 'linked' | 'already_linked' | 'failed';
  }[];
}

/**
 * Repair product-recipe linkage for all stores
 * Links products.recipe_id to recipes.id and recipes.product_id to products.id
 */
export async function repairProductRecipeLinkage(
  storeId?: string,
  productName?: string
): Promise<LinkageRepairResult> {
  console.log('🔧 [REPAIR] Starting product-recipe linkage repair', { storeId, productName });
  
  const result: LinkageRepairResult = {
    success: true,
    productsLinked: 0,
    recipesLinked: 0,
    errors: [],
    details: []
  };

  try {
    // Step 1: Find all unlinked products with matching recipes
    let productQuery = supabase
      .from('products')
      .select('id, name, store_id, recipe_id')
      .eq('product_type', 'recipe')
      .is('recipe_id', null);
    
    if (storeId) {
      productQuery = productQuery.eq('store_id', storeId);
    }
    
    if (productName) {
      productQuery = productQuery.ilike('name', `%${productName}%`);
    }

    const { data: unlinkedProducts, error: productsError } = await productQuery;

    if (productsError) {
      result.errors.push(`Failed to fetch products: ${productsError.message}`);
      result.success = false;
      return result;
    }

    console.log(`📋 [REPAIR] Found ${unlinkedProducts?.length || 0} unlinked products`);

    // Step 2: For each unlinked product, find matching recipe and link them
    for (const product of unlinkedProducts || []) {
      try {
        // Find matching recipe by name and store
        const { data: matchingRecipes, error: recipeError } = await supabase
          .from('recipes')
          .select('id, name, product_id')
          .eq('store_id', product.store_id)
          .ilike('name', product.name)
          .limit(1);

        if (recipeError) {
          result.errors.push(`Failed to find recipe for ${product.name}: ${recipeError.message}`);
          result.details.push({
            productName: product.name,
            storeId: product.store_id,
            productId: product.id,
            recipeId: '',
            action: 'failed'
          });
          continue;
        }

        if (!matchingRecipes || matchingRecipes.length === 0) {
          console.warn(`⚠️ [REPAIR] No matching recipe found for ${product.name} in store ${product.store_id}`);
          result.errors.push(`No recipe found for product: ${product.name}`);
          result.details.push({
            productName: product.name,
            storeId: product.store_id,
            productId: product.id,
            recipeId: '',
            action: 'failed'
          });
          continue;
        }

        const recipe = matchingRecipes[0];

        // Link product to recipe
        const { error: updateProductError } = await supabase
          .from('products')
          .update({ recipe_id: recipe.id })
          .eq('id', product.id);

        if (updateProductError) {
          result.errors.push(`Failed to link product ${product.name}: ${updateProductError.message}`);
          result.details.push({
            productName: product.name,
            storeId: product.store_id,
            productId: product.id,
            recipeId: recipe.id,
            action: 'failed'
          });
          continue;
        }

        // Link recipe back to product (bi-directional)
        const { error: updateRecipeError } = await supabase
          .from('recipes')
          .update({ product_id: product.id })
          .eq('id', recipe.id);

        if (updateRecipeError) {
          console.warn(`⚠️ [REPAIR] Failed to link recipe back to product: ${updateRecipeError.message}`);
          // Don't fail - product link is more critical
        } else {
          result.recipesLinked++;
        }

        result.productsLinked++;
        result.details.push({
          productName: product.name,
          storeId: product.store_id,
          productId: product.id,
          recipeId: recipe.id,
          action: 'linked'
        });

        console.log(`✅ [REPAIR] Linked ${product.name}: product_id=${product.id} <-> recipe_id=${recipe.id}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing ${product.name}: ${errorMsg}`);
        result.details.push({
          productName: product.name,
          storeId: product.store_id,
          productId: product.id,
          recipeId: '',
          action: 'failed'
        });
      }
    }

    // Summary
    const totalProcessed = result.details.length;
    const successCount = result.productsLinked;
    const failedCount = totalProcessed - successCount;

    console.log(`🎉 [REPAIR] Complete: ${successCount}/${totalProcessed} products linked, ${failedCount} failed`);
    
    if (result.productsLinked > 0) {
      toast.success(`Repaired ${result.productsLinked} product-recipe links`);
    }
    
    if (result.errors.length > 0) {
      console.error('❌ [REPAIR] Errors:', result.errors);
      toast.error(`Repair completed with ${result.errors.length} errors`);
      result.success = false;
    }

    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Critical repair error: ${errorMsg}`);
    result.success = false;
    console.error('❌ [REPAIR] Critical error:', error);
    toast.error('Product repair failed');
    return result;
  }
}

/**
 * Quick fix for a specific product in a specific store
 */
export async function quickFixProduct(
  productName: string,
  storeId: string
): Promise<boolean> {
  console.log(`🚑 [QUICK FIX] Repairing ${productName} in store ${storeId}`);
  
  const result = await repairProductRecipeLinkage(storeId, productName);
  
  if (result.success && result.productsLinked > 0) {
    toast.success(`${productName} is now ready for sale`);
    return true;
  } else {
    toast.error(`Failed to repair ${productName}`);
    return false;
  }
}

/**
 * Verify product-recipe linkage health
 */
export async function verifyLinkageHealth(storeId?: string): Promise<{
  healthy: boolean;
  unlinkedProducts: number;
  unlinkedRecipes: number;
  details: string[];
}> {
  console.log('🔍 [HEALTH CHECK] Verifying product-recipe linkage');
  
  // Check for products without recipes
  let productQuery = supabase
    .from('products')
    .select('id, name, store_id', { count: 'exact' })
    .eq('product_type', 'recipe')
    .is('recipe_id', null);
  
  if (storeId) {
    productQuery = productQuery.eq('store_id', storeId);
  }
  
  const { count: unlinkedProducts, error: productError } = await productQuery;
  
  // Check for recipes without products
  let recipeQuery = supabase
    .from('recipes')
    .select('id, name, store_id', { count: 'exact' })
    .is('product_id', null);
  
  if (storeId) {
    recipeQuery = recipeQuery.eq('store_id', storeId);
  }
  
  const { count: unlinkedRecipes, error: recipeError } = await recipeQuery;
  
  const details: string[] = [];
  
  if (productError) {
    details.push(`Product check failed: ${productError.message}`);
  }
  
  if (recipeError) {
    details.push(`Recipe check failed: ${recipeError.message}`);
  }
  
  if (unlinkedProducts && unlinkedProducts > 0) {
    details.push(`${unlinkedProducts} products missing recipe links`);
  }
  
  if (unlinkedRecipes && unlinkedRecipes > 0) {
    details.push(`${unlinkedRecipes} recipes not linked to products`);
  }
  
  const healthy = (unlinkedProducts || 0) === 0 && (unlinkedRecipes || 0) === 0;
  
  console.log(`${healthy ? '✅' : '⚠️'} [HEALTH CHECK] Linkage health:`, {
    healthy,
    unlinkedProducts: unlinkedProducts || 0,
    unlinkedRecipes: unlinkedRecipes || 0
  });
  
  return {
    healthy,
    unlinkedProducts: unlinkedProducts || 0,
    unlinkedRecipes: unlinkedRecipes || 0,
    details
  };
}
