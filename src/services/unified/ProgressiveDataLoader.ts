/**
 * Progressive Data Loader
 * Loads essential product data first, then enriches with detailed inventory info in background
 */

import { supabase } from "@/integrations/supabase/client";
import { multiLayerCache } from "./MultiLayerCache";

export interface EssentialProductData {
  productId: string;
  productName: string;
  price: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

export interface DetailedProductData extends EssentialProductData {
  recipeId: string | null;
  availableQuantity: number;
  availabilityStatus: 'available' | 'low_stock' | 'out_of_stock' | 'no_recipe';
  recipeRequirements: Array<{
    inventoryItemId: string;
    itemName: string;
    requiredQuantity: number;
    availableQuantity: number;
  }>;
}

export class ProgressiveDataLoader {
  private static instance: ProgressiveDataLoader;
  private backgroundLoadPromises = new Map<string, Promise<void>>();

  static getInstance(): ProgressiveDataLoader {
    if (!ProgressiveDataLoader.instance) {
      ProgressiveDataLoader.instance = new ProgressiveDataLoader();
    }
    return ProgressiveDataLoader.instance;
  }

  /**
   * Load essential product data FAST (names, prices, images only)
   * Returns within 500ms typically
   */
  async loadEssentialData(storeId: string): Promise<EssentialProductData[]> {
    const startTime = performance.now();
    
    console.log('⚡ [PROGRESSIVE] Loading essential product data...');

    // Check cache first
    const cached = multiLayerCache.get<EssentialProductData[]>(storeId, 'essential', 'products');
    if (cached) {
      console.log(`✅ [PROGRESSIVE] Essential data from cache (${(performance.now() - startTime).toFixed(2)}ms)`);
      return cached;
    }

    // Load only essential fields (super fast query)
    const { data: products, error } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        price,
        category_id,
        image_url,
        is_available,
        categories!inner(
          id,
          name
        )
      `)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .order('display_order', { ascending: true })
      .order('product_name', { ascending: true });

    if (error) {
      console.error('❌ [PROGRESSIVE] Essential data load failed:', error);
      return [];
    }

    const essentialData: EssentialProductData[] = (products || []).map(p => ({
      productId: p.id,
      productName: p.product_name,
      price: p.price,
      categoryId: p.category_id,
      categoryName: p.categories.name,
      imageUrl: p.image_url,
      isAvailable: p.is_available
    }));

    // Cache for 30 minutes
    multiLayerCache.set(storeId, 'essential', essentialData, 'products');

    const loadTime = performance.now() - startTime;
    console.log(`✅ [PROGRESSIVE] Essential data loaded: ${essentialData.length} products (${loadTime.toFixed(2)}ms)`);

    return essentialData;
  }

  /**
   * Load detailed data in background (inventory, recipes, availability)
   * Does not block UI rendering
   */
  async loadDetailedDataInBackground(
    storeId: string,
    essentialProducts: EssentialProductData[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<DetailedProductData[]> {
    const key = `${storeId}_detailed`;
    
    // Prevent duplicate background loads
    if (this.backgroundLoadPromises.has(key)) {
      console.log('⏳ [PROGRESSIVE] Background load already in progress');
      await this.backgroundLoadPromises.get(key);
      return this.getDetailedDataFromCache(storeId);
    }

    console.log('🔄 [PROGRESSIVE] Starting background detailed data load...');

    const promise = this.executeBackgroundLoad(storeId, essentialProducts, onProgress);
    this.backgroundLoadPromises.set(key, promise);

    try {
      await promise;
      return this.getDetailedDataFromCache(storeId);
    } finally {
      this.backgroundLoadPromises.delete(key);
    }
  }

  /**
   * Execute the background load
   */
  private async executeBackgroundLoad(
    storeId: string,
    essentialProducts: EssentialProductData[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<void> {
    const startTime = performance.now();
    const total = essentialProducts.length;

    // Load recipes and inventory in parallel
    const [recipesData, inventoryData] = await Promise.all([
      this.loadRecipesData(storeId),
      this.loadInventoryData(storeId)
    ]);

    console.log('📦 [PROGRESSIVE] Background data loaded:', {
      recipes: Object.keys(recipesData).length,
      inventory: inventoryData.length
    });

    // Enrich products with detailed data
    const detailedProducts: DetailedProductData[] = [];
    
    for (let i = 0; i < essentialProducts.length; i++) {
      const essential = essentialProducts[i];
      const recipe = recipesData[essential.productId];
      
      const detailed: DetailedProductData = {
        ...essential,
        recipeId: recipe?.id || null,
        availableQuantity: recipe ? this.calculateAvailability(recipe, inventoryData) : 100,
        availabilityStatus: this.determineStatus(recipe, inventoryData),
        recipeRequirements: recipe?.ingredients || []
      };
      
      detailedProducts.push(detailed);
      
      // Report progress
      if (onProgress && (i + 1) % 10 === 0) {
        onProgress(i + 1, total);
      }
    }

    // Cache detailed data
    multiLayerCache.set(storeId, 'detailed', detailedProducts, 'products');

    const loadTime = performance.now() - startTime;
    console.log(`✅ [PROGRESSIVE] Background load complete (${loadTime.toFixed(2)}ms)`);
  }

  /**
   * Load recipes for all products
   */
  private async loadRecipesData(storeId: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('product_catalog')
      .select(`
        id,
        recipe_id,
        recipes!inner(
          id,
          name,
          recipe_ingredients_by_store!inner(
            inventory_stock_id,
            quantity,
            ingredient_name
          )
        )
      `)
      .eq('store_id', storeId)
      .not('recipe_id', 'is', null);

    if (error) {
      console.error('❌ [PROGRESSIVE] Recipe load failed:', error);
      return {};
    }

    const recipesMap: Record<string, any> = {};
    (data || []).forEach(product => {
      if (product.recipes && product.recipes.recipe_ingredients_by_store) {
        recipesMap[product.id] = {
          id: product.recipe_id,
          name: product.recipes.name,
          ingredients: product.recipes.recipe_ingredients_by_store.map((ing: any) => ({
            inventoryItemId: ing.inventory_stock_id,
            itemName: ing.ingredient_name,
            requiredQuantity: ing.quantity,
            availableQuantity: 0 // Will be filled from inventory
          }))
        };
      }
    });

    return recipesMap;
  }

  /**
   * Load inventory stock data
   */
  private async loadInventoryData(storeId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ [PROGRESSIVE] Inventory load failed:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate product availability based on recipe and inventory
   */
  private calculateAvailability(recipe: any, inventory: any[]): number {
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return 100;
    }

    let minQuantity = Infinity;

    for (const ingredient of recipe.ingredients) {
      const stock = inventory.find(inv => inv.id === ingredient.inventoryItemId);
      if (!stock) {
        return 0;
      }

      const possibleUnits = Math.floor(stock.stock_quantity / ingredient.requiredQuantity);
      minQuantity = Math.min(minQuantity, possibleUnits);
    }

    return minQuantity === Infinity ? 0 : minQuantity;
  }

  /**
   * Determine availability status
   */
  private determineStatus(recipe: any, inventory: any[]): DetailedProductData['availabilityStatus'] {
    if (!recipe) return 'available';
    
    const quantity = this.calculateAvailability(recipe, inventory);
    
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= 5) return 'low_stock';
    return 'available';
  }

  /**
   * Get cached detailed data
   */
  private getDetailedDataFromCache(storeId: string): DetailedProductData[] {
    return multiLayerCache.get<DetailedProductData[]>(storeId, 'detailed', 'products') || [];
  }

  /**
   * Clear all caches
   */
  clearCache(storeId: string): void {
    multiLayerCache.invalidateLayer(storeId, 'products');
    this.backgroundLoadPromises.delete(`${storeId}_detailed`);
  }
}

export const progressiveDataLoader = ProgressiveDataLoader.getInstance();
