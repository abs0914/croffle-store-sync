/**
 * OFFLINE INVENTORY HOOK
 * 
 * Hook for offline-first inventory operations.
 * Integrates all offline services for inventory screens.
 */

import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineInventoryService } from '@/services/offline/offlineInventoryService';
import { referenceDataService } from '@/services/offline/referenceDataService';
import { offlineSyncService } from '@/services/offline/offlineSyncService';
import { outboxService } from '@/services/offline/outboxService';

export function useOfflineInventory(storeId: string | null) {
  const { isOnline } = useNetworkStatus();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [inventoryLevels, setInventoryLevels] = useState<any[]>([]);
  const [todayActivity, setTodayActivity] = useState({
    totalDeductions: 0,
    totalAdjustments: 0,
    totalWaste: 0,
    itemsAffected: 0
  });

  // Initialize
  useEffect(() => {
    if (!storeId) return;
    setIsInitialized(true);
  }, [storeId]);

  // Load inventory levels
  useEffect(() => {
    if (!storeId) return;

    const loadInventory = async () => {
      const levels = await offlineInventoryService.getCurrentInventoryLevels(storeId);
      setInventoryLevels(levels);

      const activity = await offlineInventoryService.getTodayActivity(storeId);
      setTodayActivity(activity);
    };

    loadInventory();

    // Refresh every 10 seconds
    const interval = setInterval(loadInventory, 10000);
    return () => clearInterval(interval);
  }, [storeId]);

  // Update pending sync count
  useEffect(() => {
    if (!storeId) return;

    const updatePending = async () => {
      const count = await offlineInventoryService.getUnsyncedEventsCount(storeId);
      setPendingSync(count);
    };

    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, [storeId]);

  // Trigger manual sync
  const triggerSync = async () => {
    if (!isOnline || !storeId) return;
    setIsSyncing(true);
    try {
      await offlineSyncService.syncAll();
    } finally {
      setIsSyncing(false);
    }
  };

  // Record manual adjustment
  const recordAdjustment = async (
    inventoryStockId: string,
    quantityChange: number,
    reason: string,
    userId: string
  ) => {
    if (!storeId) return false;
    return await offlineInventoryService.recordManualAdjustment(
      storeId,
      inventoryStockId,
      quantityChange,
      reason,
      userId
    );
  };

  // Record waste
  const recordWaste = async (
    inventoryStockId: string,
    quantity: number,
    reason: string,
    userId: string
  ) => {
    if (!storeId) return false;
    return await offlineInventoryService.recordWaste(
      storeId,
      inventoryStockId,
      quantity,
      reason,
      userId
    );
  };

  // Refresh cache
  const refreshCache = async () => {
    if (!storeId) return;
    await referenceDataService.refreshCache(storeId);
  };

  return {
    isInitialized,
    isOnline,
    isSyncing,
    pendingSync,
    inventoryLevels,
    todayActivity,
    triggerSync,
    recordAdjustment,
    recordWaste,
    refreshCache,
    inventoryService: offlineInventoryService
  };
}
