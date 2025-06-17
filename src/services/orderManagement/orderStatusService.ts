
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderWithStatus {
  id: string;
  receipt_number: string;
  customer_id?: string;
  store_id: string;
  user_id: string;
  shift_id: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  payment_method: string;
  order_status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  assigned_to?: string;
  estimated_completion_time?: string;
  order_notes?: string;
  created_at: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface OrderStatusHistory {
  id: string;
  transaction_id: string;
  old_status?: string;
  new_status: string;
  changed_by: string;
  change_reason?: string;
  changed_at: string;
}

export const fetchPendingOrders = async (storeId: string): Promise<OrderWithStatus[]> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customer:customers(name, phone, email)
      `)
      .eq('store_id', storeId)
      .in('order_status', ['pending', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    toast.error('Failed to fetch pending orders');
    return [];
  }
};

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderWithStatus['order_status'],
  changeReason?: string,
  estimatedCompletionTime?: string,
  assignedTo?: string
): Promise<boolean> => {
  try {
    // First get current status
    const { data: currentOrder, error: fetchError } = await supabase
      .from('transactions')
      .select('order_status')
      .eq('id', orderId)
      .single();

    if (fetchError) throw fetchError;

    const oldStatus = currentOrder?.order_status;

    // Update the order
    const updateData: any = { order_status: newStatus };
    if (estimatedCompletionTime) updateData.estimated_completion_time = estimatedCompletionTime;
    if (assignedTo) updateData.assigned_to = assignedTo;

    const { error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Log the status change
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        transaction_id: orderId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        change_reason: changeReason
      });

    if (historyError) {
      console.warn('Failed to log status change:', historyError);
    }

    toast.success(`Order status updated to ${newStatus}`);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    toast.error('Failed to update order status');
    return false;
  }
};

export const assignOrderToUser = async (orderId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ assigned_to: userId })
      .eq('id', orderId);

    if (error) throw error;

    toast.success('Order assigned successfully');
    return true;
  } catch (error) {
    console.error('Error assigning order:', error);
    toast.error('Failed to assign order');
    return false;
  }
};

export const fetchOrderStatusHistory = async (orderId: string): Promise<OrderStatusHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('transaction_id', orderId)
      .order('changed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching order status history:', error);
    return [];
  }
};

export const cancelOrder = async (orderId: string, reason: string): Promise<boolean> => {
  try {
    const result = await updateOrderStatus(orderId, 'cancelled', reason);
    if (result) {
      toast.success('Order cancelled successfully');
    }
    return result;
  } catch (error) {
    console.error('Error cancelling order:', error);
    toast.error('Failed to cancel order');
    return false;
  }
};
