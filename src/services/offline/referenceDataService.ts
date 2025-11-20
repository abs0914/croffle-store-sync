/**
 * REFERENCE DATA SERVICE
 * 
 * Manages caching and retrieval of reference data (products, categories, inventory, recipes).
 * Implements Start-of-Day (SOD) data loading.
 */

import { offlineDB, CachedProduct, CachedCategory, CachedInventoryStock, CachedRecipe } from './db/schema';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types';
import { toast } from 'sonner';

class ReferenceDataService {
  private readonly CACHE_VERSION = 1;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Start-of-Day: Load and cache all reference data for a store
   */
  async startOfDay(storeId: string): Promise<{
    success: boolean;
    cached: {
      products: number;
      categories: number;
      inventory: number;
      recipes: number;
    };
  }> {
    console.log('🌅 Starting SOD data sync for store:', storeId);

    try {
      // Fetch all reference data in parallel
      const [products, categories, inventory, recipes] = await Promise.all([
        this.fetchProductsFromServer(storeId),
        this.fetchCategoriesFromServer(storeId),
        this.fetchInventoryFromServer(storeId),
        this.fetchRecipesFromServer(storeId)
      ]);

      // Cache data to IndexedDB
      await Promise.all([
        this.cacheProducts(storeId, products),
        this.cacheCategories(storeId, categories),
        this.cacheInventory(storeId, inventory),
        this.cacheRecipes(recipes)
      ]);

      const result = {
        success: true,
        cached: {
          products: products.length,
          categories: categories.length,
          inventory: inventory.length,
          recipes: recipes.length
        }
      };

      console.log('✅ SOD data sync completed:', result);
      toast.success('Store data cached for offline use', {
        description: `${result.cached.products} products, ${result.cached.inventory} inventory items`
      });

      // Update sync metadata
      await offlineDB.sync_metadata.put({
        key: 'last_sod_sync',
        store_id: storeId,
        timestamp: Date.now(),
        data: result
      });

      return result;
    } catch (error) {
      console.error('❌ SOD data sync failed:', error);
      toast.error('Failed to cache store data');
      return {
        success: false,
        cached: { products: 0, categories: 0, inventory: 0, recipes: 0 }
      };
    }
  }

  /**
   * Fetch products from server
   */
  private async fetchProductsFromServer(storeId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('product_catalog')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_available', true);

    if (error) throw error;
    
    // Map product_catalog fields to Product type
    return (data || []).map(p => ({
      id: p.id,
      name: p.product_name,
      description: p.description,
      price: p.price,
      category_id: p.category_id,
      store_id: p.store_id,
      image_url: p.image_url,
      is_active: p.is_available,
      is_available: p.is_available,
      sku: p.id, // Use id as SKU if not available
      stock_quantity: 1000, // Default high value for offline
      recipe_id: p.recipe_id,
      product_type: p.product_type as any,
      product_status: p.product_status as any,
      created_at: p.created_at,
      updated_at: p.updated_at
    } as Product));
  }

