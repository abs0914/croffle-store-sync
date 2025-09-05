import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SystemHealthStatus {
  store_name: string;
  store_id: string;
  total_recipes: number;
  recipes_with_ingredients: number;
  recipes_without_ingredients: number;
  total_ingredients: number;
  mapped_ingredients: number;
  unmapped_ingredients: number;
  health_score: number;
}

export interface RepairResult {
  recipes_fixed: number;
  ingredients_added: number;
  execution_details: {
    fixed_recipes: Array<{
      recipe_name: string;
      store_name: string;
      template_ingredients: number;
      had_ingredients: number;
      ingredients_added: number;
    }>;
    summary: {
      total_recipes_fixed: number;
      total_ingredients_added: number;
      completion_rate: string;
    };
  };
}

export interface MappingResult {
  mappings_created: number;
  stores_processed: number;
  mapping_details: {
    mappings_created: Array<{
      store_name: string;
      recipe_name: string;
      ingredient_name: string;
      inventory_item: string;
      match_score?: number;
    }>;
    summary: {
      total_mappings: number;
      stores_processed: number;
    };
  };
}

export const inventorySystemRepairService = {
  // Check overall system health
  async getSystemHealth(): Promise<SystemHealthStatus[]> {
    try {
      const { data, error } = await supabase.rpc('monitor_inventory_system_health');
      
      if (error) {
        console.error('Error checking system health:', error);
        toast.error('Failed to check system health');
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getSystemHealth:', error);
      toast.error('Failed to check system health');
      return [];
    }
  },

  // Execute system-wide recipe ingredient repair
  async repairRecipeIngredients(): Promise<RepairResult | null> {
    try {
      toast.info('Starting system-wide recipe ingredient repair...');
      
      const { data, error } = await supabase.rpc('fix_recipe_ingredients_with_proper_units');
      
      if (error) {
        console.error('Error repairing recipe ingredients:', error);
        toast.error('Failed to repair recipe ingredients');
        return null;
      }
      
      const result = data?.[0] as RepairResult;
      
      if (result) {
        toast.success(
          `✅ Repair Complete! Fixed ${result.recipes_fixed} recipes with ${result.ingredients_added} ingredients`
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error in repairRecipeIngredients:', error);
      toast.error('Failed to repair recipe ingredients');
      return null;
    }
  },

  // Create ingredient to inventory mappings
  async createInventoryMappings(): Promise<MappingResult | null> {
    try {
      toast.info('Creating inventory mappings...');
      
      const { data, error } = await supabase.rpc('create_advanced_inventory_mappings');
      
      if (error) {
        console.error('Error creating inventory mappings:', error);
        toast.error('Failed to create inventory mappings');
        return null;
      }
      
      const result = data?.[0] as MappingResult;
      
      if (result) {
        toast.success(
          `✅ Mappings Created! ${result.mappings_created} mappings across ${result.stores_processed} stores`
        );
      }
      
      return result;
    } catch (error) {
      console.error('Error in createInventoryMappings:', error);
      toast.error('Failed to create inventory mappings');
      return null;
    }
  },

  // Execute complete system repair (Phase 1)
  async executeCompleteRepair(): Promise<{
    ingredientRepair: RepairResult | null;
    mappingResult: MappingResult | null;
    healthBefore: SystemHealthStatus[];
    healthAfter: SystemHealthStatus[];
  }> {
    try {
      // Get health before repair
      const healthBefore = await this.getSystemHealth();
      
      // Execute ingredient repair
      const ingredientRepair = await this.repairRecipeIngredients();
      
      // Create inventory mappings
      const mappingResult = await this.createInventoryMappings();
      
      // Get health after repair
      const healthAfter = await this.getSystemHealth();
      
      return {
        ingredientRepair,
        mappingResult,
        healthBefore,
        healthAfter
      };
    } catch (error) {
      console.error('Error in executeCompleteRepair:', error);
      toast.error('Failed to execute complete repair');
      return {
        ingredientRepair: null,
        mappingResult: null,
        healthBefore: [],
        healthAfter: []
      };
    }
  },

  // Get transactions that need inventory correction since a specific date
  async getUnprocessedTransactions(sinceDate: string = '2025-08-26'): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          receipt_number,
          store_id,
          total,
          created_at,
          stores!inner(name),
          transaction_items(name, quantity)
        `)
        .gte('created_at', sinceDate)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting unprocessed transactions:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getUnprocessedTransactions:', error);
      return [];
    }
  },

  // Calculate inventory impact for historical transactions
  async calculateInventoryImpact(transactions: any[]): Promise<{
    totalTransactions: number;
    totalItems: number;
    impactByStore: Record<string, any>;
    impactByIngredient: Record<string, number>;
  }> {
    try {
      const impactByStore: Record<string, any> = {};
      const impactByIngredient: Record<string, number> = {};
      let totalItems = 0;
      
      for (const transaction of transactions) {
        const storeName = transaction.stores.name;
        if (!impactByStore[storeName]) {
          impactByStore[storeName] = {
            transactionCount: 0,
            itemCount: 0,
            totalValue: 0
          };
        }
        
        impactByStore[storeName].transactionCount++;
        impactByStore[storeName].totalValue += transaction.total;
        
        for (const item of transaction.transaction_items) {
          impactByStore[storeName].itemCount += item.quantity;
          totalItems += item.quantity;
          
          // Estimate ingredient impact (this would need recipe lookup in real implementation)
          const estimatedIngredients = item.quantity * 5; // Average 5 ingredients per item
          if (!impactByIngredient[item.name]) {
            impactByIngredient[item.name] = 0;
          }
          impactByIngredient[item.name] += estimatedIngredients;
        }
      }
      
      return {
        totalTransactions: transactions.length,
        totalItems,
        impactByStore,
        impactByIngredient
      };
    } catch (error) {
      console.error('Error calculating inventory impact:', error);
      return {
        totalTransactions: 0,
        totalItems: 0,
        impactByStore: {},
        impactByIngredient: {}
      };
    }
  }
};