/**
 * Phase 5: Cross-Store Deduction Monitoring Service
 * Monitors for blocked cross-store attempts and logs metrics
 */

import { supabase } from "@/integrations/supabase/client";

export interface CrossStoreAttempt {
  timestamp: string;
  recipe_name: string;
  recipe_store: string;
  inventory_item: string;
  inventory_store: string;
  transaction_id?: string;
  blocked: boolean;
}

export interface MonitoringMetrics {
  total_blocked_attempts: number;
  attempts_by_store: Record<string, number>;
  attempts_last_24h: number;
  most_common_violations: Array<{
    recipe_name: string;
    count: number;
  }>;
}

/**
 * Log a blocked cross-store deduction attempt
 */
export async function logBlockedAttempt(
  recipeName: string,
  recipeStoreId: string,
  inventoryItem: string,
  inventoryStoreId: string,
  transactionId?: string
): Promise<void> {
  console.warn('🚨 Cross-store deduction blocked:', {
    recipeName,
    recipeStoreId,
    inventoryItem,
    inventoryStoreId,
    transactionId
  });

  try {
    // Log to console for immediate visibility
    console.error(`
      🚨 CROSS-STORE DEDUCTION BLOCKED
      Recipe: ${recipeName} (Store: ${recipeStoreId})
      Attempted to use: ${inventoryItem} (Store: ${inventoryStoreId})
      Transaction: ${transactionId || 'N/A'}
    `);

    // Could store in a dedicated monitoring table if needed
    // For now, relying on console logs and error tracking
  } catch (error) {
    console.error('Failed to log blocked attempt:', error);
  }
}

/**
 * Get monitoring metrics for cross-store attempts
 */
export async function getMonitoringMetrics(): Promise<MonitoringMetrics> {
  // This would query a dedicated monitoring table
  // For now, returning empty metrics structure
  return {
    total_blocked_attempts: 0,
    attempts_by_store: {},
    attempts_last_24h: 0,
    most_common_violations: []
  };
}

/**
 * Validate store health - check for any remaining cross-store mappings
 */
export async function validateStoreHealth(storeId: string): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check for cross-store mappings
    const { data: recipes } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        recipe_ingredients!inner(
          inventory_stock_id,
          inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(
            store_id
          )
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (recipes) {
      recipes.forEach(recipe => {
        recipe.recipe_ingredients?.forEach((ingredient: any) => {
          if (ingredient.inventory_stock?.store_id !== storeId) {
            issues.push(`Recipe "${recipe.name}" has cross-store ingredient mapping`);
          }
        });
      });
    }

    // Check for recipes without ingredients
    const { data: emptyRecipes } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        recipe_ingredients(id)
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (emptyRecipes) {
      emptyRecipes.forEach(recipe => {
        if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
          issues.push(`Recipe "${recipe.name}" has no ingredients`);
          recommendations.push(`Add ingredients to recipe "${recipe.name}"`);
        }
      });
    }

    const healthy = issues.length === 0;

    if (!healthy) {
      recommendations.push('Run the Cross-Store Mapping Repair Tool at /admin/inventory/cross-store-repair');
    }

    return {
      healthy,
      issues,
      recommendations
    };

  } catch (error) {
    console.error('Error validating store health:', error);
    return {
      healthy: false,
      issues: ['Failed to validate store health'],
      recommendations: ['Check database connection and permissions']
    };
  }
}

/**
 * Generate system health report
 */
export async function generateSystemHealthReport(): Promise<{
  overall_health: 'healthy' | 'warning' | 'critical';
  stores_checked: number;
  healthy_stores: number;
  stores_with_issues: number;
  total_issues: number;
  store_details: Array<{
    store_id: string;
    store_name: string;
    health_status: 'healthy' | 'issues';
    issue_count: number;
    issues: string[];
  }>;
}> {
  try {
    // Get all active stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);

    if (!stores || stores.length === 0) {
      return {
        overall_health: 'warning',
        stores_checked: 0,
        healthy_stores: 0,
        stores_with_issues: 0,
        total_issues: 0,
        store_details: []
      };
    }

    const storeDetails = [];
    let totalIssues = 0;
    let healthyStores = 0;

    for (const store of stores) {
      const health = await validateStoreHealth(store.id);
      
      storeDetails.push({
        store_id: store.id,
        store_name: store.name,
        health_status: health.healthy ? 'healthy' : 'issues',
        issue_count: health.issues.length,
        issues: health.issues
      });

      if (health.healthy) {
        healthyStores++;
      }

      totalIssues += health.issues.length;
    }

    const storesWithIssues = stores.length - healthyStores;

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (totalIssues > 0 && totalIssues < 10) {
      overallHealth = 'warning';
    } else if (totalIssues >= 10) {
      overallHealth = 'critical';
    }

    return {
      overall_health: overallHealth,
      stores_checked: stores.length,
      healthy_stores: healthyStores,
      stores_with_issues: storesWithIssues,
      total_issues: totalIssues,
      store_details: storeDetails
    };

  } catch (error) {
    console.error('Error generating system health report:', error);
    return {
      overall_health: 'critical',
      stores_checked: 0,
      healthy_stores: 0,
      stores_with_issues: 0,
      total_issues: 0,
      store_details: []
    };
  }
}
