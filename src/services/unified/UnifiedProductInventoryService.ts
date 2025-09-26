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
  private refreshTimeouts = new Map<string, NodeJS.Timeout>();

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

      // Clear cache to ensure fresh data
      this.cache.delete(storeId);
      
      // Force fresh fetch from product catalog with no caching
      const { data: productsData, error: productsError } = await supabase
        .from('product_catalog')
        .select(`
          *,
          categories!inner(id, name, description, is_active)
        `)
        .eq('store_id', storeId)
        .order('display_order', { ascending: true })

      if (productsError) throw productsError;

      // Fetch inventory stock for the store
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId);

      if (inventoryError) throw inventoryError;

      // Real inventory calculation based on recipes and stock
      const unifiedProducts: UnifiedProductData[] = await Promise.all((productsData || []).map(async product => {
        // Get actual inventory availability for this product
        const availability = await this.calculateRealAvailability(product.id, storeId, inventoryData);
        const availableQuantity = availability.quantity;
        const availabilityStatus = availability.status;

        console.log(`📊 Product ${product.product_name}: recipe_id=${product.recipe_id}, availability=${availabilityStatus}, quantity=${availableQuantity}`);

        return {
          ...product,
          available_quantity: availableQuantity,
          recipe_requirements: availability.requirements,
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
          recipe_id: product.recipe_id, // Preserve actual recipe_id from database
          product_type: product.recipe_id ? 'recipe' : 'direct',
          is_available: true,
          created_at: product.created_at,
          updated_at: product.updated_at
        } as UnifiedProductData;
      }));

      // Extract unique ACTIVE categories only
      const categoriesMap = new Map<string, Category>();
      productsData?.forEach(product => {
        if (product.categories && product.categories.is_active && !categoriesMap.has(product.categories.id)) {
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

      const categories = Array.from(categoriesMap.values()).sort(
        (a, b) => a.name.localeCompare(b.name)
      );

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
   * Force refresh with aggressive cache busting
   */
  async forceRefreshWithCacheBusting(storeId: string): Promise<UnifiedInventoryData> {
    console.log('🚀 Force refresh with cache busting for store:', storeId);
    
    // Clear ALL caches immediately
    this.cache.clear();
    
    // Add cache-busting timestamp to prevent browser caching
    const cacheBuster = Date.now();
    
    try {
      // Force fresh fetch from database with cache bypass headers
      const { data: productsData, error: productsError } = await supabase
        .from('product_catalog')
        .select(`
          *,
          categories!inner(id, name, description, is_active)
        `)
        .eq('store_id', storeId)
        .order('display_order', { ascending: true });

      if (productsError) throw productsError;

      // Fetch inventory stock for the store
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId);

      if (inventoryError) throw inventoryError;

      // Process and enhance image URLs with cache busting
      const enhancedProductsData = (productsData || []).map(product => ({
        ...product,
        image_url: product.image_url ? `${product.image_url}?v=${cacheBuster}` : product.image_url
      }));

      // Use enhanced data for processing
      const unifiedProducts: UnifiedProductData[] = await Promise.all(enhancedProductsData.map(async product => {
        const availability = await this.calculateRealAvailability(product.id, storeId, inventoryData);
        const availableQuantity = availability.quantity;
        const availabilityStatus = availability.status;

        console.log(`📊 Product ${product.product_name}: recipe_id=${product.recipe_id}, availability=${availabilityStatus}, quantity=${availableQuantity}`);

        return {
          ...product,
          available_quantity: availableQuantity,
          recipe_requirements: availability.requirements,
          availability_status: availabilityStatus,
          last_availability_check: new Date().toISOString(),
          // Map database fields to Product interface
          id: product.id,
          name: product.product_name,
          description: product.description,
          price: product.price,
          category_id: product.categories?.id || '',
          store_id: product.store_id,
          image_url: product.image_url, // Already has cache buster
          is_active: product.is_available,
          stock_quantity: availableQuantity,
          sku: `CAT-${product.id.slice(0, 8)}`,
          recipe_id: product.recipe_id, // Preserve actual recipe_id from database
          product_type: product.recipe_id ? 'recipe' : 'direct',
          is_available: true,
          created_at: product.created_at,
          updated_at: product.updated_at
        } as UnifiedProductData;
      }));

      // Extract unique ACTIVE categories only
      const categoriesMap = new Map<string, Category>();
      enhancedProductsData?.forEach(product => {
        if (product.categories && product.categories.is_active && !categoriesMap.has(product.categories.id)) {
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

      const categories = Array.from(categoriesMap.values()).sort(
        (a, b) => a.name.localeCompare(b.name)
      );

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

      console.log('✅ Force refresh with cache busting completed:', {
        storeId,
        totalProducts: stats.totalProducts,
        productsWithImages: unifiedProducts.filter(p => p.image_url).length,
        cacheBuster
      });

      return result;
    } catch (error) {
      console.error('❌ Error in force refresh with cache busting:', error);
      throw error;
    }
  }

  /**
   * Clear all caches completely
   */
  clearAllCaches(): void {
    console.log('🧹 Clearing all unified service caches');
    this.cache.clear();
    this.refreshTimeouts.clear();
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
  private refreshData(storeId: string) {
    // Clear cache immediately to ensure fresh data
    this.cache.delete(storeId);
    
    // Clear existing timeout
    const existingTimeout = this.refreshTimeouts.get(storeId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout (debounce for 500ms - faster refresh)
    const timeout = setTimeout(async () => {
      console.log('🔄 Refreshing unified data after catalog update');
      await this.getUnifiedData(storeId);
      this.refreshTimeouts.delete(storeId);
    }, 500);

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
   * Calculate real availability based on recipes and inventory stock
   */
  private async calculateRealAvailability(
    productId: string, 
    storeId: string, 
    inventoryData: any[]
  ): Promise<{
    quantity: number;
    status: UnifiedProductData['availability_status'];
    requirements: Array<{
      inventory_item_id: string;
      item_name: string;
      required_quantity: number;
      available_quantity: number;
      is_sufficient: boolean;
    }>;
  }> {
    try {
      console.log(`🔍 DEBUG: Starting availability calculation for product ${productId}`);

      // First, check if product has a recipe_id in the product catalog
      const { data: productInfo, error: productError } = await supabase
        .from('product_catalog')
        .select('recipe_id, product_name, is_available')
        .eq('id', productId)
        .eq('store_id', storeId)
        .single();

      if (productError) {
        console.error(`❌ DEBUG: Error fetching product info for ${productId}:`, productError);
        return { quantity: 0, status: 'out_of_stock', requirements: [] };
      }

      console.log(`📊 DEBUG: Product ${productInfo.product_name} has recipe_id: ${productInfo.recipe_id}, is_available: ${productInfo.is_available}`);

      // If no recipe_id, treat as direct sale product
      if (!productInfo.recipe_id) {
        console.log(`✅ DEBUG: Product ${productInfo.product_name} is direct sale (no recipe)`);
        return {
          quantity: 100, // High quantity for direct sale products
          status: 'available',
          requirements: []
        };
      }

      // Product has recipe - fetch recipe and ingredients with less restrictive conditions
      console.log(`🧾 DEBUG: Fetching recipe data for product ${productInfo.product_name} with recipe_id: ${productInfo.recipe_id}`);
      
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          is_active,
          recipe_ingredients_with_names (
            id,
            inventory_stock_id,
            ingredient_name,
            quantity,
            inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
              id,
              item,
              stock_quantity,
              is_active
            )
          )
        `)
        .eq('id', productInfo.recipe_id)
        .single();

      if (recipeError) {
        console.error(`❌ DEBUG: Error fetching recipe for ${productInfo.product_name}:`, recipeError);
        // If recipe lookup fails but product has recipe_id, mark as no_recipe
        return {
          quantity: 0,
          status: 'no_recipe',
          requirements: []
        };
      }

      if (!recipeData.is_active) {
        console.log(`⚠️ DEBUG: Recipe ${recipeData.name} is inactive`);
        return {
          quantity: 0,
          status: 'out_of_stock',
          requirements: []
        };
      }

      console.log(`📋 DEBUG: Recipe ${recipeData.name} found with ${recipeData.recipe_ingredients_with_names?.length || 0} ingredients`);

      const ingredients = recipeData.recipe_ingredients_with_names || [];
      
      if (ingredients.length === 0) {
        console.log(`⚠️ DEBUG: Recipe ${recipeData.name} has no ingredients`);
        return {
          quantity: 0,
          status: 'no_recipe',
          requirements: []
        };
      }

      const requirements: Array<{
        inventory_item_id: string;
        item_name: string;
        required_quantity: number;
        available_quantity: number;
        is_sufficient: boolean;
      }> = [];

      let minAvailableQuantity = Infinity;
      let hasInsufficientStock = false;
      let hasLowStock = false;

      // Check each ingredient
      for (const ingredient of ingredients) {
        console.log(`🥄 DEBUG: Checking ingredient ${ingredient.ingredient_name}:`, {
          inventory_stock_id: ingredient.inventory_stock_id,
          required_quantity: ingredient.quantity,
          has_inventory_stock: !!ingredient.inventory_stock
        });

        if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
          console.warn(`⚠️ DEBUG: Ingredient ${ingredient.ingredient_name} not mapped to inventory or inventory stock missing`);
          // Mark as insufficient if ingredient has no inventory mapping
          hasInsufficientStock = true;
          minAvailableQuantity = 0;
          continue;
        }

        const stock = ingredient.inventory_stock;
        
        if (!stock.is_active) {
          console.warn(`⚠️ DEBUG: Inventory stock ${stock.item} is inactive`);
          hasInsufficientStock = true;
          minAvailableQuantity = 0;
          continue;
        }

        const availableStock = stock.stock_quantity;
        const requiredPerUnit = ingredient.quantity;
        const possibleUnits = Math.floor(availableStock / requiredPerUnit);

        console.log(`📊 DEBUG: Ingredient ${ingredient.ingredient_name} calculation:`, {
          availableStock,
          requiredPerUnit,
          possibleUnits,
          sufficient: availableStock >= requiredPerUnit
        });

        requirements.push({
          inventory_item_id: stock.id,
          item_name: stock.item,
          required_quantity: requiredPerUnit,
          available_quantity: availableStock,
          is_sufficient: availableStock >= requiredPerUnit
        });

        if (possibleUnits <= 0) {
          hasInsufficientStock = true;
          minAvailableQuantity = 0;
        } else {
          minAvailableQuantity = Math.min(minAvailableQuantity, possibleUnits);
          if (possibleUnits <= 5) { // Low stock threshold
            hasLowStock = true;
          }
        }
      }

      // Determine status
      let status: UnifiedProductData['availability_status'];
      if (hasInsufficientStock || minAvailableQuantity === 0) {
        status = 'out_of_stock';
        minAvailableQuantity = 0;
      } else if (hasLowStock || minAvailableQuantity <= 5) {
        status = 'low_stock';
      } else {
        status = 'available';
      }

      const result = {
        quantity: minAvailableQuantity === Infinity ? 0 : minAvailableQuantity,
        status,
        requirements
      };

      console.log(`✅ DEBUG: Final availability for ${productInfo.product_name}:`, {
        quantity: result.quantity,
        status: result.status,
        ingredientCount: requirements.length,
        insufficientIngredients: requirements.filter(r => !r.is_sufficient).length
      });

      return result;
    } catch (error) {
      console.error(`❌ DEBUG: Error calculating availability for product ${productId}:`, error);
      return {
        quantity: 0,
        status: 'out_of_stock',
        requirements: []
      };
    }
  }

  /**
   * Validate if products can be sold (for pre-payment validation)
   */
  async validateProductsForSale(
    storeId: string, 
    items: Array<{ productId: string; quantity: number }>
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    console.log('🔍 Validating products for sale with REAL inventory checks:', {
      storeId,
      itemCount: items.length
    });

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of items) {
      try {
        // Get real availability for this specific product
        const { data: inventoryData } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('store_id', storeId);

        const availability = await this.calculateRealAvailability(item.productId, storeId, inventoryData || []);
        
        if (availability.status === 'out_of_stock') {
          errors.push(`Product is out of stock (insufficient ingredients)`);
        } else if (availability.quantity < item.quantity) {
          errors.push(`Insufficient quantity: need ${item.quantity}, can make ${availability.quantity}`);
        } else if (availability.status === 'low_stock') {
          warnings.push(`Low stock warning: only ${availability.quantity} units can be made`);
        }

        // Log detailed availability info
        console.log(`📊 Product ${item.productId} availability:`, {
          requested: item.quantity,
          available: availability.quantity,
          status: availability.status,
          requirements: availability.requirements.length
        });

      } catch (error) {
        console.error(`Error validating product ${item.productId}:`, error);
        errors.push(`Failed to validate product availability`);
      }
    }

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    console.log('✅ Product validation completed:', result);
    return result;
  }
}

export const unifiedProductInventoryService = UnifiedProductInventoryService.getInstance();