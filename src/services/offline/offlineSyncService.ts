import { offlineTransactionQueue, OfflineTransaction, OfflineInventoryChange } from './offlineTransactionQueue';
import { streamlinedTransactionService } from '../transactions/streamlinedTransactionService';
import { toast } from 'sonner';

export interface SyncResult {
  success: boolean;
  syncedTransactions: number;
  failedTransactions: number;
  syncedInventoryChanges: number;
  errors: string[];
}

class OfflineSyncService {
  private isSyncing = false;
  private syncListeners: ((result: SyncResult) => void)[] = [];
  private retryTimeouts: NodeJS.Timeout[] = [];
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAYS = [5000, 15000, 60000]; // 5s, 15s, 1m

  // Sync all pending offline data
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('🔄 Sync already in progress, skipping');
      return {
        success: false,
        syncedTransactions: 0,
        failedTransactions: 0,
        syncedInventoryChanges: 0,
        errors: ['Sync already in progress']
      };
    }

    this.isSyncing = true;
    console.log('🚀 Starting offline data sync...');

    const result: SyncResult = {
      success: true,
      syncedTransactions: 0,
      failedTransactions: 0,
      syncedInventoryChanges: 0,
      errors: []
    };

    try {
      // Get pending data
      const pendingTransactions = offlineTransactionQueue.getPendingTransactions();
      const pendingInventoryChanges = offlineTransactionQueue.getPendingInventoryChanges();

      console.log(`📊 Found ${pendingTransactions.length} transactions and ${pendingInventoryChanges.length} inventory changes to sync`);

      if (pendingTransactions.length === 0 && pendingInventoryChanges.length === 0) {
        console.log('✅ No pending data to sync');
        this.notifyListeners(result);
        return result;
      }

      // Show sync progress
      toast.loading(`Syncing ${pendingTransactions.length} transactions...`, {
        id: 'offline-sync'
      });

      // Sync transactions first
      for (const transaction of pendingTransactions) {
        try {
          await this.syncTransaction(transaction);
          result.syncedTransactions++;
          
          // Update progress
          toast.loading(`Syncing ${result.syncedTransactions}/${pendingTransactions.length} transactions...`, {
            id: 'offline-sync'
          });
        } catch (error) {
          console.error('❌ Failed to sync transaction:', transaction.id, error);
          result.failedTransactions++;
          result.errors.push(`Transaction ${transaction.id}: ${error.message}`);
          
          offlineTransactionQueue.markTransactionFailed(
            transaction.id, 
            error.message || 'Unknown sync error'
          );
        }
      }

      // Note: Inventory changes are typically handled during transaction sync
      // so we may not need separate inventory sync in most cases

      // Cleanup synced transactions
      if (result.syncedTransactions > 0) {
        offlineTransactionQueue.clearSyncedTransactions();
      }

      // Show final result
      toast.dismiss('offline-sync');
      
      if (result.syncedTransactions > 0) {
        toast.success(`✅ Synced ${result.syncedTransactions} offline transactions`);
      }
      
      if (result.failedTransactions > 0) {
        toast.error(`❌ Failed to sync ${result.failedTransactions} transactions`);
        result.success = false;
      }

      console.log('🎯 Sync completed:', result);
      
    } catch (error) {
      console.error('💥 Sync process failed:', error);
      result.success = false;
      result.errors.push(`Sync process error: ${error.message}`);
      
      toast.dismiss('offline-sync');
      toast.error('Sync failed - will retry later');
    } finally {
      this.isSyncing = false;
      this.notifyListeners(result);
    }

    return result;
  }

  // Sync a single transaction
  private async syncTransaction(offlineTransaction: OfflineTransaction): Promise<void> {
    console.log('🔄 Syncing transaction:', offlineTransaction.id);

    // Convert offline transaction to streamlined format
    const streamlinedData = {
      storeId: offlineTransaction.storeId,
      userId: offlineTransaction.userId,
      shiftId: offlineTransaction.shiftId,
      customerId: offlineTransaction.customerId,
      items: offlineTransaction.items,
      subtotal: offlineTransaction.subtotal,
      tax: offlineTransaction.tax,
      discount: offlineTransaction.discount,
      discountType: offlineTransaction.discountType,
      discountIdNumber: offlineTransaction.discountIdNumber,
      total: offlineTransaction.total,
      amountTendered: offlineTransaction.amountTendered,
      change: offlineTransaction.change,
      paymentMethod: offlineTransaction.paymentMethod,
      paymentDetails: offlineTransaction.paymentDetails,
      orderType: (offlineTransaction.orderType as 'delivery' | 'dine_in' | 'takeout') || 'dine_in',
      deliveryPlatform: offlineTransaction.deliveryPlatform,
      deliveryOrderNumber: offlineTransaction.deliveryOrderNumber,
      // Add offline metadata
      isOfflineSync: true,
      offlineTransactionId: offlineTransaction.id,
      offlineTimestamp: offlineTransaction.timestamp
    };

    // Process through streamlined service
    const result = await streamlinedTransactionService.processTransaction(streamlinedData);

    if (!result?.id) {
      throw new Error('Server did not return transaction ID');
    }

    // Mark as synced
    offlineTransactionQueue.markTransactionSynced(offlineTransaction.id, result.id);
    
    console.log('✅ Transaction synced successfully:', offlineTransaction.id, '→', result.id);
  }

  // Add sync listener
  addSyncListener(listener: (result: SyncResult) => void): void {
    this.syncListeners.push(listener);
  }

  // Remove sync listener
  removeSyncListener(listener: (result: SyncResult) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index > -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  // Notify all listeners
  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Check if currently syncing
  get isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // Auto-sync when coming back online
  async autoSyncOnReconnect(): Promise<void> {
    const stats = offlineTransactionQueue.getQueueStats();
    
    if (stats.pendingTransactions > 0) {
      console.log('🌐 Reconnected with pending transactions, starting auto-sync...');
      
      // Small delay to ensure connection is stable
      setTimeout(() => {
        this.syncAll();
      }, 2000);
    }
  }

  // Retry failed transactions with exponential backoff
  async retryFailedTransactions(): Promise<void> {
    const allTransactions = offlineTransactionQueue.getAllTransactions();
    const failedTransactions = allTransactions.filter(t => 
      t.syncStatus === 'failed' && 
      t.syncAttempts < this.MAX_RETRY_ATTEMPTS
    );

    if (failedTransactions.length === 0) {
      return;
    }

    console.log(`🔄 Retrying ${failedTransactions.length} failed transactions`);

    for (const transaction of failedTransactions) {
      const delay = this.RETRY_DELAYS[Math.min(transaction.syncAttempts, this.RETRY_DELAYS.length - 1)];
      
      const timeoutId = setTimeout(async () => {
        try {
          await this.syncTransaction(transaction);
          offlineTransactionQueue.markTransactionSynced(transaction.id);
          toast.success(`✅ Retried transaction ${transaction.id} successfully`);
        } catch (error) {
          offlineTransactionQueue.markTransactionFailed(transaction.id, error.message);
          
          if (transaction.syncAttempts >= this.MAX_RETRY_ATTEMPTS) {
            toast.error(`❌ Transaction ${transaction.id} failed after ${this.MAX_RETRY_ATTEMPTS} attempts`);
          }
        }
      }, delay);

      this.retryTimeouts.push(timeoutId);
    }
  }

  // Cancel all pending retries
  cancelRetries(): void {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts = [];
  }

  // Get failed transactions that need manual intervention
  getFailedTransactions(): OfflineTransaction[] {
    const allTransactions = offlineTransactionQueue.getAllTransactions();
    return allTransactions.filter(t => 
      t.syncStatus === 'failed' && 
      t.syncAttempts >= this.MAX_RETRY_ATTEMPTS
    );
  }

  // Force retry a specific transaction
  async forceRetryTransaction(transactionId: string): Promise<boolean> {
    const transaction = offlineTransactionQueue.getTransaction(transactionId);
    
    if (!transaction || transaction.syncStatus === 'synced') {
      return false;
    }

    try {
      await this.syncTransaction(transaction);
      offlineTransactionQueue.markTransactionSynced(transactionId);
      toast.success(`✅ Force retry successful for ${transactionId}`);
      return true;
    } catch (error) {
      offlineTransactionQueue.markTransactionFailed(transactionId, error.message);
      toast.error(`❌ Force retry failed for ${transactionId}`);
      return false;
    }
  }

  // Get sync statistics
  getSyncStats(): {
    totalTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    permanentlyFailedTransactions: number;
    syncedTransactions: number;
    oldestPendingAge?: number;
  } {
    const stats = offlineTransactionQueue.getQueueStats();
    const allTransactions = offlineTransactionQueue.getAllTransactions();
    const permanentlyFailed = allTransactions.filter(t => 
      t.syncStatus === 'failed' && 
      t.syncAttempts >= this.MAX_RETRY_ATTEMPTS
    ).length;

    return {
      ...stats,
      permanentlyFailedTransactions: permanentlyFailed,
      oldestPendingAge: stats.oldestPending ? Date.now() - stats.oldestPending : undefined
    };
  }

  // Enhanced error handling
  private async syncTransactionWithRetry(transaction: OfflineTransaction): Promise<void> {
    try {
      await this.syncTransaction(transaction);
    } catch (error) {
      // Check if it's a recoverable error
      const isRecoverable = this.isRecoverableError(error);
      
      if (isRecoverable && transaction.syncAttempts < this.MAX_RETRY_ATTEMPTS) {
        // Schedule retry
        const delay = this.RETRY_DELAYS[Math.min(transaction.syncAttempts, this.RETRY_DELAYS.length - 1)];
        console.log(`⏳ Scheduling retry for transaction ${transaction.id} in ${delay}ms`);
        
        setTimeout(() => {
          this.syncTransactionWithRetry(transaction);
        }, delay);
      } else {
        // Mark as permanently failed
        throw error;
      }
    }
  }

  // Check if error is recoverable
  private isRecoverableError(error: any): boolean {
    // Network errors are usually recoverable
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return true;
    }
    
    // Server errors (5xx) are recoverable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Timeout errors are recoverable
    if (error.name === 'TimeoutError' || error.code === 'TIMEOUT') {
      return true;
    }
    
    // Client errors (4xx) are usually not recoverable
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    
    // Default to recoverable for unknown errors
    return true;
  }

  // Get queue for specific transaction access
  private getQueue(): OfflineTransaction[] {
    return offlineTransactionQueue.getAllTransactions();
  }
}

export const offlineSyncService = new OfflineSyncService();