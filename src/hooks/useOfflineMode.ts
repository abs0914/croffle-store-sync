import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineTransactionQueue } from '../services/offline/offlineTransactionQueue';
import { offlineProductCache } from '../services/offline/offlineProductCache';
import { offlineSyncService, SyncResult } from '../services/offline/offlineSyncService';
import { toast } from 'sonner';

export interface OfflineModeStatus {
  isOnline: boolean;
  isOfflineCapable: boolean;
  hasCachedData: boolean;
  pendingTransactions: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
  cacheAge: number | null; // in minutes
}

export function useOfflineMode(storeId: string | null) {
  const networkStatus = useNetworkStatus();
  const [offlineStatus, setOfflineStatus] = useState<OfflineModeStatus>({
    isOnline: networkStatus.isOnline,
    isOfflineCapable: false,
    hasCachedData: false,
    pendingTransactions: 0,
    lastSyncTime: null,
    isSyncing: false,
    cacheAge: null
  });

  // Update offline status
  const updateOfflineStatus = () => {
    if (!storeId) {
      setOfflineStatus(prev => ({
        ...prev,
        isOnline: networkStatus.isOnline,
        isOfflineCapable: false,
        hasCachedData: false,
        pendingTransactions: 0,
        cacheAge: null
      }));
      return;
    }

    const stats = offlineTransactionQueue.getQueueStats();
    const cachedData = offlineProductCache.getCachedProducts(storeId);
    const cacheAge = offlineProductCache.getCacheAge(storeId);

    setOfflineStatus(prev => ({
      ...prev,
      isOnline: networkStatus.isOnline,
      isOfflineCapable: cachedData !== null,
      hasCachedData: cachedData !== null,
      pendingTransactions: stats.pendingTransactions,
      cacheAge,
      isSyncing: offlineSyncService.isSyncInProgress
    }));
  };

  // Listen for network changes
  useEffect(() => {
    updateOfflineStatus();

    // Auto-sync when reconnecting
    if (networkStatus.justReconnected && storeId) {
      console.log('🌐 Network reconnected, starting auto-sync...');
      offlineSyncService.autoSyncOnReconnect();
    }
  }, [networkStatus, storeId]);

  // Listen for sync results
  useEffect(() => {
    const handleSyncResult = (result: SyncResult) => {
      updateOfflineStatus();
      
      if (result.success && result.syncedTransactions > 0) {
        setOfflineStatus(prev => ({ 
          ...prev, 
          lastSyncTime: Date.now() 
        }));
      }
    };

    offlineSyncService.addSyncListener(handleSyncResult);
    
    return () => {
      offlineSyncService.removeSyncListener(handleSyncResult);
    };
  }, []);

  // Refresh status periodically
  useEffect(() => {
    const interval = setInterval(updateOfflineStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [storeId]);

  // Process offline transaction
  const processOfflineTransaction = (transactionData: any): string | null => {
    if (!storeId) {
      toast.error('No store selected for offline transaction');
      return null;
    }

    try {
      // Reserve inventory offline
      let allItemsReserved = true;
      for (const item of transactionData.items) {
        const reserved = offlineProductCache.reserveInventoryOffline(
          storeId,
          item.productId,
          item.variationId,
          item.quantity
        );
        
        if (!reserved) {
          allItemsReserved = false;
          break;
        }
      }

      if (!allItemsReserved) {
        toast.error('Insufficient inventory for offline transaction');
        return null;
      }

      // Queue the transaction
      const transactionId = offlineTransactionQueue.queueTransaction(transactionData);
      
      // Queue inventory changes
      transactionData.items.forEach((item: any) => {
        offlineTransactionQueue.queueInventoryChange({
          storeId,
          productId: item.productId,
          variationId: item.variationId,
          quantityDeducted: item.quantity,
          transactionId
        });
      });

      updateOfflineStatus();
      return transactionId;
    } catch (error) {
      console.error('Error processing offline transaction:', error);
      toast.error('Failed to process offline transaction');
      return null;
    }
  };

  // Manual sync trigger
  const triggerSync = async (): Promise<SyncResult> => {
    if (!networkStatus.isOnline) {
      toast.error('Cannot sync while offline');
      return {
        success: false,
        syncedTransactions: 0,
        failedTransactions: 0,
        syncedInventoryChanges: 0,
        errors: ['No internet connection']
      };
    }

    setOfflineStatus(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const result = await offlineSyncService.syncAll();
      return result;
    } finally {
      setOfflineStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // Cache products for offline use
  const cacheProductsForOffline = (products: any[], categories: any[]) => {
    if (!storeId) return;
    
    offlineProductCache.cacheProducts(storeId, products, categories);
    
    // Also cache basic inventory levels
    const inventoryLevels = products.map(product => ({
      productId: product.id,
      variationId: undefined,
      availableQuantity: 1000, // Optimistic availability
      lastUpdated: Date.now(),
      reservedOffline: 0
    }));
    
    offlineProductCache.cacheInventoryLevels(storeId, inventoryLevels);
    updateOfflineStatus();
  };

  // Get cached products
  const getCachedProducts = () => {
    if (!storeId) return null;
    return offlineProductCache.getCachedProducts(storeId);
  };

  // Check if product is available offline
  const checkOfflineAvailability = (productId: string, variationId?: string, quantity: number = 1): boolean => {
    if (!storeId) return false;
    const available = offlineProductCache.getAvailableQuantity(storeId, productId, variationId);
    return available >= quantity;
  };

  // Get enhanced cache status
  const getCacheStatus = () => {
    if (!storeId) return null;
    return offlineProductCache.getCacheStatus(storeId);
  };

  // Get low stock items
  const getLowStockItems = () => {
    if (!storeId) return [];
    return offlineProductCache.getLowStockItems(storeId);
  };

  return {
    ...offlineStatus,
    processOfflineTransaction,
    triggerSync,
    cacheProductsForOffline,
    getCachedProducts,
    checkOfflineAvailability,
    getCacheStatus,
    getLowStockItems,
    queueStats: storeId ? offlineTransactionQueue.getQueueStats() : null,
    syncStats: offlineSyncService.getSyncStats(),
    failedTransactions: offlineSyncService.getFailedTransactions()
  };
}