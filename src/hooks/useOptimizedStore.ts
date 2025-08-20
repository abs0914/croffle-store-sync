import { useEffect, useState } from 'react';
import { InventoryCacheService } from '@/services/cache/inventoryCacheService';
import { BackgroundProcessingService } from '@/services/transactions/backgroundProcessingService';

/**
 * Optimized store hook with preloading and caching
 */
export function useOptimizedStore(currentStore: any) {
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [preloadingStatus, setPreloadingStatus] = useState<'idle' | 'loading' | 'complete' | 'error'>('idle');

  useEffect(() => {
    if (currentStore && preloadingStatus === 'idle') {
      preloadStoreData();
    }
  }, [currentStore, preloadingStatus]);

  const preloadStoreData = async () => {
    if (!currentStore) return;

    setPreloadingStatus('loading');
    const startTime = Date.now();

    try {
      console.log('🚀 Preloading store data for:', currentStore.name);

      // Preload inventory cache
      await InventoryCacheService.preloadStoreCache(currentStore.id);

      // Start background cache refresh job
      BackgroundProcessingService.refreshCacheInBackground(currentStore.id);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Store data preloaded in ${loadTime}ms`);

      setPreloadingStatus('complete');
      setIsStoreReady(true);

    } catch (error) {
      console.error('❌ Failed to preload store data:', error);
      setPreloadingStatus('error');
      setIsStoreReady(false);
    }
  };

  const refreshStoreCache = async () => {
    if (!currentStore) return;

    console.log('🔄 Refreshing store cache...');
    InventoryCacheService.invalidateStoreCache(currentStore.id);
    await InventoryCacheService.preloadStoreCache(currentStore.id);
    console.log('✅ Store cache refreshed');
  };

  const getStoreStats = () => {
    const cacheStats = InventoryCacheService.getCacheStats();
    const processingStats = BackgroundProcessingService.getProcessingStats();
    
    return {
      cache: cacheStats,
      processing: processingStats,
      storeReady: isStoreReady,
      preloadingStatus
    };
  };

  return {
    currentStore,
    isStoreReady,
    preloadingStatus,
    refreshStoreCache,
    getStoreStats
  };
}