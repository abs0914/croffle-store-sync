import { supabase } from "@/integrations/supabase/client";

/**
 * Predictive Availability Management Service
 * Forecasts ingredient needs and manages proactive transfers
 */
export class AvailabilityForecastingService {
  
  /**
   * Analyze usage patterns and forecast ingredient needs
   */
  static async forecastIngredientNeeds(storeId: string, days: number = 7): Promise<{
    forecasts: Array<{
      ingredient: string;
      currentStock: number;
      predictedUsage: number;
      daysUntilEmpty: number;
      reorderRecommended: boolean;
      reorderQuantity: number;
      confidence: number;
    }>;
    summary: {
      totalIngredients: number;
      criticalItems: number;
      reorderRecommendations: number;
    };
  }> {
    try {
      console.log(`📈 Forecasting ingredient needs for store ${storeId} over ${days} days`);
      
      // Get historical usage data
      const usageData = await this.getHistoricalUsageData(storeId, 30); // Last 30 days
      
      // Get current inventory levels
      const { data: currentInventory } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      const forecasts = [];
      let criticalItems = 0;
      let reorderRecommendations = 0;
      
      for (const item of currentInventory || []) {
        const usage = usageData.get(item.id) || { daily: 0, trend: 0, dataPoints: 0, variance: 0 };
        
        // Calculate predictions
        const predictedDailyUsage = usage.daily * (1 + usage.trend);
        const predictedUsage = predictedDailyUsage * days;
        const daysUntilEmpty = predictedDailyUsage > 0 ? item.stock_quantity / predictedDailyUsage : Infinity;
        
        // Determine if reorder is needed
        const reorderPoint = (item.minimum_threshold || 10) * 2; // Safety margin
        const reorderRecommended = daysUntilEmpty < (days * 1.5) || item.stock_quantity <= reorderPoint;
        
        // Calculate reorder quantity
        const safetyStock = predictedDailyUsage * 3; // 3 days safety
        const reorderQuantity = reorderRecommended ? 
          Math.max(predictedUsage + safetyStock - item.stock_quantity, item.minimum_threshold || 50) : 0;
        
        // Calculate confidence based on data quality
        const confidence = this.calculateConfidence(usage.dataPoints, usage.variance);
        
        if (daysUntilEmpty < 7) criticalItems++;
        if (reorderRecommended) reorderRecommendations++;
        
        forecasts.push({
          ingredient: item.item,
          currentStock: item.stock_quantity,
          predictedUsage: Math.round(predictedUsage),
          daysUntilEmpty: Math.round(daysUntilEmpty * 10) / 10,
          reorderRecommended,
          reorderQuantity: Math.round(reorderQuantity),
          confidence: Math.round(confidence * 100) / 100
        });
      }
      
      // Sort by urgency (days until empty)
      forecasts.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
      
      return {
        forecasts,
        summary: {
          totalIngredients: forecasts.length,
          criticalItems,
          reorderRecommendations
        }
      };
    } catch (error) {
      console.error('❌ Forecasting failed:', error);
      return {
        forecasts: [],
        summary: { totalIngredients: 0, criticalItems: 0, reorderRecommendations: 0 }
      };
    }
  }
  
  /**
   * Get historical usage data for analysis
   */
  private static async getHistoricalUsageData(storeId: string, days: number): Promise<Map<string, {
    daily: number;
    trend: number;
    dataPoints: number;
    variance: number;
  }>> {
    const usageMap = new Map();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    try {
      // Get inventory movements for analysis
      const { data: movements } = await supabase
        .from('inventory_movements')
        .select(`
          inventory_stock_id,
          quantity_change,
          created_at,
          movement_type,
          inventory_stock!inner(store_id, item)
        `)
        .eq('inventory_stock.store_id', storeId)
        .gte('created_at', cutoffDate.toISOString())
        .in('movement_type', ['sale', 'recipe_usage']);
      
      // Aggregate usage by inventory item
      const itemUsage = new Map<string, number[]>();
      
      for (const movement of movements || []) {
        if (movement.quantity_change < 0) { // Outgoing usage
          const itemId = movement.inventory_stock_id;
          const usage = Math.abs(movement.quantity_change);
          
          if (!itemUsage.has(itemId)) {
            itemUsage.set(itemId, []);
          }
          itemUsage.get(itemId)!.push(usage);
        }
      }
      
      // Calculate statistics for each item
      for (const [itemId, usageArray] of itemUsage) {
        const totalUsage = usageArray.reduce((sum, val) => sum + val, 0);
        const dailyAverage = totalUsage / days;
        const variance = this.calculateVariance(usageArray);
        
        // Simple trend calculation (last half vs first half)
        const midpoint = Math.floor(usageArray.length / 2);
        const firstHalf = usageArray.slice(0, midpoint);
        const secondHalf = usageArray.slice(midpoint);
        
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
        
        const trend = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0;
        
        usageMap.set(itemId, {
          daily: dailyAverage,
          trend,
          dataPoints: usageArray.length,
          variance
        });
      }
      
      return usageMap;
    } catch (error) {
      console.error('Failed to get historical usage:', error);
      return new Map();
    }
  }
  
  /**
   * Calculate statistical variance
   */
  private static calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
  
  /**
   * Calculate prediction confidence based on data quality
   */
  private static calculateConfidence(dataPoints: number, variance: number): number {
    // More data points = higher confidence
    const dataConfidence = Math.min(dataPoints / 20, 1); // Max at 20 data points
    
    // Lower variance = higher confidence
    const varianceConfidence = Math.max(0, 1 - (variance / 100)); // Normalize variance impact
    
    return (dataConfidence * 0.6) + (varianceConfidence * 0.4);
  }
  
