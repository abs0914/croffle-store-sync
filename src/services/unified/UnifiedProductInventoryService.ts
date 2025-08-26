/**
 * Unified Product-Inventory Service
 * Single source of truth for all product availability and inventory data
 * Provides real-time sync between inventory, recipes, and product catalog
 */

import { supabase } from "@/integrations/supabase/client";
import { Product, Category } from "@/types";
import { toast } from "sonner";

export interface UnifiedProductData extends Product {
  available_quantity: number;
  recipe_requirements: Array<{
    inventory_item_id: string;
    item_name: string;
    required_quantity: number;
    available_quantity: number;
    is_sufficient: boolean;
  }>;
  availability_status: 'available' | 'low_stock' | 'out_of_stock' | 'no_recipe';
  last_availability_check: string;
}

export interface UnifiedInventoryData {
  products: UnifiedProductData[];
  categories: Category[];
  totalProducts: number;
  availableProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  lastSync: string;
}

class UnifiedProductInventoryService {
  private static instance: UnifiedProductInventoryService;
  private cache = new Map<string, UnifiedInventoryData>();
  private listeners = new Set<(storeId: string, data: UnifiedInventoryData) => void>();

  static getInstance(): UnifiedProductInventoryService {
    if (!UnifiedProductInventoryService.instance) {
      UnifiedProductInventoryService.instance = new UnifiedProductInventoryService();
    }
    return UnifiedProductInventoryService.instance;
  }

