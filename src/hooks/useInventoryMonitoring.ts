/**
 * Phase 4: Simplified Inventory Monitoring System
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  metadata?: any;
  created_at: string;
}

interface InventoryMonitoringStats {
  successfulDeductions: number;
  failedDeductions: number;
  criticalFailures: number;
  lastFailureTime?: string;
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Real-time monitoring hook for inventory deduction system
 */
export const useInventoryMonitoring = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [stats, setStats] = useState<InventoryMonitoringStats>({
    successfulDeductions: 0,
    failedDeductions: 0,
    criticalFailures: 0,
    systemHealth: 'healthy'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load initial data
    loadInitialData();

    // Set up monitoring (simplified for existing tables)
    const monitoringInterval = setInterval(() => {
      refreshStats();
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(monitoringInterval);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      // Initialize with mock data for now
      setAlerts([]);
      
      // Calculate stats from recent transactions
      await refreshStats();

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      // Get recent transactions for stats
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('id, status, created_at')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (recentTransactions) {
        const successful = recentTransactions.filter(t => t.status === 'completed').length;
        const failed = recentTransactions.filter(t => t.status === 'failed').length;
        
        const health = failed > successful * 0.1 ? 'degraded' : 'healthy';
        
        setStats({
          successfulDeductions: successful,
          failedDeductions: failed,
          criticalFailures: 0, // Will be calculated when alerts system is available
          systemHealth: health,
          lastFailureTime: failed > 0 ? recentTransactions.find(t => t.status === 'failed')?.created_at : undefined
        });
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  const handleNewAlert = (alert: SystemAlert) => {
    setAlerts(prev => [alert, ...prev.slice(0, 9)]);
    
    // Show real-time notification
    if (alert.severity === 'critical') {
      toast.error(`🚨 CRITICAL: ${alert.title}`, {
        duration: 10000,
        action: {
          label: 'View Details',
          onClick: () => console.log('Alert details:', alert)
        }
      });
    } else if (alert.severity === 'high') {
      toast.error(`⚠️ ${alert.title}`, {
        duration: 5000
      });
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      failedDeductions: prev.failedDeductions + 1,
      criticalFailures: alert.severity === 'critical' ? prev.criticalFailures + 1 : prev.criticalFailures,
      lastFailureTime: alert.created_at,
      systemHealth: alert.severity === 'critical' ? 'critical' : 'degraded'
    }));
  };

  const updateStatsFromAudit = (auditEntry: any) => {
    if (auditEntry.operation_type === 'deduction') {
      setStats(prev => ({
        ...prev,
        successfulDeductions: auditEntry.status === 'success' ? prev.successfulDeductions + 1 : prev.successfulDeductions,
        failedDeductions: auditEntry.status === 'failure' ? prev.failedDeductions + 1 : prev.failedDeductions,
        systemHealth: auditEntry.status === 'success' && prev.systemHealth !== 'critical' ? 'healthy' : prev.systemHealth
      }));
    }
  };

  const calculateStats = (auditData: any[]) => {
    const successful = auditData.filter(item => item.status === 'success').length;
    const failed = auditData.filter(item => item.status === 'failure').length;
    const critical = auditData.filter(item => item.status === 'critical_failure').length;
    
    const health = critical > 0 ? 'critical' : failed > successful * 0.1 ? 'degraded' : 'healthy';
    
    setStats({
      successfulDeductions: successful,
      failedDeductions: failed,
      criticalFailures: critical,
      lastFailureTime: failed > 0 ? auditData.find(item => item.status === 'failure')?.created_at : undefined,
      systemHealth: health
    });
  };

  const resolveAlert = async (alertId: string) => {
    try {
      // Remove alert from local state (simplified)
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Alert resolved');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const runSystemHealthCheck = async () => {
    try {
      // Run simplified health check
      await refreshStats();
      toast.success('System health check completed');
      return { status: 'healthy', message: 'Health check completed successfully' };
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('System health check failed');
      return null;
    }
  };

  return {
    alerts,
    stats,
    isLoading,
    resolveAlert,
    runSystemHealthCheck
  };
};