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
}

export const offlineProductCache = new OfflineProductCache();