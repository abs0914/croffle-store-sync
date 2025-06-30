
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
    const { error } = await supabase
      .from('order_audit_trail')
      .insert({
        order_id: orderId,
        order_type: orderType,
        action,
        old_status: oldStatus,
        new_status: newStatus,
        change_reason: changeReason,
        changed_by: (await supabase.auth.getUser()).data.user?.id
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
    let query = supabase
      .from('order_audit_trail')
      .select(`
        *,
        purchase_order:purchase_orders!order_audit_trail_order_id_fkey(
          order_number,
          store_id,
          store:stores(name)
        ),
        grn:goods_received_notes!order_audit_trail_order_id_fkey(
          grn_number,
          purchase_order:purchase_orders(
            store_id,
            store:stores(name)
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (orderType) {
      query = query.eq('order_type', orderType);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by store if specified
    let filteredData = data || [];
    if (storeId) {
      filteredData = filteredData.filter((entry: any) => {
        if (entry.purchase_order?.store_id === storeId) return true;
        if (entry.grn?.purchase_order?.store_id === storeId) return true;
        return false;
      });
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
