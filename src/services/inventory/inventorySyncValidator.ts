import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SyncHealthStatus {
  isHealthy: boolean;
  lastSuccessfulSync: Date | null;
  failureRate: number;
  recentFailures: number;
  canProcessSales: boolean;
  issues: string[];
}

/**
 * Real-time inventory sync validation service
 * Prevents sales when inventory sync is experiencing issues
 */
export class InventorySyncValidator {
  private static instance: InventorySyncValidator;
  private syncHealth: SyncHealthStatus | null = null;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 seconds
  private failureThreshold = 0.3; // 30% failure rate threshold
  private criticalFailureThreshold = 0.5; // 50% failure rate threshold

  private constructor() {}

  static getInstance(): InventorySyncValidator {
    if (!this.instance) {
      this.instance = new InventorySyncValidator();
    }
    return this.instance;
  }

  /**
   * Check if inventory sync is healthy enough to process sales
   */
  async validateSyncHealth(): Promise<SyncHealthStatus> {
    const now = Date.now();
    
    // Use cached result if recent
    if (this.syncHealth && (now - this.lastHealthCheck) < this.healthCheckInterval) {
      return this.syncHealth;
    }

    try {
      // Check recent sync performance (last 1 hour)
      const { data: recentSyncs, error } = await supabase
        .from('inventory_sync_audit')
        .select('sync_status, created_at, error_details')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error checking sync health:', error);
        return this.getEmergencyStatus();
      }

      const totalSyncs = recentSyncs?.length || 0;
      const failedSyncs = recentSyncs?.filter(sync => sync.sync_status === 'failed').length || 0;
      const recentFailures = recentSyncs?.slice(0, 10).filter(sync => sync.sync_status === 'failed').length || 0;
      const failureRate = totalSyncs > 0 ? failedSyncs / totalSyncs : 0;

      // Find last successful sync
      const lastSuccess = recentSyncs?.find(sync => sync.sync_status === 'success');
      const lastSuccessfulSync = lastSuccess ? new Date(lastSuccess.created_at) : null;

      const issues: string[] = [];
      let canProcessSales = true;

      // Analyze health status
      if (failureRate > this.criticalFailureThreshold) {
        issues.push(`Critical: ${Math.round(failureRate * 100)}% sync failure rate`);
        canProcessSales = false;
      } else if (failureRate > this.failureThreshold) {
        issues.push(`Warning: ${Math.round(failureRate * 100)}% sync failure rate`);
      }

      if (recentFailures >= 5) {
        issues.push(`${recentFailures} recent consecutive failures`);
        canProcessSales = false;
      }

      if (lastSuccessfulSync && (Date.now() - lastSuccessfulSync.getTime()) > 600000) {
        issues.push('No successful sync in the last 10 minutes');
        canProcessSales = false;
      }

      if (totalSyncs === 0) {
        issues.push('No recent sync data available');
        canProcessSales = false;
      }

      const healthStatus: SyncHealthStatus = {
        isHealthy: issues.length === 0 && canProcessSales,
        lastSuccessfulSync,
        failureRate,
        recentFailures,
        canProcessSales,
        issues
      };

      this.syncHealth = healthStatus;
      this.lastHealthCheck = now;

      // Log health status
      if (!healthStatus.isHealthy) {
        console.warn('🔴 Inventory sync health issues detected:', healthStatus);
      }

      return healthStatus;

    } catch (error) {
      console.error('Critical error checking sync health:', error);
      return this.getEmergencyStatus();
    }
  }

  /**
   * Emergency status when health check fails
   */
  private getEmergencyStatus(): SyncHealthStatus {
    return {
      isHealthy: false,
      lastSuccessfulSync: null,
      failureRate: 1,
      recentFailures: 10,
      canProcessSales: false,
      issues: ['Unable to verify sync health - emergency mode activated']
    };
  }

  /**
   * Validate if a sale can be processed based on sync health
   */
  async canProcessSale(): Promise<{ allowed: boolean; reason?: string }> {
    const health = await this.validateSyncHealth();
    
    if (!health.canProcessSales) {
      const reason = `Inventory sync issues detected: ${health.issues.join(', ')}`;
      
      // Show user notification
      toast.error('⚠️ Sales temporarily disabled due to inventory sync issues');
      
      return { allowed: false, reason };
    }

    return { allowed: true };
  }

  /**
   * Force refresh sync health status
   */
  async refreshHealth(): Promise<SyncHealthStatus> {
    this.lastHealthCheck = 0;
    return this.validateSyncHealth();
  }

  /**
   * Get current cached health status
   */
  getCurrentHealth(): SyncHealthStatus | null {
    return this.syncHealth;
  }

  /**
   * Override sync health for emergency sales (admin only)
   */
  overrideSyncHealth(adminOverride: boolean = false): void {
    if (adminOverride && this.syncHealth) {
      this.syncHealth.canProcessSales = true;
      this.syncHealth.issues.push('Admin override active');
      toast.warning('⚠️ Admin override: Sales enabled despite sync issues');
    }
  }
}