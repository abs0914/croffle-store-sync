import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrder, PurchaseOrderItem } from "@/types/orderManagement";
import { toast } from "sonner";

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
    inventory_stock_id: string;
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

        // If inventory stock doesn't exist, create it
        if (!inventoryStock) {
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
      }
    }

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
    const { error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

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
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw error;

    toast.success('Purchase order cancelled successfully');
    return true;
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    toast.error('Failed to cancel purchase order');
    return false;
  }
};
