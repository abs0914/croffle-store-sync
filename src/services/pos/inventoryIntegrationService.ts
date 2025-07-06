
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  processInventoryDeduction,
  processRecipeInventoryDeduction,
  checkRecipeAvailability,
  InventoryDeductionItem
} from "@/services/inventory/unifiedInventoryDeductionService";

export interface InventoryCheckResult {
  isAvailable: boolean;
  productName: string;
  availableQuantity: number;
  requiredQuantity: number;
  insufficientItems?: string[];
}

export interface POSInventoryUpdate {
  productId: string;
  variationId?: string;
  quantitySold: number;
  transactionId: string;
  storeId: string;
}

/**
 * Check product inventory availability for POS
 */
export const checkProductInventoryAvailability = async (
  productId: string,
  quantity: number,
  storeId: string,
  variationId?: string
): Promise<InventoryCheckResult> => {
  try {
    console.log('Checking product inventory availability:', { productId, quantity, storeId, variationId });

    // Get product details and recipe
    const { data: product, error: productError } = await supabase
      .from('product_catalog')
      .select(`
        name,
        recipes(id)
      `)
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return {
        isAvailable: false,
        productName: 'Unknown Product',
        availableQuantity: 0,
        requiredQuantity: quantity,
        insufficientItems: ['Product not found']
      };
    }

    // If product has a recipe, check recipe availability
    if (product.recipes && product.recipes.length > 0) {
      const recipeId = product.recipes[0].id;
      const availability = await checkRecipeAvailability(recipeId, quantity, storeId);
      
      return {
        isAvailable: availability.canMake,
        productName: product.name,
        availableQuantity: availability.availableQuantity,
        requiredQuantity: quantity,
        insufficientItems: availability.missingIngredients
      };
    }

    // For products without recipes, check direct inventory
    // This would require product-inventory mapping (future enhancement)
    console.warn('Product has no recipe - direct inventory checking not implemented yet');
    
    return {
      isAvailable: true, // Allow for now
      productName: product.name,
      availableQuantity: quantity,
      requiredQuantity: quantity
    };

  } catch (error) {
    console.error('Error checking product inventory availability:', error);
    return {
      isAvailable: false,
      productName: 'Unknown Product',
      availableQuantity: 0,
      requiredQuantity: quantity,
      insufficientItems: ['System error during availability check']
    };
  }
};

/**
 * Process inventory deduction for POS sales
 */
export const processInventoryDeduction = async (
  updates: POSInventoryUpdate[]
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    console.log('Processing POS inventory deduction:', updates);

    for (const update of updates) {
      try {
        // Get product recipe
        const { data: product, error: productError } = await supabase
          .from('product_catalog')
          .select(`
            name,
            recipes(id)
          `)
          .eq('id', update.productId)
          .single();

        if (productError || !product) {
          errors.push(`Product not found: ${update.productId}`);
          continue;
        }

        // Process recipe-based deduction
        if (product.recipes && product.recipes.length > 0) {
          const recipeId = product.recipes[0].id;
          const result = await processRecipeInventoryDeduction(
            recipeId,
            update.quantitySold,
            update.storeId,
            (await supabase.auth.getUser()).data.user?.id || '',
            update.transactionId,
            `POS Sale: ${product.name} (${update.quantitySold} units)`
          );

          if (!result.success) {
            errors.push(...result.errors);
          }
        }
        // For products without recipes, skip for now (future enhancement)

      } catch (error) {
        console.error(`Error processing inventory for product ${update.productId}:`, error);
        errors.push(`Failed to process ${update.productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const success = errors.length === 0;
    
    if (success) {
      console.log('All POS inventory deductions completed successfully');
    } else {
      console.error('Some POS inventory deductions failed:', errors);
    }

    return { success, errors };

  } catch (error) {
    console.error('Error in processInventoryDeduction:', error);
    errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors };
  }
};
