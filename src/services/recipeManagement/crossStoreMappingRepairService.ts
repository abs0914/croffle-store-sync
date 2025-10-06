/**
 * Phase 2: Cross-Store Mapping Repair Service
 * Detects and repairs recipe ingredients mapped to wrong store's inventory
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CrossStoreMappingIssue {
  recipe_id: string;
  recipe_name: string;
  recipe_store_id: string;
  recipe_store_name: string;
  ingredient_id: string;
  ingredient_name: string;
  inventory_stock_id: string;
  inventory_item_name: string;
  inventory_store_id: string;
  inventory_store_name: string;
}

export interface RepairResult {
  ingredient_id: string;
  ingredient_name: string;
  old_inventory_stock_id: string;
  new_inventory_stock_id: string;
  success: boolean;
  error?: string;
}

export interface RepairSummary {
  total_issues: number;
  repaired: number;
  failed: number;
  skipped: number;
  results: RepairResult[];
}

/**
 * Detect all cross-store recipe ingredient mappings
 */
export async function detectCrossStoreMappings(
  storeId?: string
): Promise<CrossStoreMappingIssue[]> {
  console.log('🔍 Phase 2: Detecting cross-store mappings', { storeId });
  
  try {
    let query = supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        stores!recipes_store_id_fkey(name),
        recipe_ingredients!inner(
          id,
          ingredient_name,
          inventory_stock_id,
          inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
            id,
            item,
            store_id,
            stores!inventory_stock_store_id_fkey(name)
          )
        )
      `)
      .eq('is_active', true);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Failed to detect cross-store mappings:', error);
      throw error;
    }

    // Filter for cross-store issues
    const issues: CrossStoreMappingIssue[] = [];
    
    data?.forEach((recipe: any) => {
      recipe.recipe_ingredients?.forEach((ingredient: any) => {
        if (ingredient.inventory_stock && 
            ingredient.inventory_stock.store_id !== recipe.store_id) {
          issues.push({
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            recipe_store_id: recipe.store_id,
            recipe_store_name: recipe.stores?.name || 'Unknown Store',
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.ingredient_name,
            inventory_stock_id: ingredient.inventory_stock_id,
            inventory_item_name: ingredient.inventory_stock.item,
            inventory_store_id: ingredient.inventory_stock.store_id,
            inventory_store_name: ingredient.inventory_stock.stores?.name || 'Unknown Store'
          });
        }
      });
    });

    console.log(`🔍 Phase 2: Found ${issues.length} cross-store mapping issues`);
    return issues;

  } catch (error) {
    console.error('❌ Error detecting cross-store mappings:', error);
    toast.error('Failed to detect cross-store mappings');
    throw error;
  }
}

/**
 * Repair cross-store mappings for a specific store
 */
export async function repairCrossStoreMappings(
  storeId: string,
  autoFix: boolean = false
): Promise<RepairSummary> {
  console.log('🔧 Phase 2: Starting repair process', { storeId, autoFix });
  
  const results: RepairResult[] = [];
  let repaired = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get all cross-store issues for this store
    const issues = await detectCrossStoreMappings(storeId);
    
    if (issues.length === 0) {
      toast.success('No cross-store mappings found');
      return {
        total_issues: 0,
        repaired: 0,
        failed: 0,
        skipped: 0,
        results: []
      };
    }

    console.log(`🔧 Phase 2: Processing ${issues.length} issues`);

    // Group issues by ingredient to avoid duplicate repairs
    const uniqueIssues = new Map<string, CrossStoreMappingIssue>();
    issues.forEach(issue => {
      uniqueIssues.set(issue.ingredient_id, issue);
    });

    // Process each unique ingredient
    for (const issue of uniqueIssues.values()) {
      const result = await repairSingleMapping(issue, autoFix);
      results.push(result);

      if (result.success) {
        repaired++;
      } else if (result.error?.includes('skipped')) {
        skipped++;
      } else {
        failed++;
      }
    }

    const summary: RepairSummary = {
      total_issues: uniqueIssues.size,
      repaired,
      failed,
      skipped,
      results
    };

    console.log('✅ Phase 2: Repair completed', summary);
    
    if (repaired > 0) {
      toast.success(`Repaired ${repaired} cross-store mappings`);
    }
    if (failed > 0) {
      toast.error(`Failed to repair ${failed} mappings`);
    }
    if (skipped > 0) {
      toast.warning(`Skipped ${skipped} mappings (no matching inventory)`);
    }

    return summary;

  } catch (error) {
    console.error('❌ Error repairing cross-store mappings:', error);
    toast.error('Failed to repair cross-store mappings');
    throw error;
  }
}

/**
 * Repair a single cross-store mapping
 */
async function repairSingleMapping(
  issue: CrossStoreMappingIssue,
  autoFix: boolean
): Promise<RepairResult> {
  console.log(`🔧 Phase 2: Repairing ingredient ${issue.ingredient_name}`);

  try {
    // Find matching inventory in the correct store
    const { data: correctInventory, error: searchError } = await supabase
      .from('inventory_stock')
      .select('id, item')
      .eq('store_id', issue.recipe_store_id)
      .eq('is_active', true)
      .or(`item.ilike.%${issue.ingredient_name}%,item.eq.${issue.inventory_item_name}`)
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error('❌ Search error:', searchError);
      return {
        ingredient_id: issue.ingredient_id,
        ingredient_name: issue.ingredient_name,
        old_inventory_stock_id: issue.inventory_stock_id,
        new_inventory_stock_id: '',
        success: false,
        error: searchError.message
      };
    }

    if (!correctInventory) {
      console.warn(`⚠️ No matching inventory found for ${issue.ingredient_name} in store ${issue.recipe_store_name}`);
      return {
        ingredient_id: issue.ingredient_id,
        ingredient_name: issue.ingredient_name,
        old_inventory_stock_id: issue.inventory_stock_id,
        new_inventory_stock_id: '',
        success: false,
        error: `No matching inventory found in ${issue.recipe_store_name} (skipped)`
      };
    }

    if (!autoFix) {
      console.log(`ℹ️ Found match but autoFix=false: ${correctInventory.item} (${correctInventory.id})`);
      return {
        ingredient_id: issue.ingredient_id,
        ingredient_name: issue.ingredient_name,
        old_inventory_stock_id: issue.inventory_stock_id,
        new_inventory_stock_id: correctInventory.id,
        success: false,
        error: 'Preview only (not executed)'
      };
    }

    // Update the recipe ingredient to point to correct inventory
    const { error: updateError } = await supabase
      .from('recipe_ingredients')
      .update({ 
        inventory_stock_id: correctInventory.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', issue.ingredient_id);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return {
        ingredient_id: issue.ingredient_id,
        ingredient_name: issue.ingredient_name,
        old_inventory_stock_id: issue.inventory_stock_id,
        new_inventory_stock_id: correctInventory.id,
        success: false,
        error: updateError.message
      };
    }

    console.log(`✅ Repaired: ${issue.ingredient_name} → ${correctInventory.item}`);

    return {
      ingredient_id: issue.ingredient_id,
      ingredient_name: issue.ingredient_name,
      old_inventory_stock_id: issue.inventory_stock_id,
      new_inventory_stock_id: correctInventory.id,
      success: true
    };

  } catch (error) {
    console.error('❌ Error repairing mapping:', error);
    return {
      ingredient_id: issue.ingredient_id,
      ingredient_name: issue.ingredient_name,
      old_inventory_stock_id: issue.inventory_stock_id,
      new_inventory_stock_id: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a detailed report of cross-store issues
 */
export async function generateRepairReport(
  storeId?: string
): Promise<{
  issues: CrossStoreMappingIssue[];
  summary: {
    total_recipes_affected: number;
    total_stores_affected: number;
    total_ingredients_affected: number;
  };
}> {
  console.log('📊 Phase 2: Generating repair report', { storeId });

  try {
    const issues = await detectCrossStoreMappings(storeId);

    const uniqueRecipes = new Set(issues.map(i => i.recipe_id));
    const uniqueStores = new Set(issues.map(i => i.recipe_store_id));
    const uniqueIngredients = new Set(issues.map(i => i.ingredient_id));

    const summary = {
      total_recipes_affected: uniqueRecipes.size,
      total_stores_affected: uniqueStores.size,
      total_ingredients_affected: uniqueIngredients.size
    };

    console.log('📊 Phase 2: Report generated', summary);

    return { issues, summary };

  } catch (error) {
    console.error('❌ Error generating report:', error);
    throw error;
  }
}
