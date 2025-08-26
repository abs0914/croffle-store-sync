import { supabase } from "@/integrations/supabase/client";
import { ProductStatus } from "./types";
import { toast } from "sonner";

export interface AvailabilityCheckResult {
  productId: string;
  productName: string;
  currentStatus: ProductStatus;
  suggestedStatus: ProductStatus;
  reason: string;
  canMake: boolean;
  maxQuantity: number;
  insufficientIngredients: string[];
}

/**
 * Check if a product can be made based on its recipe ingredients
 */
export const checkProductAvailabilityByRecipe = async (
  productId: string,
  storeId: string
): Promise<AvailabilityCheckResult | null> => {
  try {
    // Get product with recipe information
    const { data: product, error: productError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        product_status,
        is_available,
        recipe_id,
        ingredients:product_ingredients(
          *,
          inventory_item:inventory_stock(*)
        )
      `)
      .eq('id', productId)
      .eq('store_id', storeId)
      .single();

    if (productError || !product) {
      console.error('Error fetching product:', productError);
      return null;
    }

    // If no recipe or ingredients, assume it's always available
    if (!product.recipe_id && (!product.ingredients || product.ingredients.length === 0)) {
      return {
        productId: product.id,
        productName: product.product_name,
        currentStatus: (product.product_status || (product.is_available ? 'available' : 'out_of_stock')) as any,
        suggestedStatus: 'available',
        reason: 'No recipe dependencies',
        canMake: true,
        maxQuantity: Infinity,
        insufficientIngredients: []
      };
    }

    let canMake = true;
    let maxQuantity = Infinity;
    const insufficientIngredients: string[] = [];

    // Check each ingredient availability
    if (product.ingredients && product.ingredients.length > 0) {
      for (const ingredient of product.ingredients) {
        if (ingredient.inventory_item) {
          const availableStock = ingredient.inventory_item.stock_quantity || 0;
          const requiredQuantity = ingredient.required_quantity || 0;
          
          if (availableStock < requiredQuantity) {
            canMake = false;
            insufficientIngredients.push(ingredient.inventory_item.item);
          } else if (requiredQuantity > 0) {
            const possibleQuantity = Math.floor(availableStock / requiredQuantity);
            maxQuantity = Math.min(maxQuantity, possibleQuantity);
          }
        }
      }
    }

    // Determine suggested status
    let suggestedStatus: ProductStatus;
    let reason: string;

    if (!canMake) {
      suggestedStatus = 'out_of_stock';
      reason = `Insufficient ingredients: ${insufficientIngredients.join(', ')}`;
    } else if (maxQuantity < 5) {
      suggestedStatus = 'available'; // Still available but low stock
      reason = `Low stock: can make ${maxQuantity} units`;
    } else {
      suggestedStatus = 'available';
      reason = `Sufficient ingredients available`;
    }

    return {
      productId: product.id,
      productName: product.product_name,
      currentStatus: (product.product_status || (product.is_available ? 'available' : 'out_of_stock')) as any,
      suggestedStatus,
      reason,
      canMake,
      maxQuantity: maxQuantity === Infinity ? 999 : maxQuantity,
      insufficientIngredients
    };

  } catch (error) {
    console.error('Error checking product availability:', error);
    return null;
  }
};

/**
 * Update product availability based on inventory levels
 */
export const updateProductAvailabilityBasedOnStock = async (
  productId: string,
  storeId: string,
  autoUpdate: boolean = false
): Promise<boolean> => {
  try {
    const availabilityCheck = await checkProductAvailabilityByRecipe(productId, storeId);
    
    if (!availabilityCheck) {
      return false;
    }

    const { currentStatus, suggestedStatus, canMake } = availabilityCheck;

    // Only update if status should change
    if (currentStatus !== suggestedStatus || (currentStatus === 'available' && !canMake)) {
      const { error } = await supabase
        .from('product_catalog')
        .update({
          product_status: suggestedStatus,
          is_available: canMake
        })
        .eq('id', productId);

      if (error) {
        console.error('Error updating product availability:', error);
        return false;
      }

      if (!autoUpdate) {
        toast.info(`Product availability updated`, {
          description: `${availabilityCheck.productName}: ${availabilityCheck.reason}`
        });
      }

      return true;
    }

    return false; // No update needed
  } catch (error) {
    console.error('Error updating product availability:', error);
    return false;
  }
};

/**
 * Check and update availability for all products in a store
 */
export const updateAllProductsAvailability = async (
  storeId: string,
  autoUpdate: boolean = true
): Promise<{
  totalChecked: number;
  totalUpdated: number;
  results: AvailabilityCheckResult[];
}> => {
  try {
    // Get all products for the store
    const { data: products, error } = await supabase
      .from('product_catalog')
      .select('id, product_name')
      .eq('store_id', storeId)
      .eq('is_available', true);

    if (error) {
      console.error('Error fetching products:', error);
      return { totalChecked: 0, totalUpdated: 0, results: [] };
    }

    const results: AvailabilityCheckResult[] = [];
    let totalUpdated = 0;

    // Check each product
    for (const product of products || []) {
      const availabilityCheck = await checkProductAvailabilityByRecipe(product.id, storeId);
      
      if (availabilityCheck) {
        results.push(availabilityCheck);
        
        // Update if needed
        const updated = await updateProductAvailabilityBasedOnStock(product.id, storeId, autoUpdate);
        if (updated) {
          totalUpdated++;
        }
      }
    }

    if (!autoUpdate && totalUpdated > 0) {
      toast.success(`Updated availability for ${totalUpdated} products`);
    }

    return {
      totalChecked: products?.length || 0,
      totalUpdated,
      results
    };

  } catch (error) {
    console.error('Error updating all products availability:', error);
    return { totalChecked: 0, totalUpdated: 0, results: [] };
  }
};

/**
 * Set up automatic availability monitoring
 */
export const setupAutomaticAvailabilityMonitoring = (storeId: string) => {
  // Check availability every 5 minutes
  const interval = setInterval(async () => {
    console.log(`Running automatic availability check for store: ${storeId}`);
    await updateAllProductsAvailability(storeId, true);
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
};
