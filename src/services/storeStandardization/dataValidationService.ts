import { supabase } from "@/integrations/supabase/client";

export interface ValidationResult {
  storeId: string;
  storeName: string;
  validationChecks: {
    consistencyScore: number;
    posReadiness: number;
    recipeCostValidation: boolean;
    inventoryIntegration: number;
  };
  issues: ValidationIssue[];
  status: 'passed' | 'warning' | 'failed';
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'consistency' | 'pos_readiness' | 'recipe_cost' | 'inventory';
  message: string;
  productId?: string;
  productName?: string;
  suggestedAction?: string;
}

export interface ConsistencyIssue {
  issue_type: string;
  count_affected: number;
  description: string;
}

const SUGBO_MERCADO_STORE_ID = 'e8b8c8a0-8c8a-4c8a-8c8a-8c8a8c8a8c8a';

// Get all stores except Sugbo Mercado
export const getTargetStores = async () => {
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .neq('id', SUGBO_MERCADO_STORE_ID);

  if (error) throw error;
  return stores || [];
};

// Run comprehensive data validation for a store
export const validateStoreData = async (storeId: string): Promise<ValidationResult> => {
  const { data: store } = await supabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single();

  const issues: ValidationIssue[] = [];
  
  // 1. Consistency Checks
  const consistencyScore = await checkDataConsistency(storeId, issues);
  
  // 2. POS Readiness
  const posReadiness = await checkPOSReadiness(storeId, issues);
  
  // 3. Recipe Cost Validation
  const recipeCostValidation = await validateRecipeCosts(storeId, issues);
  
  // 4. Inventory Integration
  const inventoryIntegration = await checkInventoryIntegration(storeId, issues);

  // Determine overall status
  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  
  let status: 'passed' | 'warning' | 'failed' = 'passed';
  if (errorCount > 0) status = 'failed';
  else if (warningCount > 0) status = 'warning';

  return {
    storeId,
    storeName: store?.name || 'Unknown Store',
    validationChecks: {
      consistencyScore,
      posReadiness,
      recipeCostValidation,
      inventoryIntegration
    },
    issues,
    status
  };
};

// Check data consistency using existing function
const checkDataConsistency = async (storeId: string, issues: ValidationIssue[]): Promise<number> => {
  try {
    const { data: consistencyIssues } = await supabase
      .rpc('validate_product_catalog_consistency');

    if (consistencyIssues) {
      consistencyIssues.forEach((issue: ConsistencyIssue) => {
        if (issue.count_affected > 0) {
          issues.push({
            type: issue.issue_type === 'zero_price' ? 'error' : 'warning',
            category: 'consistency',
            message: `${issue.description}: ${issue.count_affected} items`,
            suggestedAction: getConsistencyAction(issue.issue_type)
          });
        }
      });
    }

    const totalIssues = consistencyIssues?.reduce((sum, issue) => sum + issue.count_affected, 0) || 0;
    return Math.max(0, 100 - (totalIssues * 5)); // Deduct 5 points per issue
  } catch (error) {
    console.error('Consistency check failed:', error);
    return 0;
  }
};

// Check POS readiness
const checkPOSReadiness = async (storeId: string, issues: ValidationIssue[]): Promise<number> => {
  const { data: products } = await supabase
    .from('product_catalog')
    .select('id, product_name, price, is_available, recipe_id')
    .eq('store_id', storeId);

  if (!products) return 0;

  const totalProducts = products.length;
  let readyCount = 0;

  products.forEach(product => {
    let isReady = true;
    
    if (!product.price || product.price === 0) {
      isReady = false;
      issues.push({
        type: 'error',
        category: 'pos_readiness',
        message: `Product "${product.product_name}" has no price set`,
        productId: product.id,
        productName: product.product_name,
        suggestedAction: 'Set appropriate pricing'
      });
    }
    
    if (!product.recipe_id) {
      isReady = false;
      issues.push({
        type: 'warning',
        category: 'pos_readiness',
        message: `Product "${product.product_name}" has no recipe linked`,
        productId: product.id,
        productName: product.product_name,
        suggestedAction: 'Link to recipe template'
      });
    }

    if (isReady) readyCount++;
  });

  return totalProducts > 0 ? Math.round((readyCount / totalProducts) * 100) : 100;
};

