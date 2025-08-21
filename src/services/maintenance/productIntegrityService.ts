import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AutomaticTemplateMatchingService } from "./automaticTemplateMatching";

export interface ProductIntegrityReport {
  totalProducts: number;
  productsWithCompleteTemplates: number;
  productsMissingTemplates: number;
  duplicatesRemoved: number;
  templatesFixed: number;
  orphanedProducts: number;
  completionPercentage: number;
}

export interface MaintenanceResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Service for maintaining product catalog integrity and consistency
 */
export class ProductIntegrityService {
  
  /**
   * Run comprehensive product integrity analysis
   */
  static async analyzeIntegrity(storeId?: string): Promise<ProductIntegrityReport> {
    try {
      // Get overall statistics using a more reliable query
      const { data: stats, error: statsError } = await supabase
        .rpc('get_recipe_repair_status');

      if (statsError) throw statsError;

      const repairData = stats?.[0];
      const totalProducts = repairData?.total_products || 0;
      const productsWithCompleteTemplates = repairData?.products_with_recipes || 0;
      const productsMissingTemplates = repairData?.products_missing_recipes || 0;
      
      // We already have repair status from the main query above
      const orphanedProducts = repairData?.orphaned_products || 0;

      return {
        totalProducts,
        productsWithCompleteTemplates,
        productsMissingTemplates,
        duplicatesRemoved: 0, // Will be populated after cleanup
        templatesFixed: 0, // Will be populated after template fix
        orphanedProducts,
        completionPercentage: totalProducts > 0 ? 
          Math.round((productsWithCompleteTemplates / totalProducts) * 100) : 100
      };
    } catch (error) {
      console.error('Integrity analysis failed:', error);
      throw new Error('Failed to analyze product integrity');
    }
  }

  /**
   * Remove duplicate product entries
   */
  static async removeDuplicates(): Promise<MaintenanceResult> {
    try {
      const { data: result, error } = await supabase
        .rpc('simple_duplicate_cleanup');

      if (error) {
        console.error('Duplicate cleanup failed:', error);
        return {
          success: false,
          message: `Cleanup failed: ${error.message}`
        };
      }

      return {
        success: true,
        message: result || 'Duplicate cleanup completed',
        details: { cleanupResult: result }
      };
    } catch (error) {
      console.error('Duplicate cleanup error:', error);
      return {
        success: false,
        message: 'Failed to remove duplicates'
      };
    }
  }

  /**
   * Fix missing recipe template associations
   */
  static async fixTemplateAssociations(): Promise<MaintenanceResult> {
    try {
      const { data: result, error } = await supabase
        .rpc('simple_template_fix');

      if (error) {
        console.error('Template fix failed:', error);
        return {
          success: false,
          message: `Template fix failed: ${error.message}`
        };
      }

      return {
        success: true,
        message: result || 'Template associations fixed',
        details: { fixResult: result }
      };
    } catch (error) {
      console.error('Template fix error:', error);
      return {
        success: false,
        message: 'Failed to fix template associations'
      };
    }
  }

  /**
   * Repair recipe template links using the advanced repair function
   */
  static async repairRecipeTemplateLinks(): Promise<MaintenanceResult> {
    try {
      const { data: results, error } = await supabase
        .rpc('repair_recipe_template_links');

      if (error) {
        console.error('Recipe repair failed:', error);
        return {
          success: false,
          message: `Recipe repair failed: ${error.message}`
        };
      }

      const actionCounts = results?.reduce((acc: any, result: any) => {
        acc[result.action_type] = (acc[result.action_type] || 0) + 1;
        return acc;
      }, {}) || {};

      const totalActions = results?.length || 0;
      const successCount = results?.filter((r: any) => r.success).length || 0;

      return {
        success: successCount === totalActions,
        message: `Recipe repair completed: ${successCount}/${totalActions} actions successful`,
        details: { 
          results, 
          actionCounts,
          summary: {
            linkedExistingRecipes: actionCounts['linked_existing_recipe'] || 0,
            createdMissingRecipes: actionCounts['created_missing_recipe'] || 0,
            createdBasicTemplates: actionCounts['created_basic_template'] || 0
          }
        }
      };
    } catch (error) {
      console.error('Recipe repair error:', error);
      return {
        success: false,
        message: 'Failed to repair recipe template links'
      };
    }
  }

