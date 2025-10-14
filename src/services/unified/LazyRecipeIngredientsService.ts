/**
 * Lazy Recipe Ingredients Loading Service
 * 
 * Only fetches recipe ingredients when actually needed (cart validation/payment)
 * Eliminates 1s+ query during product grid display
 */

import { supabase } from '@/integrations/supabase/client';
import { multiLayerCache } from './MultiLayerCache';

interface RecipeIngredient {
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  inventoryStockId: string | null;
  inventoryItem: string | null;
  inventoryStock: number;
  inventoryActive: boolean;
}

class LazyRecipeIngredientsService {
  private static instance: LazyRecipeIngredientsService;

  static getInstance(): LazyRecipeIngredientsService {
    if (!LazyRecipeIngredientsService.instance) {
      LazyRecipeIngredientsService.instance = new LazyRecipeIngredientsService();
    }
    return LazyRecipeIngredientsService.instance;
  }

  /**
   * Fetch recipe ingredients only when needed (cart/payment)
   * Uses aggressive caching to avoid repeated queries
   */
  async fetchRecipeIngredients(
    storeId: string,
    recipeIds: string[]
  ): Promise<RecipeIngredient[]> {
    if (recipeIds.length === 0) {
      return [];
    }

    console.log(`🔄 [LAZY] Fetching recipe ingredients for ${recipeIds.length} recipes`);
    const startTime = performance.now();

    // Check cache first
    const cacheKey = `recipes_${recipeIds.sort().join('_')}`;
    const cached = multiLayerCache.get<RecipeIngredient[]>(storeId, 'recipeIngredients', cacheKey);
    if (cached) {
      console.log(`✅ [LAZY] Using cached recipe ingredients (${(performance.now() - startTime).toFixed(2)}ms)`);
      return cached;
    }

    try {
      // Fetch from database
      const { data, error } = await supabase
        .from('recipe_ingredients_by_store')
        .select('*')
        .eq('store_id', storeId)
        .in('recipe_id', recipeIds);

      if (error) {
        console.error('❌ Error fetching recipe ingredients:', error);
        return [];
      }

      const ingredients: RecipeIngredient[] = (data || []).map(d => ({
        recipeId: d.recipe_id,
        ingredientId: d.id,
        ingredientName: d.ingredient_name,
        requiredQuantity: d.quantity,
        inventoryStockId: d.inventory_stock_id,
        inventoryItem: d.ingredient_name,
        inventoryStock: d.stock_quantity || 0,
        inventoryActive: d.inventory_active || false
      }));

      // Cache the result
      multiLayerCache.set(storeId, cacheKey, ingredients, 'recipeIngredients');

      const fetchTime = performance.now() - startTime;
      console.log(`✅ [LAZY] Recipe ingredients fetched in ${fetchTime.toFixed(2)}ms (${ingredients.length} ingredients)`);

      if (fetchTime > 500) {
        console.warn(`⚠️ [LAZY] Slow query: ${fetchTime.toFixed(2)}ms`);
      }

      return ingredients;
    } catch (error) {
      console.error('❌ [LAZY] Error fetching recipe ingredients:', error);
      return [];
    }
  }

  /**
   * Fetch ingredients for specific cart items only
   */
  async fetchForCartItems(
    storeId: string,
    cartItems: Array<{ productId: string; recipeId?: string }>
  ): Promise<RecipeIngredient[]> {
    const recipeIds = cartItems
      .filter(item => item.recipeId)
      .map(item => item.recipeId!);

    const uniqueRecipeIds = [...new Set(recipeIds)];
    return this.fetchRecipeIngredients(storeId, uniqueRecipeIds);
  }

  /**
   * Clear cache for a store
   */
  clearCache(storeId: string): void {
    multiLayerCache.invalidateLayer(storeId, 'recipeIngredients');
    console.log(`🧹 [LAZY] Cleared recipe ingredients cache for store: ${storeId}`);
  }
}

export const lazyRecipeIngredientsService = LazyRecipeIngredientsService.getInstance();
