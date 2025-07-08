
import { supabase } from "@/integrations/supabase/client";
import { DeliveryOrder } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchDeliveryOrders = async (storeId?: string): Promise<DeliveryOrder[]> => {
  try {
    let query = supabase
      .from('delivery_orders')
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          store:stores(id, name, address),
          items:purchase_order_items(
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
    console.error('Error fetching delivery orders:', error);
    toast.error('Failed to fetch delivery orders');
    return [];
  }
};

export const updateDeliveryOrder = async (
  id: string,
  updates: Partial<DeliveryOrder>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('delivery_orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    toast.success('Delivery order updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating delivery order:', error);
    toast.error('Failed to update delivery order');
    return false;
  }
};