  /**
   * Run automatic template matching (Phase 1)
   */
  static async runPhase1AutoMatching(): Promise<MaintenanceResult> {
    try {
      const result = await AutomaticTemplateMatchingService.runAutomaticMatching();
      return {
        success: result.success,
        message: result.message,
        details: {
          matched: result.matched,
          unmatched: result.unmatched,
          totalProcessed: result.totalProcessed,
          matchedCount: result.matchedCount
        }
      };
    } catch (error) {
      console.error('Phase 1 auto matching failed:', error);
      return {
        success: false,
        message: 'Automatic template matching failed'
      };
    }
  }

  /**
   * Run complete maintenance operation with 3-phase plan
   */
  static async runCompleteMaintenance(storeId?: string): Promise<{
    initialReport: ProductIntegrityReport;
    duplicateCleanup: MaintenanceResult;
    templateFix: MaintenanceResult;
    recipeRepair: MaintenanceResult;
    phase1AutoMatching: MaintenanceResult;
    finalReport: ProductIntegrityReport;
    overall: MaintenanceResult;
  }> {
    try {
      // Initial analysis
      console.log('🔍 Starting product integrity maintenance...');
      const initialReport = await this.analyzeIntegrity(storeId);
      
      // Step 1: Remove duplicates
      console.log('🧹 Removing duplicate products...');
      const duplicateCleanup = await this.removeDuplicates();
      
      // Step 2: Fix basic template associations
      console.log('🔧 Fixing template associations...');
      const templateFix = await this.fixTemplateAssociations();
      
      // Step 3: Advanced recipe repair
      console.log('⚡ Running advanced recipe repair...');
      const recipeRepair = await this.repairRecipeTemplateLinks();
      
      // Step 4: Run Phase 1 automatic matching (NEW)
      console.log('🎯 Running Phase 1 automatic template matching...');
      const phase1AutoMatching = await this.runPhase1AutoMatching();
      
      // Final analysis
      console.log('📊 Final integrity analysis...');
      const finalReport = await this.analyzeIntegrity(storeId);
      
      const improvementPercentage = finalReport.completionPercentage - initialReport.completionPercentage;
      const success = duplicateCleanup.success && templateFix.success && 
                     recipeRepair.success && phase1AutoMatching.success;
      
      const overall: MaintenanceResult = {
        success,
        message: success ? 
          `Maintenance completed successfully. Improved completion from ${initialReport.completionPercentage}% to ${finalReport.completionPercentage}% (+${improvementPercentage}%)` :
          'Maintenance completed with some issues. Check individual operation results.',
        details: {
          improvementPercentage,
          beforeAfter: {
            before: initialReport,
            after: finalReport
          },
          phase1Results: phase1AutoMatching.details
        }
      };

      return {
        initialReport,
        duplicateCleanup,
        templateFix,
        recipeRepair,
        phase1AutoMatching,
        finalReport,
        overall
      };
    } catch (error) {
      console.error('Complete maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Sync product catalog with products table to ensure consistency
   */
  static async syncCatalogConsistency(storeId: string): Promise<MaintenanceResult> {
    try {
      // Check for mismatches using a simpler query approach
      const { data: catalogItems, error: catalogError } = await supabase
        .from('product_catalog')
        .select('id, product_name, is_available, store_id')
        .eq('store_id', storeId);

      if (catalogError) throw catalogError;

      const { data: productItems, error: productError } = await supabase
        .from('products')
        .select('id, name, is_active, store_id')
        .eq('store_id', storeId);

      if (productError) throw productError;

      // Find mismatches manually
      const mismatches = catalogItems?.filter(catalog => {
        const matchingProduct = productItems?.find(product => 
          product.name === catalog.product_name
        );
        return matchingProduct && catalog.is_available !== matchingProduct.is_active;
      }) || [];

      // No error handling needed for the manual approach

      let fixedCount = 0;
      if (mismatches && mismatches.length > 0) {
        // Fix mismatches by updating product_catalog to match products
        for (const mismatch of mismatches) {
          const matchingProduct = productItems?.find(p => p.name === mismatch.product_name);
          if (matchingProduct) {
            const { error: updateError } = await supabase
              .from('product_catalog')
              .update({ 
                is_available: matchingProduct.is_active,
                updated_at: new Date().toISOString()
              })
              .eq('id', mismatch.id);

            if (!updateError) {
              fixedCount++;
            }
          }
        }
      }

      return {
        success: true,
        message: `Catalog sync completed. Fixed ${fixedCount} mismatches.`,
        details: { mismatches: mismatches?.length || 0, fixed: fixedCount }
      };
    } catch (error) {
      console.error('Catalog sync failed:', error);
      return {
        success: false,
        message: 'Failed to sync catalog consistency'
      };
    }
  }
}