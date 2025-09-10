/**
 * Inventory Health Service
 * Phase 3: System Hardening - Health Checks and Monitoring
 */

import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  component: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'warning' | 'critical';
  checks: HealthCheckResult[];
  summary: {
    healthy: number;
    warnings: number;
    critical: number;
  };
  generatedAt: string;
}

/**
 * Comprehensive health check for inventory system
 */
export const runInventoryHealthCheck = async (storeId: string): Promise<SystemHealthReport> => {
  console.log(`🏥 Running inventory health check for store: ${storeId}`);
  
  const checks: HealthCheckResult[] = [];
  const timestamp = new Date().toISOString();
  
  // Check 1: Recipe-to-Inventory Mapping Coverage
  try {
    const mappingCheck = await checkRecipeIngredientMappings(storeId);
    checks.push(mappingCheck);
  } catch (error) {
    checks.push({
      status: 'critical',
      component: 'Recipe Ingredient Mappings',
      message: 'Failed to check recipe ingredient mappings',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Check 2: Template Deployment Completeness
  try {
    const deploymentCheck = await checkTemplateDeploymentCompleteness(storeId);
    checks.push(deploymentCheck);
  } catch (error) {
    checks.push({
      status: 'critical',
      component: 'Template Deployment',
      message: 'Failed to check template deployment completeness',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Check 3: Inventory Stock Levels
  try {
    const stockCheck = await checkInventoryStockLevels(storeId);
    checks.push(stockCheck);
  } catch (error) {
    checks.push({
      status: 'critical',
      component: 'Stock Levels',
      message: 'Failed to check inventory stock levels',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Check 4: Recent Transaction Processing
  try {
    const transactionCheck = await checkRecentTransactionProcessing(storeId);
    checks.push(transactionCheck);
  } catch (error) {
    checks.push({
      status: 'critical',
      component: 'Transaction Processing',
      message: 'Failed to check recent transaction processing',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Calculate summary
  const summary = {
    healthy: checks.filter(c => c.status === 'healthy').length,
    warnings: checks.filter(c => c.status === 'warning').length,
    critical: checks.filter(c => c.status === 'critical').length
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (summary.critical > 0) {
    overallStatus = 'critical';
  } else if (summary.warnings > 0) {
    overallStatus = 'warning';
  }

  const report: SystemHealthReport = {
    overallStatus,
    checks,
    summary,
    generatedAt: timestamp
  };

  console.log(`🏥 Health check completed. Status: ${overallStatus}`, summary);
  return report;
};

/**
 * Check recipe ingredient mapping coverage
 */
async function checkRecipeIngredientMappings(storeId: string): Promise<HealthCheckResult> {
  const { data: mappingData, error } = await supabase.rpc('audit_recipe_completeness');
  
  if (error) {
    throw new Error(`Mapping check failed: ${error.message}`);
  }

  const incompleteRecipes = mappingData?.filter((recipe: any) => recipe.status === 'incomplete') || [];
  const totalRecipes = mappingData?.length || 0;
  const completionRate = totalRecipes > 0 ? ((totalRecipes - incompleteRecipes.length) / totalRecipes) * 100 : 100;

  if (completionRate === 100) {
    return {
      status: 'healthy',
      component: 'Recipe Ingredient Mappings',
      message: `All ${totalRecipes} recipes have complete ingredient mappings`,
      details: { completionRate, totalRecipes, incompleteRecipes: 0 },
      timestamp: new Date().toISOString()
    };
  } else if (completionRate >= 80) {
    return {
      status: 'warning',
      component: 'Recipe Ingredient Mappings',
      message: `${completionRate.toFixed(1)}% recipe completion rate - some recipes missing ingredients`,
      details: { completionRate, totalRecipes, incompleteRecipes: incompleteRecipes.length },
      timestamp: new Date().toISOString()
    };
  } else {
    return {
      status: 'critical',
      component: 'Recipe Ingredient Mappings',
      message: `LOW completion rate: ${completionRate.toFixed(1)}% - many recipes missing ingredients`,
      details: { completionRate, totalRecipes, incompleteRecipes: incompleteRecipes.length },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check template deployment completeness
 */
async function checkTemplateDeploymentCompleteness(storeId: string): Promise<HealthCheckResult> {
  // Check if all active templates have deployed recipes for this store
  const { data: templateData, error: templateError } = await supabase
    .from('recipe_templates')
    .select('id, name')
    .eq('is_active', true);

  if (templateError) {
    throw new Error(`Template check failed: ${templateError.message}`);
  }

  const { data: recipeData, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name, template_id')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .not('template_id', 'is', null);

  if (recipeError) {
    throw new Error(`Recipe check failed: ${recipeError.message}`);
  }

  const totalTemplates = templateData?.length || 0;
  const deployedRecipes = recipeData?.length || 0;
  const deploymentRate = totalTemplates > 0 ? (deployedRecipes / totalTemplates) * 100 : 100;

  if (deploymentRate === 100) {
    return {
      status: 'healthy',
      component: 'Template Deployment',
      message: `All ${totalTemplates} templates deployed as recipes`,
      details: { deploymentRate, totalTemplates, deployedRecipes },
      timestamp: new Date().toISOString()
    };
  } else if (deploymentRate >= 80) {
    return {
      status: 'warning',
      component: 'Template Deployment',
      message: `${deploymentRate.toFixed(1)}% deployment rate - some templates not deployed`,
      details: { deploymentRate, totalTemplates, deployedRecipes },
      timestamp: new Date().toISOString()
    };
  } else {
    return {
      status: 'critical',
      component: 'Template Deployment',
      message: `LOW deployment rate: ${deploymentRate.toFixed(1)}% - many templates missing`,
      details: { deploymentRate, totalTemplates, deployedRecipes },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check inventory stock levels
 */
async function checkInventoryStockLevels(storeId: string): Promise<HealthCheckResult> {
  const { data: stockData, error } = await supabase
    .from('inventory_stock')
    .select('id, item, stock_quantity, minimum_threshold')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Stock level check failed: ${error.message}`);
  }

  const totalItems = stockData?.length || 0;
  const lowStockItems = stockData?.filter(item => 
    item.stock_quantity <= item.minimum_threshold
  ) || [];
  const outOfStockItems = stockData?.filter(item => 
    item.stock_quantity <= 0
  ) || [];

  if (outOfStockItems.length > 0) {
    return {
      status: 'critical',
      component: 'Stock Levels',
      message: `${outOfStockItems.length} items out of stock, ${lowStockItems.length} low stock`,
      details: { 
        totalItems, 
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        outOfStockList: outOfStockItems.map(item => item.item)
      },
      timestamp: new Date().toISOString()
    };
  } else if (lowStockItems.length > 0) {
    return {
      status: 'warning',
      component: 'Stock Levels',
      message: `${lowStockItems.length} items below minimum threshold`,
      details: { 
        totalItems, 
        lowStockItems: lowStockItems.length,
        outOfStockItems: 0,
        lowStockList: lowStockItems.map(item => item.item)
      },
      timestamp: new Date().toISOString()
    };
  } else {
    return {
      status: 'healthy',
      component: 'Stock Levels',
      message: `All ${totalItems} inventory items have adequate stock`,
      details: { totalItems, lowStockItems: 0, outOfStockItems: 0 },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check recent transaction processing
 */
async function checkRecentTransactionProcessing(storeId: string): Promise<HealthCheckResult> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Check recent transactions
  const { data: recentTransactions, error: transactionError } = await supabase
    .from('transactions')
    .select('id, created_at')
    .eq('store_id', storeId)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (transactionError) {
    throw new Error(`Transaction check failed: ${transactionError.message}`);
  }

  // Check inventory sync audit for recent transactions
  const recentTransactionIds = recentTransactions?.map(t => t.id) || [];
  
  if (recentTransactionIds.length === 0) {
    return {
      status: 'healthy',
      component: 'Transaction Processing',
      message: 'No recent transactions to analyze',
      details: { recentTransactions: 0, successfulSyncs: 0, failedSyncs: 0 },
      timestamp: new Date().toISOString()
    };
  }

  const { data: syncData, error: syncError } = await supabase
    .from('inventory_sync_audit')
    .select('transaction_id, sync_status')
    .in('transaction_id', recentTransactionIds);

  if (syncError) {
    throw new Error(`Sync audit check failed: ${syncError.message}`);
  }

  const totalTransactions = recentTransactionIds.length;
  const syncedTransactions = syncData?.length || 0;
  const successfulSyncs = syncData?.filter(s => s.sync_status === 'success').length || 0;
  const failedSyncs = syncData?.filter(s => s.sync_status === 'error').length || 0;
  const unsyncedTransactions = totalTransactions - syncedTransactions;

  if (unsyncedTransactions > 0 || failedSyncs > 0) {
    return {
      status: 'critical',
      component: 'Transaction Processing',
      message: `${unsyncedTransactions} unsynced, ${failedSyncs} failed syncs out of ${totalTransactions} transactions`,
      details: { 
        totalTransactions, 
        successfulSyncs, 
        failedSyncs, 
        unsyncedTransactions,
        syncRate: totalTransactions > 0 ? (successfulSyncs / totalTransactions) * 100 : 0
      },
      timestamp: new Date().toISOString()
    };
  } else if (successfulSyncs === totalTransactions) {
    return {
      status: 'healthy',
      component: 'Transaction Processing',
      message: `All ${totalTransactions} recent transactions processed successfully`,
      details: { 
        totalTransactions, 
        successfulSyncs, 
        failedSyncs: 0, 
        unsyncedTransactions: 0,
        syncRate: 100
      },
      timestamp: new Date().toISOString()
    };
  } else {
    return {
      status: 'warning',
      component: 'Transaction Processing',
      message: `${successfulSyncs}/${totalTransactions} transactions processed successfully`,
      details: { 
        totalTransactions, 
        successfulSyncs, 
        failedSyncs, 
        unsyncedTransactions,
        syncRate: (successfulSyncs / totalTransactions) * 100
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Quick health status check for dashboard display
 */
export const getQuickHealthStatus = async (storeId: string): Promise<{
  status: 'healthy' | 'warning' | 'critical';
  message: string;
}> => {
  try {
    const report = await runInventoryHealthCheck(storeId);
    return {
      status: report.overallStatus,
      message: `${report.summary.healthy} healthy, ${report.summary.warnings} warnings, ${report.summary.critical} critical`
    };
  } catch (error) {
    return {
      status: 'critical',
      message: 'Health check failed'
    };
  }
};