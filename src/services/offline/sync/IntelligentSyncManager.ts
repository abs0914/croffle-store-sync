/**
 * INTELLIGENT SYNC MANAGER
 * 
 * Advanced synchronization service with:
 * - Priority-based sync queuing (high/medium/low)
 * - Exponential backoff retry strategy
 * - Network-aware sync decisions
 * - Batch processing for efficiency
 * - Background sync scheduling
 * - Comprehensive error handling and recovery
 */

import { toast } from 'sonner';
import { EnhancedOfflineTransactionQueue, EnhancedOfflineTransaction, TransactionBatch } from '../storage/EnhancedOfflineTransactionQueue';
import { EnhancedNetworkDetectionService, SyncRecommendation } from '../network/EnhancedNetworkDetectionService';
import { streamlinedTransactionService } from '../../transactions/streamlinedTransactionService';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflictCount: number;
  totalProcessed: number;
  errors: SyncError[];
  duration: number;
  networkQuality: string;
}

export interface SyncError {
  transactionId: string;
  receiptNumber: string;
  error: string;
  errorType: 'network' | 'server' | 'validation' | 'conflict' | 'unknown';
  retryable: boolean;
  timestamp: number;
}

export interface SyncProgress {
  phase: 'preparing' | 'syncing' | 'resolving_conflicts' | 'completing' | 'finished';
  currentBatch: number;
  totalBatches: number;
  currentTransaction: number;
  totalTransactions: number;
  estimatedTimeRemaining: number;
  networkQuality: string;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

export class IntelligentSyncManager {
  private static instance: IntelligentSyncManager;
  private transactionQueue: EnhancedOfflineTransactionQueue;
  private networkService: EnhancedNetworkDetectionService;
  private isSyncing = false;
  private syncProgressCallbacks: Set<SyncProgressCallback> = new Set();
  private backgroundSyncInterval: NodeJS.Timeout | null = null;
  private readonly BACKGROUND_SYNC_INTERVAL = 60000; // 1 minute
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second

  private constructor() {
    this.transactionQueue = EnhancedOfflineTransactionQueue.getInstance();
    this.networkService = EnhancedNetworkDetectionService.getInstance();
  }

  static getInstance(): IntelligentSyncManager {
    if (!IntelligentSyncManager.instance) {
      IntelligentSyncManager.instance = new IntelligentSyncManager();
    }
    return IntelligentSyncManager.instance;
  }

  /**
   * Initialize the sync manager
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Intelligent Sync Manager...');

    try {
      await this.transactionQueue.initialize();
      await this.networkService.initialize();

      // Listen for network changes
      this.networkService.addListener((networkStatus) => {
        if (networkStatus.justReconnected && networkStatus.stableConnection) {
          console.log('🌐 Network reconnected, triggering sync...');
          this.triggerSync('immediate');
        }
      });

      // Start background sync
      this.startBackgroundSync();

      console.log('✅ Intelligent Sync Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Intelligent Sync Manager:', error);
      throw error;
    }
  }

  /**
   * Trigger sync with specified priority
   */
  async triggerSync(priority: 'immediate' | 'background' = 'background'): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return this.createEmptySyncResult();
    }

    console.log(`🚀 Triggering ${priority} sync...`);
    
