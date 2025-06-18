
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StockOrderWorkflow {
  id: string;
  order_number: string;
  store_id: string;
  status: 'requested' | 'pending' | 'approved' | 'fulfilled' | 'delivered' | 'cancelled';
  requested_by: string;
  approved_by?: string;
  order_date: string;
  fulfilled_date?: string;
  notes?: string;
  items?: StockOrderItem[];
  store?: { name: string };
}

export interface StockOrderItem {
  id: string;
  stock_order_id: string;
  inventory_stock_id: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_cost?: number;
  notes?: string;
  inventory_stock?: {
    item: string;
    unit: string;
    current_stock: number;
    minimum_threshold: number;
  };
}

export const createStockOrder = async (
  storeId: string,
  items: Omit<StockOrderItem, 'id' | 'stock_order_id'>[],
  notes?: string
): Promise<string | null> => {
  try {
    console.log('Creating stock order:', { storeId, items, notes });

    // Generate order number
    const orderNumber = `SO-${Date.now()}`;

    // Create the stock order
    const { data: order, error: orderError } = await supabase
      .from('stock_orders')
      .insert({
        store_id: storeId,
        status: 'requested',
        notes: notes || 'Manual stock order request',
        order_number: orderNumber,
        requested_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Add items to the order
    const orderItems = items.map(item => ({
      ...item,
      stock_order_id: order.id
    }));

    const { error: itemsError } = await supabase
      .from('stock_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    toast.success('Stock order created successfully');
    return order.id;
  } catch (error) {
    console.error('Error creating stock order:', error);
    toast.error('Failed to create stock order');
    return null;
  }
};

export const approveStockOrder = async (
  orderId: string,
  approvedQuantities: Record<string, number>
): Promise<boolean> => {
  try {
    console.log('Approving stock order:', { orderId, approvedQuantities });

    // Update order status
    const { error: orderError } = await supabase
      .from('stock_orders')
      .update({
        status: 'approved',
        approved_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', orderId);

    if (orderError) throw orderError;

    // Update item quantities
    for (const [itemId, quantity] of Object.entries(approvedQuantities)) {
      const { error: itemError } = await supabase
        .from('stock_order_items')
        .update({ approved_quantity: quantity })
        .eq('id', itemId);

      if (itemError) throw itemError;
    }

    toast.success('Stock order approved');
    return true;
  } catch (error) {
    console.error('Error approving stock order:', error);
    toast.error('Failed to approve stock order');
    return false;
  }
};

export const fulfillStockOrder = async (
  orderId: string,
  deliveredQuantities: Record<string, number>
): Promise<boolean> => {
  try {
    console.log('Fulfilling stock order:', { orderId, deliveredQuantities });

    // Get order details
    const { data: orderItems, error: fetchError } = await supabase
      .from('stock_order_items')
      .select(`
        *,
        inventory_stock:inventory_stock(*)
      `)
      .eq('stock_order_id', orderId);

    if (fetchError) throw fetchError;

    // Update inventory quantities
    for (const item of orderItems || []) {
      const deliveredQty = deliveredQuantities[item.id] || 0;
      if (deliveredQty > 0) {
        const newStock = (item.inventory_stock?.stock_quantity || 0) + deliveredQty;
        
        const { error: stockError } = await supabase
          .from('inventory_stock')
          .update({ stock_quantity: newStock })
          .eq('id', item.inventory_stock_id);

        if (stockError) throw stockError;

        // Create movement record
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: item.inventory_stock_id,
            movement_type: 'restock',
            quantity_change: deliveredQty,
            previous_quantity: item.inventory_stock?.stock_quantity || 0,
            new_quantity: newStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            reference_type: 'stock_order',
            reference_id: orderId,
            notes: `Stock order fulfillment: ${item.inventory_stock?.item}`
          });

        if (movementError) {
          console.error('Failed to create movement record:', movementError);
        }
      }
    }

    // Update order status
    const { error: orderError } = await supabase
      .from('stock_orders')
      .update({
        status: 'fulfilled',
        fulfilled_date: new Date().toISOString()
      })
      .eq('id', orderId);

    if (orderError) throw orderError;

    toast.success('Stock order fulfilled');
    return true;
  } catch (error) {
    console.error('Error fulfilling stock order:', error);
    toast.error('Failed to fulfill stock order');
    return false;
  }
};

export const fetchStockOrders = async (
  storeId?: string,
  status?: string
): Promise<StockOrderWorkflow[]> => {
  try {
    let query = supabase
      .from('stock_orders')
      .select(`
        *,
        items:stock_order_items(
          *,
          inventory_stock:inventory_stock(*)
        ),
        store:stores(name)
      `)
      .order('order_date', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as StockOrderWorkflow[];
  } catch (error) {
    console.error('Error fetching stock orders:', error);
    toast.error('Failed to fetch stock orders');
    return [];
  }
};

export const cancelStockOrder = async (orderId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stock_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    if (error) throw error;

    toast.success('Stock order cancelled');
    return true;
  } catch (error) {
    console.error('Error cancelling stock order:', error);
    toast.error('Failed to cancel stock order');
    return false;
  }
};
