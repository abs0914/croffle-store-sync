
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryDeductionItem {
  inventory_stock_id: string;
  quantity_needed: number;
  unit: string;
  item_name: string;
  recipe_ingredient_name?: string;
  conversion_factor?: number;
}

export interface InventoryDeductionRequest {
  store_id: string;
  items: InventoryDeductionItem[];
  transaction_id?: string;
  transaction_type: 'sale' | 'recipe_usage' | 'conversion' | 'adjustment' | 'transfer_out';
  user_id: string;
  notes?: string;
  reference_type?: string;
  reference_id?: string;
}

export interface InventoryDeductionResult {
  success: boolean;
  deductions: {
    inventory_stock_id: string;
    item_name: string;
    quantity_deducted: number;
    previous_stock: number;
    new_stock: number;
    fractional_stock?: number;
  }[];
  errors: string[];
  insufficient_items: string[];
}

/**
 * Unified inventory deduction service
 * Handles all types of inventory deductions in one place
 */
export const processInventoryDeduction = async (
  request: InventoryDeductionRequest
): Promise<InventoryDeductionResult> => {
  const result: InventoryDeductionResult = {
    success: false,
    deductions: [],
    errors: [],
    insufficient_items: []
  };

  try {
    console.log('Processing unified inventory deduction:', request);

    // First, validate all items have sufficient stock
    const validationResult = await validateInventoryAvailability(request.items, request.store_id);
    if (!validationResult.success) {
      result.errors = validationResult.errors;
      result.insufficient_items = validationResult.insufficient_items;
      return result;
    }

    // Process each deduction
    for (const item of request.items) {
      try {
        const deductionResult = await deductSingleItem(item, request);
        if (deductionResult.success) {
          result.deductions.push(deductionResult.deduction);
        } else {
          result.errors.push(deductionResult.error || `Failed to deduct ${item.item_name}`);
        }
      } catch (error) {
        console.error(`Error deducting item ${item.item_name}:`, error);
        result.errors.push(`Failed to deduct ${item.item_name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.success = result.errors.length === 0;
    
    if (result.success) {
      console.log('All inventory deductions completed successfully');
    } else {
      console.error('Some inventory deductions failed:', result.errors);
    }

    return result;

  } catch (error) {
    console.error('Error in processInventoryDeduction:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Validate that all items have sufficient stock
 */
const validateInventoryAvailability = async (
  items: InventoryDeductionItem[],
  storeId: string
): Promise<{ success: boolean; errors: string[]; insufficient_items: string[] }> => {
  const errors: string[] = [];
  const insufficient_items: string[] = [];

  try {
    for (const item of items) {
      const { data: inventoryStock, error } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, fractional_stock, item')
        .eq('id', item.inventory_stock_id)
        .eq('store_id', storeId)
        .single();

      if (error || !inventoryStock) {
        errors.push(`Inventory item not found: ${item.item_name}`);
        continue;
      }

      const totalStock = inventoryStock.stock_quantity + (inventoryStock.fractional_stock || 0);
      
      if (totalStock < item.quantity_needed) {
        insufficient_items.push(
          `${item.item_name}: Required ${item.quantity_needed} ${item.unit}, Available ${totalStock}`
        );
      }
    }

    return {
      success: errors.length === 0 && insufficient_items.length === 0,
      errors,
      insufficient_items
    };

  } catch (error) {
    console.error('Error validating inventory availability:', error);
    return {
      success: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      insufficient_items: []
    };
  }
};

/**
 * Deduct a single inventory item
 */
const deductSingleItem = async (
  item: InventoryDeductionItem,
  request: InventoryDeductionRequest
): Promise<{
  success: boolean;
  deduction?: InventoryDeductionResult['deductions'][0];
  error?: string;
}> => {
  try {
    // Get current stock
    const { data: currentStock, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, fractional_stock, item')
      .eq('id', item.inventory_stock_id)
      .eq('store_id', request.store_id)
      .single();

    if (fetchError || !currentStock) {
      return { success: false, error: `Inventory item not found: ${item.item_name}` };
    }

    const previousWholeStock = currentStock.stock_quantity;
    const previousFractionalStock = currentStock.fractional_stock || 0;
    const totalPreviousStock = previousWholeStock + previousFractionalStock;

    // Calculate new stock levels
    const newTotalStock = totalPreviousStock - item.quantity_needed;
    const newWholeStock = Math.floor(newTotalStock);
    const newFractionalStock = newTotalStock - newWholeStock;

    // Update inventory stock
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({
        stock_quantity: newWholeStock,
        fractional_stock: newFractionalStock > 0 ? newFractionalStock : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.inventory_stock_id)
      .eq('store_id', request.store_id);

    if (updateError) {
      return { success: false, error: `Failed to update stock for ${item.item_name}: ${updateError.message}` };
    }

    // Log the transaction
    await logInventoryTransaction({
      store_id: request.store_id,
      inventory_stock_id: item.inventory_stock_id,
      transaction_type: request.transaction_type,
      quantity_change: item.quantity_needed,
      previous_quantity: totalPreviousStock,
      new_quantity: newTotalStock,
      user_id: request.user_id,
      transaction_id: request.transaction_id,
      reference_type: request.reference_type,
      reference_id: request.reference_id,
      notes: request.notes || `${request.transaction_type}: ${item.item_name}`
    });

    return {
      success: true,
      deduction: {
        inventory_stock_id: item.inventory_stock_id,
        item_name: item.item_name,
        quantity_deducted: item.quantity_needed,
        previous_stock: totalPreviousStock,
        new_stock: newTotalStock,
        fractional_stock: newFractionalStock > 0 ? newFractionalStock : undefined
      }
    };

  } catch (error) {
    console.error(`Error deducting single item ${item.item_name}:`, error);
    return { 
      success: false, 
      error: `Failed to deduct ${item.item_name}: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

/**
 * Log inventory transaction
 */
const logInventoryTransaction = async (params: {
  store_id: string;
  inventory_stock_id: string;
  transaction_type: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  user_id: string;
  transaction_id?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}): Promise<void> => {
  try {
    // Log to inventory_transactions table
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        store_id: params.store_id,
        product_id: params.inventory_stock_id,
        transaction_type: params.transaction_type,
        quantity: params.quantity_change,
        previous_quantity: params.previous_quantity,
        new_quantity: params.new_quantity,
        created_by: params.user_id,
        reference_id: params.transaction_id,
        notes: params.notes
      });

    if (transactionError) {
      console.warn('Failed to log inventory transaction:', transactionError);
    }

    // Log to inventory_movements table if exists
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        inventory_stock_id: params.inventory_stock_id,
        movement_type: params.transaction_type as any,
        quantity_change: -params.quantity_change,
        previous_quantity: Math.floor(params.previous_quantity),
        new_quantity: Math.floor(params.new_quantity),
        created_by: params.user_id,
        reference_type: params.reference_type,
        reference_id: params.reference_id,
        notes: params.notes
      });

    if (movementError) {
      console.warn('Failed to log inventory movement:', movementError);
    }

  } catch (error) {
    console.warn('Error logging inventory transaction:', error);
  }
};

/**
 * Get recipe-based inventory deduction requirements
 */
export const getRecipeInventoryRequirements = async (
  recipeId: string,
  quantity: number,
  storeId: string
): Promise<InventoryDeductionItem[]> => {
  try {
    console.log('Getting recipe inventory requirements:', { recipeId, quantity, storeId });

    // Get recipe ingredients with conversion mappings
    const { data: ingredients, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        inventory_conversion_mappings!inner(
          inventory_stock_id,
          conversion_factor
        )
      `)
      .eq('recipe_id', recipeId);

    if (error) {
      console.error('Error fetching recipe ingredients:', error);
      return [];
    }

    const requirements: InventoryDeductionItem[] = [];

    for (const ingredient of ingredients || []) {
      // Handle mapping data
      let mappingData = ingredient.inventory_conversion_mappings;
      if (Array.isArray(mappingData)) {
        mappingData = mappingData[0];
      }

      if (mappingData && mappingData.inventory_stock_id && mappingData.conversion_factor) {
        // Calculate required quantity from bulk inventory
        const recipeQuantityNeeded = ingredient.quantity * quantity;
        const bulkQuantityNeeded = recipeQuantityNeeded / mappingData.conversion_factor;

        // Get inventory item details
        const { data: inventoryItem } = await supabase
          .from('inventory_stock')
          .select('item, unit')
          .eq('id', mappingData.inventory_stock_id)
          .eq('store_id', storeId)
          .single();

        if (inventoryItem) {
          requirements.push({
            inventory_stock_id: mappingData.inventory_stock_id,
            quantity_needed: bulkQuantityNeeded,
            unit: inventoryItem.unit,
            item_name: inventoryItem.item,
            recipe_ingredient_name: ingredient.ingredient_name || inventoryItem.item,
            conversion_factor: mappingData.conversion_factor
          });
        }
      }
    }

    return requirements;

  } catch (error) {
    console.error('Error getting recipe inventory requirements:', error);
    return [];
  }
};

/**
 * Process recipe-based inventory deduction
 */
export const processRecipeInventoryDeduction = async (
  recipeId: string,
  quantity: number,
  storeId: string,
  userId: string,
  transactionId?: string,
  notes?: string
): Promise<InventoryDeductionResult> => {
  try {
    console.log('Processing recipe inventory deduction:', { recipeId, quantity, storeId });

    const requirements = await getRecipeInventoryRequirements(recipeId, quantity, storeId);
    
    if (requirements.length === 0) {
      console.warn('No inventory requirements found for recipe:', recipeId);
      return {
        success: true,
        deductions: [],
        errors: [],
        insufficient_items: []
      };
    }

    const deductionRequest: InventoryDeductionRequest = {
      store_id: storeId,
      items: requirements,
      transaction_id: transactionId,
      transaction_type: 'recipe_usage',
      user_id: userId,
      notes: notes || `Recipe usage: ${quantity} units`,
      reference_type: 'recipe',
      reference_id: recipeId
    };

    return await processInventoryDeduction(deductionRequest);

  } catch (error) {
    console.error('Error processing recipe inventory deduction:', error);
    return {
      success: false,
      deductions: [],
      errors: [`Failed to process recipe deduction: ${error instanceof Error ? error.message : 'Unknown error'}`],
      insufficient_items: []
    };
  }
};

/**
 * Check recipe availability
 */
export const checkRecipeAvailability = async (
  recipeId: string,
  quantityNeeded: number,
  storeId: string
): Promise<{
  canMake: boolean;
  maxQuantity: number;
  missingIngredients: string[];
  availableQuantity: number;
}> => {
  try {
    const requirements = await getRecipeInventoryRequirements(recipeId, 1, storeId);
    
    if (requirements.length === 0) {
      return {
        canMake: false,
        maxQuantity: 0,
        missingIngredients: ['No ingredients defined'],
        availableQuantity: 0
      };
    }

    const validation = await validateInventoryAvailability(requirements, storeId);
    let maxQuantity = Infinity;
    const missingIngredients: string[] = [];

    // Calculate max possible quantity based on available stock
    for (const item of requirements) {
      const { data: stock } = await supabase
        .from('inventory_stock')
        .select('stock_quantity, fractional_stock')
        .eq('id', item.inventory_stock_id)
        .eq('store_id', storeId)
        .single();

      if (stock) {
        const totalStock = stock.stock_quantity + (stock.fractional_stock || 0);
        const possibleQuantity = Math.floor(totalStock / item.quantity_needed);
        maxQuantity = Math.min(maxQuantity, possibleQuantity);
        
        if (totalStock < item.quantity_needed * quantityNeeded) {
          missingIngredients.push(item.item_name);
        }
      } else {
        missingIngredients.push(item.item_name);
        maxQuantity = 0;
      }
    }

    return {
      canMake: validation.success && maxQuantity >= quantityNeeded,
      maxQuantity: maxQuantity === Infinity ? 0 : maxQuantity,
      missingIngredients,
      availableQuantity: maxQuantity === Infinity ? 0 : maxQuantity
    };

  } catch (error) {
    console.error('Error checking recipe availability:', error);
    return {
      canMake: false,
      maxQuantity: 0,
      missingIngredients: ['System error'],
      availableQuantity: 0
    };
  }
};
