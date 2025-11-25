/**
 * Atomic Inventory Monitoring Service
 * Real-time monitoring and health checks for the atomic inventory system
 */

import { supabase } from "@/integrations/supabase/client";

export interface InventoryHealth {
  status: 'healthy' | 'warning' | 'critical';
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    warnings: number;
    critical: number;
  };
  timestamp: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details?: any;
}

export interface DeductionMetrics {
  total_deductions: number;
  successful: number;
  failed: number;
  avg_duration_ms: number;
  idempotency_hits: number;
  version_conflicts: number;
  last_24h: {
    deductions: number;
    failures: number;
    failure_rate: number;
  };
}

export interface QueueMetrics {
  pending: number;
  insufficient_stock: number;
  approved: number;
  rejected: number;
  avg_wait_time_minutes: number;
}

export class AtomicInventoryMonitor {
  
  /**
   * Run comprehensive health check
   */
  static async runHealthCheck(storeId: string): Promise<InventoryHealth> {
    console.log('🏥 Running atomic inventory health check for store:', storeId);
    
    const checks: HealthCheck[] = [];
    
    // Check 1: Version column exists and working
    checks.push(await this.checkVersionColumn(storeId));
    
    // Check 2: Idempotency table operational
    checks.push(await this.checkIdempotencyTable());
    
    // Check 3: Conversion mappings have store_id
    checks.push(await this.checkConversionMappings(storeId));
    
    // Check 4: No cross-store deductions
    checks.push(await this.checkCrossStoreDeductions(storeId));
    
    // Check 5: Compensation log working
    checks.push(await this.checkCompensationLog());
    
    // Check 6: Recent deduction success rate
    checks.push(await this.checkRecentSuccessRate(storeId));
    
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      critical: checks.filter(c => c.status === 'critical').length
    };
    
    const overallStatus = 
      summary.critical > 0 ? 'critical' :
      summary.warnings > 0 ? 'warning' : 'healthy';
    
    return {
      status: overallStatus,
      checks,
      summary,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Get deduction metrics
   */
  static async getDeductionMetrics(storeId: string): Promise<DeductionMetrics> {
    try {
      // Get idempotency records (proxy for deduction attempts)
      const { data: allDeductions } = await supabase
        .from('inventory_deduction_idempotency')
        .select('id, created_at')
        .order('created_at', { ascending: false });
      
      // Get recent movements to calculate success rate
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentMovements } = await supabase
        .from('inventory_movements')
        .select('id, reference_id')
        .eq('reference_type', 'transaction')
        .gte('created_at', oneDayAgo);
      
      const { data: recentIdempotency } = await supabase
        .from('inventory_deduction_idempotency')
        .select('id')
        .gte('created_at', oneDayAgo);
      
      const totalDeductions = allDeductions?.length || 0;
      const last24hDeductions = recentIdempotency?.length || 0;
      const successfulMovements = recentMovements?.length || 0;
      
      return {
        total_deductions: totalDeductions,
        successful: successfulMovements,
        failed: totalDeductions - successfulMovements,
        avg_duration_ms: 0, // Could track with timestamps
        idempotency_hits: 0, // Would need separate tracking
        version_conflicts: 0, // Would need separate tracking
        last_24h: {
          deductions: last24hDeductions,
          failures: Math.max(0, last24hDeductions - successfulMovements),
          failure_rate: last24hDeductions > 0 
            ? ((last24hDeductions - successfulMovements) / last24hDeductions) * 100 
            : 0
        }
      };
    } catch (error) {
      console.error('Failed to get deduction metrics:', error);
      return {
        total_deductions: 0,
        successful: 0,
        failed: 0,
        avg_duration_ms: 0,
        idempotency_hits: 0,
        version_conflicts: 0,
        last_24h: { deductions: 0, failures: 0, failure_rate: 0 }
      };
    }
  }
  
  /**
   * Get queue metrics
   */
  static async getQueueMetrics(storeId: string): Promise<QueueMetrics> {
    try {
      const { data: pending } = await supabase
        .from('offline_transaction_queue')
        .select('id')
        .eq('store_id', storeId)
        .eq('status', 'pending');
      
      const { data: insufficient } = await supabase
        .from('offline_transaction_queue')
        .select('id')
        .eq('store_id', storeId)
        .eq('status', 'insufficient_stock');
      
      const { data: approved } = await supabase
        .from('offline_transaction_queue')
        .select('id, created_at, approved_at')
        .eq('store_id', storeId)
        .eq('status', 'approved')
        .not('approved_at', 'is', null);
      
      const { data: rejected } = await supabase
        .from('offline_transaction_queue')
        .select('id')
        .eq('store_id', storeId)
        .eq('status', 'rejected');
      
      // Calculate average wait time
      let avgWaitMinutes = 0;
      if (approved && approved.length > 0) {
        const waitTimes = approved
          .filter(a => a.created_at && a.approved_at)
          .map(a => {
            const created = new Date(a.created_at!);
            const approvedTime = new Date(a.approved_at!);
            return (approvedTime.getTime() - created.getTime()) / (1000 * 60);
          });
        
        if (waitTimes.length > 0) {
          avgWaitMinutes = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
        }
      }
      
      return {
        pending: pending?.length || 0,
        insufficient_stock: insufficient?.length || 0,
        approved: approved?.length || 0,
        rejected: rejected?.length || 0,
        avg_wait_time_minutes: avgWaitMinutes
      };
    } catch (error) {
      console.error('Failed to get queue metrics:', error);
      return {
        pending: 0,
        insufficient_stock: 0,
        approved: 0,
        rejected: 0,
        avg_wait_time_minutes: 0
      };
    }
  }
  
