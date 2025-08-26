import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PurchaseOrderFulfillment {
  id: string;
  purchase_order_id: string;
  fulfillment_number: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_by: string;
  completed_by?: string;
  started_at: string;
  completed_at?: string;
  notes?: string;
  total_fulfilled_items: number;
  created_at: string;
  updated_at: string;
  purchase_order?: any;
  items?: PurchaseOrderFulfillmentItem[];
}

export interface PurchaseOrderFulfillmentItem {
  id: string;
  fulfillment_id: string;
  purchase_order_item_id: string;
  ordered_quantity: number;
  fulfilled_quantity: number;
  unit_price?: number;
  notes?: string;
  status: 'pending' | 'fulfilled' | 'partial' | 'unavailable';
  created_at: string;
  updated_at: string;
  purchase_order_item?: any;
}

export interface FulfillmentModification {
  id: string;
  fulfillment_id: string;
  modification_type: 'quantity_change' | 'item_addition' | 'item_removal' | 'substitution';
  requested_by: string;
  approved_by?: string;
  status: 'pending' | 'approved' | 'rejected';
  original_data?: any;
  new_data: any;
  justification?: string;
  approval_notes?: string;
  requested_at: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export const createFulfillment = async (
  purchaseOrderId: string,
  startedBy: string,
  notes?: string
): Promise<PurchaseOrderFulfillment | null> => {
  try {
    const { data, error } = await supabase
      .from('purchase_order_fulfillments')
      .insert({
        purchase_order_id: purchaseOrderId,
        started_by: startedBy,
        notes,
        fulfillment_number: '' // Will be set by trigger
      })
      .select('*')
      .single();

    if (error) throw error;

    // Update purchase order status to in_progress
    await supabase
      .from('purchase_orders')
      .update({ status: 'in_progress' })
      .eq('id', purchaseOrderId);

    toast.success('Fulfillment session started');
    return data as PurchaseOrderFulfillment;
  } catch (error) {
    console.error('Error creating fulfillment:', error);
    toast.error('Failed to start fulfillment');
    return null;
  }
};

export const fetchFulfillments = async (purchaseOrderId?: string): Promise<PurchaseOrderFulfillment[]> => {
  try {
    let query = supabase
      .from('purchase_order_fulfillments')
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          store:stores(id, name),
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        ),
        items:purchase_order_fulfillment_items(
          *,
          purchase_order_item:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (purchaseOrderId) {
      query = query.eq('purchase_order_id', purchaseOrderId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as PurchaseOrderFulfillment[];
  } catch (error) {
    console.error('Error fetching fulfillments:', error);
    toast.error('Failed to fetch fulfillments');
    return [];
  }
};

export const updateFulfillmentItem = async (
  fulfillmentItemId: string,
  updates: Partial<PurchaseOrderFulfillmentItem>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('purchase_order_fulfillment_items')
      .update(updates)
      .eq('id', fulfillmentItemId);

    if (error) throw error;

    toast.success('Fulfillment item updated');
    return true;
  } catch (error) {
    console.error('Error updating fulfillment item:', error);
    toast.error('Failed to update fulfillment item');
    return false;
  }
};

export const completeFulfillment = async (
  fulfillmentId: string,
  completedBy: string,
  notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('purchase_order_fulfillments')
      .update({
        status: 'completed',
        completed_by: completedBy,
        completed_at: new Date().toISOString(),
        notes
      })
      .eq('id', fulfillmentId);

    if (error) throw error;

    // Update purchase order status to fulfilled
    const { data: fulfillment } = await supabase
      .from('purchase_order_fulfillments')
      .select('purchase_order_id')
      .eq('id', fulfillmentId)
      .single();

    if (fulfillment) {
      await supabase
        .from('purchase_orders')
        .update({ status: 'fulfilled' })
        .eq('id', fulfillment.purchase_order_id);
    }

    toast.success('Fulfillment completed');
    return true;
  } catch (error) {
    console.error('Error completing fulfillment:', error);
    toast.error('Failed to complete fulfillment');
    return false;
  }
};

export const createFulfillmentModification = async (
  fulfillmentId: string,
  modificationType: FulfillmentModification['modification_type'],
  requestedBy: string,
  originalData: any,
  newData: any,
  justification?: string
): Promise<FulfillmentModification | null> => {
  try {
    const { data, error } = await supabase
      .from('fulfillment_modifications')
      .insert({
        fulfillment_id: fulfillmentId,
        modification_type: modificationType,
        requested_by: requestedBy,
        original_data: originalData,
        new_data: newData,
        justification
      })
      .select('*')
      .single();

    if (error) throw error;

    toast.success('Modification request submitted');
    return data as FulfillmentModification;
  } catch (error) {
    console.error('Error creating modification:', error);
    toast.error('Failed to submit modification request');
    return null;
  }
};

export const approveModification = async (
  modificationId: string,
  approvedBy: string,
  approvalNotes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('fulfillment_modifications')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        processed_at: new Date().toISOString(),
        approval_notes: approvalNotes
      })
      .eq('id', modificationId);

    if (error) throw error;

    toast.success('Modification approved');
    return true;
  } catch (error) {
    console.error('Error approving modification:', error);
    toast.error('Failed to approve modification');
    return false;
  }
};

export const rejectModification = async (
  modificationId: string,
  approvedBy: string,
  approvalNotes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('fulfillment_modifications')
      .update({
        status: 'rejected',
        approved_by: approvedBy,
        processed_at: new Date().toISOString(),
        approval_notes: approvalNotes
      })
      .eq('id', modificationId);

    if (error) throw error;

    toast.success('Modification rejected');
    return true;
  } catch (error) {
    console.error('Error rejecting modification:', error);
    toast.error('Failed to reject modification');
    return false;
  }
};

export const createFulfillmentItems = async (
  fulfillmentId: string,
  items: Array<{
    purchase_order_item_id: string;
    ordered_quantity: number;
    unit_price?: number;
  }>
): Promise<boolean> => {
  try {
    const fulfillmentItems = items.map(item => ({
      fulfillment_id: fulfillmentId,
      ...item,
      fulfilled_quantity: 0,
      status: 'pending' as const
    }));

    const { error } = await supabase
      .from('purchase_order_fulfillment_items')
      .insert(fulfillmentItems);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error creating fulfillment items:', error);
    toast.error('Failed to create fulfillment items');
    return false;
  }
};