  /**
   * Trigger proactive commissary-to-store transfers
   */
  static async triggerProactiveTransfers(storeId: string): Promise<{
    transfersTriggered: number;
    estimatedDeliveryTime: string;
    transfers: Array<{
      item: string;
      quantity: number;
      reason: string;
      urgency: 'critical' | 'high' | 'medium' | 'low';
    }>;
  }> {
    try {
      console.log(`🚚 Triggering proactive transfers for store ${storeId}`);
      
      // Get forecasting data
      const forecast = await this.forecastIngredientNeeds(storeId, 7);
      
      const transfers = [];
      
      for (const item of forecast.forecasts) {
        if (item.reorderRecommended) {
          let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
          let reason = `Forecasted shortage in ${item.daysUntilEmpty} days`;
          
          if (item.daysUntilEmpty < 1) {
            urgency = 'critical';
            reason = 'Critical - stock depleted within 24 hours';
          } else if (item.daysUntilEmpty < 3) {
            urgency = 'high';
            reason = `High priority - stock depleted in ${Math.round(item.daysUntilEmpty)} days`;
          } else if (item.daysUntilEmpty < 7) {
            urgency = 'medium';
            reason = `Medium priority - stock depleted in ${Math.round(item.daysUntilEmpty)} days`;
          }
          
          // Check if commissary has sufficient stock
          const { data: commissaryStock } = await supabase
            .from('commissary_inventory')
            .select('current_stock')
            .ilike('name', `%${item.ingredient}%`)
            .single();
          
          if (commissaryStock && commissaryStock.current_stock >= item.reorderQuantity) {
            transfers.push({
              item: item.ingredient,
              quantity: item.reorderQuantity,
              reason,
              urgency
            });
            
            // Create restock request
            await this.createAutomaticRestockRequest(storeId, item, urgency, reason);
          }
        }
      }
      
      // Estimate delivery time based on urgency
      const criticalTransfers = transfers.filter(t => t.urgency === 'critical').length;
      const estimatedDeliveryTime = criticalTransfers > 0 ? 'Within 4 hours' : 'Next business day';
      
      console.log(`✅ Triggered ${transfers.length} proactive transfers`);
      
      return {
        transfersTriggered: transfers.length,
        estimatedDeliveryTime,
        transfers
      };
    } catch (error) {
      console.error('❌ Proactive transfers failed:', error);
      return {
        transfersTriggered: 0,
        estimatedDeliveryTime: 'Unknown',
        transfers: []
      };
    }
  }
  
  /**
   * Create automatic restock request
   */
  private static async createAutomaticRestockRequest(
    storeId: string,
    item: any,
    urgency: string,
    reason: string
  ): Promise<void> {
    try {
      // Find commissary item
      const { data: commissaryItem } = await supabase
        .from('commissary_inventory')
        .select('id')
        .ilike('name', `%${item.ingredient}%`)
        .single();
      
      if (commissaryItem) {
        await supabase
          .from('commissary_restock_requests')
          .insert({
            store_id: storeId,
            commissary_item_id: commissaryItem.id,
            requested_quantity: item.reorderQuantity,
            priority: urgency,
            status: 'pending',
            justification: `Automated forecast: ${reason}. Confidence: ${Math.round(item.confidence * 100)}%`,
            requested_by: null // System request
          });
      }
    } catch (error) {
      console.error('Failed to create restock request:', error);
    }
  }
  
  /**
   * Calculate smart reorder points for all store ingredients
   */
  static async calculateSmartReorderPoints(storeId: string): Promise<{
    updated: number;
    recommendations: Array<{
      ingredient: string;
      currentThreshold: number;
      recommendedThreshold: number;
      reason: string;
    }>;
  }> {
    try {
      console.log(`🎯 Calculating smart reorder points for store ${storeId}`);
      
      const forecast = await this.forecastIngredientNeeds(storeId, 14);
      const recommendations = [];
      let updated = 0;
      
      for (const item of forecast.forecasts) {
        // Calculate optimal reorder point based on usage patterns and lead time
        const leadTimeDays = 2; // Assume 2-day lead time
        const safetyStock = item.predictedUsage / 14 * leadTimeDays * 1.5; // 50% safety margin
        const recommendedThreshold = Math.max(safetyStock, 5); // Minimum threshold of 5
        
        // Get current threshold
        const { data: currentItem } = await supabase
          .from('inventory_stock')
          .select('minimum_threshold, item')
          .eq('store_id', storeId)
          .eq('item', item.ingredient)
          .single();
        
        if (currentItem) {
          const currentThreshold = currentItem.minimum_threshold || 10;
          const thresholdDifference = Math.abs(recommendedThreshold - currentThreshold);
          
          if (thresholdDifference > 5) { // Significant difference
            let reason = '';
            if (recommendedThreshold > currentThreshold) {
              reason = `Increase due to higher usage pattern (${item.predictedUsage}/14 days)`;
            } else {
              reason = `Decrease due to lower usage pattern (${item.predictedUsage}/14 days)`;
            }
            
            recommendations.push({
              ingredient: item.ingredient,
              currentThreshold,
              recommendedThreshold: Math.round(recommendedThreshold),
              reason
            });
            
            // Update the threshold
            await supabase
              .from('inventory_stock')
              .update({
                minimum_threshold: Math.round(recommendedThreshold),
                updated_at: new Date().toISOString()
              })
              .eq('store_id', storeId)
              .eq('item', item.ingredient);
            
            updated++;
          }
        }
      }
      
      console.log(`✅ Updated ${updated} reorder points`);
      
      return {
        updated,
        recommendations
      };
    } catch (error) {
      console.error('❌ Smart reorder calculation failed:', error);
      return {
        updated: 0,
        recommendations: []
      };
    }
  }
}