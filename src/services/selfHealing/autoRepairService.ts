import { supabase } from "@/integrations/supabase/client";
import { TemplateRecipeSyncEngine } from "../recipeSync/templateRecipeSyncEngine";
import { IntelligentValidationService } from "../inventory/intelligentValidationService";
import { toast } from "sonner";

export interface RepairReport {
  timestamp: string;
  storeId?: string;
  totalIssues: number;
  resolved: number;
  failed: number;
  details: {
    templateSync: { detected: number; repaired: number; failed: number };
    missingInventory: { created: number; failed: number };
    orphanedRecipes: { linked: number; failed: number };
    catalogSync: { updated: number; failed: number };
  };
}

/**
 * Self-Healing Architecture Service
 * Automatically detects and repairs system inconsistencies
 */
export class AutoRepairService {
  
  /**
   * Run comprehensive system health check and auto-repair
   */
  static async runSystemHealthCheck(storeId?: string): Promise<RepairReport> {
    const startTime = new Date().toISOString();
    console.log('🩺 Starting comprehensive system health check...', { storeId });
    
    const report: RepairReport = {
      timestamp: startTime,
      storeId,
      totalIssues: 0,
      resolved: 0,
      failed: 0,
      details: {
        templateSync: { detected: 0, repaired: 0, failed: 0 },
        missingInventory: { created: 0, failed: 0 },
        orphanedRecipes: { linked: 0, failed: 0 },
        catalogSync: { updated: 0, failed: 0 }
      }
    };
    
    try {
      // Phase 1: Template-Recipe Synchronization
      console.log('🔄 Phase 1: Checking template-recipe sync...');
      const syncResults = await TemplateRecipeSyncEngine.detectAndRepairSyncDrift();
      report.details.templateSync = {
        detected: syncResults.driftDetected,
        repaired: syncResults.repaired,
        failed: syncResults.failed
      };
      report.totalIssues += syncResults.driftDetected;
      report.resolved += syncResults.repaired;
      report.failed += syncResults.failed;
      
      // Phase 2: Missing Inventory Items
      if (storeId) {
        console.log('📦 Phase 2: Checking missing inventory items...');
        const inventoryResults = await IntelligentValidationService.autoRepairMissingInventory(storeId);
        report.details.missingInventory = {
          created: inventoryResults.created,
          failed: inventoryResults.failed
        };
        report.totalIssues += inventoryResults.created + inventoryResults.failed;
        report.resolved += inventoryResults.created;
        report.failed += inventoryResults.failed;
      }
      
      // Phase 3: Orphaned Recipes (recipes without templates)
      console.log('🔗 Phase 3: Linking orphaned recipes to templates...');
      const orphanResults = await this.linkOrphanedRecipesToTemplates(storeId);
      report.details.orphanedRecipes = orphanResults;
      report.totalIssues += orphanResults.linked + orphanResults.failed;
      report.resolved += orphanResults.linked;
      report.failed += orphanResults.failed;
      
      // Phase 4: Product Catalog Sync
      console.log('📋 Phase 4: Syncing product catalog availability...');
      const catalogResults = await this.syncProductCatalogAvailability(storeId);
      report.details.catalogSync = catalogResults;
      report.totalIssues += catalogResults.updated + catalogResults.failed;
      report.resolved += catalogResults.updated;
      report.failed += catalogResults.failed;
      
      console.log('✅ System health check completed:', report);
      
      // Send notification about results
      if (report.resolved > 0) {
        toast.success(`Auto-repair completed: ${report.resolved} issues fixed`);
      }
      
      if (report.failed > 0) {
        toast.warning(`${report.failed} issues require manual attention`);
      }
      
      return report;
    } catch (error) {
      console.error('❌ System health check failed:', error);
      report.failed = report.totalIssues;
      report.resolved = 0;
      return report;
    }
  }
  