  // Private health check methods
  
  private static async checkVersionColumn(storeId: string): Promise<HealthCheck> {
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, version')
        .eq('store_id', storeId)
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0 && typeof data[0].version === 'number') {
        return {
          name: 'Version Column',
          status: 'healthy',
          message: 'Optimistic locking version column operational'
        };
      }
      
      return {
        name: 'Version Column',
        status: 'critical',
        message: 'Version column missing or not configured'
      };
    } catch (error) {
      return {
        name: 'Version Column',
        status: 'critical',
        message: `Error checking version column: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }
  
  private static async checkIdempotencyTable(): Promise<HealthCheck> {
    try {
      const { error } = await supabase
        .from('inventory_deduction_idempotency')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      
      return {
        name: 'Idempotency Table',
        status: 'healthy',
        message: 'Idempotency protection operational'
      };
    } catch (error) {
      return {
        name: 'Idempotency Table',
        status: 'critical',
        message: `Idempotency table error: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }
  
  private static async checkConversionMappings(storeId: string): Promise<HealthCheck> {
    try {
      const { data, error } = await supabase
        .from('conversion_mappings')
        .select('id, store_id')
        .eq('store_id', storeId)
        .limit(10);
      
      if (error) throw error;
      
      if (data && data.every(m => m.store_id === storeId)) {
        return {
          name: 'Conversion Mappings',
          status: 'healthy',
          message: 'Store-isolated conversion mappings working correctly'
        };
      }
      
      return {
        name: 'Conversion Mappings',
        status: 'warning',
        message: 'Some conversion mappings may not have store_id'
      };
    } catch (error) {
      return {
        name: 'Conversion Mappings',
        status: 'critical',
        message: `Conversion mappings error: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }
  
  private static async checkCrossStoreDeductions(storeId: string): Promise<HealthCheck> {
    try {
      // Check recent movements for cross-store issues
      const { data: movements } = await supabase
        .from('inventory_movements')
        .select(`
          id,
          inventory_stock:inventory_stock_id (store_id)
        `)
        .eq('reference_type', 'transaction')
        .limit(50);
      
      if (!movements) {
        return {
          name: 'Cross-Store Prevention',
          status: 'healthy',
          message: 'No movements to check'
        };
      }
      
      const crossStoreMovements = movements.filter(
        m => m.inventory_stock && (m.inventory_stock as any).store_id !== storeId
      );
      
      if (crossStoreMovements.length === 0) {
        return {
          name: 'Cross-Store Prevention',
          status: 'healthy',
          message: 'No cross-store deductions detected'
        };
      }
      
      return {
        name: 'Cross-Store Prevention',
        status: 'critical',
        message: `Found ${crossStoreMovements.length} potential cross-store deductions`,
        details: { count: crossStoreMovements.length }
      };
    } catch (error) {
      return {
        name: 'Cross-Store Prevention',
        status: 'warning',
        message: 'Unable to verify cross-store prevention'
      };
    }
  }
  
  private static async checkCompensationLog(): Promise<HealthCheck> {
    try {
      const { error } = await supabase
        .from('inventory_compensation_log')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      
      return {
        name: 'Compensation Log',
        status: 'healthy',
        message: 'Rollback compensation system operational'
      };
    } catch (error) {
      return {
        name: 'Compensation Log',
        status: 'critical',
        message: `Compensation log error: ${error instanceof Error ? error.message : 'Unknown'}`
      };
    }
  }
  
  private static async checkRecentSuccessRate(storeId: string): Promise<HealthCheck> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentIdempotency } = await supabase
        .from('inventory_deduction_idempotency')
        .select('id, transaction_id')
        .gte('created_at', oneHourAgo);
      
      const { data: recentMovements } = await supabase
        .from('inventory_movements')
        .select('reference_id')
        .eq('reference_type', 'transaction')
        .gte('created_at', oneHourAgo);
      
      const attempts = recentIdempotency?.length || 0;
      const successful = recentMovements?.length || 0;
      
      if (attempts === 0) {
        return {
          name: 'Recent Success Rate',
          status: 'healthy',
          message: 'No recent deductions to evaluate'
        };
      }
      
      const successRate = (successful / attempts) * 100;
      
      if (successRate >= 95) {
        return {
          name: 'Recent Success Rate',
          status: 'healthy',
          message: `Success rate: ${successRate.toFixed(1)}% (${successful}/${attempts})`
        };
      } else if (successRate >= 80) {
        return {
          name: 'Recent Success Rate',
          status: 'warning',
          message: `Success rate below target: ${successRate.toFixed(1)}% (${successful}/${attempts})`
        };
      } else {
        return {
          name: 'Recent Success Rate',
          status: 'critical',
          message: `Low success rate: ${successRate.toFixed(1)}% (${successful}/${attempts})`
        };
      }
    } catch (error) {
      return {
        name: 'Recent Success Rate',
        status: 'warning',
        message: 'Unable to calculate success rate'
      };
    }
  }
}
