
import { supabase } from "@/integrations/supabase/client";
import { deductIngredientsForProduct } from "./ingredientDeductionService";
import { toast } from "sonner";

export interface InventoryValidationResult {
  isValid: boolean;
  insufficientItems: string[];
  availableQuantity?: number;
}

export interface AutoReorderResult {
  triggered: boolean;
  orderIds: string[];
  message: string;
}

export const validateProductAvailability = async (
  productId: string,
  quantity: number = 1
): Promise<InventoryValidationResult> => {
  try {
    console.log('Validating product availability:', { productId, quantity });
    
    // Get product ingredients
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select(`
        *,
        inventory_item:inventory_stock(*)
      `)
      .eq('product_catalog_id', productId);

    if (error) throw error;

    const insufficientItems: string[] = [];
    let minAvailableQuantity = Infinity;

    for (const ingredient of ingredients || []) {
      const requiredQuantity = ingredient.required_quantity * quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      
      const availableProducts = Math.floor(currentStock / ingredient.required_quantity);
      minAvailableQuantity = Math.min(minAvailableQuantity, availableProducts);

      if (currentStock < requiredQuantity) {
        insufficientItems.push(ingredient.inventory_item?.item || 'Unknown item');
      }
    }

    return {
      isValid: insufficientItems.length === 0,
      insufficientItems,
      availableQuantity: minAvailableQuantity === Infinity ? 0 : minAvailableQuantity
    };
  } catch (error) {
    console.error('Error validating product availability:', error);
    return {
      isValid: false,
      insufficientItems: ['Validation error occurred']
    };
  }
};

export const processProductSale = async (
  productId: string,
  quantity: number,
  transactionId: string,
  storeId: string
): Promise<boolean> => {
  try {
    console.log('Processing product sale:', { productId, quantity, transactionId, storeId });

    // First validate availability
    const validation = await validateProductAvailability(productId, quantity);
    if (!validation.isValid) {
      toast.error(`Insufficient stock: ${validation.insufficientItems.join(', ')}`);
      return false;
    }

    // Deduct ingredients
    const deductionSuccess = await deductIngredientsForProduct(productId, quantity, transactionId);
    if (!deductionSuccess) {
      return false;
    }

    // Auto-reorder system disabled - manual ordering through Order Management
    console.log('Product sale processed successfully - auto-reorder disabled');
    return true;
  } catch (error) {
    console.error('Error processing product sale:', error);
    toast.error('Failed to process product sale');
    return false;
  }
};

export const checkAndTriggerAutoReorder = async (storeId: string): Promise<AutoReorderResult> => {
  // Auto-reorder system disabled - use manual order management instead
  console.log('Auto-reorder disabled for store:', storeId);
  return {
    triggered: false,
    orderIds: [],
    message: 'Auto-reorder disabled - use Order Management for manual ordering'
  };
};

export const getInventoryStatus = async (storeId: string) => {
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
