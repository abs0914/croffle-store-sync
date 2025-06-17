
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreMetrics {
  id: string;
  store_id: string;
  metric_date: string;
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  inventory_turnover: number;
  low_stock_items: number;
  out_of_stock_items: number;
  created_at: string;
  updated_at: string;
}

export const fetchStoreMetrics = async (
  storeId: string,
  startDate?: string,
  endDate?: string
): Promise<StoreMetrics[]> => {
  try {
    let query = supabase
      .from('store_metrics')
      .select('*')
      .eq('store_id', storeId)
      .order('metric_date', { ascending: false });

    if (startDate) {
      query = query.gte('metric_date', startDate);
    }

    if (endDate) {
      query = query.lte('metric_date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching store metrics:', error);
    toast.error('Failed to fetch store metrics');
    return [];
  }
};

export const getDashboardSummary = async (storeId: string): Promise<{
  todaySales: number;
  todayOrders: number;
  avgOrderValue: number;
  inventoryAlerts: number;
  weeklyGrowth: number;
}> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get today's metrics
    const { data: todayMetrics } = await supabase
      .from('store_metrics')
      .select('*')
      .eq('store_id', storeId)
      .eq('metric_date', today)
      .single();

    // Get last week's metrics for comparison
    const { data: lastWeekMetrics } = await supabase
      .from('store_metrics')
      .select('*')
      .eq('store_id', storeId)
      .eq('metric_date', lastWeek)
      .single();

    // Get inventory alerts count
    const { data: alerts } = await supabase
      .from('store_inventory_alerts')
      .select('id')
      .eq('store_id', storeId)
      .eq('is_acknowledged', false);

    const todaySales = todayMetrics?.total_sales || 0;
    const lastWeekSales = lastWeekMetrics?.total_sales || 0;
    const weeklyGrowth = lastWeekSales > 0 ? ((todaySales - lastWeekSales) / lastWeekSales) * 100 : 0;

    return {
      todaySales,
      todayOrders: todayMetrics?.total_orders || 0,
      avgOrderValue: todayMetrics?.average_order_value || 0,
      inventoryAlerts: alerts?.length || 0,
      weeklyGrowth
    };
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return {
      todaySales: 0,
      todayOrders: 0,
      avgOrderValue: 0,
      inventoryAlerts: 0,
      weeklyGrowth: 0
    };
  }
};
