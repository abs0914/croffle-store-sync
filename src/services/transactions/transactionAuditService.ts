import { supabase } from "@/integrations/supabase/client";

export interface TransactionAuditLog {
  id?: string;
  transaction_id: string;
  action: 'created' | 'rollback' | 'inventory_sync_success' | 'inventory_sync_failed';
  details: any;
  error_details?: string[];
  user_id?: string;
  store_id: string;
  created_at?: string;
}

/**
 * Enhanced transaction audit and monitoring service
 */
export class TransactionAuditService {
  
  /**
   * Log successful inventory synchronization
   */
  static async logInventorySyncSuccess(
    transactionId: string,
    itemCount: number,
    storeId: string,
    userId?: string  // ⭐ Accept optional userId
  ): Promise<void> {
    try {
      const auditLog: TransactionAuditLog = {
        transaction_id: transactionId,
        action: 'inventory_sync_success',
        details: {
          items_processed: itemCount,
          sync_timestamp: new Date().toISOString(),
          status: 'success'
        },
        store_id: storeId,
        user_id: userId  // ⭐ Use provided userId instead of querying
      };
      
      await this.writeAuditLog(auditLog);
      console.log('📝 Inventory sync success logged:', transactionId);
      
    } catch (error) {
      console.error('Failed to log inventory sync success:', error);
    }
  }
  
  /**
   * Log transaction rollback with detailed error information
   */
  static async logTransactionRollback(
    transactionId: string,
    errors: string[],
    storeId: string,
    userId?: string
  ): Promise<void> {
    try {
      const auditLog: TransactionAuditLog = {
        transaction_id: transactionId,
        action: 'rollback',
        details: {
          rollback_reason: 'inventory_sync_failure',
          rollback_timestamp: new Date().toISOString(),
          original_errors: errors
        },
        error_details: errors,
        store_id: storeId,
        user_id: userId
      };
      
      await this.writeAuditLog(auditLog);
      console.log('📝 Transaction rollback logged:', transactionId);
      
    } catch (error) {
      console.error('Failed to log transaction rollback:', error);
    }
  }
  
  /**
   * Log inventory sync failure for monitoring
   */
  static async logInventorySyncFailure(
    transactionId: string,
    errors: string[],
    storeId: string,
    itemCount: number
  ): Promise<void> {
    try {
      const auditLog: TransactionAuditLog = {
        transaction_id: transactionId,
        action: 'inventory_sync_failed',
        details: {
          items_attempted: itemCount,
          failure_timestamp: new Date().toISOString(),
          failure_count: errors.length
        },
        error_details: errors,
        store_id: storeId
      };
      
      await this.writeAuditLog(auditLog);
      
      // Also create an alert for monitoring systems
      await this.createInventorySyncAlert(transactionId, errors, storeId);
      
      console.log('📝 Inventory sync failure logged:', transactionId);
      
    } catch (error) {
      console.error('Failed to log inventory sync failure:', error);
    }
  }
  
  /**
   * Write audit log to database and console
   */
  private static async writeAuditLog(auditLog: TransactionAuditLog): Promise<void> {
    try {
      // Log to database using the new audit function
      const syncStatus = auditLog.action.includes('failed') ? 'failed' : 
                        auditLog.action.includes('success') ? 'success' : 'pending';
      
      const { error } = await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: auditLog.transaction_id,
        p_sync_status: syncStatus,
        p_error_details: auditLog.error_details?.join(', ') || null,
        p_items_processed: auditLog.details?.items_processed || 0,
        p_sync_duration_ms: auditLog.details?.sync_duration_ms || null
      });

      if (error) {
        console.error('Failed to log to database audit:', error);
      }

      // Also log to console for immediate debugging
      console.log('📊 AUDIT LOG:', JSON.stringify({
        timestamp: new Date().toISOString(),
        level: auditLog.action.includes('failed') ? 'ERROR' : 'INFO',
        service: 'TransactionAuditService',
        ...auditLog
      }, null, 2));
      
    } catch (error) {
      console.error('Critical audit logging error:', error);
      // Fallback to console-only logging
      console.log('📊 AUDIT LOG (FALLBACK):', JSON.stringify({
        timestamp: new Date().toISOString(),
        level: auditLog.action.includes('failed') ? 'ERROR' : 'INFO',
        service: 'TransactionAuditService',
        ...auditLog
      }, null, 2));
    }
  }
  
  /**
   * Create alert for inventory sync failures
   */
  private static async createInventorySyncAlert(
    transactionId: string,
    errors: string[],
    storeId: string
  ): Promise<void> {
    // Create high-priority alert for inventory sync failures
    console.error('🚨 INVENTORY SYNC ALERT:', {
      level: 'HIGH',
      type: 'INVENTORY_SYNC_FAILURE',
      transaction_id: transactionId,
      store_id: storeId,
      error_count: errors.length,
      errors: errors.slice(0, 3), // First 3 errors for alert
      timestamp: new Date().toISOString(),
      requires_attention: true
    });
  }
  
  /**
   * Get inventory sync statistics for monitoring dashboard
   */
  static async getInventorySyncStats(
    storeId: string,
    hours: number = 24
  ): Promise<{
    total_transactions: number;
    successful_syncs: number;
    failed_syncs: number;
    success_rate: number;
    recent_failures: string[];
  }> {
    // This would typically query a database table
    // For now, return mock data structure
    return {
      total_transactions: 0,
      successful_syncs: 0,
      failed_syncs: 0,
      success_rate: 0,
      recent_failures: []
    };
  }
}

/**
 * Convenience functions for common audit operations
 */
export const logInventorySyncSuccess = (
  transactionId: string,
  itemCount: number,
  storeId: string,
  userId?: string
): Promise<void> => {
  return TransactionAuditService.logInventorySyncSuccess(transactionId, itemCount, storeId, userId);
};

export const rollbackTransactionWithAudit = async (
  transactionId: string,
  errors: string[],
  storeId: string,
  userId?: string
): Promise<void> => {
  try {
    console.log('🔄 Starting rollback with proper cleanup order...');
    
    // Step 1: Delete audit records first to avoid foreign key constraints
    const { error: auditDeleteError } = await supabase
      .from("inventory_sync_audit")
      .delete()
      .eq("transaction_id", transactionId);
    
    if (auditDeleteError) {
      console.warn('Failed to delete audit records:', auditDeleteError);
      // Continue with rollback - audit cleanup is not critical
    }
    
    // Step 2: Delete transaction items
    const { error: itemsDeleteError } = await supabase
      .from("transaction_items")
      .delete()
      .eq("transaction_id", transactionId);
    
    if (itemsDeleteError) {
      console.warn('Failed to delete transaction items:', itemsDeleteError);
    }
    
    // Step 3: Delete the main transaction
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId);
    
    if (deleteError) {
      console.error('Failed to delete transaction:', deleteError);
      // Still log rollback attempt even if deletion fails
    } else {
      console.log('✅ Transaction deleted successfully');
    }
    
    // Step 4: Log the rollback attempt (even if deletion failed)
    await TransactionAuditService.logTransactionRollback(transactionId, errors, storeId, userId);
    
    console.log('✅ Transaction rollback with audit completed:', transactionId);
    
  } catch (error) {
    console.error('❌ Failed to rollback transaction with audit:', error);
    // Still attempt to log the failed rollback
    try {
      await TransactionAuditService.logTransactionRollback(transactionId, 
        [...errors, `Rollback error: ${error instanceof Error ? error.message : String(error)}`], 
        storeId, userId);
    } catch (logError) {
      console.error('❌ Failed to log rollback failure:', logError);
    }
    throw error;
  }
};