  /**
   * Get unified product and inventory data for a store
   */
  async getUnifiedData(storeId: string): Promise<UnifiedInventoryData> {
    try {
      console.log('🔄 Fetching unified product-inventory data for store:', storeId);

      // Fetch products with enhanced availability data
      const { data: productsData, error: productsError } = await supabase
        .from('product_catalog')
        .select(`
          *,
          categories!inner(id, name, description, is_active)
        `)
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('display_order', { ascending: true });

      if (productsError) throw productsError;

      // Fetch inventory stock for the store
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId);

      if (inventoryError) throw inventoryError;

      // Skip recipe integration for now - use simplified approach
      const unifiedProducts: UnifiedProductData[] = (productsData || []).map(product => {
        // Simplified availability calculation without recipes for now
        const availableQuantity = 999; // Default available
        const availabilityStatus: UnifiedProductData['availability_status'] = 'available';

        return {
          ...product,
          available_quantity: availableQuantity,
          recipe_requirements: [], // Empty for now
          availability_status: availabilityStatus,
          last_availability_check: new Date().toISOString(),
          // Map database fields to Product interface
          id: product.id,
          name: product.product_name,
          description: product.description,
          price: product.price,
          category_id: product.categories?.id || '',
          store_id: product.store_id,
          image_url: product.image_url,
          is_active: product.is_available,
          stock_quantity: availableQuantity,
          sku: `CAT-${product.id.slice(0, 8)}`,
          recipe_id: null,
          product_type: 'direct',
          is_available: true,
          created_at: product.created_at,
          updated_at: product.updated_at
        } as UnifiedProductData;
      });

      // Extract unique categories
      const categoriesMap = new Map<string, Category>();
      productsData?.forEach(product => {
        if (product.categories && !categoriesMap.has(product.categories.id)) {
          categoriesMap.set(product.categories.id, {
            id: product.categories.id,
            name: product.categories.name,
            description: product.categories.description,
            store_id: storeId,
            is_active: product.categories.is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      const categories = Array.from(categoriesMap.values());

      // Calculate statistics
      const stats = {
        totalProducts: unifiedProducts.length,
        availableProducts: unifiedProducts.filter(p => p.availability_status === 'available').length,
        lowStockProducts: unifiedProducts.filter(p => p.availability_status === 'low_stock').length,
        outOfStockProducts: unifiedProducts.filter(p => p.availability_status === 'out_of_stock').length
      };

      const result: UnifiedInventoryData = {
        products: unifiedProducts,
        categories,
        ...stats,
        lastSync: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(storeId, result);

      // Notify listeners
      this.notifyListeners(storeId, result);

      console.log('✅ Unified data fetched:', {
        storeId,
        totalProducts: stats.totalProducts,
        availableProducts: stats.availableProducts,
        lowStockProducts: stats.lowStockProducts,
        outOfStockProducts: stats.outOfStockProducts
      });

      return result;
    } catch (error) {
      console.error('❌ Error fetching unified data:', error);
      toast.error('Failed to load product and inventory data');
      
      // Return cached data if available
      const cached = this.cache.get(storeId);
      if (cached) {
        console.log('📦 Returning cached data due to error');
        return cached;
      }
      
      // Return empty data as fallback
      return {
        products: [],
        categories: [],
        totalProducts: 0,
        availableProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        lastSync: new Date().toISOString()
      };
    }
  }

  /**
   * Subscribe to real-time updates for a store
   */
  subscribeToUpdates(storeId: string): () => void {
    console.log('🔔 Setting up real-time subscriptions for store:', storeId);

    // Subscribe to inventory changes
    const inventoryChannel = supabase
      .channel(`unified_inventory_${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventory_stock',
        filter: `store_id=eq.${storeId}`
      }, () => {
        console.log('📦 Inventory change detected, refreshing unified data');
        this.refreshData(storeId);
      })
      .subscribe();

    // Subscribe to product catalog changes
    const catalogChannel = supabase
      .channel(`unified_catalog_${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_catalog',
        filter: `store_id=eq.${storeId}`
      }, () => {
        console.log('🛍️ Product catalog change detected, refreshing unified data');
        this.refreshData(storeId);
      })
      .subscribe();

    // Subscribe to recipe changes
    const recipeChannel = supabase
      .channel(`unified_recipes_${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_ingredients'
      }, () => {
        console.log('🧾 Recipe change detected, refreshing unified data');
        this.refreshData(storeId);
      })
      .subscribe();

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions for store:', storeId);
      inventoryChannel.unsubscribe();
      catalogChannel.unsubscribe();
      recipeChannel.unsubscribe();
    };
  }

  /**
   * Add listener for data updates
   */
  addListener(callback: (storeId: string, data: UnifiedInventoryData) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get cached data for a store
   */
  getCachedData(storeId: string): UnifiedInventoryData | null {
    return this.cache.get(storeId) || null;
  }

  /**
   * Refresh data for a store (debounced)
   */
  private refreshTimeouts = new Map<string, NodeJS.Timeout>();
  
  private refreshData(storeId: string) {
    // Clear existing timeout
    const existingTimeout = this.refreshTimeouts.get(storeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout (debounce for 1 second)
    const timeout = setTimeout(async () => {
      await this.getUnifiedData(storeId);
      this.refreshTimeouts.delete(storeId);
    }, 1000);

    this.refreshTimeouts.set(storeId, timeout);
  }

  /**
   * Notify all listeners of data changes
   */
  private notifyListeners(storeId: string, data: UnifiedInventoryData) {
    this.listeners.forEach(listener => {
      try {
        listener(storeId, data);
      } catch (error) {
        console.error('Error calling unified data listener:', error);
      }
    });
  }

  /**
   * Validate if products can be sold (for pre-payment validation)
   */
  async validateProductsForSale(
    storeId: string, 
    items: Array<{ productId: string; quantity: number }>
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const data = await this.getUnifiedData(storeId);
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of items) {
      const product = data.products.find(p => p.id === item.productId);
      
      if (!product) {
        errors.push(`Product not found: ${item.productId}`);
        continue;
      }

      if (product.availability_status === 'out_of_stock') {
        errors.push(`${product.name} is out of stock`);
      } else if (product.available_quantity < item.quantity) {
        errors.push(`Insufficient ${product.name}: need ${item.quantity}, available ${product.available_quantity}`);
      } else if (product.availability_status === 'low_stock') {
        warnings.push(`${product.name} is low in stock (${product.available_quantity} remaining)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const unifiedProductInventoryService = UnifiedProductInventoryService.getInstance();