// Validate recipe costs
const validateRecipeCosts = async (storeId: string, issues: ValidationIssue[]): Promise<boolean> => {
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name, total_cost, cost_per_serving')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!recipes) return true;

  let validRecipes = 0;
  recipes.forEach(recipe => {
    if (recipe.total_cost > 0 && recipe.cost_per_serving > 0) {
      validRecipes++;
    } else {
      issues.push({
        type: 'warning',
        category: 'recipe_cost',
        message: `Recipe "${recipe.name}" has invalid cost calculation`,
        suggestedAction: 'Recalculate recipe costs with proper ingredients'
      });
    }
  });

  return recipes.length > 0 ? (validRecipes / recipes.length) >= 0.8 : true;
};

// Check inventory integration
const checkInventoryIntegration = async (storeId: string, issues: ValidationIssue[]): Promise<number> => {
  // Simple check based on existing recipes and inventory items
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id, name')
    .eq('store_id', storeId)
    .eq('is_active', true);

  const { data: inventoryItems } = await supabase
    .from('inventory_stock')
    .select('id, item')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (!recipes) return 0;

  const totalRecipes = recipes.length;
  const totalInventoryItems = inventoryItems?.length || 0;

  // Basic integration check - if there are recipes and inventory items, assume some integration
  let integrationRate = 0;
  
  if (totalRecipes > 0 && totalInventoryItems > 0) {
    // Estimate integration based on presence of both systems
    integrationRate = Math.min(90, Math.round((totalInventoryItems / totalRecipes) * 50));
  }

  if (integrationRate < 80 && totalRecipes > 0) {
    issues.push({
      type: 'warning',
      category: 'inventory',
      message: `Limited inventory integration detected (${totalInventoryItems} inventory items for ${totalRecipes} recipes)`,
      suggestedAction: 'Set up ingredient-to-inventory mappings'
    });
  }

  return integrationRate;
};

// Get suggested action for consistency issues
const getConsistencyAction = (issueType: string): string => {
  const actions: Record<string, string> = {
    'zero_price': 'Update product pricing',
    'missing_recipe': 'Link products to recipes',
    'sync_mismatch': 'Synchronize product catalog',
    'missing_category': 'Assign product categories'
  };
  return actions[issueType] || 'Review and fix data';
};

// Run validation for all target stores
export const validateAllStores = async (): Promise<ValidationResult[]> => {
  const stores = await getTargetStores();
  const results: ValidationResult[] = [];

  for (const store of stores) {
    try {
      const result = await validateStoreData(store.id);
      results.push(result);
    } catch (error) {
      console.error(`Validation failed for store ${store.name}:`, error);
      results.push({
        storeId: store.id,
        storeName: store.name,
        validationChecks: {
          consistencyScore: 0,
          posReadiness: 0,
          recipeCostValidation: false,
          inventoryIntegration: 0
        },
        issues: [{
          type: 'error',
          category: 'consistency',
          message: 'Validation process failed',
          suggestedAction: 'Check store configuration'
        }],
        status: 'failed'
      });
    }
  }

  return results;
};

// Fix identified issues automatically where possible
export const autoFixIssues = async (storeId: string, issueTypes: string[]): Promise<{ fixed: number; failed: string[] }> => {
  let fixed = 0;
  const failed: string[] = [];

  try {
    // Fix zero prices by applying suggested pricing
    if (issueTypes.includes('zero_price')) {
      const { error } = await supabase
        .rpc('calculate_recipe_suggested_price', { 
          recipe_id_param: null, 
          store_id_param: storeId 
        });
      
      if (error) {
        failed.push('Failed to fix pricing issues');
      } else {
        fixed++;
      }
    }

    // Link missing recipes
    if (issueTypes.includes('missing_recipe')) {
      const { error } = await supabase
        .rpc('repair_recipe_template_links');
      
      if (error) {
        failed.push('Failed to link missing recipes');
      } else {
        fixed++;
      }
    }

  } catch (error) {
    console.error('Auto-fix failed:', error);
    failed.push('Auto-fix process encountered errors');
  }

  return { fixed, failed };
};