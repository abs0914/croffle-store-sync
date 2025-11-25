/**
 * Offline Transaction Queue Service
 * Manages queuing, syncing, and approval of offline transactions
 */

import { supabase } from "@/integrations/supabase/client";
import { AtomicInventoryService, DeductionItem } from "./atomicInventoryService";
import { toast } from "sonner";

export interface QueuedTransaction {
  id: string;
  device_id: string;
  store_id: string;
  transaction_data: any; // Contains transaction_id and items
  created_at: string;
  processed_at?: string;
  status: string;
  stock_validation_errors?: any;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface QueueApprovalResult {
  success: boolean;
  approved: number;
  rejected: number;
  errors: string[];
}

export class OfflineQueueService {
  
  /**
   * Queue a transaction for later processing (when offline or insufficient stock)
   */
  static async queueTransaction(
    transactionId: string,
    storeId: string,
    deviceId: string,
    items: DeductionItem[],
    reason: 'offline' | 'insufficient_stock' = 'offline'
  ): Promise<void> {
    console.log('📥 Queueing transaction:', { transactionId, storeId, reason });
    
    try {
      const { error } = await supabase
        .from('offline_transaction_queue')
        .insert([{
          device_id: deviceId,
          store_id: storeId,
          transaction_data: {
            transaction_id: transactionId,
            items: items,
            queued_at: new Date().toISOString(),
            reason: reason
          } as any,
          status: reason === 'insufficient_stock' ? 'insufficient_stock' : 'pending'
        }]);
      
      if (error) throw error;
      
      console.log('✅ Transaction queued successfully');
      
      if (reason === 'offline') {
        toast.info('Transaction queued - will sync when online');
      } else {
        toast.warning('Insufficient stock - transaction queued for approval');
      }
      
    } catch (error) {
      console.error('❌ Failed to queue transaction:', error);
      throw new Error(`Failed to queue transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get all pending queued transactions for a store
   */
  static async getPendingTransactions(storeId: string): Promise<QueuedTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('offline_transaction_queue')
        .select('*')
        .eq('store_id', storeId)
        .in('status', ['pending', 'insufficient_stock'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
      
    } catch (error) {
      console.error('❌ Failed to fetch pending transactions:', error);
      return [];
    }
  }
  
  /**
   * Attempt to sync a single queued transaction
   */
  static async syncQueuedTransaction(
    queueId: string,
    transactionData: any,
    storeId: string,
    userId: string
  ): Promise<{ success: boolean; needsApproval: boolean; insufficientItems?: string[] }> {
    console.log('🔄 Syncing queued transaction:', { queueId });
    
    const transactionId = transactionData.transaction_id;
    const items: DeductionItem[] = transactionData.items || [];
    
    try {
      // Try to deduct inventory atomically
      const idempotencyKey = `offline-queue-${queueId}-${Date.now()}`;
      
      const result = await AtomicInventoryService.deductInventoryAtomic({
        transactionId,
        storeId,
        items,
        userId,
        idempotencyKey
      });
      
      if (result.success) {
        // Mark as approved (auto-approved because stock was available)
        await supabase
          .from('offline_transaction_queue')
          .update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            stock_validation_errors: null
          })
          .eq('id', queueId);
        
        console.log('✅ Queued transaction synced successfully');
        return { success: true, needsApproval: false };
        
      } else {
        // Check if it's an insufficient stock error
        const hasInsufficientStock = result.errors.some(err => 
          err.toLowerCase().includes('insufficient') || 
          err.toLowerCase().includes('stock')
        );
        
        if (hasInsufficientStock) {
          // Mark for manual approval
          await supabase
            .from('offline_transaction_queue')
            .update({
              status: 'insufficient_stock',
              stock_validation_errors: {
                errors: result.errors,
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', queueId);
          
          console.log('⚠️ Insufficient stock - needs manual approval');
          return { 
            success: false, 
            needsApproval: true,
            insufficientItems: result.errors
          };
        } else {
          // Other error - log and keep pending
          await supabase
            .from('offline_transaction_queue')
            .update({
              stock_validation_errors: {
                errors: result.errors,
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', queueId);
          
          console.error('❌ Sync failed with error:', result.errors);
          return { success: false, needsApproval: false };
        }
      }
      
    } catch (error) {
      console.error('❌ Error syncing queued transaction:', error);
      
      // Update error in queue
      await supabase
        .from('offline_transaction_queue')
        .update({
          stock_validation_errors: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', queueId);
      
      return { success: false, needsApproval: false };
    }
  }
  
  /**
   * Manually approve a queued transaction (allowing negative stock)
   */
  static async approveTransaction(
    queueId: string,
    transactionData: any,
    storeId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log('✅ Manually approving transaction:', { queueId });
    
    const transactionId = transactionData.transaction_id;
    const items: DeductionItem[] = transactionData.items || [];
    
    try {
      // Force deduction - this will create compensation records if needed
      const idempotencyKey = `manual-approval-${queueId}-${Date.now()}`;
      
      const result = await AtomicInventoryService.deductInventoryAtomic({
        transactionId,
        storeId,
        items,
        userId,
        idempotencyKey
      });
      
      // Even if deduction fails (insufficient stock), we approve it manually
      // The compensation log will track the negative stock situation
      await supabase
        .from('offline_transaction_queue')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          notes: result.success ? 'Manually approved' : 'Manually approved with insufficient stock',
          stock_validation_errors: result.success ? null : {
            errors: result.errors,
            approved_anyway: true
          }
        })
        .eq('id', queueId);
      
      if (!result.success) {
        toast.warning('Transaction approved but some items had insufficient stock');
      } else {
        toast.success('Transaction approved and inventory deducted');
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error approving transaction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Reject a queued transaction
   */
  static async rejectTransaction(
    queueId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    console.log('❌ Rejecting transaction:', { queueId, reason });
    
    try {
      await supabase
        .from('offline_transaction_queue')
        .update({
          status: 'rejected',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          processed_at: new Date().toISOString(),
          notes: reason || 'Manually rejected'
        })
        .eq('id', queueId);
      
      toast.success('Transaction rejected');
      
    } catch (error) {
      console.error('❌ Error rejecting transaction:', error);
      toast.error('Failed to reject transaction');
    }
  }
  
  /**
   * Sync all pending queued transactions for a store
   */
  static async syncAllPending(
    storeId: string,
    userId: string
  ): Promise<{ synced: number; needsApproval: number; failed: number }> {
    console.log('🔄 Syncing all pending transactions for store:', storeId);
    
    const pending = await this.getPendingTransactions(storeId);
    
    let synced = 0;
    let needsApproval = 0;
    let failed = 0;
    
    for (const queued of pending) {
      if (queued.status !== 'pending') {
        needsApproval++;
        continue; // Skip insufficient_stock items - they need manual approval
      }
      
      const result = await this.syncQueuedTransaction(
        queued.id,
        queued.transaction_data,
        queued.store_id,
        userId
      );
      
      if (result.success) {
        synced++;
      } else if (result.needsApproval) {
        needsApproval++;
      } else {
        failed++;
      }
    }
    
    console.log('📊 Sync results:', { synced, needsApproval, failed });
    
    if (synced > 0) {
      toast.success(`Synced ${synced} offline transactions`);
    }
    if (needsApproval > 0) {
      toast.warning(`${needsApproval} transactions need manual approval`);
    }
    if (failed > 0) {
      toast.error(`${failed} transactions failed to sync`);
    }
    
    return { synced, needsApproval, failed };
  }
  
  /**
   * Get queue statistics for a store
   */
  static async getQueueStats(storeId: string): Promise<{
    pending: number;
    insufficient_stock: number;
    total_queued: number;
  }> {
    try {
      const { data: pending } = await supabase
        .from('offline_transaction_queue')
        .select('id', { count: 'exact' })
        .eq('store_id', storeId)
        .eq('status', 'pending');
      
      const { data: insufficient } = await supabase
        .from('offline_transaction_queue')
        .select('id', { count: 'exact' })
        .eq('store_id', storeId)
        .eq('status', 'insufficient_stock');
      
      return {
        pending: pending?.length || 0,
        insufficient_stock: insufficient?.length || 0,
        total_queued: (pending?.length || 0) + (insufficient?.length || 0)
      };
      
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      return { pending: 0, insufficient_stock: 0, total_queued: 0 };
    }
  }
}
