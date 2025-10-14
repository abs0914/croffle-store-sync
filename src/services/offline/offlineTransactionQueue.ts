import { toast } from 'sonner';
import { PlatformStorageManager } from './storage/PlatformStorageManager';

export interface OfflineTransaction {
  id: string;
  timestamp: number;
  storeId: string;
  userId: string;
  shiftId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    variationId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: string;
  discountIdNumber?: string;
  total: number;
  amountTendered: number;
  change?: number;
  paymentMethod: 'cash' | 'card' | 'e-wallet';
  paymentDetails?: any;
  orderType?: string;
  deliveryPlatform?: string;
  deliveryOrderNumber?: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncAttempts: number;
  lastSyncAttempt?: number;
  syncError?: string;
}

export interface OfflineInventoryChange {
  id: string;
  timestamp: number;
  storeId: string;
  productId: string;
  variationId?: string;
  quantityDeducted: number;
  transactionId: string;
  syncStatus: 'pending' | 'synced' | 'failed';
}

class OfflineTransactionQueue {
  private readonly STORAGE_KEY = 'offline_transactions';
  private readonly INVENTORY_STORAGE_KEY = 'offline_inventory_changes';
  private readonly RECEIPT_COUNTER_KEY = 'offline_receipt_counter';
  private readonly MAX_QUEUE_SIZE = 100;
  private readonly MAX_SYNC_ATTEMPTS = 3;
  private readonly OFFLINE_RECEIPT_PREFIX = 'OFF';

  // Generate sequential offline receipt number
  private generateOfflineReceiptNumber(): string {
    const counter = this.getReceiptCounter() + 1;
    this.saveReceiptCounter(counter);
    return `${this.OFFLINE_RECEIPT_PREFIX}${counter.toString().padStart(6, '0')}`;
  }

  // Queue a transaction for offline processing
  queueTransaction(transaction: Omit<OfflineTransaction, 'id' | 'timestamp' | 'syncStatus' | 'syncAttempts'>): string {
    const receiptNumber = this.generateOfflineReceiptNumber();
    const offlineTransaction: OfflineTransaction = {
      ...transaction,
      id: receiptNumber,
      timestamp: Date.now(),
      syncStatus: 'pending',
      syncAttempts: 0
    };

    const queue = this.getQueue();
    queue.unshift(offlineTransaction);

    // Maintain queue size limit
    if (queue.length > this.MAX_QUEUE_SIZE) {
      queue.splice(this.MAX_QUEUE_SIZE);
    }

    this.saveQueue(queue);
    
    console.log('📱 Transaction queued for offline sync:', offlineTransaction.id);
    toast.success('Transaction saved offline - will sync when online', {
      description: `Receipt: ${offlineTransaction.id}`
    });

    return offlineTransaction.id;
  }

  // Queue inventory changes for sync
  queueInventoryChange(change: Omit<OfflineInventoryChange, 'id' | 'timestamp' | 'syncStatus'>): void {
    const inventoryChange: OfflineInventoryChange = {
      ...change,
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      syncStatus: 'pending'
    };

    const changes = this.getInventoryChanges();
    changes.unshift(inventoryChange);

    // Maintain reasonable size
    if (changes.length > this.MAX_QUEUE_SIZE * 2) {
      changes.splice(this.MAX_QUEUE_SIZE * 2);
    }

    this.saveInventoryChanges(changes);
    console.log('📦 Inventory change queued for sync:', inventoryChange.id);
  }

  // Get all pending transactions
  getPendingTransactions(): OfflineTransaction[] {
    return this.getQueue().filter(t => t.syncStatus === 'pending');
  }

  // Get all pending inventory changes
  getPendingInventoryChanges(): OfflineInventoryChange[] {
    return this.getInventoryChanges().filter(c => c.syncStatus === 'pending');
  }

  // Get queue statistics
  getQueueStats() {
    const queue = this.getQueue();
    const inventoryChanges = this.getInventoryChanges();
    
    return {
      totalTransactions: queue.length,
      pendingTransactions: queue.filter(t => t.syncStatus === 'pending').length,
      failedTransactions: queue.filter(t => t.syncStatus === 'failed').length,
      syncedTransactions: queue.filter(t => t.syncStatus === 'synced').length,
      totalInventoryChanges: inventoryChanges.length,
      pendingInventoryChanges: inventoryChanges.filter(c => c.syncStatus === 'pending').length,
      oldestPending: queue.find(t => t.syncStatus === 'pending')?.timestamp
    };
  }