  /**
   * Link orphaned recipes (without templates) to matching templates
   */
  private static async linkOrphanedRecipesToTemplates(storeId?: string): Promise<{
    linked: number;
    failed: number;
  }> {
    try {
      // Find recipes without templates
      let query = supabase
        .from('recipes')
        .select('id, name, store_id')
        .is('template_id', null)
        .eq('is_active', true);
        
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data: orphanedRecipes, error } = await query;
      
      if (error) throw error;
      
      let linked = 0;
      let failed = 0;
      
      for (const recipe of orphanedRecipes || []) {
        try {
          // Find matching template by name
          const { data: matchingTemplate } = await supabase
            .from('recipe_templates')
            .select('id')
            .ilike('name', recipe.name)
            .eq('is_active', true)
            .single();
            
          if (matchingTemplate) {
            // Link recipe to template
            const { error: updateError } = await supabase
              .from('recipes')
              .update({
                template_id: matchingTemplate.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', recipe.id);
              
            if (updateError) {
              failed++;
            } else {
              linked++;
              // Sync the recipe with its new template
              await TemplateRecipeSyncEngine.syncRecipeWithTemplate(recipe.id);
            }
          }
        } catch (error) {
          console.error(`Failed to link recipe ${recipe.name}:`, error);
          failed++;
        }
      }
      
      return { linked, failed };
    } catch (error) {
      console.error('Failed to link orphaned recipes:', error);
      return { linked: 0, failed: 0 };
    }
  }
  
  /**
   * Sync product catalog availability based on ingredient availability
   */
  private static async syncProductCatalogAvailability(storeId?: string): Promise<{
    updated: number;
    failed: number;
  }> {
    try {
      let query = supabase
        .from('product_catalog')
        .select('id, store_id, is_available');
        
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data: products, error } = await query;
      
      if (error) throw error;
      
      let updated = 0;
      let failed = 0;
      
      for (const product of products || []) {
        try {
          // Validate product availability
          const validation = await IntelligentValidationService.validateProductForPOS(product.id);
          
          // Update availability if it doesn't match validation
          if (product.is_available !== validation.canSell) {
            const { error: updateError } = await supabase
              .from('product_catalog')
              .update({
                is_available: validation.canSell,
                updated_at: new Date().toISOString()
              })
              .eq('id', product.id);
              
            if (updateError) {
              failed++;
            } else {
              updated++;
            }
          }
        } catch (error) {
          console.error(`Failed to sync product ${product.id}:`, error);
          failed++;
        }
      }
      
      return { updated, failed };
    } catch (error) {
      console.error('Failed to sync catalog availability:', error);
      return { updated: 0, failed: 0 };
    }
  }
  
  /**
   * Schedule automatic health checks
   */
  static async scheduleAutomaticHealthChecks(): Promise<void> {
    console.log('📅 Scheduling automatic health checks...');
    
    // Run health check every 30 minutes
    const interval = 30 * 60 * 1000; // 30 minutes
    
    setInterval(async () => {
      try {
        console.log('🤖 Running scheduled health check...');
        await this.runSystemHealthCheck();
      } catch (error) {
        console.error('Scheduled health check failed:', error);
      }
    }, interval);
    
    // Also run an immediate check
    setTimeout(() => {
      this.runSystemHealthCheck();
    }, 5000); // 5 seconds after startup
  }
  
  /**
   * Emergency repair mode - more aggressive fixing
   */
  static async emergencyRepair(storeId: string): Promise<RepairReport> {
    console.log('🚨 Running emergency repair for store:', storeId);
    
    // First run standard health check
    const standardReport = await this.runSystemHealthCheck(storeId);
    
    // If issues remain, try more aggressive fixes
    if (standardReport.failed > 0) {
      console.log('🔧 Attempting aggressive repairs...');
      
      try {
        // Force recreate all missing inventory items
        await this.forceRecreateInventoryStructure(storeId);
        
        // Force sync all recipes in the store
        await this.forceSyncAllStoreRecipes(storeId);
        
        // Run health check again to see improvements
        const finalReport = await this.runSystemHealthCheck(storeId);
        
        toast.info('Emergency repair completed - check system status');
        
        return finalReport;
      } catch (error) {
        console.error('Emergency repair failed:', error);
        toast.error('Emergency repair failed - manual intervention required');
        return standardReport;
      }
    }
    
    return standardReport;
  }
  
  /**
   * Force recreate inventory structure for a store
   */
  private static async forceRecreateInventoryStructure(storeId: string): Promise<void> {
    // Get all active recipe ingredients for this store
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        recipes!inner(store_id),
        commissary_inventory(*)
      `)
      .eq('recipes.store_id', storeId);
    
    const uniqueIngredients = new Map();
    
    for (const ingredient of ingredients || []) {
      const key = `${ingredient.commissary_inventory?.name}-${ingredient.unit}`;
      if (!uniqueIngredients.has(key)) {
        uniqueIngredients.set(key, {
          name: ingredient.commissary_inventory?.name,
          unit: ingredient.unit,
          cost: ingredient.cost_per_unit
        });
      }
    }
    
    // Create missing inventory items
    for (const [_, ingredientData] of uniqueIngredients) {
      await supabase
        .from('inventory_stock')
        .upsert({
          store_id: storeId,
          item: ingredientData.name,
          unit: ingredientData.unit,
          stock_quantity: 0,
          cost: ingredientData.cost,
          is_active: true,
          minimum_threshold: 10
        }, {
          onConflict: 'store_id,item,unit'
        });
    }
  }
  
  /**
   * Force sync all recipes in a store with their templates
   */
  private static async forceSyncAllStoreRecipes(storeId: string): Promise<void> {
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, template_id')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .not('template_id', 'is', null);
    
    for (const recipe of recipes || []) {
      await TemplateRecipeSyncEngine.syncRecipeWithTemplate(recipe.id);
    }
  }
}