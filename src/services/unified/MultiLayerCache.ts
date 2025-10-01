/**
 * Multi-Layer Caching Service
 * Different TTLs for different data types to optimize cache hit rates
 */

interface CacheLayer {
  name: string;
  ttl: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  layer: string;
}

export class MultiLayerCache {
  private static instance: MultiLayerCache;
  private cache = new Map<string, CacheEntry<any>>();
  
  // Define cache layers with appropriate TTLs
  private layers: Record<string, CacheLayer> = {
    products: { name: 'products', ttl: 30 * 60 * 1000 }, // 30 minutes - rarely changes
    recipeIngredients: { name: 'recipeIngredients', ttl: 15 * 60 * 1000 }, // 15 minutes - stable
    inventory: { name: 'inventory', ttl: 5 * 60 * 1000 }, // 5 minutes - changes frequently
    cartValidation: { name: 'cartValidation', ttl: 2 * 60 * 1000 }, // 2 minutes - temporary
    batchedData: { name: 'batchedData', ttl: 10 * 60 * 1000 } // 10 minutes - combined data
  };

  static getInstance(): MultiLayerCache {
    if (!MultiLayerCache.instance) {
      MultiLayerCache.instance = new MultiLayerCache();
    }
    return MultiLayerCache.instance;
  }

  /**
   * Set data in appropriate cache layer
   */
  set<T>(storeId: string, key: string, data: T, layer: keyof typeof this.layers): void {
    const cacheLayer = this.layers[layer];
    const cacheKey = `${storeId}_${layer}_${key}`;
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      layer: cacheLayer.name
    });
    
    // Auto-cleanup after TTL
    setTimeout(() => {
      this.cache.delete(cacheKey);
    }, cacheLayer.ttl);
  }

  /**
   * Get data from cache if not expired
   */
  get<T>(storeId: string, key: string, layer: keyof typeof this.layers): T | null {
    const cacheKey = `${storeId}_${layer}_${key}`;
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const cacheLayer = this.layers[layer];
    const age = Date.now() - entry.timestamp;
    
    if (age > cacheLayer.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Invalidate specific layer for a store
   */
  invalidateLayer(storeId: string, layer: keyof typeof this.layers): void {
    const prefix = `${storeId}_${layer}_`;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 Invalidated ${layer} layer for store ${storeId}: ${keysToDelete.length} entries`);
  }

  /**
   * Clear all cache for a store
   */
  clearStore(storeId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(storeId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const stats = {
      totalEntries: this.cache.size,
      byLayer: {} as Record<string, number>
    };
    
    this.cache.forEach(entry => {
      stats.byLayer[entry.layer] = (stats.byLayer[entry.layer] || 0) + 1;
    });
    
    return stats;
  }
}

export const multiLayerCache = MultiLayerCache.getInstance();
