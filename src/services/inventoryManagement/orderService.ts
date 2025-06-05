
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderItem } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchOrders = async (storeId: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        supplier:suppliers(*),
        order_items:order_items(
          *,
          inventory_item:inventory_items(*)
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    toast.error('Failed to fetch orders');
    return [];
  }
};

export const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'supplier' | 'order_items'>): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select(`
        *,
        supplier:suppliers(*),
        order_items:order_items(
          *,
          inventory_item:inventory_items(*)
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Order created successfully');
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    toast.error('Failed to create order');
    return null;
  }
};

export const updateOrder = async (id: string, updates: Partial<Order>): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        supplier:suppliers(*),
        order_items:order_items(
          *,
          inventory_item:inventory_items(*)
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Order updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating order:', error);
    toast.error('Failed to update order');
    return null;
  }
};

export const deleteOrder = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Order deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    toast.error('Failed to delete order');
    return false;
  }
};

export const addOrderItem = async (orderItem: Omit<OrderItem, 'id' | 'created_at'>): Promise<OrderItem | null> => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .insert(orderItem)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding order item:', error);
    toast.error('Failed to add item to order');
    return null;
  }
};

export const removeOrderItem = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error removing order item:', error);
    toast.error('Failed to remove item from order');
    return false;
  }
};

export const updateOrderItem = async (id: string, updates: Partial<OrderItem>): Promise<OrderItem | null> => {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        inventory_item:inventory_items(*)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating order item:', error);
    toast.error('Failed to update order item');
    return null;
  }
};

export const generateOrderNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  return `PO${year}${month}${day}${random}`;
};
