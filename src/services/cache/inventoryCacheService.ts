import { supabase } from "@/integrations/supabase/client";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface InventoryItem {
  id: string;
  item: string;
  stock_quantity: number;
  serving_ready_quantity?: number;
  minimum_threshold: number;
  unit: string;
  store_id: string;
  is_active: boolean;
}

interface ProductValidationData {
  isValid: boolean;
  productName: string;
  errors: string[];
  stock?: number;
}

/**
 * High-performance inventory caching service
 */
export class InventoryCacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly CACHE_TTL = 30000; // 30 seconds
  private static readonly BATCH_SIZE = 50;
  
  /**
   * Clear all cache entries
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Inventory cache cleared');
  }

  /**
   * Clear all cache entries and reset for fresh system start
   */
  static resetForFreshStart(): void {
    this.cache.clear();
    console.log('🔄 Inventory cache reset for fresh system start');
  }

  /**
   * Get cached data or fetch if not available
   */
  private static async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.CACHE_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now < cached.expiry) {
      console.log(`📦 Cache hit for: ${key}`);
      return cached.data;
    }

    console.log(`🔄 Cache miss, fetching: ${key}`);
    const data = await fetchFn();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + ttl
    });

    return data;
  }

  /**
   * Batch fetch inventory items for a store
   */
  static async getStoreInventory(storeId: string): Promise<InventoryItem[]> {
    const cacheKey = `store_inventory_${storeId}`;
    
    return this.getCached(cacheKey, async () => {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, item, stock_quantity, serving_ready_quantity, minimum_threshold, unit, store_id, is_active')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Failed to fetch store inventory:', error);
        return [];
      }

      console.log(`✅ Fetched ${data?.length || 0} inventory items for store ${storeId}`);
      return data || [];
    });
  }

  /**
   * Batch validate multiple products efficiently
   */
  static async batchValidateProducts(
    productIds: string[],
    quantities: number[],
    storeId: string
  ): Promise<Map<string, ProductValidationData>> {
    const startTime = Date.now();
    const results = new Map<string, ProductValidationData>();

    // Get all store inventory at once
    const inventory = await this.getStoreInventory(storeId);
    const inventoryMap = new Map(inventory.map(item => [item.item.toLowerCase(), item]));

    // Get product catalog data in batch
    const { data: products, error } = await supabase
      .from('product_catalog')
      .select('id, product_name, is_available')
      .in('id', productIds);

    if (error) {
      console.error('❌ Batch product validation failed:', error);
      productIds.forEach((id, index) => {
        results.set(id, {
          isValid: false,
          productName: 'Unknown Product',
          errors: ['Validation failed']
        });
      });
      return results;
    }

    // Process each product
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const quantity = quantities[i];
      const product = products?.find(p => p.id === productId);

      if (!product) {
        results.set(productId, {
          isValid: false,
          productName: 'Unknown Product',
          errors: ['Product not found']
        });
        continue;
      }

      if (!product.is_available) {
        results.set(productId, {
          isValid: false,
          productName: product.product_name,
          errors: ['Product not available']
        });
        continue;
      }

      // Check direct inventory mapping
      const inventoryItem = inventoryMap.get(product.product_name.toLowerCase());
      if (inventoryItem) {
        const availableStock = inventoryItem.serving_ready_quantity || inventoryItem.stock_quantity;
        const isValid = availableStock >= quantity;
        
        results.set(productId, {
          isValid,
          productName: product.product_name,
          errors: isValid ? [] : [`Insufficient stock: need ${quantity}, have ${availableStock}`],
          stock: availableStock
        });
      } else {
        // For recipe-based products, we'd need ingredient validation
        // For now, assume valid if no direct inventory mapping
        results.set(productId, {
          isValid: true,
          productName: product.product_name,
          errors: []
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`⚡ Batch validated ${productIds.length} products in ${duration}ms`);

    return results;
  }

  /**
   * Get specific inventory item from cache
   */
  static async getInventoryItem(itemName: string, storeId: string): Promise<InventoryItem | null> {
    const inventory = await this.getStoreInventory(storeId);
    return inventory.find(item => 
      item.item.toLowerCase().includes(itemName.toLowerCase())
    ) || null;
  }

  /**
   * Preload cache for store
   */
  static async preloadStoreCache(storeId: string): Promise<void> {
    const startTime = Date.now();
    
    await Promise.all([
      this.getStoreInventory(storeId),
      // Could add more preloading here (categories, products, etc.)
    ]);

    const duration = Date.now() - startTime;
    console.log(`🚀 Preloaded cache for store ${storeId} in ${duration}ms`);
  }

  /**
   * Invalidate specific cache entries
   */
  static invalidateStoreCache(storeId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(storeId)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for store ${storeId}`);
  }

  /**
   * Update cache after inventory changes
   */
  static updateInventoryCache(storeId: string, itemId: string, newQuantity: number): void {
    const cacheKey = `store_inventory_${storeId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.data) {
      const inventory = cached.data as InventoryItem[];
      const item = inventory.find(inv => inv.id === itemId);
      
      if (item) {
        item.stock_quantity = newQuantity;
        item.serving_ready_quantity = newQuantity;
        console.log(`✅ Updated cache for item ${itemId}: ${newQuantity}`);
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: this.cache.size,
      totalSize: JSON.stringify(Array.from(this.cache.entries())).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : now,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : now
    };
  }
}