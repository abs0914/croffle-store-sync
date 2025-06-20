
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StockAlert {
  id: string;
  item_id: string;
  item_name: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'reorder_point' | 'consumption_spike';
  current_stock: number;
  threshold: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommended_action: string;
  created_at: string;
  acknowledged: boolean;
}

export interface StockMonitoringMetrics {
  total_alerts: number;
  critical_alerts: number;
  high_priority_alerts: number;
  items_needing_restock: number;
  estimated_stockout_value: number;
  avg_days_until_stockout: number;
}

export const monitorStockLevels = async (storeId: string): Promise<StockAlert[]> => {
  try {
    const { data: inventory, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;

    const alerts: StockAlert[] = [];

    inventory?.forEach(item => {
      const currentStock = item.stock_quantity;
      const minimumThreshold = item.minimum_threshold || 10;
      const reorderPoint = Math.ceil(minimumThreshold * 1.5);

      // Out of stock alert
      if (currentStock <= 0) {
        alerts.push({
          id: `${item.id}-out-of-stock`,
          item_id: item.id,
          item_name: item.item,
          alert_type: 'out_of_stock',
          current_stock: currentStock,
          threshold: 0,
          urgency: 'critical',
          message: `${item.item} is completely out of stock`,
          recommended_action: 'Order immediately to prevent service disruption',
          created_at: new Date().toISOString(),
          acknowledged: false
        });
      }
      // Low stock alert
      else if (currentStock <= minimumThreshold) {
        alerts.push({
          id: `${item.id}-low-stock`,
          item_id: item.id,
          item_name: item.item,
          alert_type: 'low_stock',
          current_stock: currentStock,
          threshold: minimumThreshold,
          urgency: currentStock <= minimumThreshold * 0.5 ? 'high' : 'medium',
          message: `${item.item} is running low (${currentStock} units remaining)`,
          recommended_action: 'Consider reordering soon',
          created_at: new Date().toISOString(),
          acknowledged: false
        });
      }
      // Reorder point alert
      else if (currentStock <= reorderPoint) {
        alerts.push({
          id: `${item.id}-reorder-point`,
          item_id: item.id,
          item_name: item.item,
          alert_type: 'reorder_point',
          current_stock: currentStock,
          threshold: reorderPoint,
          urgency: 'low',
          message: `${item.item} has reached reorder point`,
          recommended_action: 'Plan for next order',
          created_at: new Date().toISOString(),
          acknowledged: false
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error('Error monitoring stock levels:', error);
    return [];
  }
};

export const detectConsumptionSpikes = async (storeId: string): Promise<StockAlert[]> => {
  try {
    // Get recent transaction data (last 7 days)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('items, created_at')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', recentDate.toISOString());

    if (error) throw error;

    // Analyze consumption patterns for spikes
    const consumptionData: Record<string, number[]> = {};
    const alerts: StockAlert[] = [];

    // Process transactions by day
    transactions?.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      const date = tx.created_at.split('T')[0];
      
      items.forEach((item: any) => {
        const key = `${item.productId}-${date}`;
        if (!consumptionData[item.productId]) {
          consumptionData[item.productId] = [];
        }
        consumptionData[item.productId].push(item.quantity);
      });
    });

    // Detect spikes (consumption > 2x average)
    Object.entries(consumptionData).forEach(([productId, dailyConsumption]) => {
      const average = dailyConsumption.reduce((a, b) => a + b, 0) / dailyConsumption.length;
      const maxConsumption = Math.max(...dailyConsumption);
      
      if (maxConsumption > average * 2) {
        alerts.push({
          id: `${productId}-consumption-spike`,
          item_id: productId,
          item_name: 'Product Item', // Would need to fetch product name
          alert_type: 'consumption_spike',
          current_stock: 0, // Would need current stock data
          threshold: average,
          urgency: 'medium',
          message: `Unusual consumption spike detected (${maxConsumption} vs avg ${average.toFixed(1)})`,
          recommended_action: 'Monitor closely and consider increasing stock levels',
          created_at: new Date().toISOString(),
          acknowledged: false
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error('Error detecting consumption spikes:', error);
    return [];
  }
};

export const getStockMonitoringMetrics = async (storeId: string): Promise<StockMonitoringMetrics> => {
  try {
    const alerts = await monitorStockLevels(storeId);
    
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.urgency === 'critical').length;
    const highPriorityAlerts = alerts.filter(a => a.urgency === 'high').length;
    const itemsNeedingRestock = alerts.filter(a => 
      a.alert_type === 'out_of_stock' || a.alert_type === 'low_stock'
    ).length;

    // Calculate estimated stockout value and average days until stockout
    const { data: inventory, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;

    let estimatedStockoutValue = 0;
    let totalDaysUntilStockout = 0;
    let itemsWithLowStock = 0;

    inventory?.forEach(item => {
      if (item.stock_quantity <= (item.minimum_threshold || 10)) {
        estimatedStockoutValue += (item.cost || 0) * (item.minimum_threshold || 10);
        
        // Estimate days until stockout (simplified calculation)
        const daysUntilStockout = item.stock_quantity > 0 ? item.stock_quantity / 2 : 0;
        totalDaysUntilStockout += daysUntilStockout;
        itemsWithLowStock++;
      }
    });

    const avgDaysUntilStockout = itemsWithLowStock > 0 ? 
      totalDaysUntilStockout / itemsWithLowStock : 0;

    return {
      total_alerts: totalAlerts,
      critical_alerts: criticalAlerts,
      high_priority_alerts: highPriorityAlerts,
      items_needing_restock: itemsNeedingRestock,
      estimated_stockout_value: estimatedStockoutValue,
      avg_days_until_stockout: Math.round(avgDaysUntilStockout)
    };
  } catch (error) {
    console.error('Error getting stock monitoring metrics:', error);
    return {
      total_alerts: 0,
      critical_alerts: 0,
      high_priority_alerts: 0,
      items_needing_restock: 0,
      estimated_stockout_value: 0,
      avg_days_until_stockout: 0
    };
  }
};
