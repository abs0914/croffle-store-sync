import { supabase } from "@/integrations/supabase/client";
import { PurchaseOrder, PurchaseOrderItem } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchPurchaseOrders = async (storeId: string): Promise<PurchaseOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
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

export const createPurchaseOrder = async (
  purchaseOrder: Omit<PurchaseOrder, 'id' | 'created_at' | 'updated_at' | 'supplier' | 'items'>
): Promise<PurchaseOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({
        order_number: purchaseOrder.order_number,
        store_id: purchaseOrder.store_id,
        supplier_id: null, // Commissary orders don't need a specific supplier
        created_by: purchaseOrder.created_by,
        approved_by: purchaseOrder.approved_by,
        status: purchaseOrder.status,
        total_amount: purchaseOrder.total_amount,
        requested_delivery_date: purchaseOrder.requested_delivery_date,
        notes: purchaseOrder.notes
      })
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;
    toast.success('Purchase order created successfully');
    return data;
  } catch (error) {
    console.error('Error creating purchase order:', error);
    toast.error('Failed to create purchase order');
    return null;
  }
};

export const updatePurchaseOrder = async (
  id: string,
  updates: Partial<PurchaseOrder>
): Promise<PurchaseOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;
    toast.success('Purchase order updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating purchase order:', error);
    toast.error('Failed to update purchase order');
    return null;
  }
};

export const addPurchaseOrderItem = async (
  item: Omit<PurchaseOrderItem, 'id' | 'created_at'>
): Promise<PurchaseOrderItem | null> => {
  try {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .insert(item)
      .select(`
        *,
        inventory_stock:inventory_stock(*)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding purchase order item:', error);
    toast.error('Failed to add item to purchase order');
    return null;
  }
};

export const removePurchaseOrderItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('purchase_order_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error removing purchase order item:', error);
    toast.error('Failed to remove item from purchase order');
    return false;
  }
};

export const generatePurchaseOrderNumber = async (): Promise<string> => {
  try {
    // Generate a commissary order number with timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CO${timestamp}${randomSuffix}`; // CO = Commissary Order
  } catch (error) {
    console.error('Error generating purchase order number:', error);
    return `CO${Date.now()}`;
  }
};
