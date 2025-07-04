
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

    // Check for auto-reorder triggers
    const reorderResult = await checkAndTriggerAutoReorder(storeId);
    if (reorderResult.triggered) {
      console.log('Auto-reorder triggered:', reorderResult.message);
      toast.info(reorderResult.message);
    }

    return true;
  } catch (error) {
    console.error('Error processing product sale:', error);
    toast.error('Failed to process product sale');
    return false;
  }
};

export const checkAndTriggerAutoReorder = async (storeId: string): Promise<AutoReorderResult> => {
  try {
    console.log('Checking auto-reorder triggers for store:', storeId);

    // Get items below minimum threshold using proper SQL query
    const { data: lowStockItems, error } = await supabase
      .rpc('get_low_stock_items', { 
        store_id_param: storeId 
      });

    if (error) throw error;

    if (!lowStockItems || lowStockItems.length === 0) {
      return {
        triggered: false,
        orderIds: [],
        message: 'No auto-reorder needed'
      };
    }

    // Generate order number
    const orderNumber = `AUTO-${Date.now()}`;

    // Create stock order for low stock items
    const { data: stockOrder, error: orderError } = await supabase
      .from('stock_orders')
      .insert({
        store_id: storeId,
        status: 'requested',
        notes: 'Auto-generated order for low stock items',
        order_number: orderNumber,
        requested_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Add items to the order
    const orderItems = lowStockItems.map(item => ({
      stock_order_id: stockOrder.id,
      inventory_stock_id: item.id,
      requested_quantity: (item.maximum_capacity || 100) - item.stock_quantity,
      notes: `Auto-reorder: Current stock ${item.stock_quantity}, Threshold ${item.minimum_threshold}`
    }));

    const { error: itemsError } = await supabase
      .from('stock_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return {
      triggered: true,
      orderIds: [stockOrder.id],
      message: `Auto-reorder created for ${lowStockItems.length} low stock items`
    };
  } catch (error) {
    console.error('Error checking auto-reorder:', error);
    return {
      triggered: false,
      orderIds: [],
      message: 'Auto-reorder check failed'
    };
  }
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
