/**
 * BACKGROUND SYNC HEALTH SERVICE
 * 
 * Moves sync health checking to a background interval instead of per-transaction.
 * This eliminates 100+ row queries on every transaction.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SyncHealthStatus {
  isHealthy: boolean;
  lastSuccessfulSync: Date | null;
  failureRate: number;
  recentFailures: number;
  canProcessSales: boolean;
  issues: string[];
}

class BackgroundSyncHealthService {
  private static instance: BackgroundSyncHealthService;
  private syncHealth: SyncHealthStatus;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  private constructor() {
    // Default to healthy to avoid blocking sales on first load
    this.syncHealth = {
      isHealthy: true,
      lastSuccessfulSync: new Date(),
      failureRate: 0,
      recentFailures: 0,
      canProcessSales: true,
      issues: []
    };
  }

  static getInstance(): BackgroundSyncHealthService {
    if (!this.instance) {
      this.instance = new BackgroundSyncHealthService();
    }
    return this.instance;
  }

  /**
   * Initialize background health checking
   * Call once when app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔄 SYNC HEALTH: Initializing background monitoring');
    
    // Do initial check
    await this.checkHealth();
    
    // Set up background interval (every 30 seconds)
    this.intervalId = setInterval(() => {
      this.checkHealth().catch(console.error);
    }, 30000);

    this.isInitialized = true;
  }

  /**
   * Get cached health status - NO DATABASE QUERY
   */
  canProcessSale(): { allowed: boolean; reason?: string } {
    if (!this.syncHealth.canProcessSales) {
      return { 
        allowed: false, 
        reason: `Sync issues: ${this.syncHealth.issues.join(', ')}` 
      };
    }
    return { allowed: true };
  }

  /**
   * Get current health status without query
   */
  getCurrentHealth(): SyncHealthStatus {
    return this.syncHealth;
  }

  /**
   * Background health check - runs on interval
   */
  private async checkHealth(): Promise<void> {
    try {
      const { data: recentSyncs, error } = await supabase
        .from('inventory_sync_audit')
        .select('sync_status, created_at')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50); // Reduced from 100

      if (error) {
        console.warn('⚠️ SYNC HEALTH: Check failed, keeping previous status');
        return;
      }

      const totalSyncs = recentSyncs?.length || 0;
      const failedSyncs = recentSyncs?.filter(s => s.sync_status === 'failed').length || 0;
      const recentFailures = recentSyncs?.slice(0, 5).filter(s => s.sync_status === 'failed').length || 0;
      const failureRate = totalSyncs > 0 ? failedSyncs / totalSyncs : 0;

      const lastSuccess = recentSyncs?.find(s => s.sync_status === 'success');
      const lastSuccessfulSync = lastSuccess ? new Date(lastSuccess.created_at) : null;

      const issues: string[] = [];
      let canProcessSales = true;

      // Only block for critical issues
      if (failureRate > 0.5) {
        issues.push(`Critical: ${Math.round(failureRate * 100)}% failure rate`);
        canProcessSales = false;
      }

      if (recentFailures >= 5) {
        issues.push(`${recentFailures} consecutive failures`);
        canProcessSales = false;
      }

      // If no sync data, allow sales (fresh system or sync not running)
      if (totalSyncs === 0) {
        canProcessSales = true;
      }

      this.syncHealth = {
        isHealthy: issues.length === 0,
        lastSuccessfulSync,
        failureRate,
        recentFailures,
        canProcessSales,
        issues
      };

      if (!this.syncHealth.isHealthy) {
        console.warn('⚠️ SYNC HEALTH:', this.syncHealth);
      }

    } catch (error) {
      console.warn('⚠️ SYNC HEALTH: Exception during check', error);
      // Keep previous status on error
    }
  }

  /**
   * Force immediate health refresh
   */
  async forceRefresh(): Promise<SyncHealthStatus> {
    await this.checkHealth();
    return this.syncHealth;
  }

  /**
   * Stop background monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isInitialized = false;
  }

  /**
   * Admin override for emergency
   */
  overrideHealth(): void {
    this.syncHealth.canProcessSales = true;
    this.syncHealth.issues.push('Admin override active');
  }
}

export const backgroundSyncHealth = BackgroundSyncHealthService.getInstance();
