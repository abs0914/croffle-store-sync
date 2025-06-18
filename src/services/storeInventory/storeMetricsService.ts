
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreMetrics {
  id: string;
  store_id: string;
  metric_date: string;
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  inventory_turnover: number;
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

export const getTodayMetrics = async (storeId: string): Promise<StoreMetrics | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('store_metrics')
      .select('*')
      .eq('store_id', storeId)
      .eq('metric_date', today)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching today metrics:', error);
    return null;
  }
};

export const getInventoryMetrics = async (storeId: string) => {
  try {
    // Get inventory stock counts
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, minimum_threshold, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (stockError) throw stockError;

    const totalItems = stockData?.length || 0;
    const lowStockItems = stockData?.filter(item => 
      item.stock_quantity <= (item.minimum_threshold || 10)
    ).length || 0;
    const outOfStockItems = stockData?.filter(item => 
      item.stock_quantity <= 0
    ).length || 0;

    // Calculate inventory value
    const { data: valueData, error: valueError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, cost')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .not('cost', 'is', null);

    if (valueError) throw valueError;

    const totalValue = valueData?.reduce((sum, item) => 
      sum + (item.stock_quantity * (item.cost || 0)), 0
    ) || 0;

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      stockHealthPercentage: totalItems > 0 ? 
        Math.round(((totalItems - lowStockItems) / totalItems) * 100) : 100
    };
  } catch (error) {
    console.error('Error fetching inventory metrics:', error);
    return {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0,
      stockHealthPercentage: 100
    };
  }
};
