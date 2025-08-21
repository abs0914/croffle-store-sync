import { supabase } from "@/integrations/supabase/client";
import { validateProductsForInventory } from "./inventoryValidationService";

export interface SyncHealthMetrics {
  storeId: string;
  storeName: string;
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  syncHealthPercentage: number;
  criticalIssues: string[];
  warnings: string[];
  lastChecked: string;
  trends: {
    improving: boolean;
    deteriorating: boolean;
    stable: boolean;
  };
}

export interface AutoRepairResult {
  repairsAttempted: number;
  repairsSuccessful: number;
  repairsFailed: number;
  unresolvedIssues: string[];
  repairLog: Array<{
    productId: string;
    productName: string;
    issueType: string;
    repairAction: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Proactive Inventory Sync Monitor - Phase 2
 * Monitors inventory sync health across all stores and provides auto-repair
 */
export class ProactiveSyncMonitor {
  
  /**
   * Get comprehensive sync health metrics for all stores
   */
  static async getGlobalSyncHealth(): Promise<SyncHealthMetrics[]> {
    try {
      console.log('🔍 Running global inventory sync health check...');
      
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (storesError) {
        console.error('Error fetching stores:', storesError);
        return [];
      }

      const healthMetrics: SyncHealthMetrics[] = [];

      for (const store of stores || []) {
        const storeHealth = await this.getStoreSpecificHealth(store.id, store.name);
        healthMetrics.push(storeHealth);
      }

      // Sort by health percentage (worst first for priority)
      healthMetrics.sort((a, b) => a.syncHealthPercentage - b.syncHealthPercentage);

      console.log('✅ Global sync health analysis complete:', {
        totalStores: healthMetrics.length,
        averageHealth: this.calculateAverageHealth(healthMetrics),
        criticalStores: healthMetrics.filter(m => m.syncHealthPercentage < 80).length
      });

      return healthMetrics;

    } catch (error) {
      console.error('Error in global sync health check:', error);
      return [];
    }
  }

  /**
   * Get detailed sync health for a specific store
   */
  static async getStoreSpecificHealth(storeId: string, storeName?: string): Promise<SyncHealthMetrics> {
    try {
      // Get all products for the store
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error || !products) {
        return this.createEmptyHealthMetrics(storeId, storeName || 'Unknown Store');
      }

      // Validate all products
      const productIds = products.map(p => p.id);
      const validationResults = await validateProductsForInventory(productIds);

      let validCount = 0;
      let invalidCount = 0;
      const criticalIssues: string[] = [];
      const warnings: string[] = [];

      validationResults.forEach((result, productId) => {
        if (result.canDeductInventory) {
          validCount++;
        } else {
          invalidCount++;
          
          if (result.status === 'no_template') {
            criticalIssues.push(`${result.reason} for product ID: ${productId}`);
          } else {
            warnings.push(`${result.reason} for product ID: ${productId}`);
          }
        }
      });

      const totalProducts = products.length;
      const syncHealthPercentage = totalProducts > 0 ? Math.round((validCount / totalProducts) * 100) : 100;
      
      // Determine trend (simplified - could be enhanced with historical data)
      const trends = {
        improving: syncHealthPercentage > 90,
        deteriorating: syncHealthPercentage < 70,
        stable: syncHealthPercentage >= 70 && syncHealthPercentage <= 90
      };

      return {
        storeId,
        storeName: storeName || 'Unknown Store',
        totalProducts,
        validProducts: validCount,
        invalidProducts: invalidCount,
        syncHealthPercentage,
        criticalIssues: criticalIssues.slice(0, 10), // Limit for UI
        warnings: warnings.slice(0, 10),
        lastChecked: new Date().toISOString(),
        trends
      };

    } catch (error) {
      console.error(`Error checking store health for ${storeId}:`, error);
      return this.createEmptyHealthMetrics(storeId, storeName || 'Unknown Store');
    }
  }

  /**
   * Attempt automatic repair of common sync issues
   */
  static async attemptAutoRepair(storeId: string): Promise<AutoRepairResult> {
    console.log(`🔧 Starting auto-repair for store: ${storeId}`);
    
    const repairResult: AutoRepairResult = {
      repairsAttempted: 0,
      repairsSuccessful: 0,
      repairsFailed: 0,
      unresolvedIssues: [],
      repairLog: []
    };

    try {
      // Get products needing repair
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          recipe_id,
          recipes (
            id,
            template_id,
            recipe_templates (
              id,
              is_active
            )
          )
        `)
        .eq('store_id', storeId)
        .eq('is_active', true);

      if (error || !products) {
        repairResult.unresolvedIssues.push('Failed to fetch products for repair');
        return repairResult;
      }

      for (const product of products) {
        const recipe = Array.isArray(product.recipes) ? product.recipes[0] : product.recipes;
        
        // Repair Case 1: Product missing recipe
        if (!product.recipe_id) {
          repairResult.repairsAttempted++;
          const repairSuccess = await this.repairMissingRecipe(product, storeId);
          
          if (repairSuccess.success) {
            repairResult.repairsSuccessful++;
            repairResult.repairLog.push({
              productId: product.id,
              productName: product.name,
              issueType: 'missing_recipe',
              repairAction: 'Created new recipe with template association',
              success: true
            });
          } else {
            repairResult.repairsFailed++;
            repairResult.repairLog.push({
              productId: product.id,
              productName: product.name,
              issueType: 'missing_recipe',
              repairAction: 'Attempted to create recipe',
              success: false,
              error: repairSuccess.error
            });
          }
        }
        
        // Repair Case 2: Recipe missing template
        else if (recipe && !recipe.template_id) {
          repairResult.repairsAttempted++;
          const repairSuccess = await this.repairMissingTemplate(product, recipe);
          
          if (repairSuccess.success) {
            repairResult.repairsSuccessful++;
            repairResult.repairLog.push({
              productId: product.id,
              productName: product.name,
              issueType: 'missing_template',
              repairAction: 'Associated recipe with matching template',
              success: true
            });
          } else {
            repairResult.repairsFailed++;
            repairResult.repairLog.push({
              productId: product.id,
              productName: product.name,
              issueType: 'missing_template',
              repairAction: 'Attempted template association',
              success: false,
              error: repairSuccess.error
            });
          }
        }
        
        // Repair Case 3: Template inactive
        else if (recipe?.recipe_templates && !recipe.recipe_templates.is_active) {
          repairResult.repairsAttempted++;
          const repairSuccess = await this.repairInactiveTemplate(product, recipe);
          
          if (repairSuccess.success) {
            repairResult.repairsSuccessful++;
            repairResult.repairLog.push({
              productId: product.id,
              productName: product.name,
              issueType: 'inactive_template',
              repairAction: 'Found and associated active template',
              success: true
            });
          } else {
            repairResult.repairsFailed++;
            repairResult.unresolvedIssues.push(`${product.name}: No active template available`);
            repairResult.repairLog.push({
              productId: product.id,
              productName: product.name,
              issueType: 'inactive_template',
              repairAction: 'Searched for active template',
              success: false,
              error: repairSuccess.error
            });
          }
        }
      }

      console.log(`🔧 Auto-repair completed for store ${storeId}:`, {
        attempted: repairResult.repairsAttempted,
        successful: repairResult.repairsSuccessful,
        failed: repairResult.repairsFailed,
        unresolved: repairResult.unresolvedIssues.length
      });

      return repairResult;

    } catch (error) {
      console.error('Error during auto-repair:', error);
      repairResult.unresolvedIssues.push(`Auto-repair failed: ${error}`);
      return repairResult;
    }
  }

  /**
   * Schedule automatic monitoring and repair
   */
  static async scheduleProactiveMonitoring(intervalMinutes: number = 30): Promise<void> {
    console.log(`📅 Scheduling proactive monitoring every ${intervalMinutes} minutes`);
    
    const runMonitoring = async () => {
      try {
        const healthMetrics = await this.getGlobalSyncHealth();
        
        // Auto-repair stores with health below 80%
        const criticalStores = healthMetrics.filter(m => m.syncHealthPercentage < 80);
        
        for (const store of criticalStores) {
          console.log(`🚨 Critical sync health detected for ${store.storeName} (${store.syncHealthPercentage}%)`);
          
          const repairResult = await this.attemptAutoRepair(store.storeId);
          
          if (repairResult.repairsSuccessful > 0) {
            console.log(`✅ Auto-repair improved sync for ${store.storeName}: ${repairResult.repairsSuccessful} fixes applied`);
          }
        }
        
        // Log overall health status
        const averageHealth = this.calculateAverageHealth(healthMetrics);
        console.log(`📊 System-wide inventory sync health: ${averageHealth}%`);
        
      } catch (error) {
        console.error('Error in scheduled monitoring:', error);
      }
    };

    // Run immediately
    await runMonitoring();
    
    // Schedule recurring runs
    setInterval(runMonitoring, intervalMinutes * 60 * 1000);
  }

  // Helper methods
  private static async repairMissingRecipe(product: any, storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find matching template with exact name match first
      let { data: template } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .ilike('name', product.name)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // If no exact match, try fuzzy matching for common variations
      if (!template) {
        const { data: templates } = await supabase
          .from('recipe_templates')
          .select('id, name')
          .eq('is_active', true);

        if (templates) {
          // Try to find similar names (case insensitive partial matches)
          const productNameLower = product.name.toLowerCase();
          template = templates.find(t => {
            const templateNameLower = t.name.toLowerCase();
            return templateNameLower.includes(productNameLower) || 
                   productNameLower.includes(templateNameLower) ||
                   this.calculateSimilarity(productNameLower, templateNameLower) > 0.7;
          });
        }
      }

      if (!template) {
        // List available templates for debugging
        const { data: availableTemplates } = await supabase
          .from('recipe_templates')
          .select('name')
          .eq('is_active', true)
          .limit(10);
        
        const availableNames = availableTemplates?.map(t => t.name).join(', ') || 'None';
        return { 
          success: false, 
          error: `No matching template found for "${product.name}". Available templates: ${availableNames}` 
        };
      }

      // Create recipe
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: product.name,
          store_id: storeId,
          template_id: template.id,
          is_active: true,
          serving_size: 1,
          total_cost: 0,
          cost_per_serving: 0
        })
        .select('id')
        .single();

      if (recipeError || !newRecipe) {
        return { success: false, error: `Failed to create recipe: ${recipeError?.message}` };
      }

      // Link product to recipe
      const { error: updateError } = await supabase
        .from('products')
        .update({ recipe_id: newRecipe.id })
        .eq('id', product.id);

      if (updateError) {
        return { success: false, error: `Failed to link recipe: ${updateError.message}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Repair failed: ${error}` };
    }
  }

  private static async repairMissingTemplate(product: any, recipe: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Find matching template with exact name match first
      let { data: template } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .ilike('name', product.name)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // If no exact match, try fuzzy matching
      if (!template) {
        const { data: templates } = await supabase
          .from('recipe_templates')
          .select('id, name')
          .eq('is_active', true);

        if (templates) {
          const productNameLower = product.name.toLowerCase();
          template = templates.find(t => {
            const templateNameLower = t.name.toLowerCase();
            return templateNameLower.includes(productNameLower) || 
                   productNameLower.includes(templateNameLower) ||
                   this.calculateSimilarity(productNameLower, templateNameLower) > 0.7;
          });
        }
      }

      if (!template) {
        return { 
          success: false, 
          error: `No matching template found for "${product.name}"` 
        };
      }

      // Update recipe with template
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ template_id: template.id })
        .eq('id', recipe.id);

      if (updateError) {
        return { success: false, error: `Failed to update recipe: ${updateError.message}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Repair failed: ${error}` };
    }
  }

  private static async repairInactiveTemplate(product: any, recipe: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Find active template with same name
      let { data: activeTemplate } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .ilike('name', product.name)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // Try fuzzy matching if exact match not found
      if (!activeTemplate) {
        const { data: templates } = await supabase
          .from('recipe_templates')
          .select('id, name')
          .eq('is_active', true);

        if (templates) {
          const productNameLower = product.name.toLowerCase();
          activeTemplate = templates.find(t => {
            const templateNameLower = t.name.toLowerCase();
            return templateNameLower.includes(productNameLower) || 
                   productNameLower.includes(templateNameLower) ||
                   this.calculateSimilarity(productNameLower, templateNameLower) > 0.7;
          });
        }
      }

      if (!activeTemplate) {
        return { success: false, error: 'No active template available' };
      }

      // Update recipe with active template
      const { error: updateError } = await supabase
        .from('recipes')
        .update({ template_id: activeTemplate.id })
        .eq('id', recipe.id);

      if (updateError) {
        return { success: false, error: `Failed to update recipe: ${updateError.message}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Repair failed: ${error}` };
    }
  }

  private static createEmptyHealthMetrics(storeId: string, storeName: string): SyncHealthMetrics {
    return {
      storeId,
      storeName,
      totalProducts: 0,
      validProducts: 0,
      invalidProducts: 0,
      syncHealthPercentage: 0,
      criticalIssues: ['Unable to fetch store data'],
      warnings: [],
      lastChecked: new Date().toISOString(),
      trends: { improving: false, deteriorating: true, stable: false }
    };
  }

  private static calculateAverageHealth(metrics: SyncHealthMetrics[]): number {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, m) => sum + m.syncHealthPercentage, 0);
    return Math.round(total / metrics.length);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(len1, len2);
    return 1 - (matrix[len1][len2] / maxLen);
  }
}