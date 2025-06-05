
import { supabase } from "@/integrations/supabase/client";
import { DeliveryOrder } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchDeliveryOrders = async (): Promise<DeliveryOrder[]> => {
  try {
    const { data, error } = await supabase
      .from('delivery_orders')
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          supplier:suppliers(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    toast.error('Failed to fetch delivery orders');
    return [];
  }
};

export const createDeliveryOrder = async (
  purchaseOrderId: string
): Promise<DeliveryOrder | null> => {
  try {
    const deliveryNumber = await generateDeliveryOrderNumber();
    
    const { data, error } = await supabase
      .from('delivery_orders')
      .insert({
        delivery_number: deliveryNumber,
        purchase_order_id: purchaseOrderId,
        status: 'for_delivery'
      })
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          supplier:suppliers(*)
        )
      `)
      .single();

    if (error) throw error;
    toast.success('Delivery order created successfully');
    return data;
  } catch (error) {
    console.error('Error creating delivery order:', error);
    toast.error('Failed to create delivery order');
    return null;
  }
};

export const updateDeliveryOrder = async (
  id: string,
  updates: Partial<DeliveryOrder>
): Promise<DeliveryOrder | null> => {
  try {
    const { data, error } = await supabase
      .from('delivery_orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          supplier:suppliers(*)
        )
      `)
      .single();

    if (error) throw error;
    toast.success('Delivery order updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating delivery order:', error);
    toast.error('Failed to update delivery order');
    return null;
  }
};

const generateDeliveryOrderNumber = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .rpc('generate_delivery_order_number');

    if (error) throw error;
    return data || `DO${Date.now()}`;
  } catch (error) {
    console.error('Error generating delivery order number:', error);
    return `DO${Date.now()}`;
  }
};
