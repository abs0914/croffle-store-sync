import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProductRecipeStatus,
  syncProductCatalogWithRecipes,
  createMissingRecipes,
  setupRecipeProductMonitoring,
  type RecipeProductStatus
} from '@/services/recipeManagement/recipeProductIntegration';

export const useRecipeProductIntegration = (storeId: string | null) => {
  const [isSync, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Fetch product recipe statuses
  const { 
    data: productStatuses = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['product-recipe-status', storeId],
    queryFn: () => storeId ? getProductRecipeStatus(storeId) : Promise.resolve([]),
    enabled: !!storeId,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000 // Consider data stale after 15 seconds
  });

  // Sync product catalog with recipes
  const syncCatalog = useCallback(async () => {
    if (!storeId || isSync) return;

    setIsSyncing(true);
    try {
      const result = await syncProductCatalogWithRecipes(storeId);
      setLastSyncTime(new Date());
      await refetch(); // Refresh data after sync
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [storeId, isSync, refetch]);

  // Create missing recipes
  const createRecipes = useCallback(async () => {
    if (!storeId) return 0;
    
    const created = await createMissingRecipes(storeId);
    if (created > 0) {
      await refetch(); // Refresh data after creating recipes
    }
    return created;
  }, [storeId, refetch]);

  // Setup real-time monitoring
  useEffect(() => {
    if (!storeId) return;

    const cleanup = setupRecipeProductMonitoring(storeId);
    
    return cleanup;
  }, [storeId]);

  // Calculate summary metrics
  const summary = {
    total: productStatuses.length,
    readyToSell: productStatuses.filter(p => p.status === 'ready_to_sell').length,
    setupNeeded: productStatuses.filter(p => p.status === 'setup_needed').length,
    directProducts: productStatuses.filter(p => p.status === 'direct_product').length,
    missingTemplates: productStatuses.filter(p => p.status === 'missing_template').length,
    canProduce: productStatuses.filter(p => p.canProduce).length,
    needsAttention: productStatuses.filter(p => 
      p.status === 'setup_needed' || p.status === 'missing_template'
    ).length
  };

  return {
    productStatuses,
    summary,
    isLoading,
    error,
    isSync,
    lastSyncTime,
    syncCatalog,
    createRecipes,
    refetch
  };
};