    try {
      this.isSyncing = true;
      const startTime = Date.now();

      // Get network recommendation
      const stats = await this.transactionQueue.getQueueStats();
      const recommendation = this.networkService.getSyncRecommendation(
        stats.pendingTransactions + stats.failedTransactions
      );

      if (!recommendation.shouldSync && priority !== 'immediate') {
        console.log(`⏸️ Sync postponed: ${recommendation.reason}`);
        return this.createEmptySyncResult();
      }

      // Perform sync
      const result = await this.performIntelligentSync(recommendation);
      result.duration = Date.now() - startTime;

      // Show user feedback
      if (result.syncedCount > 0) {
        toast.success(`Synced ${result.syncedCount} transactions`, {
          description: `Completed in ${Math.round(result.duration / 1000)}s`
        });
      }

      if (result.failedCount > 0) {
        toast.warning(`${result.failedCount} transactions failed to sync`, {
          description: 'Will retry automatically'
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast.error('Sync failed', {
        description: 'Will retry automatically when network improves'
      });
      return this.createErrorSyncResult(error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Add sync progress listener
   */
  addProgressListener(callback: SyncProgressCallback): void {
    this.syncProgressCallbacks.add(callback);
  }

  /**
   * Remove sync progress listener
   */
  removeProgressListener(callback: SyncProgressCallback): void {
    this.syncProgressCallbacks.delete(callback);
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): { isSyncing: boolean; lastSyncTime?: number } {
    return {
      isSyncing: this.isSyncing,
      // lastSyncTime will be implemented with persistent storage
    };
  }

  /**
   * Perform intelligent sync based on network conditions
   */
  private async performIntelligentSync(recommendation: SyncRecommendation): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      totalProcessed: 0,
      errors: [],
      duration: 0,
      networkQuality: this.networkService.getNetworkStatus().quality.level
    };

    try {
      // Phase 1: Prepare batches
      this.notifyProgress({
        phase: 'preparing',
        currentBatch: 0,
        totalBatches: 0,
        currentTransaction: 0,
        totalTransactions: 0,
        estimatedTimeRemaining: recommendation.estimatedTime || 0,
        networkQuality: result.networkQuality
      });

      const batches = await this.createSyncBatches(recommendation);
      
      if (batches.length === 0) {
        console.log('📭 No transactions to sync');
        return result;
      }

      // Phase 2: Sync batches
      this.notifyProgress({
        phase: 'syncing',
        currentBatch: 0,
        totalBatches: batches.length,
        currentTransaction: 0,
        totalTransactions: batches.reduce((sum, batch) => sum + batch.transactions.length, 0),
        estimatedTimeRemaining: recommendation.estimatedTime || 0,
        networkQuality: result.networkQuality
      });

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchResult = await this.syncBatch(batch, i + 1, batches.length);
        
        result.syncedCount += batchResult.syncedCount;
        result.failedCount += batchResult.failedCount;
        result.conflictCount += batchResult.conflictCount;
        result.totalProcessed += batchResult.totalProcessed;
        result.errors.push(...batchResult.errors);

        // Check if we should continue based on network conditions
        const currentRecommendation = this.networkService.getSyncRecommendation(
          batches.length - i - 1
        );
        
        if (!currentRecommendation.shouldSync && i < batches.length - 1) {
          console.log('⏸️ Pausing sync due to network conditions');
          break;
        }
      }

      // Phase 3: Complete
      this.notifyProgress({
        phase: 'finishing',
        currentBatch: batches.length,
        totalBatches: batches.length,
        currentTransaction: result.totalProcessed,
        totalTransactions: result.totalProcessed,
        estimatedTimeRemaining: 0,
        networkQuality: result.networkQuality
      });

      result.success = result.failedCount === 0;
      return result;
    } catch (error) {
      console.error('❌ Intelligent sync failed:', error);
      result.success = false;
      result.errors.push({
        transactionId: 'batch_error',
        receiptNumber: 'N/A',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'unknown',
        retryable: true,
        timestamp: Date.now()
      });
      return result;
    }
  }

  /**
   * Create sync batches based on recommendation
   */
  private async createSyncBatches(recommendation: SyncRecommendation): Promise<TransactionBatch[]> {
    const batches: TransactionBatch[] = [];
    const batchSize = recommendation.batchSize || 10;

    // Get high priority transactions first
    const highPriorityBatch = await this.transactionQueue.createSyncBatch('high');
    if (highPriorityBatch) {
      batches.push(highPriorityBatch);
    }

    // Then medium priority
    const mediumPriorityBatch = await this.transactionQueue.createSyncBatch('medium');
    if (mediumPriorityBatch) {
      batches.push(mediumPriorityBatch);
    }

    // Finally low priority (if network conditions allow)
    if (recommendation.priority !== 'background') {
      const lowPriorityBatch = await this.transactionQueue.createSyncBatch('low');
      if (lowPriorityBatch) {
        batches.push(lowPriorityBatch);
      }
    }

    return batches;
  }

  /**
   * Sync a single batch of transactions
   */
  private async syncBatch(batch: TransactionBatch, batchNumber: number, totalBatches: number): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      totalProcessed: 0,
      errors: [],
      duration: 0,
      networkQuality: this.networkService.getNetworkStatus().quality.level
    };

    console.log(`📦 Syncing batch ${batchNumber}/${totalBatches} with ${batch.transactions.length} transactions`);

    for (let i = 0; i < batch.transactions.length; i++) {
      const transaction = batch.transactions[i];
      
      this.notifyProgress({
        phase: 'syncing',
        currentBatch: batchNumber,
        totalBatches,
        currentTransaction: result.totalProcessed + 1,
        totalTransactions: batch.transactions.length,
        estimatedTimeRemaining: (batch.transactions.length - i) * 2000, // 2s per transaction
        networkQuality: result.networkQuality
      });

      try {
        await this.syncSingleTransaction(transaction);
        result.syncedCount++;
        console.log(`✅ Synced transaction: ${transaction.receiptNumber}`);
      } catch (error) {
        result.failedCount++;
        const syncError = this.createSyncError(transaction, error);
        result.errors.push(syncError);
        
        await this.transactionQueue.markTransactionFailed(
          transaction.id,
          syncError.error
        );
        
        console.error(`❌ Failed to sync transaction ${transaction.receiptNumber}:`, error);
      }
      
      result.totalProcessed++;
    }

    return result;
  }

