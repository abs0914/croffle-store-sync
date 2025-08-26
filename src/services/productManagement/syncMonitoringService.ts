import { supabase } from "@/integrations/supabase/client";
import { unifiedProductService } from "./unifiedProductService";
import { toast } from "sonner";

export interface SyncReport {
  storeId: string;
  storeName: string;
  totalProducts: number;
  syncIssues: number;
  lastChecked: Date;
  issues: Array<{
    productName: string;
    recipeId: string;
    mismatches: Array<{
      field: string;
      catalogValue: any;
      productsValue: any;
    }>;
  }>;
}

export interface AutoSyncConfig {
  enabled: boolean;
  intervalMinutes: number;
  autoRepair: boolean;
  notifyOnConflicts: boolean;
}

export const syncMonitoringService = {
  // Generate comprehensive sync report for a store
  async generateSyncReport(storeId: string): Promise<SyncReport> {
    try {
      // Get store info
      const { data: store } = await supabase
        .from('stores')
        .select('name')
        .eq('id', storeId)
        .single();

      // Get all products in store
      const { data: catalogProducts } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('store_id', storeId);

      const totalProducts = catalogProducts?.length || 0;
      const issues: SyncReport['issues'] = [];

      // Check sync for each product
      if (catalogProducts) {
        for (const product of catalogProducts) {
          if (product.recipe_id) {
            const validation = await unifiedProductService.validateSync(
              storeId, 
              product.recipe_id
            );

            if (!validation.isInSync && validation.mismatches.length > 0) {
              issues.push({
                productName: product.product_name,
                recipeId: product.recipe_id,
                mismatches: validation.mismatches
              });
            }
          }
        }
      }

      return {
        storeId,
        storeName: store?.name || 'Unknown Store',
        totalProducts,
        syncIssues: issues.length,
        lastChecked: new Date(),
        issues
      };
    } catch (error) {
      console.error('Failed to generate sync report:', error);
      throw error;
    }
  },

  // Generate reports for all stores
  async generateAllStoresReport(): Promise<SyncReport[]> {
    try {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('is_active', true);

      if (!stores) return [];

      const reports = await Promise.all(
        stores.map(store => this.generateSyncReport(store.id))
      );

      return reports;
    } catch (error) {
      console.error('Failed to generate all stores report:', error);
      return [];
    }
  },

  // Auto-repair sync issues for a store
  async autoRepairStore(storeId: string): Promise<{
    success: boolean;
    repairedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    try {
      const report = await this.generateSyncReport(storeId);
      let repairedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const issue of report.issues) {
        try {
          const result = await unifiedProductService.repairSync(
            storeId, 
            issue.recipeId
          );

          if (result.success) {
            repairedCount++;
          } else {
            failedCount++;
            if (result.conflicts) {
              errors.push(...result.conflicts);
            }
          }
        } catch (error) {
          failedCount++;
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      if (repairedCount > 0) {
        toast.success(`Repaired ${repairedCount} sync issues`);
      }
      
      if (failedCount > 0) {
        toast.error(`Failed to repair ${failedCount} sync issues`);
      }

      return {
        success: failedCount === 0,
        repairedCount,
        failedCount,
        errors
      };
    } catch (error) {
      console.error('Auto repair failed:', error);
      return {
        success: false,
        repairedCount: 0,
        failedCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  },

  // Validate recipe cost propagation
  async validateRecipeCostPropagation(recipeId: string): Promise<{
    isValid: boolean;
    issues: Array<{
      table: string;
      issue: string;
      expectedValue: any;
      actualValue: any;
    }>;
  }> {
    try {
      // Get recipe data
      const { data: recipe } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (!recipe) {
        return {
          isValid: false,
          issues: [{ table: 'recipes', issue: 'Recipe not found', expectedValue: null, actualValue: null }]
        };
      }

      // Get product catalog entries
      const { data: catalogEntries } = await supabase
        .from('product_catalog')
        .select('*')
        .eq('recipe_id', recipeId);

      // Get products entries
      const { data: productEntries } = await supabase
        .from('products')
        .select('*')
        .eq('recipe_id', recipeId);

      const issues: Array<{
        table: string;
        issue: string;
        expectedValue: any;
        actualValue: any;
      }> = [];

      // Expected price based on recipe cost
      const expectedPrice = recipe.suggested_price || (recipe.total_cost * 1.5);

      // Check product catalog prices
      catalogEntries?.forEach((catalog, index) => {
        if (Math.abs((catalog.price || 0) - expectedPrice) > 0.01) {
          issues.push({
            table: 'product_catalog',
            issue: `Price mismatch in catalog entry ${index + 1}`,
            expectedValue: expectedPrice,
            actualValue: catalog.price
          });
        }
      });

      // Check products table prices
      productEntries?.forEach((product, index) => {
        if (Math.abs((product.price || 0) - expectedPrice) > 0.01) {
          issues.push({
            table: 'products',
            issue: `Price mismatch in products entry ${index + 1}`,
            expectedValue: expectedPrice,
            actualValue: product.price
          });
        }
        
        if (Math.abs((product.cost || 0) - (recipe.total_cost || 0)) > 0.01) {
          issues.push({
            table: 'products',
            issue: `Cost mismatch in products entry ${index + 1}`,
            expectedValue: recipe.total_cost,
            actualValue: product.cost
          });
        }
      });

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Recipe cost validation failed:', error);
      return {
        isValid: false,
        issues: [{ 
          table: 'validation', 
          issue: 'Validation failed', 
          expectedValue: null, 
          actualValue: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
    }
  },

  // Schedule periodic sync validation
  schedulePeriodicValidation(config: AutoSyncConfig): () => void {
    if (!config.enabled) {
      return () => {};
    }

    const intervalId = setInterval(async () => {
      try {
        const reports = await this.generateAllStoresReport();
        const storesWithIssues = reports.filter(r => r.syncIssues > 0);

        if (storesWithIssues.length > 0 && config.notifyOnConflicts) {
          const totalIssues = storesWithIssues.reduce((sum, r) => sum + r.syncIssues, 0);
          toast.warning(`Found ${totalIssues} sync issues across ${storesWithIssues.length} stores`);

          if (config.autoRepair) {
            // Auto-repair issues
            for (const store of storesWithIssues) {
              await this.autoRepairStore(store.storeId);
            }
          }
        }
      } catch (error) {
        console.error('Periodic validation failed:', error);
        if (config.notifyOnConflicts) {
          toast.error('Sync validation failed - check console for details');
        }
      }
    }, config.intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }
};