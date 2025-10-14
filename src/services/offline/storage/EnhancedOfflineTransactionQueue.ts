/**
 * ENHANCED OFFLINE TRANSACTION QUEUE
 * 
 * Upgraded transaction queue with:
 * - Priority-based processing (cash > card > e-wallet)
 * - Advanced error handling and retry logic
 * - Platform-optimized storage (IndexedDB/SQLite/localStorage)
 * - Comprehensive transaction metadata
 * - Batch operations for performance
 */

import { toast } from 'sonner';
import { PlatformStorageManager, StorageConfig } from './PlatformStorageManager';

export interface EnhancedOfflineTransaction {
  id: string;
  timestamp: number;
  storeId: string;
  userId: string;
  shiftId: string;
  customerId?: string;
  
  // Transaction items with enhanced metadata
  items: Array<{
    productId: string;
    variationId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
    sku?: string;
    taxRate?: number;
  }>;
  
  // Financial details
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: string;
  discountIdNumber?: string;
  total: number;
  amountTendered: number;
  change?: number;
  
  // Payment information
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  paymentDetails?: any;
  
  // Order details
  orderType?: string;
  deliveryPlatform?: string;
  deliveryOrderNumber?: string;
  
  // Sync management
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  syncAttempts: number;
  lastSyncAttempt?: number;
  syncError?: string;
  
  // Priority and metadata
  priority: 'high' | 'medium' | 'low';
  receiptNumber: string;
  deviceId?: string;
  networkQuality?: string;
  
  // Conflict resolution
  conflictData?: {
    serverVersion?: any;
    conflictType: 'inventory' | 'pricing' | 'customer' | 'other';
    resolutionStrategy?: 'server_wins' | 'client_wins' | 'merge' | 'user_prompt';
    resolvedAt?: number;
  };
}

export interface TransactionBatch {
  id: string;
  transactions: EnhancedOfflineTransaction[];
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  estimatedSyncTime: number;
}

export interface QueueStats {
  totalTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  syncingTransactions: number;
  conflictTransactions: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  oldestTransaction: number;
  newestTransaction: number;
  estimatedSyncTime: number;
  storageUsage: number;
}

export class EnhancedOfflineTransactionQueue {
  private static instance: EnhancedOfflineTransactionQueue;
  private storageManager: PlatformStorageManager;
  private readonly STORE_NAME = 'offline_transactions';
  private readonly BATCH_STORE_NAME = 'transaction_batches';
  private readonly OFFLINE_RECEIPT_PREFIX = 'OFF';
  private readonly MAX_QUEUE_SIZE = 500;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly BATCH_SIZE = 10;

  private constructor() {
    // Initialize storage configuration
    const storageConfig: StorageConfig = {
      dbName: 'CroffleOfflineDB',
      version: 1,
      stores: [
        {
          name: this.STORE_NAME,
          keyPath: 'id',
          indexes: [
            { name: 'timestamp', keyPath: 'timestamp' },
            { name: 'storeId', keyPath: 'storeId' },
            { name: 'syncStatus', keyPath: 'syncStatus' },
            { name: 'priority', keyPath: 'priority' },
            { name: 'paymentMethod', keyPath: 'paymentMethod' }
          ]
        },
        {
          name: this.BATCH_STORE_NAME,
          keyPath: 'id',
          indexes: [
            { name: 'priority', keyPath: 'priority' },
            { name: 'createdAt', keyPath: 'createdAt' }
          ]
        }
      ]
    };

    this.storageManager = PlatformStorageManager.getInstance(storageConfig);
  }

  static getInstance(): EnhancedOfflineTransactionQueue {
    if (!EnhancedOfflineTransactionQueue.instance) {
      EnhancedOfflineTransactionQueue.instance = new EnhancedOfflineTransactionQueue();
    }
    return EnhancedOfflineTransactionQueue.instance;
  }

  /**
   * Initialize the queue system
   */
  async initialize(): Promise<void> {
    try {
      await this.storageManager.initialize();
      console.log('✅ Enhanced Offline Transaction Queue initialized');
      
      // Clean up old transactions on startup
      await this.cleanupOldTransactions();
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Offline Transaction Queue:', error);
      throw error;
    }
  }