  /**
   * Fetch categories from server
   */
  private async fetchCategoriesFromServer(storeId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch inventory from server
   */
  private async fetchInventoryFromServer(storeId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch recipes from server
   */
  private async fetchRecipesFromServer(storeId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          inventory_stock_id,
          quantity_required,
          unit
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Cache products to IndexedDB
   */
  private async cacheProducts(storeId: string, products: Product[]): Promise<void> {
    const cachedProducts: CachedProduct[] = products.map(p => ({
      id: p.id,
      store_id: storeId,
      name: p.name,
      description: p.description,
      price: p.price,
      category_id: p.category_id,
      is_available: p.is_available ?? true,
      recipe_id: p.recipe_id,
      inventory_stock_id: p.inventory_stock_id,
      selling_quantity: p.selling_quantity,
      image_url: p.image_url,
      sku: p.sku,
      cached_at: Date.now(),
      cache_version: this.CACHE_VERSION
    }));

    await offlineDB.products.bulkPut(cachedProducts);
  }

  /**
   * Cache categories to IndexedDB
   */
  private async cacheCategories(storeId: string, categories: Category[]): Promise<void> {
    const cachedCategories: CachedCategory[] = categories.map(c => ({
      id: c.id,
      store_id: storeId,
      name: c.name,
      description: c.description,
      is_active: c.is_active,
      display_order: 0,
      cached_at: Date.now()
    }));

    await offlineDB.categories.bulkPut(cachedCategories);
  }

  /**
   * Cache inventory to IndexedDB with starting quantities
   */
  private async cacheInventory(storeId: string, inventory: any[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const cachedInventory: CachedInventoryStock[] = inventory.map(i => ({
      id: i.id,
      store_id: storeId,
      item: i.item,
      unit: i.unit,
      stock_quantity: i.stock_quantity,
      minimum_threshold: i.minimum_threshold,
      maximum_capacity: i.maximum_capacity,
      cost: i.cost,
      item_category: i.item_category,
      // Snapshot for today
      starting_quantity: i.stock_quantity,
      day_date: today,
      cached_at: Date.now()
    }));

    await offlineDB.inventory_stocks.bulkPut(cachedInventory);
  }

  /**
   * Cache recipes to IndexedDB
   */
  private async cacheRecipes(recipes: any[]): Promise<void> {
    const cachedRecipes: CachedRecipe[] = recipes.map(r => ({
      id: r.id,
      product_catalog_id: r.product_catalog_id,
      recipe_template_id: r.recipe_template_id,
      total_cost: r.total_cost || 0,
      cost_per_serving: r.cost_per_serving || 0,
      ingredients: (r.recipe_ingredients || []).map((ri: any) => ({
        inventory_stock_id: ri.inventory_stock_id,
        quantity_required: ri.quantity_required,
        unit: ri.unit
      })),
      cached_at: Date.now()
    }));

    await offlineDB.recipes.bulkPut(cachedRecipes);
  }

  /**
   * Get cached products
   */
  async getProducts(storeId: string): Promise<CachedProduct[]> {
    return await offlineDB.products
      .where('store_id')
      .equals(storeId)
      .toArray();
  }

  /**
   * Get cached categories
   */
  async getCategories(storeId: string): Promise<CachedCategory[]> {
    return await offlineDB.categories
      .where('store_id')
      .equals(storeId)
      .toArray();
  }

  /**
   * Get cached inventory
   */
  async getInventory(storeId: string): Promise<CachedInventoryStock[]> {
    return await offlineDB.inventory_stocks
      .where('store_id')
      .equals(storeId)
      .toArray();
  }

  /**
   * Get recipe for a product
   */
  async getRecipe(productCatalogId: string): Promise<CachedRecipe | undefined> {
    return await offlineDB.recipes.get({ product_catalog_id: productCatalogId } as any);
  }

  /**
   * Check if cache is stale
   */
  async isCacheStale(storeId: string): Promise<boolean> {
    const metadata = await offlineDB.sync_metadata.get({ store_id: storeId, key: 'last_sod_sync' } as any);
    
    if (!metadata) return true;
    
    const age = Date.now() - metadata.timestamp;
    return age > this.CACHE_TTL;
  }

  /**
   * Get cache age in minutes
   */
  async getCacheAge(storeId: string): Promise<number | null> {
    const metadata = await offlineDB.sync_metadata.get({ store_id: storeId, key: 'last_sod_sync' } as any);
    
    if (!metadata) return null;
    
    return Math.floor((Date.now() - metadata.timestamp) / 60000);
  }

  /**
   * Force refresh cache
   */
  async refreshCache(storeId: string): Promise<void> {
    await offlineDB.clearReferenceData(storeId);
    await this.startOfDay(storeId);
  }
}

// Export singleton instance
export const referenceDataService = new ReferenceDataService();
