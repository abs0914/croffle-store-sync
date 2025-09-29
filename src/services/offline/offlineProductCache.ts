import { Product, Category } from '@/types';

export interface CachedProductData {
  products: Product[];
  categories: Category[];
  lastSync: number;
  storeId: string;
}

export interface OfflineInventoryLevel {
  productId: string;
  variationId?: string;
  availableQuantity: number;
  lastUpdated: number;
  reservedOffline: number; // Quantity reserved by offline transactions
}

class OfflineProductCache {
  private readonly PRODUCTS_CACHE_KEY = 'offline_products_cache';
  private readonly INVENTORY_CACHE_KEY = 'offline_inventory_levels';
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly LOW_STOCK_THRESHOLD = 10;
  private readonly CRITICAL_STOCK_THRESHOLD = 5;

  // Cache products and categories
  cacheProducts(storeId: string, products: Product[], categories: Category[]): void {
    const cacheData: CachedProductData = {
      products,
      categories,
      lastSync: Date.now(),
      storeId
    };

    try {
      localStorage.setItem(this.PRODUCTS_CACHE_KEY, JSON.stringify(cacheData));
      console.log('📦 Cached products for offline use:', products.length, 'products');
    } catch (error) {
      console.error('Error caching products:', error);
    }
  }

  // Get cached products
  getCachedProducts(storeId: string): CachedProductData | null {
    try {
      const stored = localStorage.getItem(this.PRODUCTS_CACHE_KEY);
      if (!stored) return null;

      const cacheData: CachedProductData = JSON.parse(stored);
      
      // Check if cache is for the correct store
      if (cacheData.storeId !== storeId) {
        return null;
      }

      // Check if cache is not expired
      const isExpired = Date.now() - cacheData.lastSync > this.CACHE_EXPIRY;
      if (isExpired) {
        console.warn('🕒 Product cache expired, may contain stale data');
      }

      return cacheData;
    } catch (error) {
      console.error('Error reading cached products:', error);
      return null;
    }
  }

