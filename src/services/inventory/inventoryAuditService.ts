/**
 * Inventory Audit Service
 * 
 * **PHASE 2 FIX**: Comprehensive audit trail and monitoring service
 * Provides centralized logging, performance tracking, and health monitoring
 * for the inventory deduction system.
 */

import { supabase } from '@/integrations/supabase/client';

export interface InventoryAuditEvent {
  transactionId: string;
  storeId: string;
  operationType: 'mix_match_deduction' | 'regular_deduction' | 'validation' | 'system_health';
  status: 'success' | 'partial_success' | 'failure' | 'warning';
  itemsProcessed: number;
  processingTimeMs: number;
  userId?: string;
  metadata: {
    productNames?: string[];
    deductedItems?: Array<{
      itemName: string;
      quantityDeducted: number;
      newStock: number;
    }>;
    skippedItems?: string[];
    errors?: string[];
    warnings?: string[];
    authenticationAttempts?: number;
    retryCount?: number;
    [key: string]: any;
  };
}

export interface InventoryHealthMetrics {
  successRate: number;
  averageProcessingTime: number;
  authFailureRate: number;
  auditFailureRate: number;
  mixMatchSuccessRate: number;
  regularDeductionSuccessRate: number;
  totalTransactions: number;
  lastHealthCheck: string;
}

export class InventoryAuditService {
  private static instance: InventoryAuditService;
  private performanceBuffer: Map<string, number> = new Map();

  public static getInstance(): InventoryAuditService {
    if (!InventoryAuditService.instance) {
      InventoryAuditService.instance = new InventoryAuditService();
    }
    return InventoryAuditService.instance;
  }

  /**
   * **PHASE 2**: Start performance timing for a transaction
   */
  public startPerformanceTimer(transactionId: string): void {
    this.performanceBuffer.set(transactionId, Date.now());
    console.log(`⏱️ PERFORMANCE: Started timer for transaction ${transactionId}`);
  }

  /**
   * **PHASE 2**: Get elapsed time for a transaction
   */
  public getElapsedTime(transactionId: string): number {
    const startTime = this.performanceBuffer.get(transactionId);
    if (!startTime) {
      console.warn(`⚠️ PERFORMANCE: No start time found for transaction ${transactionId}`);
      return 0;
    }
    
    const elapsed = Date.now() - startTime;
    this.performanceBuffer.delete(transactionId); // Clean up
    return elapsed;
  }

