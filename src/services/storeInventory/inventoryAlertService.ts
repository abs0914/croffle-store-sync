
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryAlert {
  id: string;
  store_id: string;
  inventory_stock_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'reorder_point';
  threshold_quantity: number;
  current_quantity: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  updated_at: string;
  inventory_stock?: {
    item: string;
    unit: string;
  };
}

export const fetchInventoryAlerts = async (storeId: string): Promise<InventoryAlert[]> => {
  try {
    const { data, error } = await supabase
      .from('store_inventory_alerts')
      .select(`
        *,
        inventory_stock:inventory_stock(item, unit)
      `)
      .eq('store_id', storeId)
      .eq('is_acknowledged', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    toast.error('Failed to fetch inventory alerts');
    return [];
  }
};

export const acknowledgeAlert = async (alertId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('store_inventory_alerts')
      .update({
        is_acknowledged: true,
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) throw error;
    
    toast.success('Alert acknowledged');
    return true;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    toast.error('Failed to acknowledge alert');
    return false;
  }
};

export const getAlertSummary = async (storeId: string) => {
  try {
    const { data, error } = await supabase
      .from('store_inventory_alerts')
      .select('alert_type')
      .eq('store_id', storeId)
      .eq('is_acknowledged', false);

    if (error) throw error;

    const summary = {
      lowStock: data?.filter(alert => alert.alert_type === 'low_stock').length || 0,
      outOfStock: data?.filter(alert => alert.alert_type === 'out_of_stock').length || 0,
      reorderPoint: data?.filter(alert => alert.alert_type === 'reorder_point').length || 0,
      total: data?.length || 0
    };

    return summary;
  } catch (error) {
    console.error('Error fetching alert summary:', error);
    return {
      lowStock: 0,
      outOfStock: 0,
      reorderPoint: 0,
      total: 0
    };
  }
};
