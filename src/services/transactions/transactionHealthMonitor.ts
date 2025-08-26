/**
 * Transaction Health Monitor
 * Real-time monitoring and alerting for transaction system health
 */

import { supabase } from "@/integrations/supabase/client";
import { transactionErrorLogger } from "./transactionErrorLogger";

export interface TransactionHealthMetrics {
  successRate: number;
  avgProcessingTime: number;
  errorRate: number;
  inventoryFailureRate: number;
  lastHealthCheck: string;
  systemStatus: 'healthy' | 'degraded' | 'critical';
  recommendations: string[];
}

class TransactionHealthMonitor {
  private static instance: TransactionHealthMonitor;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(metrics: TransactionHealthMetrics) => void> = new Set();

  static getInstance(): TransactionHealthMonitor {
    if (!TransactionHealthMonitor.instance) {
      TransactionHealthMonitor.instance = new TransactionHealthMonitor();
    }
    return TransactionHealthMonitor.instance;
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(intervalMinutes: number = 15): void {
    this.stopMonitoring(); // Clear any existing interval

    console.log('🔍 Starting transaction health monitoring...');
    
    // Initial health check
    this.performHealthCheck();

    // Set up recurring health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('⏹️ Stopped transaction health monitoring');
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<TransactionHealthMetrics> {
    try {
      console.log('🔍 Performing transaction system health check...');

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get recent transactions
      const { data: recentTransactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, status, created_at, total')
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false });

      if (transactionsError) {
        throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
      }

      // Get recent errors (mock for now since table doesn't exist)
      // TODO: Implement real database querying when transaction_error_logs table is available
      const recentErrors: any[] = [];
      console.log('Health check - mock error query for timeframe:', oneHourAgo.toISOString());

      // Calculate metrics
      const totalTransactions = recentTransactions?.length || 0;
      const successfulTransactions = recentTransactions?.filter(t => t.status === 'completed').length || 0;
      const totalErrors = recentErrors?.length || 0;
      const inventoryErrors = 0; // Mock since we don't have error table yet

      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 100;
      const errorRate = totalTransactions > 0 ? (totalErrors / totalTransactions) * 100 : 0;
      const inventoryFailureRate = totalTransactions > 0 ? (inventoryErrors / totalTransactions) * 100 : 0;

      // Determine system status
      let systemStatus: TransactionHealthMetrics['systemStatus'] = 'healthy';
      const recommendations: string[] = [];

      if (successRate < 95) {
        systemStatus = 'critical';
        recommendations.push('Critical: Transaction success rate below 95%');
      } else if (successRate < 98) {
        systemStatus = 'degraded';
        recommendations.push('Warning: Transaction success rate below 98%');
      }

      if (errorRate > 10) {
        systemStatus = 'critical';
        recommendations.push('Critical: High error rate detected');
      } else if (errorRate > 5) {
        systemStatus = 'degraded';
        recommendations.push('Warning: Elevated error rate');
      }

      if (inventoryFailureRate > 15) {
        recommendations.push('High inventory failure rate - check recipe mappings');
      }

      if (totalTransactions === 0) {
        recommendations.push('No recent transactions - system may be offline');
      }

      const metrics: TransactionHealthMetrics = {
        successRate: Math.round(successRate * 100) / 100,
        avgProcessingTime: 0, // TODO: Calculate from performance logs
        errorRate: Math.round(errorRate * 100) / 100,
        inventoryFailureRate: Math.round(inventoryFailureRate * 100) / 100,
        lastHealthCheck: now.toISOString(),
        systemStatus,
        recommendations
      };

      console.log('📊 Health check completed:', metrics);

      // Notify listeners
      this.notifyListeners(metrics);

      // Log critical issues
      if (systemStatus === 'critical') {
        await transactionErrorLogger.logError(
          'SYSTEM_HEALTH_CRITICAL',
          `Transaction system health critical: ${recommendations.join(', ')}`,
          {
            storeId: 'system',
            step: 'health_check',
            timestamp: now.toISOString()
          },
          'health_monitoring'
        );
      }

      return metrics;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      
      const criticalMetrics: TransactionHealthMetrics = {
        successRate: 0,
        avgProcessingTime: 0,
        errorRate: 100,
        inventoryFailureRate: 0,
        lastHealthCheck: new Date().toISOString(),
        systemStatus: 'critical',
        recommendations: ['Health check system failure - immediate investigation required']
      };

      await transactionErrorLogger.logError(
        'HEALTH_CHECK_FAILURE',
        error instanceof Error ? error : 'Health check system failure',
        {
          storeId: 'system',
          step: 'health_check_failure',
          timestamp: new Date().toISOString()
        },
        'health_monitoring'
      );

      return criticalMetrics;
    }
  }

  /**
   * Add listener for health updates
   */
  addListener(callback: (metrics: TransactionHealthMetrics) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of health updates
   */
  private notifyListeners(metrics: TransactionHealthMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error calling health monitor listener:', error);
      }
    });
  }

  /**
   * Get current system health status
   */
  async getCurrentHealth(): Promise<TransactionHealthMetrics> {
    return this.performHealthCheck();
  }

  /**
   * Check if system is healthy enough to process transactions
   */
  async canProcessTransactions(): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const health = await this.getCurrentHealth();
      
      if (health.systemStatus === 'critical') {
        return {
          allowed: false,
          reason: `System critical: ${health.recommendations.join(', ')}`
        };
      }

      if (health.successRate < 90) {
        return {
          allowed: false,
          reason: `Success rate too low: ${health.successRate}%`
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Health check failed - system status unknown'
      };
    }
  }
}

export const transactionHealthMonitor = TransactionHealthMonitor.getInstance();