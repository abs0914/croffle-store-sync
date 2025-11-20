/**
 * OFFLINE POS HOOK
 * 
 * Main hook for offline-first POS operations.
 * Integrates all offline services for POS screens.
 */

import { useState, useEffect } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { deviceIdService } from '@/services/offline/deviceIdService';
import { referenceDataService } from '@/services/offline/referenceDataService';
import { offlinePOSService } from '@/services/offline/offlinePOSService';
import { offlineInventoryService } from '@/services/offline/offlineInventoryService';
import { businessDayService } from '@/services/offline/businessDayService';
import { offlineSyncService } from '@/services/offline/offlineSyncService';
import { outboxService } from '@/services/offline/outboxService';
import { offlineDB } from '@/services/offline/db/schema';

export function useOfflinePOS(storeId: string | null) {
  const { isOnline } = useNetworkStatus();
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  // Initialize offline system
  useEffect(() => {
    if (!storeId) return;

    const init = async () => {
      const id = await deviceIdService.getDeviceId();
      setDeviceId(id);
      await deviceIdService.setStoreId(storeId);
      
      // Check cache age
      const age = await referenceDataService.getCacheAge(storeId);
      setCacheAge(age);
      
      setIsInitialized(true);
    };

    init();
  }, [storeId]);

  // Update pending sync count
  useEffect(() => {
    if (!storeId) return;

    const updatePending = async () => {
      const stats = await outboxService.getStats(storeId);
      setPendingSync(stats.pending);
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

  // Start of day
  const startOfDay = async (shiftId?: string, startingCash?: number) => {
    if (!storeId) return { success: false };
    return await businessDayService.startOfDay(storeId, shiftId, startingCash);
  };

  // End of day
  const endOfDay = async () => {
    if (!storeId) return { success: false, summary: null, pendingSync: false };
    return await businessDayService.endOfDay(storeId);
  };

  return {
    isInitialized,
    isOnline,
    deviceId,
    isSyncing,
    pendingSync,
    cacheAge,
    triggerSync,
    startOfDay,
    endOfDay,
    // Service instances
    posService: offlinePOSService,
    inventoryService: offlineInventoryService,
    referenceDataService,
    businessDayService,
    db: offlineDB
  };
}