  // Mark transaction as synced
  markTransactionSynced(transactionId: string, serverTransactionId?: string): void {
    const queue = this.getQueue();
    const transaction = queue.find(t => t.id === transactionId);
    
    if (transaction) {
      transaction.syncStatus = 'synced';
      if (serverTransactionId) {
        (transaction as any).serverTransactionId = serverTransactionId;
      }
      this.saveQueue(queue);
      console.log('✅ Transaction marked as synced:', transactionId);
    }
  }

  // Mark transaction as failed
  markTransactionFailed(transactionId: string, error: string): void {
    const queue = this.getQueue();
    const transaction = queue.find(t => t.id === transactionId);
    
    if (transaction) {
      transaction.syncStatus = 'failed';
      transaction.syncError = error;
      transaction.syncAttempts++;
      transaction.lastSyncAttempt = Date.now();
      this.saveQueue(queue);
      console.error('❌ Transaction sync failed:', transactionId, error);
    }
  }

  // Mark inventory change as synced
  markInventoryChangeSynced(changeId: string): void {
    const changes = this.getInventoryChanges();
    const change = changes.find(c => c.id === changeId);
    
    if (change) {
      change.syncStatus = 'synced';
      this.saveInventoryChanges(changes);
      console.log('✅ Inventory change marked as synced:', changeId);
    }
  }

  // Clear synced transactions (cleanup)
  clearSyncedTransactions(): void {
    const queue = this.getQueue();
    const filtered = queue.filter(t => t.syncStatus !== 'synced');
    this.saveQueue(filtered);
    
    const changes = this.getInventoryChanges();
    const filteredChanges = changes.filter(c => c.syncStatus !== 'synced');
    this.saveInventoryChanges(filteredChanges);
    
    console.log('🧹 Cleared synced transactions and inventory changes');
  }

  // Get transaction by ID
  getTransaction(transactionId: string): OfflineTransaction | undefined {
    return this.getQueue().find(t => t.id === transactionId);
  }

  // Private methods
  private getQueue(): OfflineTransaction[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading offline transaction queue:', error);
      return [];
    }
  }

  private saveQueue(queue: OfflineTransaction[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving offline transaction queue:', error);
      toast.error('Failed to save offline transaction');
    }
  }

  private getInventoryChanges(): OfflineInventoryChange[] {
    try {
      const stored = localStorage.getItem(this.INVENTORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading offline inventory changes:', error);
      return [];
    }
  }

  private saveInventoryChanges(changes: OfflineInventoryChange[]): void {
    try {
      localStorage.setItem(this.INVENTORY_STORAGE_KEY, JSON.stringify(changes));
    } catch (error) {
      console.error('Error saving offline inventory changes:', error);
    }
  }

  // Receipt counter management
  private getReceiptCounter(): number {
    try {
      const stored = localStorage.getItem(this.RECEIPT_COUNTER_KEY);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error reading receipt counter:', error);
      return 0;
    }
  }

  private saveReceiptCounter(counter: number): void {
    try {
      localStorage.setItem(this.RECEIPT_COUNTER_KEY, counter.toString());
    } catch (error) {
      console.error('Error saving receipt counter:', error);
    }
  }

  // Reset receipt counter (for admin use)
  resetReceiptCounter(): void {
    localStorage.removeItem(this.RECEIPT_COUNTER_KEY);
    console.log('🔢 Receipt counter reset');
  }

  // Get next receipt number without incrementing
  getNextReceiptNumber(): string {
    const counter = this.getReceiptCounter() + 1;
    return `${this.OFFLINE_RECEIPT_PREFIX}${counter.toString().padStart(6, '0')}`;
  }

  // Public access to queue for sync service
  getAllTransactions(): OfflineTransaction[] {
    return this.getQueue();
  }
}

export const offlineTransactionQueue = new OfflineTransactionQueue();