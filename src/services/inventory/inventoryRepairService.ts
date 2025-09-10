import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InventoryRepairResult {
  success: boolean;
  recipesLinked: number;
  transactionsProcessed: number;
  inventoryDeducted: number;
  errors: string[];
  warnings: string[];
}

/**
 * Repair inventory system by linking recipes to products and optionally processing historical transactions
 */
export const repairInventorySystem = async (
  storeId: string, 
  processHistoricalTransactions: boolean = false
): Promise<InventoryRepairResult> => {
  console.log('🔧 Starting inventory system repair...');
  
  try {
    const { data, error } = await supabase.functions.invoke('repair-inventory-system', {
      body: {
        storeId,
        processHistoricalTransactions
      }
    });

    if (error) {
      console.error('❌ Repair function error:', error);
      toast.error('Failed to repair inventory system');
      return {
        success: false,
        recipesLinked: 0,
        transactionsProcessed: 0,
        inventoryDeducted: 0,
        errors: [error.message],
        warnings: []
      };
    }

    const result = data as InventoryRepairResult;
    
    if (result.success) {
      toast.success(
        `✅ Inventory system repaired! ${result.recipesLinked} recipes linked` + 
        (processHistoricalTransactions ? `, ${result.transactionsProcessed} transactions processed` : '')
      );
    } else {
      toast.error('⚠️ Repair completed with errors. Check console for details.');
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️ Repair warnings:', result.warnings);
    }

    if (result.errors.length > 0) {
      console.error('❌ Repair errors:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('❌ Repair service error:', error);
    toast.error('Failed to start inventory repair');
    return {
      success: false,
      recipesLinked: 0,
      transactionsProcessed: 0,
      inventoryDeducted: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    };
  }
};

/**
 * Check inventory system health
 */
export const checkInventorySystemHealth = async (storeId: string) => {
  try {
    // Check for unlinked recipes
    const { data: unlinkedRecipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .is('product_id', null);

    if (recipesError) {
      console.error('Error checking recipes:', recipesError);
      return { healthy: false, issues: ['Failed to check recipes'] };
    }

    // Check for recipes without ingredients
    const { data: recipesWithoutIngredients, error: ingredientsError } = await supabase
      .from('recipes')
      .select(`
        id, 
        name,
        recipe_ingredients (id)
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (ingredientsError) {
      console.error('Error checking recipe ingredients:', ingredientsError);
      return { healthy: false, issues: ['Failed to check recipe ingredients'] };
    }

    const issues: string[] = [];
    
    if (unlinkedRecipes && unlinkedRecipes.length > 0) {
      issues.push(`${unlinkedRecipes.length} recipes not linked to products`);
    }

    const emptyRecipes = recipesWithoutIngredients?.filter(r => 
      !r.recipe_ingredients || r.recipe_ingredients.length === 0
    ) || [];

    if (emptyRecipes.length > 0) {
      issues.push(`${emptyRecipes.length} recipes have no ingredients`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      unlinkedRecipesCount: unlinkedRecipes?.length || 0,
      emptyRecipesCount: emptyRecipes.length
    };
  } catch (error) {
    console.error('Error checking inventory system health:', error);
    return { 
      healthy: false, 
      issues: ['Failed to perform health check'] 
    };
  }
};