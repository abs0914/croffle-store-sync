
import { QueryClient } from '@tanstack/react-query';

export class InventoryCacheService {
  private static instance: InventoryCacheService;
  private queryClient: QueryClient;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  static getInstance(queryClient: QueryClient): InventoryCacheService {
    if (!InventoryCacheService.instance) {
      InventoryCacheService.instance = new InventoryCacheService(queryClient);
    }
    return InventoryCacheService.instance;
  }

  // Memory cache for frequently accessed data
  setMemoryCache(key: string, data: any, ttlMs: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  getMemoryCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Prefetch inventory data for better UX
  async prefetchInventoryData(storeId: string) {
    // Handle each prefetch separately with proper typing
    const prefetchPromises = [
      // Prefetch inventory items
      this.queryClient.prefetchQuery({
        queryKey: ['inventory-stock', storeId],
        queryFn: async () => {
          const { fetchInventoryItems } = await import('@/services/inventoryManagement/inventoryItemService');
          return fetchInventoryItems(storeId);
        },
        staleTime: 2 * 60 * 1000 // 2 minutes
      }),
      
      // Prefetch inventory movements
      this.queryClient.prefetchQuery({
        queryKey: ['inventory-movements', storeId],
        queryFn: async () => {
          const { fetchInventoryMovements } = await import('@/services/storeInventory/inventoryMovementService');
          return fetchInventoryMovements(storeId);
        },
        staleTime: 2 * 60 * 1000 // 2 minutes
      }),
      
      // Prefetch stock orders
      this.queryClient.prefetchQuery({
        queryKey: ['stock-orders', storeId],
        queryFn: async () => {
          const { fetchStockOrders } = await import('@/services/inventory/stockOrderWorkflowService');
          return fetchStockOrders(storeId);
        },
        staleTime: 2 * 60 * 1000 // 2 minutes
      })
    ];

    // Prefetch all queries concurrently
    await Promise.allSettled(prefetchPromises);
  }

  // Batch update cache for multiple items
  batchUpdateCache(updates: Array<{ queryKey: string[]; data: any }>) {
    updates.forEach(({ queryKey, data }) => {
      this.queryClient.setQueryData(queryKey, data);
    });
  }

  // Optimize cache by removing stale data
  cleanupStaleCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }

    // Remove unused queries from React Query cache
    this.queryClient.getQueryCache().clear();
  }

  // Preload critical data patterns
  async preloadCriticalData(storeId: string) {
    const criticalKeys = [
      `inventory-status-${storeId}`,
      `low-stock-alerts-${storeId}`,
      `pending-orders-${storeId}`
    ];

    const cached = criticalKeys.map(key => this.getMemoryCache(key)).filter(Boolean);
    
    if (cached.length < criticalKeys.length) {
      // Load missing critical data
      await this.prefetchInventoryData(storeId);
    }

    return cached;
  }
}

export const createCacheService = (queryClient: QueryClient) => 
  InventoryCacheService.getInstance(queryClient);