  /**
   * Queue a transaction with automatic priority assignment
   */
  async queueTransaction(transactionData: Partial<EnhancedOfflineTransaction>): Promise<string> {
    try {
      const transactionId = this.generateTransactionId();
      const receiptNumber = await this.generateOfflineReceiptNumber();
      
      // Determine priority based on payment method and amount
      const priority = this.determinePriority(transactionData);
      
      const transaction: EnhancedOfflineTransaction = {
        id: transactionId,
        timestamp: Date.now(),
        receiptNumber,
        priority,
        syncStatus: 'pending',
        syncAttempts: 0,
        deviceId: await this.getDeviceId(),
        ...transactionData
      } as EnhancedOfflineTransaction;

      // Store the transaction
      await this.storageManager.setItem(
        this.STORE_NAME,
        transactionId,
        transaction,
        {
          priority,
          paymentMethod: transaction.paymentMethod,
          total: transaction.total
        }
      );

      console.log(`📝 Queued offline transaction: ${receiptNumber} (Priority: ${priority})`);
      
      // Show user feedback
      toast.success(`Transaction queued offline: ${receiptNumber}`, {
        description: `Will sync when connection is restored (Priority: ${priority})`
      });

      return transactionId;
    } catch (error) {
      console.error('❌ Failed to queue transaction:', error);
      toast.error('Failed to save offline transaction');
      throw error;
    }
  }

  /**
   * Get transactions by priority for sync processing
   */
  async getTransactionsByPriority(priority?: 'high' | 'medium' | 'low', limit: number = 50): Promise<EnhancedOfflineTransaction[]> {
    try {
      const query = {
        store: this.STORE_NAME,
        index: priority ? 'priority' : 'timestamp',
        key: priority,
        limit
      };

      const items = await this.storageManager.query(query);
      return items
        .map(item => item.data as EnhancedOfflineTransaction)
        .filter(transaction => transaction.syncStatus === 'pending' || transaction.syncStatus === 'failed')
        .sort((a, b) => {
          // Sort by priority first, then by timestamp
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
        });
    } catch (error) {
      console.error('❌ Failed to get transactions by priority:', error);
      return [];
    }
  }

  /**
   * Create transaction batches for efficient sync
   */
  async createSyncBatch(priority: 'high' | 'medium' | 'low'): Promise<TransactionBatch | null> {
    try {
      const transactions = await this.getTransactionsByPriority(priority, this.BATCH_SIZE);
      
      if (transactions.length === 0) {
        return null;
      }

      const batchId = this.generateBatchId();
      const batch: TransactionBatch = {
        id: batchId,
        transactions,
        priority,
        createdAt: Date.now(),
        estimatedSyncTime: this.estimateSyncTime(transactions)
      };

      // Store the batch
      await this.storageManager.setItem(this.BATCH_STORE_NAME, batchId, batch);

      // Mark transactions as syncing
      for (const transaction of transactions) {
        transaction.syncStatus = 'syncing';
        transaction.lastSyncAttempt = Date.now();
        await this.storageManager.setItem(this.STORE_NAME, transaction.id, transaction);
      }

      console.log(`📦 Created sync batch: ${batchId} with ${transactions.length} transactions`);
      return batch;
    } catch (error) {
      console.error('❌ Failed to create sync batch:', error);
      return null;
    }
  }

  /**
   * Mark transaction as successfully synced
   */
  async markTransactionSynced(transactionId: string, serverTransactionId?: string): Promise<void> {
    try {
      const item = await this.storageManager.getItem(this.STORE_NAME, transactionId);
      if (!item) {
        console.warn(`Transaction ${transactionId} not found in queue`);
        return;
      }

      const transaction = item.data as EnhancedOfflineTransaction;
      transaction.syncStatus = 'synced';
      transaction.lastSyncAttempt = Date.now();
      
      if (serverTransactionId) {
        transaction.conflictData = {
          ...transaction.conflictData,
          serverVersion: { id: serverTransactionId }
        };
      }

      await this.storageManager.setItem(this.STORE_NAME, transactionId, transaction);
      console.log(`✅ Transaction ${transaction.receiptNumber} marked as synced`);
    } catch (error) {
      console.error('❌ Failed to mark transaction as synced:', error);
    }
  }

  /**
   * Mark transaction as failed with error details
   */
  async markTransactionFailed(transactionId: string, error: string): Promise<void> {
    try {
      const item = await this.storageManager.getItem(this.STORE_NAME, transactionId);
      if (!item) {
        console.warn(`Transaction ${transactionId} not found in queue`);
        return;
      }

      const transaction = item.data as EnhancedOfflineTransaction;
      transaction.syncStatus = 'failed';
      transaction.syncAttempts += 1;
      transaction.lastSyncAttempt = Date.now();
      transaction.syncError = error;

      // If max retries reached, lower priority
      if (transaction.syncAttempts >= this.MAX_RETRY_ATTEMPTS) {
        transaction.priority = 'low';
        console.warn(`Transaction ${transaction.receiptNumber} reached max retry attempts, lowering priority`);
      }

      await this.storageManager.setItem(this.STORE_NAME, transactionId, transaction);
      console.log(`❌ Transaction ${transaction.receiptNumber} marked as failed: ${error}`);
    } catch (error) {
      console.error('❌ Failed to mark transaction as failed:', error);
    }
  }

