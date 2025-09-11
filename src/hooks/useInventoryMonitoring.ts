/**
 * Phase 4: Real-time Inventory Monitoring & Alerting System
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
  is_resolved: boolean;
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

    // Set up real-time monitoring
    const alertsChannel = supabase
      .channel('inventory-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_alerts',
          filter: 'alert_type=in.(inventory_deduction_failure,critical_system_failure)'
        },
        (payload) => {
          const newAlert = payload.new as SystemAlert;
          handleNewAlert(newAlert);
        }
      )
      .subscribe();

    const auditChannel = supabase
      .channel('inventory-audit')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_audit_log'
        },
        (payload) => {
          updateStatsFromAudit(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(auditChannel);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      // Load recent alerts
      const { data: alertsData } = await supabase
        .from('system_alerts')
        .select('*')
        .in('alert_type', ['inventory_deduction_failure', 'critical_system_failure'])
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertsData) {
        setAlerts(alertsData);
      }

      // Load stats from last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: auditData } = await supabase
        .from('inventory_audit_log')
        .select('status, created_at')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (auditData) {
        calculateStats(auditData);
      }

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
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
      const { error } = await supabase
        .from('system_alerts')
        .update({ is_resolved: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Alert resolved');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const runSystemHealthCheck = async () => {
    try {
      // Run comprehensive health check
      const { data, error } = await supabase.rpc('run_inventory_system_health_check');
      
      if (error) throw error;
      
      toast.success('System health check completed');
      return data;
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