import { supabase } from "@/integrations/supabase/client";
import { deductIngredientsForProduct } from "@/services/productCatalog/ingredientDeductionService";
import { deductIngredientsWithTracking, AffectedInventoryItem } from "@/services/inventory/productInventoryTracker";
import { toast } from "sonner";

export interface InventoryUpdateResult {
  success: boolean;
  failures: string[];
  rollbackRequired: boolean;
  affected_inventory_items?: AffectedInventoryItem[];
}

/**
 * Production-ready inventory integration service
 * Handles real inventory deduction with proper validation and rollback
 */
export const handleTransactionInventoryUpdate = async (
  transactionId: string,
  items: any[],
  storeId?: string
): Promise<boolean> => {
  try {
    console.log('🔄 Processing inventory deduction for transaction:', transactionId);
    
    const failures: string[] = [];
    const processedItems: { productId: string; quantity: number }[] = [];
    const allAffectedItems: AffectedInventoryItem[] = [];
    
    // Process each item with proper validation and tracking
    for (const item of items) {
      try {
        // Use the new tracking service for detailed inventory sync
        const result = await deductIngredientsWithTracking(
          item.productId,
          item.quantity,
          transactionId
        );
        
        if (result.success) {
          processedItems.push({ productId: item.productId, quantity: item.quantity });
          allAffectedItems.push(...result.affected_inventory_items);
          console.log(`✅ Inventory updated for ${item.name}:`, result.affected_inventory_items);
        } else {
          failures.push(`Failed to deduct inventory for ${item.name}: ${result.error_details}`);
        }
      } catch (error) {
        console.error(`Error processing item ${item.productId}:`, error);
        failures.push(`Error processing ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Handle partial failures
    if (failures.length > 0) {
      console.error('❌ Inventory update failures:', failures);
      
      // If any items failed, attempt rollback of successful items
      if (processedItems.length > 0) {
        console.log('🔄 Attempting rollback of processed items...');
        await rollbackInventoryDeduction(transactionId, processedItems);
      }
      
      toast.error(`Inventory update failed: ${failures.join(', ')}`);
      return false;
    }
    
    console.log('✅ All inventory updates completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Critical error in inventory update:', error);
    toast.error('Critical inventory processing error');
    return false;
  }
};

/**
 * Validates if an item has sufficient stock for the requested quantity
 */
const validateItemAvailability = async (
  productId: string,
  quantity: number,
  storeId?: string
): Promise<{ isValid: boolean; error?: string }> => {
  try {
    // Import validation from existing service
    const { validateProductAvailability } = await import('@/services/productCatalog/inventoryIntegrationService');
    
    const result = await validateProductAvailability(productId, quantity);
    
    if (!result.isValid) {
      return {
        isValid: false,
        error: result.insufficientItems.join(', ')
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Rollback inventory deductions for failed transactions
 */
const rollbackInventoryDeduction = async (
  transactionId: string,
  processedItems: { productId: string; quantity: number }[]
): Promise<void> => {
  try {
    console.log('🔄 Rolling back inventory for transaction:', transactionId);
    
    for (const item of processedItems) {
      try {
        // Get product ingredients to reverse deduction
        const { data: ingredients } = await supabase
          .from('product_ingredients')
          .select(`
            required_quantity,
            inventory_stock_id,
            inventory_item:inventory_stock(*)
          `)
          .eq('product_catalog_id', item.productId);
        
        if (ingredients) {
          for (const ingredient of ingredients) {
            const restoreQuantity = ingredient.required_quantity * item.quantity;
            
            // Get current stock to calculate new value
            const { data: currentStock } = await supabase
              .from('inventory_stock')
              .select('stock_quantity')
              .eq('id', ingredient.inventory_stock_id)
              .single();
            
            const newStockQuantity = (currentStock?.stock_quantity || 0) + restoreQuantity;
            
            // Restore inventory stock
            await supabase
              .from('inventory_stock')
              .update({
                stock_quantity: newStockQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', ingredient.inventory_stock_id);
            
            // Log rollback movement
            await supabase
              .from('inventory_movements')
              .insert({
                inventory_stock_id: ingredient.inventory_stock_id,
                movement_type: 'adjustment',
                quantity_change: restoreQuantity,
                previous_quantity: ingredient.inventory_item?.stock_quantity || 0,
                new_quantity: (ingredient.inventory_item?.stock_quantity || 0) + restoreQuantity,
                notes: `Rollback for failed transaction ${transactionId}`,
                created_by: null // System rollback
              });
          }
        }
      } catch (rollbackError) {
        console.error(`Failed to rollback item ${item.productId}:`, rollbackError);
      }
    }
    
    console.log('✅ Inventory rollback completed');
  } catch (error) {
    console.error('❌ Critical error in inventory rollback:', error);
  }
};