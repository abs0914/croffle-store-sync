import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ForeignMappingResult {
  recipe_id: string;
  recipe_name: string;
  ingredient_id: string;
  ingredient_name: string;
  foreign_inventory_id: string;
  foreign_store_id: string;
  foreign_store_name: string;
  foreign_item_name: string;
}

export interface FixForeignMappingsResult {
  fixed_count: number;
  failed_count: number;
  details: {
    operations: Array<{
      recipe_name: string;
      ingredient_name: string;
      old_item?: string;
      new_item?: string;
      foreign_item?: string;
      status: 'fixed' | 'no_match_found';
    }>;
    summary: {
      total_processed: number;
      successfully_fixed: number;
      failed_to_fix: number;
    };
  };
}

/**
 * Detect foreign mappings (ingredients mapped to other stores' inventory)
 */
export const detectForeignMappings = async (storeId: string): Promise<ForeignMappingResult[]> => {
  try {
    const { data, error } = await supabase.rpc('detect_foreign_mappings', {
      p_store_id: storeId
    });

    if (error) {
      console.error('Error detecting foreign mappings:', error);
      toast.error('Failed to check for cross-store mapping issues');
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in detectForeignMappings:', error);
    toast.error('Failed to check for cross-store mapping issues');
    return [];
  }
};

/**
 * Automatically fix foreign mappings by finding matching inventory items in the target store
 */
export const fixForeignMappingsByName = async (storeId: string): Promise<FixForeignMappingsResult | null> => {
  try {
    const { data, error } = await supabase.rpc('fix_foreign_mappings_by_name', {
      p_store_id: storeId
    });

    if (error) {
      console.error('Error fixing foreign mappings:', error);
      toast.error('Failed to fix foreign mappings');
      return null;
    }

    const result = data?.[0];
    if (!result) {
      toast.error('No results returned from foreign mapping fix');
      return null;
    }

    return {
      fixed_count: result.fixed_count,
      failed_count: result.failed_count,
      details: result.details as any // Database JSON needs to be cast
    };
  } catch (error) {
    console.error('Error in fixForeignMappingsByName:', error);
    toast.error('Failed to fix foreign mappings');
    return null;
  }
};

/**
 * Get cross-store mapping issues for a specific store
 */
export const getCrossStoreMappingIssues = async (storeId?: string) => {
  try {
    let query = supabase
      .from('cross_store_mapping_issues')
      .select('*');

    if (storeId) {
      query = query.eq('recipe_store_id', storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cross-store mapping issues:', error);
      toast.error('Failed to fetch mapping issues');
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCrossStoreMappingIssues:', error);
    toast.error('Failed to fetch mapping issues');
    return [];
  }
};

/**
 * Validate recipe for deployment readiness (no foreign mappings, all ingredients mapped)
 */
export const validateRecipeForDeployment = (
  recipeIngredients: any[],
  currentStoreInventoryIds: Set<string>
) => {
  const unmappedIngredients = recipeIngredients.filter(ing => !ing.inventory_stock_id);
  const foreignMappedIngredients = recipeIngredients.filter(
    ing => ing.inventory_stock_id && !currentStoreInventoryIds.has(ing.inventory_stock_id)
  );

  return {
    canDeploy: unmappedIngredients.length === 0 && foreignMappedIngredients.length === 0,
    unmappedCount: unmappedIngredients.length,
    foreignMappedCount: foreignMappedIngredients.length,
    totalIngredients: recipeIngredients.length,
    issues: [
      ...(unmappedIngredients.length > 0 ? [`${unmappedIngredients.length} ingredients not mapped to inventory`] : []),
      ...(foreignMappedIngredients.length > 0 ? [`${foreignMappedIngredients.length} ingredients mapped to other stores`] : [])
    ]
  };
};