  // Cache inventory levels
  cacheInventoryLevels(storeId: string, levels: OfflineInventoryLevel[]): void {
    const cacheKey = `${this.INVENTORY_CACHE_KEY}_${storeId}`;
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        levels,
        lastUpdated: Date.now()
      }));
      console.log('📊 Cached inventory levels for offline use:', levels.length, 'items');
    } catch (error) {
      console.error('Error caching inventory levels:', error);
    }
  }

  // Get cached inventory levels
  getCachedInventoryLevels(storeId: string): OfflineInventoryLevel[] {
    const cacheKey = `${this.INVENTORY_CACHE_KEY}_${storeId}`;
    
    try {
      const stored = localStorage.getItem(cacheKey);
      if (!stored) return [];

      const cacheData = JSON.parse(stored);
      return cacheData.levels || [];
    } catch (error) {
      console.error('Error reading cached inventory levels:', error);
      return [];
    }
  }

  // Reserve inventory for offline transaction
  reserveInventoryOffline(storeId: string, productId: string, variationId: string | undefined, quantity: number): boolean {
    const levels = this.getCachedInventoryLevels(storeId);
    const key = variationId ? `${productId}_${variationId}` : productId;
    
    let level = levels.find(l => {
      const levelKey = l.variationId ? `${l.productId}_${l.variationId}` : l.productId;
      return levelKey === key;
    });

    if (!level) {
      // Create new level entry with optimistic availability
      level = {
        productId,
        variationId,
        availableQuantity: 1000, // Optimistic availability
        lastUpdated: Date.now(),
        reservedOffline: 0
      };
      levels.push(level);
    }

    // Check if enough inventory is available
    const availableAfterReservations = level.availableQuantity - level.reservedOffline;
    
    if (availableAfterReservations >= quantity) {
      level.reservedOffline += quantity;
      level.lastUpdated = Date.now();
      this.cacheInventoryLevels(storeId, levels);
      return true;
    }

    return false;
  }

  // Get available quantity for a product
  getAvailableQuantity(storeId: string, productId: string, variationId?: string): number {
    const levels = this.getCachedInventoryLevels(storeId);
    const key = variationId ? `${productId}_${variationId}` : productId;
    
    const level = levels.find(l => {
      const levelKey = l.variationId ? `${l.productId}_${l.variationId}` : l.productId;
      return levelKey === key;
    });

    if (!level) {
      return 1000; // Optimistic availability for unknown items
    }

    return Math.max(0, level.availableQuantity - level.reservedOffline);
  }

  // Check if cache is fresh
  isCacheFresh(storeId: string): boolean {
    const cached = this.getCachedProducts(storeId);
    if (!cached) return false;

    const age = Date.now() - cached.lastSync;
    return age < this.CACHE_EXPIRY;
  }

  // Get cache age in minutes
  getCacheAge(storeId: string): number | null {
    const cached = this.getCachedProducts(storeId);
    if (!cached) return null;

    return Math.floor((Date.now() - cached.lastSync) / (1000 * 60));
  }

  // Clear cache
  clearCache(storeId?: string): void {
    if (storeId) {
      // Clear specific store cache
      const inventoryCacheKey = `${this.INVENTORY_CACHE_KEY}_${storeId}`;
      localStorage.removeItem(inventoryCacheKey);
      
      // Check if products cache is for this store
      const cached = this.getCachedProducts(storeId);
      if (cached && cached.storeId === storeId) {
        localStorage.removeItem(this.PRODUCTS_CACHE_KEY);
      }
    } else {
      // Clear all cache
      localStorage.removeItem(this.PRODUCTS_CACHE_KEY);
      
      // Clear all inventory caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.INVENTORY_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
    
    console.log('🧹 Cleared offline product cache');
  }

  // Get low stock items
  getLowStockItems(storeId: string): Array<{productId: string, variationId?: string, availableQuantity: number, stockLevel: 'low' | 'critical'}> {
    const levels = this.getCachedInventoryLevels(storeId);
    return levels
      .map(level => {
        const available = this.getAvailableQuantity(storeId, level.productId, level.variationId);
        let stockLevel: 'low' | 'critical' | null = null;
        
        if (available <= this.CRITICAL_STOCK_THRESHOLD) {
          stockLevel = 'critical';
        } else if (available <= this.LOW_STOCK_THRESHOLD) {
          stockLevel = 'low';
        }
        
        return stockLevel ? {
          productId: level.productId,
          variationId: level.variationId,
          availableQuantity: available,
          stockLevel
        } : null;
      })
      .filter(Boolean);
  }

  // Check if cache is stale (older than 6 hours)
  isCacheStale(storeId: string): boolean {
    const cached = this.getCachedProducts(storeId);
    if (!cached) return true;

    const age = Date.now() - cached.lastSync;
    const sixHours = 6 * 60 * 60 * 1000;
    return age > sixHours;
  }

  // Get cache status
  getCacheStatus(storeId: string): {
    isValid: boolean;
    isFresh: boolean;
    isStale: boolean;
    ageMinutes: number | null;
    totalProducts: number;
    lowStockCount: number;
    criticalStockCount: number;
  } {
    const cached = this.getCachedProducts(storeId);
    const lowStockItems = this.getLowStockItems(storeId);
    
    if (!cached) {
      return {
        isValid: false,
        isFresh: false,
        isStale: true,
        ageMinutes: null,
        totalProducts: 0,
        lowStockCount: 0,
        criticalStockCount: 0
      };
    }

    const ageMinutes = this.getCacheAge(storeId) || 0;
    
    return {
      isValid: true,
      isFresh: this.isCacheFresh(storeId),
      isStale: this.isCacheStale(storeId),
      ageMinutes,
      totalProducts: cached.products.length,
      lowStockCount: lowStockItems.filter(item => item.stockLevel === 'low').length,
      criticalStockCount: lowStockItems.filter(item => item.stockLevel === 'critical').length
    };
  }

  // Refresh cache expiry (for when data is validated as current)
  refreshCacheTimestamp(storeId: string): void {
    const cached = this.getCachedProducts(storeId);
    if (cached) {
      cached.lastSync = Date.now();
      this.cacheProducts(storeId, cached.products, cached.categories);
    }
  }
}

export const offlineProductCache = new OfflineProductCache();