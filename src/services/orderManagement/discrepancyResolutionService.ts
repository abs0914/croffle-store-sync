
import { supabase } from "@/integrations/supabase/client";
import { GRNDiscrepancyResolution } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchDiscrepancyResolutions = async (): Promise<GRNDiscrepancyResolution[]> => {
  try {
    const { data, error } = await supabase
      .from('grn_discrepancy_resolutions')
      .select(`
        *,
        grn:goods_received_notes(
          *,
          purchase_order:purchase_orders(*)
        ),
        purchase_order:purchase_orders(
          *,
          store:stores(id, name, address)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Type cast the resolution_type to ensure it matches our interface
    return (data || []).map(resolution => ({
      ...resolution,
      resolution_type: resolution.resolution_type as 'replace' | 'refund'
    }));
  } catch (error) {
    console.error('Error fetching discrepancy resolutions:', error);
    toast.error('Failed to fetch discrepancy resolutions');
    return [];
  }
};

export const createDiscrepancyResolution = async (
  grnId: string,
  purchaseOrderId: string,
  resolutionType: 'replace' | 'refund',
  resolutionNotes?: string,
  financialAdjustment?: number
): Promise<GRNDiscrepancyResolution | null> => {
  try {
    const { data, error } = await supabase
      .from('grn_discrepancy_resolutions')
      .insert({
        grn_id: grnId,
        purchase_order_id: purchaseOrderId,
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes,
        financial_adjustment: financialAdjustment || 0,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        grn:goods_received_notes(*),
        purchase_order:purchase_orders(*)
      `)
      .single();

    if (error) throw error;
    
    toast.success(`${resolutionType === 'replace' ? 'Replacement' : 'Refund'} request created successfully`);
    
    // Type cast the resolution_type to ensure it matches our interface
    return {
      ...data,
      resolution_type: data.resolution_type as 'replace' | 'refund'
    };
  } catch (error) {
    console.error('Error creating discrepancy resolution:', error);
    toast.error('Failed to create discrepancy resolution');
    return null;
  }
};

export const approveDiscrepancyResolution = async (
  resolutionId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grn_discrepancy_resolutions')
      .update({
        resolution_status: 'approved',
        approved_by: (await supabase.auth.getUser()).data.user?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', resolutionId);

    if (error) throw error;
    
    toast.success('Discrepancy resolution approved');
    return true;
  } catch (error) {
    console.error('Error approving discrepancy resolution:', error);
    toast.error('Failed to approve discrepancy resolution');
    return false;
  }
};

export const completeDiscrepancyResolution = async (
  resolutionId: string,
  purchaseOrderId: string,
  resolutionType: 'replace' | 'refund'
): Promise<boolean> => {
  try {
    // Start transaction by updating resolution status
    const { error: resolutionError } = await supabase
      .from('grn_discrepancy_resolutions')
      .update({
        resolution_status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', resolutionId);

    if (resolutionError) throw resolutionError;

    // Update purchase order status
    const { error: orderError } = await supabase
      .from('purchase_orders')
      .update({
        status: resolutionType === 'replace' ? 'replaced' : 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseOrderId);

    if (orderError) throw orderError;

    toast.success(`Discrepancy resolution completed - Order marked as ${resolutionType}d`);
    return true;
  } catch (error) {
    console.error('Error completing discrepancy resolution:', error);
    toast.error('Failed to complete discrepancy resolution');
    return false;
  }
};

export const rejectDiscrepancyResolution = async (
  resolutionId: string,
  rejectionReason?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grn_discrepancy_resolutions')
      .update({
        resolution_status: 'rejected',
        resolution_notes: rejectionReason ? 
          `Rejected: ${rejectionReason}` : 
          'Resolution rejected'
      })
      .eq('id', resolutionId);

    if (error) throw error;
    
    toast.success('Discrepancy resolution rejected');
    return true;
  } catch (error) {
    console.error('Error rejecting discrepancy resolution:', error);
    toast.error('Failed to reject discrepancy resolution');
    return false;
  }
};
