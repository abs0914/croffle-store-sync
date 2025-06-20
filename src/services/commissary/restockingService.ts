
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RestockRequest {
  id?: string;
  store_id: string;
  commissary_item_id: string;
  requested_quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  justification?: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'fulfilled' | 'rejected';
  approved_by?: string;
  approved_quantity?: number;
  fulfilled_by?: string;
  fulfilled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RestockFulfillment {
  restock_request_id: string;
  commissary_item_id: string;
  store_id: string;
  quantity_transferred: number;
  unit_cost: number;
  total_cost: number;
  fulfilled_by: string;
  notes?: string;
}

export const createRestockRequest = async (
  request: Omit<RestockRequest, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_restock_requests')
      .insert({
        ...request,
        status: 'pending'
      });

    if (error) throw error;
    
    toast.success('Restock request submitted successfully');
    return true;
  } catch (error) {
    console.error('Error creating restock request:', error);
    toast.error('Failed to create restock request');
    return false;
  }
};

export const fetchRestockRequests = async (storeId?: string): Promise<RestockRequest[]> => {
  try {
    let query = supabase
      .from('commissary_restock_requests')
      .select(`
        *,
        commissary_item:commissary_inventory(name, unit, current_stock),
        store:stores(name),
        requested_by_user:app_users!commissary_restock_requests_requested_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching restock requests:', error);
    toast.error('Failed to fetch restock requests');
    return [];
  }
};

export const approveRestockRequest = async (
  requestId: string,
  approvedQuantity: number,
  approvedBy: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_restock_requests')
      .update({
        status: 'approved',
        approved_quantity: approvedQuantity,
        approved_by: approvedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    
    toast.success('Restock request approved');
    return true;
  } catch (error) {
    console.error('Error approving restock request:', error);
    toast.error('Failed to approve restock request');
    return false;
  }
};

export const fulfillRestockRequest = async (
  fulfillment: RestockFulfillment
): Promise<boolean> => {
  try {
    // Start a transaction-like approach
    const { data: request, error: fetchError } = await supabase
      .from('commissary_restock_requests')
      .select('*')
      .eq('id', fulfillment.restock_request_id)
      .single();

    if (fetchError) throw fetchError;

    // Update the restock request
    const { error: updateError } = await supabase
      .from('commissary_restock_requests')
      .update({
        status: 'fulfilled',
        fulfilled_by: fulfillment.fulfilled_by,
        fulfilled_at: new Date().toISOString()
      })
      .eq('id', fulfillment.restock_request_id);

    if (updateError) throw updateError;

    // Record the fulfillment
    const { error: fulfillmentError } = await supabase
      .from('commissary_restock_fulfillments')
      .insert(fulfillment);

    if (fulfillmentError) throw fulfillmentError;

    // Use the inventory transfer function to move stock
    const { error: transferError } = await supabase.rpc('transfer_commissary_to_store', {
      p_commissary_item_id: fulfillment.commissary_item_id,
      p_store_id: fulfillment.store_id,
      p_quantity: fulfillment.quantity_transferred,
      p_unit_cost: fulfillment.unit_cost,
      p_fulfilled_by: fulfillment.fulfilled_by,
      p_notes: fulfillment.notes || 'Commissary restock fulfillment'
    });

    if (transferError) throw transferError;

    toast.success('Restock request fulfilled and inventory transferred');
    return true;
  } catch (error) {
    console.error('Error fulfilling restock request:', error);
    toast.error('Failed to fulfill restock request');
    return false;
  }
};

export const rejectRestockRequest = async (
  requestId: string,
  rejectedBy: string,
  reason?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('commissary_restock_requests')
      .update({
        status: 'rejected',
        approved_by: rejectedBy,
        justification: reason || 'Request rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    
    toast.success('Restock request rejected');
    return true;
  } catch (error) {
    console.error('Error rejecting restock request:', error);
    toast.error('Failed to reject restock request');
    return false;
  }
};
