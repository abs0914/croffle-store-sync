
import { useState, useEffect, useCallback } from 'react';
import { 
  generateReorderRecommendations, 
  calculateConsumptionPatterns,
  analyzeMenuSalesConsumption,
  ReorderRecommendation,
  ConsumptionPattern,
  MenuSalesConsumption
} from '@/services/inventory/consumptionAnalyticsService';
import { 
  monitorStockLevels,
  getStockMonitoringMetrics,
  detectConsumptionSpikes,
  StockAlert,
  StockMonitoringMetrics
} from '@/services/inventory/stockMonitoringService';
import { 
  processRestockingAlerts,
  scheduleRestockingAlerts,
  RestockingNotification
} from '@/services/inventory/restockingNotificationService';
import { useAuth } from '@/components/Auth/AuthProvider';

export function useProactiveReordering(storeId: string) {
  const { user } = useAuth();
  const [reorderRecommendations, setReorderRecommendations] = useState<ReorderRecommendation[]>([]);
  const [consumptionPatterns, setConsumptionPatterns] = useState<ConsumptionPattern[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [monitoringMetrics, setMonitoringMetrics] = useState<StockMonitoringMetrics | null>(null);
  const [notifications, setNotifications] = useState<RestockingNotification[]>([]);
  const [salesConsumption, setSalesConsumption] = useState<MenuSalesConsumption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReorderData = useCallback(async () => {
    if (!storeId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const [
        recommendations,
        patterns,
        alerts,
        metrics,
        consumption
      ] = await Promise.all([
        generateReorderRecommendations(storeId),
        calculateConsumptionPatterns(storeId),
        monitorStockLevels(storeId),
        getStockMonitoringMetrics(storeId),
        analyzeMenuSalesConsumption(storeId, 30)
      ]);

      setReorderRecommendations(recommendations);
      setConsumptionPatterns(patterns);
      setStockAlerts(alerts);
      setMonitoringMetrics(metrics);
      setSalesConsumption(consumption);

      // Process notifications if user is available
      if (user?.id) {
        const notificationData = await processRestockingAlerts(storeId, user.id);
        setNotifications(notificationData);
      }
    } catch (err) {
      console.error('Error loading proactive reordering data:', err);
      setError('Failed to load reordering data');
    } finally {
      setIsLoading(false);
    }
  }, [storeId, user?.id]);

  const detectSpikes = useCallback(async () => {
    if (!storeId) return;

    try {
      const spikes = await detectConsumptionSpikes(storeId);
      setStockAlerts(prev => [...prev, ...spikes]);
    } catch (err) {
      console.error('Error detecting consumption spikes:', err);
    }
  }, [storeId]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setStockAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, dismissed: true }
          : notif
      )
    );
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  }, []);

  const getTopConsumingItems = useCallback(() => {
    return consumptionPatterns
      .sort((a, b) => b.daily_average - a.daily_average)
      .slice(0, 10);
  }, [consumptionPatterns]);

  const getCriticalItems = useCallback(() => {
    return reorderRecommendations.filter(rec => 
      rec.urgency_level === 'critical' || rec.days_until_stockout <= 1
    );
  }, [reorderRecommendations]);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(notif => !notif.read && !notif.dismissed);
  }, [notifications]);

  // Set up automatic monitoring
  useEffect(() => {
    if (!storeId || !user?.id) return;

    const interval = scheduleRestockingAlerts(storeId, user.id);
    
    return () => {
      clearInterval(interval);
    };
  }, [storeId, user?.id]);

  // Initial load
  useEffect(() => {
    loadReorderData();
  }, [loadReorderData]);

  // Refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadReorderData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadReorderData]);

  return {
    // Data
    reorderRecommendations,
    consumptionPatterns,
    stockAlerts,
    monitoringMetrics,
    notifications,
    salesConsumption,
    
    // Loading state
    isLoading,
    error,
    
    // Actions
    loadReorderData,
    detectSpikes,
    acknowledgeAlert,
    dismissNotification,
    markNotificationAsRead,
    
    // Computed values
    topConsumingItems: getTopConsumingItems(),
    criticalItems: getCriticalItems(),
    unreadNotifications: getUnreadNotifications(),
    
    // Metrics
    totalAlerts: stockAlerts.length,
    criticalAlerts: stockAlerts.filter(a => a.urgency === 'critical').length,
    recommendationsCount: reorderRecommendations.length,
    estimatedSavings: reorderRecommendations.reduce((sum, r) => sum + r.cost_impact, 0)
  };
}
