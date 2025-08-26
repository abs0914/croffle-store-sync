import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getProductRecipeStatus,
  getRecipeAvailabilityStatus,
  syncProductCatalogWithRecipes,
  createMissingRecipes,
  setupRecipeProductMonitoring,
  type RecipeProductStatus,
  type RecipeAvailabilityStatus
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

  // Fetch recipe availability statuses (recipe-first approach)
  const { 
    data: recipeStatuses = [], 
    isLoading: recipesLoading, 
    error: recipesError,
    refetch: refetchRecipes
  } = useQuery({
    queryKey: ['recipe-availability-status', storeId],
    queryFn: () => storeId ? getRecipeAvailabilityStatus(storeId) : Promise.resolve([]),
    enabled: !!storeId,
    refetchInterval: 30000,
    staleTime: 15000
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

  // Calculate summary metrics based on both product and recipe data
  const summary = {
    total: productStatuses.length,
    readyToSell: productStatuses.filter(p => p.status === 'ready_to_sell').length,
    setupNeeded: productStatuses.filter(p => p.status === 'setup_needed').length,
    directProducts: productStatuses.filter(p => p.status === 'direct_product').length,
    missingTemplates: productStatuses.filter(p => p.status === 'missing_template').length,
    canProduce: productStatuses.filter(p => p.canProduce).length,
    needsAttention: productStatuses.filter(p => 
      p.status === 'setup_needed' || p.status === 'missing_template'
    ).length,
    // Recipe-specific metrics
    recipesTotal: recipeStatuses.length,
    recipesReady: recipeStatuses.filter(r => r.status === 'ready_to_sell').length,
    recipesSetupNeeded: recipeStatuses.filter(r => r.status === 'setup_needed' || r.status === 'missing_ingredients').length,
    recipesLinked: recipeStatuses.filter(r => r.isLinkedToProduct).length,
    recipesUnlinked: recipeStatuses.filter(r => !r.isLinkedToProduct).length
  };

  return {
    productStatuses,
    recipeStatuses,
    summary,
    isLoading,
    isRecipesLoading: recipesLoading,
    error,
    recipesError,
    isSync,
    lastSyncTime,
    syncCatalog,
    createRecipes,
    refetch,
    refetchRecipes
  };
};