  /**
   * Sync a single transaction
   */
  private async syncSingleTransaction(transaction: EnhancedOfflineTransaction): Promise<void> {
    // Convert enhanced transaction to streamlined format
    const streamlinedData = {
      store_id: transaction.storeId,
      user_id: transaction.userId,
      shift_id: transaction.shiftId,
      customer_id: transaction.customerId,
      items: transaction.items.map(item => ({
        product_id: item.productId,
        variation_id: item.variationId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      })),
      subtotal: transaction.subtotal,
      tax: transaction.tax,
      discount: transaction.discount,
      discount_type: transaction.discountType,
      discount_id_number: transaction.discountIdNumber,
      total: transaction.total,
      amount_tendered: transaction.amountTendered,
      change: transaction.change,
      payment_method: transaction.paymentMethod,
      payment_details: transaction.paymentDetails,
      order_type: transaction.orderType,
      delivery_platform: transaction.deliveryPlatform,
      delivery_order_number: transaction.deliveryOrderNumber,
      isOfflineSync: true,
      offlineTransactionId: transaction.id,
      offlineTimestamp: transaction.timestamp,
      offlineReceiptNumber: transaction.receiptNumber
    };

    // Process the transaction
    const result = await streamlinedTransactionService.processTransaction(streamlinedData);
    
    if (result.success && result.transaction) {
      // Mark as successfully synced
      await this.transactionQueue.markTransactionSynced(
        transaction.id,
        result.transaction.id
      );
    } else {
      throw new Error(result.error || 'Transaction processing failed');
    }
  }

  /**
   * Create sync error object
   */
  private createSyncError(transaction: EnhancedOfflineTransaction, error: any): SyncError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    let errorType: SyncError['errorType'] = 'unknown';
    let retryable = true;

    // Categorize error types
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
    } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      errorType = 'validation';
      retryable = false;
    } else if (errorMessage.includes('conflict')) {
      errorType = 'conflict';
    } else if (errorMessage.includes('server') || errorMessage.includes('500')) {
      errorType = 'server';
    }

    return {
      transactionId: transaction.id,
      receiptNumber: transaction.receiptNumber,
      error: errorMessage,
      errorType,
      retryable,
      timestamp: Date.now()
    };
  }

  /**
   * Start background sync
   */
  private startBackgroundSync(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }

    this.backgroundSyncInterval = setInterval(async () => {
      if (!this.isSyncing) {
        const stats = await this.transactionQueue.getQueueStats();
        if (stats.pendingTransactions > 0 || stats.failedTransactions > 0) {
          console.log('🔄 Background sync triggered');
          await this.triggerSync('background');
        }
      }
    }, this.BACKGROUND_SYNC_INTERVAL);

    console.log('⏰ Background sync started');
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(progress: SyncProgress): void {
    this.syncProgressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('❌ Progress callback failed:', error);
      }
    });
  }

  /**
   * Create empty sync result
   */
  private createEmptySyncResult(): SyncResult {
    return {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      totalProcessed: 0,
      errors: [],
      duration: 0,
      networkQuality: this.networkService.getNetworkStatus().quality.level
    };
  }

  /**
   * Create error sync result
   */
  private createErrorSyncResult(error: any): SyncResult {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      conflictCount: 0,
      totalProcessed: 0,
      errors: [{
        transactionId: 'sync_manager_error',
        receiptNumber: 'N/A',
        error: error instanceof Error ? error.message : 'Unknown sync error',
        errorType: 'unknown',
        retryable: true,
        timestamp: Date.now()
      }],
      duration: 0,
      networkQuality: this.networkService.getNetworkStatus().quality.level
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }
    
    this.syncProgressCallbacks.clear();
    console.log('🧹 Intelligent Sync Manager destroyed');
  }
}
