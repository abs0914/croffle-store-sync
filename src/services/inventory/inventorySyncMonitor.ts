import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventorySyncHealthStatus {
  transactionId: string;
  status: 'healthy' | 'warning' | 'critical';
  syncStatus: string;
  itemsProcessed: number;
  actualMovements: number;
  errorDetails?: string;
  timeDifference: number;
  storeId: string;
}

export interface InventorySyncAlert {
  id: string;
  type: 'false_success' | 'missing_movements' | 'sync_failure' | 'threshold_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  transactionId?: string;
  storeId?: string;
  timestamp: Date;
  acknowledged: boolean;
}

export class InventorySyncMonitor {
  private static instance: InventorySyncMonitor;
  private activeAlerts: InventorySyncAlert[] = [];
  private monitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): InventorySyncMonitor {
    if (!InventorySyncMonitor.instance) {
      InventorySyncMonitor.instance = new InventorySyncMonitor();
    }
    return InventorySyncMonitor.instance;
  }

  /**
   * Check sync health for recent transactions
   */
  async checkSyncHealth(storeId?: string, hours = 24): Promise<InventorySyncHealthStatus[]> {
    try {
      console.log('🔍 Checking inventory sync health...');

      // Get recent sync audit records
      let auditQuery = supabase
        .from('inventory_sync_audit')
        .select(`
          transaction_id,
          sync_status,
          items_processed,
          error_details,
          created_at,
          transactions:transaction_id (
            store_id,
            status,
            created_at
          )
        `)
        .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (storeId) {
        // Filter by store through transactions table
        const { data: transactions } = await supabase
          .from('transactions')
          .select('id')
          .eq('store_id', storeId);
        
        if (transactions) {
          const transactionIds = transactions.map(t => t.id);
          auditQuery = auditQuery.in('transaction_id', transactionIds);
        }
      }

      const { data: audits, error: auditError } = await auditQuery.limit(100);

      if (auditError) {
        console.error('❌ Failed to fetch sync audit data:', auditError);
        throw auditError;
      }

      const healthStatuses: InventorySyncHealthStatus[] = [];

      for (const audit of audits || []) {
        // Count actual inventory movements for this transaction
        const { count: movementCount } = await supabase
          .from('inventory_movements')
          .select('*', { count: 'exact', head: true })
          .eq('reference_id', audit.transaction_id)
          .eq('reference_type', 'transaction');

        const actualMovements = movementCount || 0;
        const reportedItems = audit.items_processed || 0;

        // Determine health status
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        
        if (audit.sync_status === 'failed') {
          status = 'critical';
        } else if (audit.sync_status === 'success' && reportedItems > 0 && actualMovements === 0) {
          status = 'critical'; // False success - critical issue
        } else if (reportedItems !== actualMovements) {
          status = 'warning'; // Mismatch between reported and actual
        }

        healthStatuses.push({
          transactionId: audit.transaction_id,
          status,
          syncStatus: audit.sync_status,
          itemsProcessed: reportedItems,
          actualMovements,
          errorDetails: audit.error_details,
          timeDifference: Math.abs(reportedItems - actualMovements),
          storeId: audit.transactions?.store_id || 'unknown'
        });
      }

      return healthStatuses;
    } catch (error) {
      console.error('❌ Error checking sync health:', error);
      throw error;
    }
  }

  /**
   * Generate alerts based on sync health issues
   */
  async generateAlerts(healthStatuses: InventorySyncHealthStatus[]): Promise<InventorySyncAlert[]> {
    const alerts: InventorySyncAlert[] = [];

    for (const status of healthStatuses) {
      if (status.status === 'critical') {
        if (status.syncStatus === 'success' && status.actualMovements === 0 && status.itemsProcessed > 0) {
          // False success alert
          alerts.push({
            id: `false_success_${status.transactionId}`,
            type: 'false_success',
            severity: 'critical',
            message: `Transaction ${status.transactionId} reported success with ${status.itemsProcessed} items processed, but no inventory movements were created`,
            transactionId: status.transactionId,
            storeId: status.storeId,
            timestamp: new Date(),
            acknowledged: false
          });
        } else if (status.syncStatus === 'failed') {
          // Sync failure alert
          alerts.push({
            id: `sync_failure_${status.transactionId}`,
            type: 'sync_failure',
            severity: 'high',
            message: `Inventory sync failed for transaction ${status.transactionId}: ${status.errorDetails}`,
            transactionId: status.transactionId,
            storeId: status.storeId,
            timestamp: new Date(),
            acknowledged: false
          });
        }
      } else if (status.status === 'warning') {
        // Mismatch alert
        alerts.push({
          id: `mismatch_${status.transactionId}`,
          type: 'missing_movements',
          severity: 'medium',
          message: `Inventory sync reported ${status.itemsProcessed} items processed but only ${status.actualMovements} movements were created`,
          transactionId: status.transactionId,
          storeId: status.storeId,
          timestamp: new Date(),
          acknowledged: false
        });
      }
    }

    // Check for high failure rate
    const totalTransactions = healthStatuses.length;
    const failedTransactions = healthStatuses.filter(s => s.status === 'critical').length;
    const failureRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;

    if (failureRate > 20) { // More than 20% failure rate
      alerts.push({
        id: `high_failure_rate_${Date.now()}`,
        type: 'threshold_exceeded',
        severity: 'critical',
        message: `High inventory sync failure rate detected: ${failureRate.toFixed(1)}% (${failedTransactions}/${totalTransactions} transactions)`,
        timestamp: new Date(),
        acknowledged: false
      });
    }

    this.activeAlerts = [...this.activeAlerts, ...alerts];
    return alerts;
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMinutes = 5): void {
    if (this.monitoring) {
      console.log('⚠️ Monitoring already active');
      return;
    }

    this.monitoring = true;
    console.log(`🔄 Starting inventory sync monitoring (every ${intervalMinutes} minutes)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        const healthStatuses = await this.checkSyncHealth();
        const newAlerts = await this.generateAlerts(healthStatuses);

        if (newAlerts.length > 0) {
          const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');
          const highAlerts = newAlerts.filter(a => a.severity === 'high');
          
          if (criticalAlerts.length > 0) {
            toast.error(`${criticalAlerts.length} critical inventory sync issues detected!`);
          } else if (highAlerts.length > 0) {
            toast.error(`${highAlerts.length} high priority inventory sync issues detected`);
          }
        }
      } catch (error) {
        console.error('❌ Error during monitoring check:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.monitoring = false;
    console.log('⏹️ Stopped inventory sync monitoring');
  }

  /**
   * Get current alerts
   */
  getActiveAlerts(): InventorySyncAlert[] {
    return this.activeAlerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Clear all acknowledged alerts
   */
  clearAcknowledgedAlerts(): void {
    this.activeAlerts = this.activeAlerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Validate transaction before completion
   */
  async validateTransactionSync(transactionId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if sync audit exists
      const { data: audit } = await supabase
        .from('inventory_sync_audit')
        .select('*')
        .eq('transaction_id', transactionId)
        .maybeSingle();

      if (!audit) {
        errors.push('No inventory sync audit record found');
        return { isValid: false, errors, warnings };
      }

      if (audit.sync_status === 'failed') {
        errors.push(`Inventory sync failed: ${audit.error_details}`);
      }

      // Check for actual inventory movements
      const { count: movementCount } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .eq('reference_id', transactionId)
        .eq('reference_type', 'transaction');

      const actualMovements = movementCount || 0;
      const reportedItems = audit.items_processed || 0;

      if (audit.sync_status === 'success' && reportedItems > 0 && actualMovements === 0) {
        errors.push('Sync reported success but no inventory movements were created');
      } else if (reportedItems !== actualMovements) {
        warnings.push(`Sync reported ${reportedItems} items but ${actualMovements} movements were created`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('❌ Error validating transaction sync:', error);
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Generate comprehensive sync report
   */
  async generateSyncReport(storeId?: string, hours = 24): Promise<{
    summary: {
      totalTransactions: number;
      successfulSync: number;
      failedSync: number;
      falseSuccessCount: number;
      healthyTransactions: number;
      warningTransactions: number;
      criticalTransactions: number;
    };
    issues: InventorySyncHealthStatus[];
    recommendations: string[];
  }> {
    const healthStatuses = await this.checkSyncHealth(storeId, hours);
    
    const summary = {
      totalTransactions: healthStatuses.length,
      successfulSync: healthStatuses.filter(s => s.syncStatus === 'success').length,
      failedSync: healthStatuses.filter(s => s.syncStatus === 'failed').length,
      falseSuccessCount: healthStatuses.filter(s => 
        s.syncStatus === 'success' && s.itemsProcessed > 0 && s.actualMovements === 0
      ).length,
      healthyTransactions: healthStatuses.filter(s => s.status === 'healthy').length,
      warningTransactions: healthStatuses.filter(s => s.status === 'warning').length,
      criticalTransactions: healthStatuses.filter(s => s.status === 'critical').length
    };

    const issues = healthStatuses.filter(s => s.status !== 'healthy');
    
    const recommendations: string[] = [];
    
    if (summary.falseSuccessCount > 0) {
      recommendations.push(`${summary.falseSuccessCount} transactions show false success reporting - investigate ingredient mapping issues`);
    }
    
    if (summary.criticalTransactions > summary.totalTransactions * 0.1) {
      recommendations.push('High number of critical sync issues - review ingredient deduction service');
    }
    
    if (summary.warningTransactions > summary.totalTransactions * 0.2) {
      recommendations.push('Many transactions have sync mismatches - review inventory movement logging');
    }

    return { summary, issues, recommendations };
  }
}

// Export singleton instance and class
export const inventorySyncMonitor = InventorySyncMonitor.getInstance();

// Backward compatibility functions for existing code
export const startInventorySyncMonitoring = (
  transactionId: string,
  storeId: string,
  items: Array<{ productId: string; name: string; quantity: number }>
): void => {
  console.log('📊 Monitoring inventory sync for transaction:', transactionId);
  // Use the new monitor instance for actual monitoring
  inventorySyncMonitor.checkSyncHealth(storeId, 1);
};

export const reportInventorySyncSuccess = (transactionId: string): void => {
  console.log('✅ Inventory sync success reported:', transactionId);
};

export const reportInventorySyncFailure = (
  transactionId: string,
  storeId: string,
  errors: string[],
  productDetails?: { productId: string; name: string }[]
): void => {
  console.error('🚨 Inventory sync failure reported:', { transactionId, storeId, errors });
};