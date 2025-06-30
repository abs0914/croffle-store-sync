
import { supabase } from "@/integrations/supabase/client";
import { GoodsReceivedNote, GRNItem, PurchaseOrder } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchGRNs = async (storeId?: string): Promise<GoodsReceivedNote[]> => {
  try {
    let query = supabase
      .from('goods_received_notes')
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        ),
        items:grn_items(
          *,
          purchase_order_item:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('purchase_order.store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    toast.error('Failed to fetch goods received notes');
    return [];
  }
};

export const fetchDeliveredPurchaseOrders = async (storeId?: string): Promise<PurchaseOrder[]> => {
  try {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        store:stores(id, name, address),
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching delivered purchase orders:', error);
    toast.error('Failed to fetch delivered purchase orders');
    return [];
  }
};

export const createGRN = async (
  purchaseOrderId: string,
  receivedBy: string
): Promise<GoodsReceivedNote | null> => {
  try {
    const grnNumber = await generateGRNNumber();
    
    const { data, error } = await supabase
      .from('goods_received_notes')
      .insert({
        grn_number: grnNumber,
        purchase_order_id: purchaseOrderId,
        received_by: receivedBy,
        status: 'pending'
      })
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    toast.success('GRN created successfully');
    return data;
  } catch (error) {
    console.error('Error creating GRN:', error);
    toast.error('Failed to create goods received note');
    return null;
  }
};

export const updateGRN = async (
  id: string,
  updates: Partial<GoodsReceivedNote>
): Promise<GoodsReceivedNote | null> => {
  try {
    const { data, error } = await supabase
      .from('goods_received_notes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    toast.success('GRN updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating GRN:', error);
    toast.error('Failed to update goods received note');
    return null;
  }
};

export const addGRNItem = async (
  item: Omit<GRNItem, 'id' | 'created_at'>
): Promise<GRNItem | null> => {
  try {
    const { data, error } = await supabase
      .from('grn_items')
      .insert(item)
      .select(`
        *,
        purchase_order_item:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding GRN item:', error);
    toast.error('Failed to add item to GRN');
    return null;
  }
};

const generateGRNNumber = async (): Promise<string> => {
  try {
    // Generate a simple GRN number with timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `GRN${timestamp}${randomSuffix}`;
  } catch (error) {
    console.error('Error generating GRN number:', error);
    return `GRN${Date.now()}`;
  }
};
