import { useState, useEffect, useCallback } from 'react';
import { InventorySyncMonitor, InventorySyncHealthStatus, InventorySyncAlert } from '@/services/inventory/inventorySyncMonitor';
import { toast } from 'sonner';

export interface InventorySyncMonitoringHook {
  // Status data
  healthStatuses: InventorySyncHealthStatus[];
  activeAlerts: InventorySyncAlert[];
  isMonitoring: boolean;
  isLoading: boolean;
  
  // Actions
  startMonitoring: (intervalMinutes?: number) => void;
  stopMonitoring: () => void;
  refreshHealthCheck: (storeId?: string, hours?: number) => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
  clearAcknowledgedAlerts: () => void;
  generateSyncReport: (storeId?: string, hours?: number) => Promise<any>;
  
  // Stats
  stats: {
    totalTransactions: number;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
    falseSuccessCount: number;
  };
}

export const useInventorySyncMonitoring = (storeId?: string): InventorySyncMonitoringHook => {
  const [healthStatuses, setHealthStatuses] = useState<InventorySyncHealthStatus[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<InventorySyncAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const monitor = InventorySyncMonitor.getInstance();

  // Calculate stats
  const stats = {
    totalTransactions: healthStatuses.length,
    healthyCount: healthStatuses.filter(s => s.status === 'healthy').length,
    warningCount: healthStatuses.filter(s => s.status === 'warning').length,
    criticalCount: healthStatuses.filter(s => s.status === 'critical').length,
    falseSuccessCount: healthStatuses.filter(s => 
      s.syncStatus === 'success' && s.itemsProcessed > 0 && s.actualMovements === 0
    ).length
  };

  const refreshHealthCheck = useCallback(async (targetStoreId?: string, hours = 24) => {
    setIsLoading(true);
    try {
      console.log('🔄 Refreshing inventory sync health check...');
      
      const statuses = await monitor.checkSyncHealth(targetStoreId || storeId, hours);
      setHealthStatuses(statuses);
      
      const newAlerts = await monitor.generateAlerts(statuses);
      if (newAlerts.length > 0) {
        setActiveAlerts(prev => [...prev, ...newAlerts]);
        
        // Show toast for critical alerts
        const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');
        if (criticalAlerts.length > 0) {
          toast.error(`${criticalAlerts.length} critical inventory sync issues detected!`);
        }
      }
      
      console.log('✅ Health check completed:', {
        totalStatuses: statuses.length,
        newAlerts: newAlerts.length,
        criticalIssues: statuses.filter(s => s.status === 'critical').length
      });
      
    } catch (error) {
      console.error('❌ Error refreshing health check:', error);
      toast.error('Failed to refresh inventory sync health');
    } finally {
      setIsLoading(false);
    }
  }, [monitor, storeId]);

  const startMonitoring = useCallback((intervalMinutes = 5) => {
    try {
      monitor.startMonitoring(intervalMinutes);
      setIsMonitoring(true);
      toast.success(`Started inventory sync monitoring (every ${intervalMinutes} minutes)`);
      
      // Initial health check
      refreshHealthCheck();
      
      console.log(`🔄 Inventory sync monitoring started (${intervalMinutes} minute intervals)`);
    } catch (error) {
      console.error('❌ Error starting monitoring:', error);
      toast.error('Failed to start monitoring');
    }
  }, [monitor, refreshHealthCheck]);

  const stopMonitoring = useCallback(() => {
    try {
      monitor.stopMonitoring();
      setIsMonitoring(false);
      toast.info('Stopped inventory sync monitoring');
      console.log('⏹️ Inventory sync monitoring stopped');
    } catch (error) {
      console.error('❌ Error stopping monitoring:', error);
      toast.error('Failed to stop monitoring');
    }
  }, [monitor]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    monitor.acknowledgeAlert(alertId);
    setActiveAlerts(monitor.getActiveAlerts());
    console.log('✅ Alert acknowledged:', alertId);
  }, [monitor]);

  const clearAcknowledgedAlerts = useCallback(() => {
    monitor.clearAcknowledgedAlerts();
    setActiveAlerts(monitor.getActiveAlerts());
    console.log('🧹 Cleared acknowledged alerts');
  }, [monitor]);

  const generateSyncReport = useCallback(async (targetStoreId?: string, hours = 24) => {
    try {
      console.log('📊 Generating sync report...');
      const report = await monitor.generateSyncReport(targetStoreId || storeId, hours);
      
      console.log('📋 Sync Report Generated:', {
        totalTransactions: report.summary.totalTransactions,
        successRate: ((report.summary.successfulSync / report.summary.totalTransactions) * 100).toFixed(1) + '%',
        criticalIssues: report.summary.criticalTransactions,
        falseSuccesses: report.summary.falseSuccessCount
      });
      
      return report;
    } catch (error) {
      console.error('❌ Error generating sync report:', error);
      toast.error('Failed to generate sync report');
      throw error;
    }
  }, [monitor, storeId]);

  // Initialize with health check on mount
  useEffect(() => {
    refreshHealthCheck();
  }, [refreshHealthCheck]);

  // Update active alerts from monitor
  useEffect(() => {
    const updateAlerts = () => {
      setActiveAlerts(monitor.getActiveAlerts());
    };

    // Check for new alerts every 30 seconds
    const alertInterval = setInterval(updateAlerts, 30000);
    
    return () => {
      clearInterval(alertInterval);
    };
  }, [monitor]);

  // Cleanup monitoring on unmount
  useEffect(() => {
    return () => {
      if (isMonitoring) {
        monitor.stopMonitoring();
      }
    };
  }, [monitor, isMonitoring]);

  return {
    // Status data
    healthStatuses,
    activeAlerts,
    isMonitoring,
    isLoading,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    refreshHealthCheck,
    acknowledgeAlert,
    clearAcknowledgedAlerts,
    generateSyncReport,
    
    // Stats
    stats
  };
};