import { supabase } from "@/integrations/supabase/client";
import { GoodsReceivedNote, GRNItem } from "@/types/orderManagement";
import { createInventoryMovement } from "@/services/storeInventory/inventoryMovementService";
import { toast } from "sonner";

export interface InventoryUpdateResult {
  success: boolean;
  errors: string[];
  updatedItems: string[];
}

/**
 * Updates store inventory based on GRN items received
 */
export const updateInventoryFromGRN = async (grn: GoodsReceivedNote): Promise<InventoryUpdateResult> => {
  const result: InventoryUpdateResult = {
    success: true,
    errors: [],
    updatedItems: []
  };

  try {
    console.log('=== DEBUG: Starting inventory update ===');
    console.log('Updating inventory from GRN:', grn.grn_number);
    console.log('GRN object:', JSON.stringify(grn, null, 2));

    // Get the store ID from the purchase order
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('store_id')
      .eq('id', grn.purchase_order_id)
      .single();

    if (poError || !purchaseOrder) {
      result.errors.push('Failed to get purchase order information');
      result.success = false;
      return result;
    }

    const storeId = purchaseOrder.store_id;

    // Handle different GRN types
    if (grn.items && grn.items.length > 0) {
      // Enhanced GRN with item-level details
      await processEnhancedGRNItems(grn.items, storeId, grn.id, result);
    } else {
      // Basic GRN - use purchase order items
      await processBasicGRNItems(grn.purchase_order_id, storeId, grn.id, result);
    }

    if (result.errors.length > 0) {
      result.success = false;
      console.error('Inventory update errors:', result.errors);
      toast.error(`Inventory update completed with ${result.errors.length} errors`);
    } else {
      console.log('Inventory updated successfully for', result.updatedItems.length, 'items');
      toast.success(`Inventory updated successfully for ${result.updatedItems.length} items`);
    }

  } catch (error) {
    console.error('Error updating inventory from GRN:', error);
    result.errors.push(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.success = false;
  }

  return result;
};

/**
 * Process enhanced GRN items with item-level tracking
 */
const processEnhancedGRNItems = async (
  grnItems: GRNItem[], 
  storeId: string, 
  grnId: string, 
  result: InventoryUpdateResult
): Promise<void> => {
  for (const grnItem of grnItems) {
    try {
      // Only update inventory for items in good condition and actually received
      if (grnItem.quality_status === 'good' && grnItem.received_quantity > 0) {
        // Get the inventory stock item from the purchase order item
        const { data: poItem, error: poItemError } = await supabase
          .from('purchase_order_items')
          .select(`
            inventory_stock_id,
            inventory_stock:inventory_stock(*)
          `)
          .eq('id', grnItem.purchase_order_item_id)
          .single();

        if (poItemError || !poItem) {
          result.errors.push(`Failed to get purchase order item for GRN item ${grnItem.id}`);
          continue;
        }

        await updateInventoryStockQuantity(
          poItem.inventory_stock_id,
          grnItem.received_quantity,
          storeId,
          grnId,
          `GRN ${grnId} - Item received in good condition`,
          result
        );
      } else {
        console.log(`Skipping inventory update for item ${grnItem.id}: quality=${grnItem.quality_status}, quantity=${grnItem.received_quantity}`);
      }
    } catch (error) {
      result.errors.push(`Failed to process GRN item ${grnItem.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};

/**
 * Process basic GRN using purchase order items
 */
const processBasicGRNItems = async (
  purchaseOrderId: string, 
  storeId: string, 
  grnId: string, 
  result: InventoryUpdateResult
): Promise<void> => {
  try {
    // Get all purchase order items
    const { data: poItems, error: poItemsError } = await supabase
      .from('purchase_order_items')
      .select(`
        *,
        inventory_stock:inventory_stock(*)
      `)
      .eq('purchase_order_id', purchaseOrderId);

    if (poItemsError || !poItems) {
      result.errors.push('Failed to get purchase order items');
      return;
    }

    // For basic GRN, assume all items were received in full
    for (const poItem of poItems) {
      await updateInventoryStockQuantity(
        poItem.inventory_stock_id,
        poItem.quantity,
        storeId,
        grnId,
        `GRN ${grnId} - Full quantity received (basic GRN)`,
        result
      );
    }
  } catch (error) {
    result.errors.push(`Failed to process basic GRN items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Update the inventory stock quantity and create movement record
 */
const updateInventoryStockQuantity = async (
  inventoryStockId: string,
  quantityToAdd: number,
  storeId: string,
  grnId: string,
  notes: string,
  result: InventoryUpdateResult
): Promise<void> => {
  try {
    // Get current inventory item
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('id', inventoryStockId)
      .eq('store_id', storeId)
      .single();

    if (inventoryError || !inventoryItem) {
      result.errors.push(`Inventory item not found: ${inventoryStockId}`);
      return;
    }

    const previousQuantity = inventoryItem.stock_quantity;
    const newQuantity = previousQuantity + quantityToAdd;

    // Update inventory quantity
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryStockId);

    if (updateError) {
      result.errors.push(`Failed to update inventory for ${inventoryItem.item}: ${updateError.message}`);
      return;
    }

    // Create inventory movement record
    const movementSuccess = await createInventoryMovement({
      inventory_stock_id: inventoryStockId,
      movement_type: 'restock',
      quantity_change: quantityToAdd,
      previous_quantity: previousQuantity,
      new_quantity: newQuantity,
      reference_type: 'grn',
      reference_id: grnId,
      notes
    });

    if (!movementSuccess) {
      result.errors.push(`Failed to create movement record for ${inventoryItem.item}`);
      return;
    }

    result.updatedItems.push(`${inventoryItem.item}: +${quantityToAdd} (${previousQuantity} → ${newQuantity})`);
    console.log(`Updated inventory: ${inventoryItem.item} +${quantityToAdd} (${previousQuantity} → ${newQuantity})`);

  } catch (error) {
    result.errors.push(`Error updating inventory ${inventoryStockId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Automatically update inventory when a GRN is created (called from GRN service)
 */
export const triggerInventoryUpdateFromGRN = async (grn: GoodsReceivedNote): Promise<void> => {
  try {
    console.log('Triggering automatic inventory update for GRN:', grn.grn_number);
    
    const result = await updateInventoryFromGRN(grn);
    
    if (!result.success) {
      console.error('Automatic inventory update failed:', result.errors);
      toast.error('Inventory update failed. Please update manually.');
    } else {
      console.log('Automatic inventory update completed successfully');
    }
    
  } catch (error) {
    console.error('Error triggering inventory update:', error);
  }
};