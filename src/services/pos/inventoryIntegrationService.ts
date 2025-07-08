
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  processInventoryDeduction as unifiedProcessInventoryDeduction,
  processRecipeInventoryDeduction,
  checkRecipeAvailability as unifiedCheckRecipeAvailability,
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

    // Get product details - using correct table name
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        name,
        recipe_id
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
    if (product.recipe_id) {
      const availability = await unifiedCheckRecipeAvailability(product.recipe_id, quantity, storeId);
      
      return {
        isAvailable: availability.canMake,
        productName: product.name,
        availableQuantity: availability.availableQuantity,
        requiredQuantity: quantity,
        insufficientItems: availability.missingIngredients
      };
    }

    // For products without recipes, check direct inventory
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
export const processInventoryDeductionForPOS = async (
  updates: POSInventoryUpdate[]
): Promise<{ success: boolean; errors: string[] }> => {
  const errors: string[] = [];

  try {
    console.log('Processing POS inventory deduction:', updates);

    for (const update of updates) {
      try {
        // Get product details - using correct table name
        const { data: product, error: productError } = await supabase
          .from('products')
          .select(`
            name,
            recipe_id
          `)
          .eq('id', update.productId)
          .single();

        if (productError || !product) {
          errors.push(`Product not found: ${update.productId}`);
          continue;
        }

        // Process recipe-based deduction
        if (product.recipe_id) {
          const result = await processRecipeInventoryDeduction(
            product.recipe_id,
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
    console.error('Error in processInventoryDeductionForPOS:', error);
    errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, errors };
  }
};

export const checkAndTriggerAutoReorder = async (storeId: string): Promise<{
  triggered: boolean;
  orderIds: string[];
  message: string;
}> => {
  // Auto-reorder system disabled - use manual order management instead
  console.log('Auto-reorder disabled for store:', storeId);
  return {
    triggered: false,
    orderIds: [],
    message: 'Auto-reorder disabled - use Order Management for manual ordering'
  };
};

export const getPOSInventoryStatus = async (storeId: string) => {
  try {
    const { data: inventory, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;

    const totalItems = inventory?.length || 0;
    const lowStockItems = inventory?.filter(item => 
      item.stock_quantity <= (item.minimum_threshold || 10)
    ).length || 0;
    const outOfStockItems = inventory?.filter(item => 
      item.stock_quantity <= 0
    ).length || 0;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      healthyItems: totalItems - lowStockItems
    };
  } catch (error) {
    console.error('Error getting inventory status:', error);
    return {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      healthyItems: 0
    };
  }
};
