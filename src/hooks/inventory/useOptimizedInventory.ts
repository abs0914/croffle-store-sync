
import { useMemo, useCallback } from 'react';
import { useOptimizedDataFetch, useOptimizedMutation } from '@/hooks/useOptimizedDataFetch';
import { fetchInventoryItems, updateInventoryItem } from '@/services/inventoryManagement/inventoryItemService';
import { fetchInventoryMovements } from '@/services/storeInventory/inventoryMovementService';
import { getInventoryStatus } from '@/services/productCatalog/inventoryIntegrationService';
import { toast } from 'sonner';

export function useOptimizedInventory(storeId: string) {
  // Optimized inventory items fetch with smart caching
  const {
    data: inventoryItems = [],
    isLoading: isLoadingItems,
    error: itemsError,
    refetch: refetchItems
  } = useOptimizedDataFetch(
    ['inventory-items', storeId],
    () => fetchInventoryItems(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 5 * 60 * 1000, // 5 minutes
      }
    }
  );

  // Optimized inventory movements with pagination
  const {
    data: movements = [],
    isLoading: isLoadingMovements
  } = useOptimizedDataFetch(
    ['inventory-movements', storeId],
    () => fetchInventoryMovements(storeId, { limit: 50 }),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 1 * 60 * 1000, // 1 minute
      }
    }
  );

  // Optimized inventory status
  const {
    data: inventoryStatus,
    isLoading: isLoadingStatus
  } = useOptimizedDataFetch(
    ['inventory-status', storeId],
    () => getInventoryStatus(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000, // 30 seconds
      }
    }
  );

  // Optimized mutation for inventory updates
  const { mutate: updateInventory } = useOptimizedMutation(
    updateInventoryItem,
    {
      onSuccess: () => {
        toast.success('Inventory updated successfully');
      },
      onError: (error) => {
        toast.error(`Failed to update inventory: ${error.message}`);
      },
      invalidateQueries: [
        ['inventory-items', storeId],
        ['inventory-status', storeId],
        ['inventory-movements', storeId]
      ]
    }
  );

  // Memoized computed values
  const computedStats = useMemo(() => {
    if (!inventoryItems.length) return null;

    const totalItems = inventoryItems.length;
    const lowStockItems = inventoryItems.filter(item => 
      item.current_stock <= (item.minimum_threshold || 10)
    ).length;
    const outOfStockItems = inventoryItems.filter(item => 
      item.current_stock <= 0
    ).length;
    const totalValue = inventoryItems.reduce((sum, item) => 
      sum + (item.current_stock * (item.unit_cost || 0)), 0
    );

    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      healthyItems: totalItems - lowStockItems
    };
  }, [inventoryItems]);

  // Optimized search and filter
  const createOptimizedFilter = useCallback((searchTerm: string, category?: string) => {
    if (!inventoryItems.length) return [];

    const filtered = inventoryItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !category || item.category === category;
      
      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      // Prioritize low stock items
      if (a.current_stock <= (a.minimum_threshold || 10) && 
          b.current_stock > (b.minimum_threshold || 10)) {
        return -1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [inventoryItems]);

  const isLoading = isLoadingItems || isLoadingMovements || isLoadingStatus;

  return {
    // Data
    inventoryItems,
    movements,
    inventoryStatus,
    computedStats,
    
    // Loading states
    isLoading,
    isLoadingItems,
    isLoadingMovements,
    isLoadingStatus,
    
    // Errors
    error: itemsError,
    
    // Actions
    updateInventory,
    refetchItems,
    createOptimizedFilter,
    
    // Performance metrics
    cacheHitRate: inventoryItems.length > 0 ? 1 : 0
  };
}
