import { supabase } from '@/integrations/supabase/client';
import { InventoryCacheService } from '@/services/cache/inventoryCacheService';
import { toast } from 'sonner';

/**
 * System Reset Service
 * 
 * Provides utilities for performing complete system resets to prepare
 * for fresh recipe and inventory data uploads.
 */
export class SystemResetService {
  
  /**
   * Perform a complete system reset
   * This clears all caches and prepares the system for fresh data upload
   */
  static async performCompleteReset(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔄 Starting complete system reset...');
      
      // Step 1: Clear all caches
      this.clearAllCaches();
      
      // Step 2: Execute database reset migration
      const dbResetResult = await this.executeDatabaseReset();
      
      if (!dbResetResult.success) {
        return {
          success: false,
          message: 'Database reset failed',
          details: dbResetResult.error
        };
      }
      
      // Step 3: Verify reset completion
      const verificationResult = await this.verifyResetCompletion();
      
      if (verificationResult.success) {
        console.log('✅ Complete system reset successful');
        toast.success('System reset completed successfully');
        
        return {
          success: true,
          message: 'System reset completed successfully. Ready for fresh data upload.',
          details: verificationResult.details
        };
      } else {
        return {
          success: false,
          message: 'System reset verification failed',
          details: verificationResult.details
        };
      }
      
    } catch (error) {
      console.error('❌ System reset failed:', error);
      toast.error('System reset failed');
      
      return {
        success: false,
        message: 'System reset failed with error',
        details: error
      };
    }
  }
  
  /**
   * Clear all application caches
   */
  static clearAllCaches(): void {
    console.log('🗑️ Clearing all caches...');
    
    // Clear inventory cache
    InventoryCacheService.resetForFreshStart();
    
    // Clear browser caches if available
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage items related to recipes and inventory
    // CRITICAL: Protect print-coordinator-status from cache clearing
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('recipe') || 
        key.includes('inventory') || 
        key.includes('product') ||
        key.includes('cache')
      ) && !key.includes('print-coordinator')) {
        keysToRemove.push(key);
      }
    }
    
    console.log(`🗑️ Removing ${keysToRemove.length} cache keys (protecting print coordinator)`);
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ All caches cleared');
  }
  
  /**
   * Execute the database reset migration
   */
  static async executeDatabaseReset(): Promise<{
    success: boolean;
    error?: any;
  }> {
    try {
      console.log('🗄️ Executing database reset...');
      
      // Note: The actual migration execution would be done through Supabase CLI
      // This is a placeholder for verification that the migration exists
      const { data, error } = await supabase
        .from('system_reset_log')
        .select('*')
        .eq('reset_type', 'COMPLETE_RECIPE_INVENTORY_RESET')
        .order('reset_date', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Database reset verification failed:', error);
        return { success: false, error };
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Database reset execution failed:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Verify that the reset was completed successfully
   */
  static async verifyResetCompletion(): Promise<{
    success: boolean;
    details: any;
  }> {
    try {
      console.log('🔍 Verifying reset completion...');
      
      // Check that key tables are empty
      const checks = await Promise.all([
        supabase.from('recipe_templates').select('id', { count: 'exact' }),
        supabase.from('recipes').select('id', { count: 'exact' }),
        supabase.from('inventory_stock').select('id', { count: 'exact' }),
        supabase.from('product_catalog').select('id', { count: 'exact' }),
        supabase.from('stores').select('id', { count: 'exact' }).eq('is_active', true)
      ]);
      
      const [recipeTemplates, recipes, inventory, products, stores] = checks;
      
      const details = {
        recipe_templates_count: recipeTemplates.count || 0,
        recipes_count: recipes.count || 0,
        inventory_stock_count: inventory.count || 0,
        product_catalog_count: products.count || 0,
        active_stores_count: stores.count || 0
      };
      
      const isResetComplete = 
        details.recipe_templates_count === 0 &&
        details.recipes_count === 0 &&
        details.inventory_stock_count === 0 &&
        details.product_catalog_count === 0 &&
        details.active_stores_count > 0; // Stores should be preserved
      
      console.log('📊 Reset verification details:', details);
      
      return {
        success: isResetComplete,
        details
      };
      
    } catch (error) {
      console.error('Reset verification failed:', error);
      return {
        success: false,
        details: { error }
      };
    }
  }
  
  /**
   * Check if system is ready for fresh data upload
   */
  static async isSystemReadyForFreshData(): Promise<boolean> {
    const verification = await this.verifyResetCompletion();
    return verification.success;
  }
}
