
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
    if (!storeId) {
      console.warn('No store ID provided to fetchStoreMetrics');
      return [];
    }

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

    if (error) {
      console.error('Error fetching store metrics:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching store metrics:', error);
    return [];
  }
};

export const getTodayMetrics = async (storeId: string): Promise<StoreMetrics | null> => {
  try {
    if (!storeId) {
      console.warn('No store ID provided to getTodayMetrics');
      return null;
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('store_metrics')
      .select('*')
      .eq('store_id', storeId)
      .eq('metric_date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, return null
        return null;
      }
      console.error('Error fetching today metrics:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching today metrics:', error);
    return null;
  }
};

export const getDashboardSummary = async (storeId: string) => {
  try {
    if (!storeId) {
      console.warn('No store ID provided to getDashboardSummary');
      return {
        todaySales: 0,
        todayOrders: 0,
        avgOrderValue: 0,
        inventoryAlerts: 0,
        weeklyGrowth: 0
      };
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get today's metrics
    const todayMetrics = await getTodayMetrics(storeId);
    
    // Get real inventory alerts count from inventory_stock table
    let alertsCount = 0;
    try {
      const { data: alertsData, error: alertsError } = await supabase
        .from('inventory_stock')
        .select('id, stock_quantity, minimum_threshold')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (!alertsError && alertsData) {
        alertsCount = alertsData.filter(item => 
          item.stock_quantity <= (item.minimum_threshold || 10)
        ).length;
      }
    } catch (error) {
      console.log('Inventory alerts not available:', error);
    }

    // Get week ago metrics for comparison
    let weeklyGrowth = 0;
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoDate = weekAgo.toISOString().split('T')[0];
      
      const { data: weekAgoMetrics } = await supabase
        .from('store_metrics')
        .select('*')
        .eq('store_id', storeId)
        .eq('metric_date', weekAgoDate)
        .single();

      if (weekAgoMetrics && todayMetrics) {
        const todaySales = todayMetrics.total_sales || 0;
        const weekAgoSales = weekAgoMetrics.total_sales || 0;
        weeklyGrowth = weekAgoSales > 0 ? ((todaySales - weekAgoSales) / weekAgoSales) * 100 : 0;
      }
    } catch (error) {
      console.log('Weekly metrics comparison not available');
    }

    console.log(`📊 Dashboard Summary for store ${storeId}:`, {
      todaySales: todayMetrics?.total_sales || 0,
      todayOrders: todayMetrics?.total_orders || 0,
      avgOrderValue: todayMetrics?.average_order_value || 0,
      inventoryAlerts: alertsCount,
      weeklyGrowth
    });

    return {
      todaySales: todayMetrics?.total_sales || 0,
      todayOrders: todayMetrics?.total_orders || 0,
      avgOrderValue: todayMetrics?.average_order_value || 0,
      inventoryAlerts: alertsCount,
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

export const getInventoryMetrics = async (storeId: string) => {
  try {
    if (!storeId) {
      console.warn('No store ID provided to getInventoryMetrics');
      return {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
        stockHealthPercentage: 100
      };
    }

    // Get real inventory stock counts from inventory_stock table
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .select('stock_quantity, minimum_threshold, is_active, cost')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (stockError) {
      console.error('Error fetching inventory stock:', stockError);
      return {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0,
        stockHealthPercentage: 100
      };
    }

    const totalItems = stockData?.length || 0;
    const lowStockItems = stockData?.filter(item => 
      item.stock_quantity <= (item.minimum_threshold || 10) && item.stock_quantity > 0
    ).length || 0;
    const outOfStockItems = stockData?.filter(item => 
      item.stock_quantity <= 0
    ).length || 0;

    const totalValue = stockData?.reduce((sum, item) => 
      sum + (item.stock_quantity * (item.cost || 0)), 0
    ) || 0;

    const stockHealthPercentage = totalItems > 0 ? 
      Math.round(((totalItems - lowStockItems - outOfStockItems) / totalItems) * 100) : 100;

    console.log(`📦 Inventory Metrics for store ${storeId}:`, {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      stockHealthPercentage
    });

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      stockHealthPercentage
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
