import { supabase } from '@/integrations/supabase/client';

export type RecipeSystemType = 'legacy' | 'unified';

export interface RecipeSystemInfo {
  type: RecipeSystemType;
  id: string;
  name: string;
  store_id: string;
  table: 'recipes' | 'unified_recipes';
}

export const recipeSystemDetection = {
  /**
   * Detect which system a recipe belongs to by checking both tables
   */
  async detectRecipeSystem(recipeId: string): Promise<RecipeSystemInfo | null> {
    try {
      // First check unified_recipes
      const { data: unifiedRecipe } = await supabase
        .from('unified_recipes')
        .select('id, name, store_id')
        .eq('id', recipeId)
        .single();

      if (unifiedRecipe) {
        return {
          type: 'unified',
          id: unifiedRecipe.id,
          name: unifiedRecipe.name,
          store_id: unifiedRecipe.store_id,
          table: 'unified_recipes'
        };
      }

      // Then check legacy recipes
      const { data: legacyRecipe } = await supabase
        .from('recipes')
        .select('id, name, store_id')
        .eq('id', recipeId)
        .single();

      if (legacyRecipe) {
        return {
          type: 'legacy',
          id: legacyRecipe.id,
          name: legacyRecipe.name,
          store_id: legacyRecipe.store_id,
          table: 'recipes'
        };
      }

      return null;
    } catch (error) {
      console.error('Error detecting recipe system:', error);
      return null;
    }
  },

  /**
   * Get all recipes for a store from both systems
   */
  async getAllRecipesByStore(storeId: string): Promise<{
    unified: any[];
    legacy: any[];
    total: number;
  }> {
    try {
      const [unifiedResult, legacyResult] = await Promise.all([
        supabase
          .from('unified_recipes')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('recipes')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('name')
      ]);

      const unified = unifiedResult.data || [];
      const legacy = legacyResult.data || [];

      return {
        unified,
        legacy,
        total: unified.length + legacy.length
      };
    } catch (error) {
      console.error('Error fetching all recipes by store:', error);
      return { unified: [], legacy: [], total: 0 };
    }
  },

  /**
   * Get system statistics for all stores
   */
  async getSystemStatistics(): Promise<{
    totalUnified: number;
    totalLegacy: number;
    storeBreakdown: Array<{
      store_id: string;
      store_name: string;
      unified_count: number;
      legacy_count: number;
    }>;
  }> {
    try {
      const [unifiedCount, legacyCount, stores] = await Promise.all([
        supabase.from('unified_recipes').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('recipes').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('stores').select('id, name').eq('is_active', true)
      ]);

      const storeBreakdown = await Promise.all(
        (stores.data || []).map(async (store) => {
          const [unifiedForStore, legacyForStore] = await Promise.all([
            supabase.from('unified_recipes').select('id', { count: 'exact' })
              .eq('store_id', store.id).eq('is_active', true),
            supabase.from('recipes').select('id', { count: 'exact' })
              .eq('store_id', store.id).eq('is_active', true)
          ]);

          return {
            store_id: store.id,
            store_name: store.name,
            unified_count: unifiedForStore.count || 0,
            legacy_count: legacyForStore.count || 0
          };
        })
      );

      return {
        totalUnified: unifiedCount.count || 0,
        totalLegacy: legacyCount.count || 0,
        storeBreakdown
      };
    } catch (error) {
      console.error('Error getting system statistics:', error);
      return {
        totalUnified: 0,
        totalLegacy: 0,
        storeBreakdown: []
      };
    }
  }
};