  /**
   * **PHASE 2**: Log comprehensive audit event with performance metrics
   */
  public async logInventoryEvent(event: InventoryAuditEvent): Promise<void> {
    try {
      console.log(`📊 AUDIT EVENT: ${event.operationType} - ${event.status} (${event.processingTimeMs}ms)`);
      
      // Simplified logging to avoid type issues
      const { error } = await supabase
        .from('inventory_audit_log')
        .insert({
          transaction_id: event.transactionId,
          store_id: event.storeId,
          operation_type: event.operationType,
          status: event.status,
          items_processed: event.itemsProcessed,
          metadata: event.metadata,
          created_by: event.userId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ AUDIT SERVICE: Failed to log event:`, error);
        this.storeFallbackAudit(event);
      } else {
        console.log(`✅ AUDIT SERVICE: Event logged successfully`);
      }
    } catch (error) {
      console.error(`❌ AUDIT SERVICE: Exception:`, error);
      this.storeFallbackAudit(event);
    }
  }

  /**
   * **PHASE 2**: Store audit data in memory as fallback when database logging fails
   */
  private storeFallbackAudit(event: InventoryAuditEvent): void {
    try {
      const fallbackKey = `fallback_audit_${Date.now()}`;
      localStorage.setItem(fallbackKey, JSON.stringify({
        ...event,
        fallback_timestamp: new Date().toISOString()
      }));
      console.log(`💾 FALLBACK AUDIT: Stored event in localStorage with key ${fallbackKey}`);
    } catch (error) {
      console.error(`❌ FALLBACK AUDIT: Failed to store in localStorage:`, error);
    }
  }

  /**
   * **PHASE 2**: Check system health and performance metrics
   */
  public async checkInventorySystemHealth(storeId: string, hoursBack: number = 24): Promise<InventoryHealthMetrics> {
    try {
      console.log(`🏥 HEALTH CHECK: Analyzing inventory system for store ${storeId} (${hoursBack}h)`);
      
      const cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000)).toISOString();
      
      // Query audit logs for health metrics
      const { data: auditLogs, error } = await supabase
        .from('inventory_audit_log')
        .select('*')
        .eq('store_id', storeId)
        .gte('created_at', cutoffTime)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`❌ HEALTH CHECK: Failed to fetch audit logs:`, error);
        return this.getDefaultHealthMetrics();
      }

      const logs = auditLogs || [];
      const totalTransactions = logs.length;
      
      if (totalTransactions === 0) {
        console.log(`ℹ️ HEALTH CHECK: No transactions found in the last ${hoursBack} hours`);
        return this.getDefaultHealthMetrics();
      }

      // Calculate metrics with proper type handling
      const successfulTransactions = logs.filter(log => log.status === 'success').length;
      const successRate = (successfulTransactions / totalTransactions) * 100;

      const authFailures = logs.filter(log => {
        const metadata = log.metadata as any;
        return metadata?.errors && Array.isArray(metadata.errors) && 
               metadata.errors.some((error: string) => error.toLowerCase().includes('auth'));
      }).length;
      const authFailureRate = (authFailures / totalTransactions) * 100;

      const auditFailures = logs.filter(log => {
        const metadata = log.metadata as any;
        return metadata?.errors && Array.isArray(metadata.errors) && 
               metadata.errors.some((error: string) => error.toLowerCase().includes('audit'));
      }).length;
      const auditFailureRate = (auditFailures / totalTransactions) * 100;

      const mixMatchLogs = logs.filter(log => log.operation_type === 'mix_match_deduction');
      const mixMatchSuccess = mixMatchLogs.filter(log => log.status === 'success').length;
      const mixMatchSuccessRate = mixMatchLogs.length > 0 ? (mixMatchSuccess / mixMatchLogs.length) * 100 : 100;

      const regularLogs = logs.filter(log => log.operation_type === 'regular_deduction');
      const regularSuccess = regularLogs.filter(log => log.status === 'success').length;
      const regularDeductionSuccessRate = regularLogs.length > 0 ? (regularSuccess / regularLogs.length) * 100 : 100;

      // Calculate average processing time with proper type handling
      const processingTimes = logs
        .map(log => {
          const metadata = log.metadata as any;
          return metadata?.processing_time_ms;
        })
        .filter((time): time is number => typeof time === 'number' && time > 0);
      
      const averageProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;

      const healthMetrics: InventoryHealthMetrics = {
        successRate,
        averageProcessingTime,
        authFailureRate,
        auditFailureRate,
        mixMatchSuccessRate,
        regularDeductionSuccessRate,
        totalTransactions,
        lastHealthCheck: new Date().toISOString()
      };

      console.log(`📊 HEALTH CHECK RESULTS: ${successRate.toFixed(2)}% success rate, ${averageProcessingTime.toFixed(0)}ms avg`);

      return healthMetrics;

    } catch (error) {
      console.error(`❌ HEALTH CHECK: System health check failed:`, error);
      return this.getDefaultHealthMetrics();
    }
  }

  /**
   * **PHASE 2**: Get default health metrics when system check fails
   */
  private getDefaultHealthMetrics(): InventoryHealthMetrics {
    return {
      successRate: 0,
      averageProcessingTime: 0,
      authFailureRate: 0,
      auditFailureRate: 0,
      mixMatchSuccessRate: 0,
      regularDeductionSuccessRate: 0,
      totalTransactions: 0,
      lastHealthCheck: new Date().toISOString()
    };
  }

  /**
   * **PHASE 2**: Log authentication failure with context
   */
  public async logAuthenticationFailure(
    transactionId: string,
    storeId: string,
    error: string,
    attempts: number = 1
  ): Promise<void> {
    await this.logInventoryEvent({
      transactionId,
      storeId,
      operationType: 'validation',
      status: 'failure',
      itemsProcessed: 0,
      processingTimeMs: 0,
      metadata: {
        error_type: 'authentication_failure',
        error_message: error,
        authentication_attempts: attempts,
        failure_timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * **PHASE 2**: Log RLS policy failure with diagnostic information
   */
  public async logRLSPolicyFailure(
    transactionId: string,
    storeId: string,
    userId: string,
    tableName: string,
    error: string
  ): Promise<void> {
    await this.logInventoryEvent({
      transactionId,
      storeId,
      operationType: 'validation',
      status: 'failure',
      itemsProcessed: 0,
      processingTimeMs: 0,
      userId,
      metadata: {
        error_type: 'rls_policy_failure',
        table_name: tableName,
        user_id: userId,
        error_message: error,
        diagnostic_info: {
          suggestion: 'Check user_stores table and app_users permissions',
          common_causes: [
            'User not in user_stores table for this store',
            'User role insufficient for operation',
            'RLS policy misconfiguration'
          ]
        }
      }
    });
  }

  /**
   * **PHASE 2**: Create performance summary report
   */
  public async generatePerformanceReport(storeId: string): Promise<string> {
    const healthMetrics = await this.checkInventorySystemHealth(storeId, 24);
    
    const report = `
📊 INVENTORY SYSTEM PERFORMANCE REPORT
Store ID: ${storeId}
Report Generated: ${new Date().toISOString()}

🔄 Overall Health: ${healthMetrics.successRate >= 90 ? '✅ Healthy' : healthMetrics.successRate >= 70 ? '⚠️ Degraded' : '❌ Critical'}
Success Rate: ${healthMetrics.successRate.toFixed(2)}%
Total Transactions (24h): ${healthMetrics.totalTransactions}

⚡ Performance Metrics:
Average Processing Time: ${healthMetrics.averageProcessingTime.toFixed(0)}ms
Authentication Failure Rate: ${healthMetrics.authFailureRate.toFixed(2)}%
Audit Failure Rate: ${healthMetrics.auditFailureRate.toFixed(2)}%

🎯 Feature-Specific Performance:
Mix & Match Success Rate: ${healthMetrics.mixMatchSuccessRate.toFixed(2)}%
Regular Deduction Success Rate: ${healthMetrics.regularDeductionSuccessRate.toFixed(2)}%

💡 Recommendations:
${healthMetrics.successRate < 90 ? '- Investigate failure patterns and implement additional resilience measures' : '- System operating normally'}
${healthMetrics.authFailureRate > 5 ? '- Review authentication configuration and session management' : ''}
${healthMetrics.mixMatchSuccessRate < 95 ? '- Focus on Mix & Match deduction reliability improvements' : ''}
    `.trim();

    console.log(report);
    return report;
  }
}

// Export singleton instance
export const inventoryAuditService = InventoryAuditService.getInstance();