
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

    if (orderError) throw orderError;

    // Create purchase order items
    if (orderData.items.length > 0) {
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(
          orderData.items.map(item => ({
            purchase_order_id: purchaseOrder.id,
            inventory_stock_id: item.inventory_stock_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            specifications: item.specifications
          }))
        );

      if (itemsError) throw itemsError;
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
