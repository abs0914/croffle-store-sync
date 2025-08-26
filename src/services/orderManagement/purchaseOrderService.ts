
import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrder, PurchaseOrderItem } from "@/types/orderManagement";
import { toast } from "sonner";
import { logAuditTrailEntry } from "./auditTrailService";

interface CreatePurchaseOrderData {
  store_id: string;
  created_by: string;
  status: 'pending' | 'approved' | 'fulfilled' | 'delivered' | 'cancelled';
  total_amount: number;
  requested_delivery_date?: string;
  delivery_scheduled_date?: string;
  delivery_notes?: string;
  notes?: string;
  items: {
    inventory_stock_id: string; // This is actually commissary_item_id from the dialog
    quantity: number;
    unit_price: number;
    specifications?: string;
  }[];
}

export const fetchPurchaseOrders = async (storeId: string): Promise<PurchaseOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    toast.error('Failed to fetch purchase orders');
    return [];
  }
};

export const createPurchaseOrder = async (orderData: CreatePurchaseOrderData): Promise<PurchaseOrder | null> => {
  try {
    // Generate order number
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Creating purchase order with order number:', orderNumber);
    console.log('Order data:', orderData);
    
    // Create purchase order
    const { data: purchaseOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: orderNumber,
        store_id: orderData.store_id,
        created_by: orderData.created_by,
        status: orderData.status,
        total_amount: orderData.total_amount,
        requested_delivery_date: orderData.requested_delivery_date,
        delivery_scheduled_date: orderData.delivery_scheduled_date,
        delivery_notes: orderData.delivery_notes,
        notes: orderData.notes
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating purchase order:', orderError);
      throw orderError;
    }

    console.log('Purchase order created:', purchaseOrder);

    // Process items - properly handle commissary to inventory stock mapping
    if (orderData.items.length > 0) {
      const purchaseOrderItems = [];
      
      for (const item of orderData.items) {
        console.log('Processing item:', item);
        
        // The inventory_stock_id is actually a commissary_item_id, so we need to map it
        const { data: commissaryItem, error: commissaryError } = await supabase
          .from('commissary_inventory')
          .select('*')
          .eq('id', item.inventory_stock_id)
          .single();

        if (commissaryError) {
          console.error('Error fetching commissary item:', commissaryError);
          continue;
        }

        console.log('Found commissary item:', commissaryItem);

        // Check if inventory stock exists for this item in the store
        let { data: inventoryStock, error: inventoryError } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('store_id', orderData.store_id)
          .eq('item', commissaryItem.name)
          .eq('unit', commissaryItem.unit)
          .maybeSingle();

        if (inventoryError && inventoryError.code !== 'PGRST116') {
          console.error('Error checking inventory stock:', inventoryError);
          continue;
        }

        console.log('Found existing inventory stock:', inventoryStock);

        // If inventory stock doesn't exist, create it
        if (!inventoryStock) {
          console.log('Creating new inventory stock for:', commissaryItem.name);
          
          const { data: newInventoryStock, error: createError } = await supabase
            .from('inventory_stock')
            .insert({
              store_id: orderData.store_id,
              item: commissaryItem.name,
              unit: commissaryItem.unit,
              stock_quantity: 0,
              cost: commissaryItem.unit_cost || 0,
              is_active: true
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating inventory stock:', createError);
            continue;
          }
          
          inventoryStock = newInventoryStock;
          console.log('Created new inventory stock:', inventoryStock);
        }

        purchaseOrderItems.push({
          purchase_order_id: purchaseOrder.id,
          inventory_stock_id: inventoryStock.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          specifications: item.specifications
        });
      }

      console.log('Creating purchase order items:', purchaseOrderItems);

      if (purchaseOrderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(purchaseOrderItems);

        if (itemsError) {
          console.error('Error creating purchase order items:', itemsError);
          throw itemsError;
        }
        
        console.log('Successfully created purchase order items');
      } else {
        console.warn('No purchase order items to create');
      }
    }

    // Log audit trail entry
    await logAuditTrailEntry(
      purchaseOrder.id,
      'purchase',
      'created',
      undefined,
      orderData.status,
      `Purchase order created with ${orderData.items.length} items`
    );

    toast.success('Purchase order created successfully');
    return purchaseOrder;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    toast.error('Failed to create purchase order');
    return null;
  }
};

export const updatePurchaseOrder = async (
  id: string,
  updates: Partial<PurchaseOrder>
): Promise<boolean> => {
  try {
    // Get current order to track status changes
    const { data: currentOrder } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Log audit trail if status changed
    if (updates.status && currentOrder?.status !== updates.status) {
      await logAuditTrailEntry(
        id,
        'purchase',
        'status_change',
        currentOrder?.status,
        updates.status,
        'Purchase order status updated'
      );
    }

    toast.success('Purchase order updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating purchase order:', error);
    toast.error('Failed to update purchase order');
    return false;
  }
};

export const fulfillPurchaseOrder = async (
  id: string,
  fulfilled_by: string,
  delivery_scheduled_date?: string,
  delivery_notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'fulfilled',
        fulfilled_by,
        fulfilled_at: new Date().toISOString(),
        delivery_scheduled_date,
        delivery_notes
      })
      .eq('id', id);

    if (error) throw error;

    // Log audit trail entry
    await logAuditTrailEntry(
      id,
      'purchase',
      'fulfilled',
      undefined,
      'fulfilled',
      delivery_notes || 'Purchase order fulfilled'
    );

    toast.success('Purchase order fulfilled successfully');
    return true;
  } catch (error) {
    console.error('Error fulfilling purchase order:', error);
    toast.error('Failed to fulfill purchase order');
    return false;
  }
};

export const deliverPurchaseOrder = async (
  id: string,
  delivery_notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'delivered',
        delivery_notes
      })
      .eq('id', id);

    if (error) throw error;

    // Log audit trail entry
    await logAuditTrailEntry(
      id,
      'purchase',
      'delivered',
      'fulfilled',
      'delivered',
      delivery_notes || 'Purchase order delivered'
    );

    toast.success('Purchase order marked as delivered');
    return true;
  } catch (error) {
    console.error('Error delivering purchase order:', error);
    toast.error('Failed to mark as delivered');
    return false;
  }
};

export const deletePurchaseOrder = async (id: string): Promise<boolean> => {
  try {
    // First get all related GRN IDs
    const { data: grnData } = await supabase
      .from('goods_received_notes')
      .select('id')
      .eq('purchase_order_id', id);

    const grnIds = grnData?.map(grn => grn.id) || [];

    // Delete related GRN items if any GRNs exist
    if (grnIds.length > 0) {
      const { error: grnItemsError } = await supabase
        .from('grn_items')
        .delete()
        .in('grn_id', grnIds);

      if (grnItemsError) throw grnItemsError;

      // Delete related goods received notes
      const { error: grnError } = await supabase
        .from('goods_received_notes')
        .delete()
        .eq('purchase_order_id', id);

      if (grnError) throw grnError;
    }

    // Delete related purchase order items
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('purchase_order_id', id);

    if (itemsError) throw itemsError;

    // Finally delete the purchase order
    const { error } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log audit trail entry
    await logAuditTrailEntry(
      id,
      'purchase',
      'deleted',
      undefined,
      'deleted',
      'Purchase order deleted permanently'
    );

    toast.success('Purchase order deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    toast.error('Failed to delete purchase order');
    return false;
  }
};

export const deletePurchaseOrderItem = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    toast.success('Purchase order item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting purchase order item:', error);
    toast.error('Failed to delete purchase order item');
    return false;
  }
};
