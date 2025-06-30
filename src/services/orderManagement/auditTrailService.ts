
import { supabase } from "@/integrations/supabase/client";
import { OrderAuditTrail } from "@/types/orderManagement";
import { toast } from "sonner";

export const logAuditTrailEntry = async (
  orderId: string,
  orderType: 'purchase' | 'delivery' | 'grn',
  action: string,
  oldStatus?: string,
  newStatus?: string,
  changeReason?: string
): Promise<void> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('order_audit_trail')
      .insert({
        order_id: orderId,
        order_type: orderType,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        change_reason: changeReason,
        changed_by: user.user?.id || ''
      });

    if (error) {
      console.error('Error logging audit trail:', error);
    }
  } catch (error) {
    console.error('Error in logAuditTrailEntry:', error);
  }
};

export const fetchAuditTrail = async (
  storeId?: string,
  orderType?: string,
  limit = 100
): Promise<OrderAuditTrail[]> => {
  try {
    console.log('Fetching audit trail with params:', { storeId, orderType, limit });
    
    let query = supabase
      .from('order_audit_trail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (orderType && orderType !== 'all') {
      query = query.eq('order_type', orderType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Raw audit trail data:', data);

    if (!data) {
      return [];
    }

    // If we need to filter by store, we'll need to do it client-side for now
    // since we need to look up the store_id from related tables
    let filteredData = data;
    
    if (storeId && storeId !== 'all') {
      // For now, we'll return all data and let the component handle store filtering
      // This can be optimized later with proper joins
      console.log('Store filtering requested but not implemented yet');
    }

    return filteredData as OrderAuditTrail[];
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    toast.error('Failed to fetch audit trail');
    return [];
  }
};

export const getAuditTrailSummary = async (storeId?: string) => {
  try {
    const auditData = await fetchAuditTrail(storeId, undefined, 1000);
    
    const summary = {
      totalEntries: auditData.length,
      byOrderType: {
        purchase: auditData.filter(e => e.order_type === 'purchase').length,
        delivery: auditData.filter(e => e.order_type === 'delivery').length,
        grn: auditData.filter(e => e.order_type === 'grn').length
      },
      byAction: auditData.reduce((acc: Record<string, number>, entry) => {
        acc[entry.action] = (acc[entry.action] || 0) + 1;
        return acc;
      }, {}),
      recentActivity: auditData.slice(0, 10)
    };

    return summary;
  } catch (error) {
    console.error('Error getting audit trail summary:', error);
    return {
      totalEntries: 0,
      byOrderType: { purchase: 0, delivery: 0, grn: 0 },
      byAction: {},
      recentActivity: []
    };
  }
};
