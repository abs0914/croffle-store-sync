import { useState, useEffect, useCallback } from 'react';
import { ProactiveSyncMonitor, SyncHealthMetrics, AutoRepairResult } from '@/services/inventory/proactiveSyncMonitor';
import { RealTimeSyncValidator, SyncValidationSubscription } from '@/services/inventory/realTimeSyncValidator';

export interface InventorySyncHealthState {
  globalHealth: SyncHealthMetrics[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  averageHealth: number;
  criticalStores: SyncHealthMetrics[];
  autoRepairInProgress: boolean;
  realTimeEnabled: boolean;
}

/**
 * Hook for managing inventory sync health monitoring and auto-repair
 */
export const useInventorySyncHealth = (storeId?: string) => {
  const [state, setState] = useState<InventorySyncHealthState>({
    globalHealth: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    averageHealth: 0,
    criticalStores: [],
    autoRepairInProgress: false,
    realTimeEnabled: false
  });

  const [realTimeSubscription, setRealTimeSubscription] = useState<SyncValidationSubscription | null>(null);

  /**
   * Refresh sync health data
   */
  const refreshHealth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let healthData: SyncHealthMetrics[];
      
      if (storeId) {
        // Get health for specific store
        const storeHealth = await ProactiveSyncMonitor.getStoreSpecificHealth(storeId);
        healthData = [storeHealth];
      } else {
        // Get global health
        healthData = await ProactiveSyncMonitor.getGlobalSyncHealth();
      }

      const averageHealth = healthData.length > 0 
        ? Math.round(healthData.reduce((sum, m) => sum + m.syncHealthPercentage, 0) / healthData.length)
        : 0;

      const criticalStores = healthData.filter(m => m.syncHealthPercentage < 80);

      setState(prev => ({
        ...prev,
        globalHealth: healthData,
        isLoading: false,
        lastUpdated: new Date().toISOString(),
        averageHealth,
        criticalStores
      }));

    } catch (error) {
      console.error('Error refreshing sync health:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to refresh health data: ${error}`
      }));
    }
  }, [storeId]);

  /**
   * Attempt auto-repair for a specific store
   */
  const attemptRepair = useCallback(async (targetStoreId: string): Promise<AutoRepairResult | null> => {
    setState(prev => ({ ...prev, autoRepairInProgress: true }));

    try {
      const repairResult = await ProactiveSyncMonitor.attemptAutoRepair(targetStoreId);
      
      // Refresh health data after repair
      await refreshHealth();
      
      setState(prev => ({ ...prev, autoRepairInProgress: false }));
      
      return repairResult;

    } catch (error) {
      console.error('Error during auto-repair:', error);
      setState(prev => ({
        ...prev,
        autoRepairInProgress: false,
        error: `Auto-repair failed: ${error}`
      }));
      return null;
    }
  }, [refreshHealth]);

  /**
   * Enable/disable real-time monitoring
   */
  const toggleRealTimeMonitoring = useCallback((enabled: boolean) => {
    if (enabled && !realTimeSubscription) {
      // Start real-time monitoring
      const subscription = RealTimeSyncValidator.startRealTimeMonitoring(storeId);
      setRealTimeSubscription(subscription);
      setState(prev => ({ ...prev, realTimeEnabled: true }));
      
      console.log('✅ Real-time inventory sync monitoring enabled');
    } else if (!enabled && realTimeSubscription) {
      // Stop real-time monitoring
      realTimeSubscription.unsubscribe();
      setRealTimeSubscription(null);
      setState(prev => ({ ...prev, realTimeEnabled: false }));
      
      console.log('🛑 Real-time inventory sync monitoring disabled');
    }
  }, [storeId, realTimeSubscription]);

  /**
   * Get detailed sync report
   */
  const getSyncReport = useCallback(() => {
    const { globalHealth, averageHealth, criticalStores, lastUpdated } = state;
    
    const totalStores = globalHealth.length;
    const healthyStores = globalHealth.filter(m => m.syncHealthPercentage >= 90).length;
    const warningStores = globalHealth.filter(m => m.syncHealthPercentage >= 70 && m.syncHealthPercentage < 90).length;
    const criticalStoreCount = criticalStores.length;

    const report = {
      summary: {
        totalStores,
        averageHealth,
        healthyStores,
        warningStores,
        criticalStores: criticalStoreCount,
        lastUpdated
      },
      storeBreakdown: globalHealth.map(store => ({
        name: store.storeName,
        health: store.syncHealthPercentage,
        status: store.syncHealthPercentage >= 90 ? 'healthy' : 
                store.syncHealthPercentage >= 70 ? 'warning' : 'critical',
        totalProducts: store.totalProducts,
        validProducts: store.validProducts,
        invalidProducts: store.invalidProducts,
        criticalIssues: store.criticalIssues.length,
        warnings: store.warnings.length
      })),
      recommendations: [
        ...(criticalStoreCount > 0 ? [`${criticalStoreCount} stores need immediate attention`] : []),
        ...(warningStores > 0 ? [`${warningStores} stores have sync warnings`] : []),
        ...(averageHealth < 80 ? ['Consider running system-wide auto-repair'] : []),
        ...(averageHealth >= 95 ? ['Inventory sync health is excellent'] : [])
      ]
    };

    return report;
  }, [state]);

  /**
   * Schedule automatic monitoring
   */
  const scheduleMonitoring = useCallback(async (intervalMinutes: number = 30) => {
    try {
      await ProactiveSyncMonitor.scheduleProactiveMonitoring(intervalMinutes);
      console.log(`✅ Scheduled automatic monitoring every ${intervalMinutes} minutes`);
    } catch (error) {
      console.error('Error scheduling monitoring:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to schedule monitoring: ${error}`
      }));
    }
  }, []);

  // Initial health check on mount
  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  // Cleanup real-time subscription on unmount
  useEffect(() => {
    return () => {
      if (realTimeSubscription) {
        realTimeSubscription.unsubscribe();
      }
    };
  }, [realTimeSubscription]);

  return {
    // State
    ...state,
    
    // Actions
    refreshHealth,
    attemptRepair,
    toggleRealTimeMonitoring,
    getSyncReport,
    scheduleMonitoring,
    
    // Computed values
    isHealthy: state.averageHealth >= 90,
    needsAttention: state.criticalStores.length > 0,
    hasWarnings: state.globalHealth.some(m => m.warnings.length > 0),
    
    // Real-time status
    realTimeQueueStatus: realTimeSubscription ? RealTimeSyncValidator.getQueueStatus() : null
  };
};