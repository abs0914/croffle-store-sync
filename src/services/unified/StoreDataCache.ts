/**
 * Store-Specific Data Cache Service
 * Provides isolated caching per store with automatic TTL management
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  storeId: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  stores: number;
  totalSize: number;
}

export class StoreDataCache {
  private static instance: StoreDataCache;
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 30000; // 30 seconds default TTL
  private stats = { hits: 0, misses: 0 };

  static getInstance(): StoreDataCache {
    if (!StoreDataCache.instance) {
      StoreDataCache.instance = new StoreDataCache();
    }
    return StoreDataCache.instance;
  }

  /**
   * Set data in cache with store-specific key
   */
  set<T>(storeId: string, key: string, data: T, ttl?: number): void {
    const cacheKey = this.buildKey(storeId, key);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      storeId
    });
    
    // Auto-cleanup after TTL
    const effectiveTTL = ttl || this.defaultTTL;
    setTimeout(() => {
      this.delete(storeId, key);
    }, effectiveTTL);
  }

  /**
   * Get data from cache if not expired
   */
  get<T>(storeId: string, key: string): T | null {
    const cacheKey = this.buildKey(storeId, key);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.defaultTTL) {
      // Expired
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Delete specific cache entry
   */
  delete(storeId: string, key: string): void {
    const cacheKey = this.buildKey(storeId, key);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache entries for a specific store
   */
  clearStore(storeId: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (entry.storeId === storeId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 Cleared ${keysToDelete.length} cache entries for store ${storeId}`);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    console.log(`🧹 Cleared all cache (${size} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const stores = new Set<string>();
    this.cache.forEach(entry => stores.add(entry.storeId));
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      stores: stores.size,
      totalSize: this.cache.size
    };
  }

  /**
   * Check if data exists and is fresh
   */
  has(storeId: string, key: string): boolean {
    const data = this.get(storeId, key);
    return data !== null;
  }

  /**
   * Build cache key with store prefix
   */
  private buildKey(storeId: string, key: string): string {
    return `store_${storeId}_${key}`;
  }

  /**
   * Set custom TTL for cache instance
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

export const storeDataCache = StoreDataCache.getInstance();
