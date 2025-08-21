import { supabase } from "@/integrations/supabase/client";
import { TemplateRecipeSyncEngine } from "../recipeSync/templateRecipeSyncEngine";
import { IntelligentValidationService } from "../inventory/intelligentValidationService";
import { AutoRepairService } from "../selfHealing/autoRepairService";
import { TransactionIntegrityService } from "../crossSystem/transactionIntegrityService";
import { toast } from "sonner";

/**
 * Master Control Service
 * Orchestrates all architectural components and provides unified API
 */
export class MasterControlService {
  
  /**
   * Initialize the complete architectural system
   */
  static async initializeArchitecture(): Promise<boolean> {
    try {
      console.log('🏗️ Initializing comprehensive architecture...');
      
      // Phase 1: Start automatic health monitoring
      await AutoRepairService.scheduleAutomaticHealthChecks();
      
      // Phase 2: Run initial system repair
      const initialRepair = await AutoRepairService.runSystemHealthCheck();
      
      if (initialRepair.totalIssues > 0) {
        console.log(`🔧 Found ${initialRepair.totalIssues} issues, ${initialRepair.resolved} auto-fixed`);
        
        if (initialRepair.failed > 0) {
          toast.warning(`System initialized but ${initialRepair.failed} issues need manual attention`);
        }
      }
      
      console.log('✅ Architecture initialization complete');
      return true;
    } catch (error) {
      console.error('❌ Architecture initialization failed:', error);
      toast.error('Failed to initialize system architecture');
      return false;
    }
  }
  
  /**
   * Process a complete sale with full architectural integrity
   */
  static async processSaleWithIntegrity(
    transactionId: string,
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>,
    storeId: string
  ) {
    console.log('💰 Processing sale with full architectural integrity...');
    
    // Use the transaction integrity service for complete processing
    const result = await TransactionIntegrityService.processIntegratedSale(
      transactionId,
      items,
      storeId
    );
    
    if (result.success) {
      toast.success('Sale processed with full system integrity');
    } else {
      toast.error(`Sale failed: ${result.errors.join(', ')}`);
      
      if (result.rollbackRequired) {
        toast.info('System performed automatic rollback');
      }
    }
    
    return result;
  }
  
  /**
   * Get products that are safe to sell (fully validated)
   */
  static async getSafeProducts(storeId: string) {
    console.log('🛡️ Getting products with full validation...');
    
    const result = await IntelligentValidationService.getSellableProducts(storeId);
    
    console.log(`📊 Validation summary:`, result.validationSummary);
    
    return result;
  }
  
  /**
   * Sync a specific template to all stores
   */
  static async syncTemplateGlobally(templateId: string) {
    console.log('🌐 Syncing template globally...');
    
    const success = await TemplateRecipeSyncEngine.syncTemplateToAllRecipes(templateId);
    
    if (success) {
      toast.success('Template synchronized across all stores');
    } else {
      toast.error('Template synchronization failed');
    }
    
    return success;
  }
  
  /**
   * Run emergency repair for critical issues
   */
  static async emergencyRepair(storeId: string) {
    console.log('🚨 Running emergency repair...');
    
    toast.info('Emergency repair in progress...');
    
    const report = await AutoRepairService.emergencyRepair(storeId);
    
    if (report.resolved > 0) {
      toast.success(`Emergency repair completed: ${report.resolved} issues fixed`);
    } else {
      toast.warning('Emergency repair found no fixable issues');
    }
    
    return report;
  }
  
  /**
   * Validate and fix a specific product's availability
   */
  static async validateAndFixProduct(productId: string) {
    console.log('🔍 Validating and fixing product:', productId);
    
    // First validate the product
    const validation = await IntelligentValidationService.validateProductForPOS(productId);
    
    if (validation.canSell) {
      toast.success('Product is ready for sale');
      return { valid: true, validation };
    }
    
    // Try to fix issues
    let fixed = false;
    
    if (validation.missingIngredients.length > 0) {
      // Get product's store ID to auto-repair inventory
      const { data: product } = await supabase
        .from('product_catalog')
        .select('store_id')
        .eq('id', productId)
        .single();
        
      if (product) {
        const repairResult = await IntelligentValidationService.autoRepairMissingInventory(product.store_id);
        
        if (repairResult.created > 0) {
          // Re-validate after repair
          const revalidation = await IntelligentValidationService.validateProductForPOS(productId);
          if (revalidation.canSell) {
            fixed = true;
            toast.success(`Product fixed: ${repairResult.created} inventory items created`);
          }
        }
      }
    }
    
    if (!fixed) {
      toast.warning('Product validation failed - manual intervention required');
    }
    
    return { 
      valid: fixed, 
      validation,
      repairAttempted: validation.missingIngredients.length > 0
    };
  }
  
  /**
   * Get comprehensive system health report
   */
  static async getSystemHealthReport(storeId?: string) {
    console.log('📊 Generating system health report...');
    
    const healthReport = await AutoRepairService.runSystemHealthCheck(storeId);
    
    // Also get validation summary if store specified
    let validationSummary = null;
    if (storeId) {
      const products = await IntelligentValidationService.getSellableProducts(storeId);
      validationSummary = products.validationSummary;
    }
    
    return {
      healthReport,
      validationSummary,
      timestamp: new Date().toISOString()
    };
  }
}

// Export for easy access
export const masterControl = MasterControlService;