  /**
   * Get comprehensive queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    try {
      const allTransactions = await this.getAllTransactions();
      const storageStats = await this.storageManager.getStats();

      const stats: QueueStats = {
        totalTransactions: allTransactions.length,
        pendingTransactions: allTransactions.filter(t => t.syncStatus === 'pending').length,
        failedTransactions: allTransactions.filter(t => t.syncStatus === 'failed').length,
        syncingTransactions: allTransactions.filter(t => t.syncStatus === 'syncing').length,
        conflictTransactions: allTransactions.filter(t => t.syncStatus === 'conflict').length,
        highPriorityCount: allTransactions.filter(t => t.priority === 'high').length,
        mediumPriorityCount: allTransactions.filter(t => t.priority === 'medium').length,
        lowPriorityCount: allTransactions.filter(t => t.priority === 'low').length,
        oldestTransaction: allTransactions.length > 0 ? Math.min(...allTransactions.map(t => t.timestamp)) : Date.now(),
        newestTransaction: allTransactions.length > 0 ? Math.max(...allTransactions.map(t => t.timestamp)) : Date.now(),
        estimatedSyncTime: this.estimateTotalSyncTime(allTransactions),
        storageUsage: storageStats.totalSize
      };

      return stats;
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      return {
        totalTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        syncingTransactions: 0,
        conflictTransactions: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        oldestTransaction: Date.now(),
        newestTransaction: Date.now(),
        estimatedSyncTime: 0,
        storageUsage: 0
      };
    }
  }

  /**
   * Get all transactions from storage
   */
  private async getAllTransactions(): Promise<EnhancedOfflineTransaction[]> {
    try {
      const items = await this.storageManager.query({ store: this.STORE_NAME });
      return items.map(item => item.data as EnhancedOfflineTransaction);
    } catch (error) {
      console.error('❌ Failed to get all transactions:', error);
      return [];
    }
  }

  /**
   * Determine transaction priority based on payment method and amount
   */
  private determinePriority(transaction: Partial<EnhancedOfflineTransaction>): 'high' | 'medium' | 'low' {
    // Cash transactions get highest priority (immediate reconciliation needed)
    if (transaction.paymentMethod === 'cash') {
      return 'high';
    }
    
    // Large transactions get medium priority
    if (transaction.total && transaction.total > 1000) {
      return 'medium';
    }
    
    // Card and e-wallet transactions get lower priority
    return 'low';
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Generate offline receipt number
   */
  private async generateOfflineReceiptNumber(): Promise<string> {
    try {
      const stats = await this.getQueueStats();
      const sequence = (stats.totalTransactions + 1).toString().padStart(6, '0');
      return `${this.OFFLINE_RECEIPT_PREFIX}${sequence}`;
    } catch (error) {
      // Fallback to timestamp-based receipt number
      const timestamp = Date.now().toString().slice(-6);
      return `${this.OFFLINE_RECEIPT_PREFIX}${timestamp}`;
    }
  }

  /**
   * Get device ID for tracking
   */
  private async getDeviceId(): Promise<string> {
    // This will be enhanced with actual device ID in mobile implementation
    return `web_${navigator.userAgent.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Estimate sync time for transactions
   */
  private estimateSyncTime(transactions: EnhancedOfflineTransaction[]): number {
    // Estimate 2 seconds per transaction + 1 second per item
    const baseTime = transactions.length * 2000;
    const itemTime = transactions.reduce((total, t) => total + (t.items?.length || 0), 0) * 1000;
    return baseTime + itemTime;
  }

  /**
   * Estimate total sync time for all pending transactions
   */
  private estimateTotalSyncTime(transactions: EnhancedOfflineTransaction[]): number {
    const pendingTransactions = transactions.filter(t => 
      t.syncStatus === 'pending' || t.syncStatus === 'failed'
    );
    return this.estimateSyncTime(pendingTransactions);
  }

  /**
   * Clean up old synced transactions
   */
  private async cleanupOldTransactions(): Promise<void> {
    try {
      const allTransactions = await this.getAllTransactions();
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const transactionsToRemove = allTransactions.filter(t => 
        t.syncStatus === 'synced' && t.timestamp < cutoffTime
      );

      for (const transaction of transactionsToRemove) {
        await this.storageManager.removeItem(this.STORE_NAME, transaction.id);
      }

      if (transactionsToRemove.length > 0) {
        console.log(`🧹 Cleaned up ${transactionsToRemove.length} old synced transactions`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old transactions:', error);
    }
  }
}
