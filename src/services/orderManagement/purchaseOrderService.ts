
import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrder, PurchaseOrderItem } from "@/types/orderManagement";
import { toast } from "sonner";

interface CreatePurchaseOrderData {
  store_id: string;
  supplier_id?: string;
  created_by: string;
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  requested_delivery_date?: string;
  notes?: string;
  location_type?: string;
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
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*),
          commissary_item:commissary_inventory(*)
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
        supplier_id: orderData.supplier_id,
        created_by: orderData.created_by,
        status: orderData.status,
        total_amount: orderData.total_amount,
        requested_delivery_date: orderData.requested_delivery_date,
        notes: orderData.notes,
        location_type: orderData.location_type
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
