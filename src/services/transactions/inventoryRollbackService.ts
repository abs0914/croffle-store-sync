import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RollbackItem {
  productId: string;
  name: string;
  quantity: number;
}

/**
 * Comprehensive inventory rollback service
 */
export class InventoryRollbackService {
  
  /**
   * Rollback inventory deductions for failed transactions
   */
  static async rollbackTransaction(
    transactionId: string,
    items: RollbackItem[]
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      console.log('🔄 Starting transaction rollback:', { transactionId, itemCount: items.length });
      
      // Process each item for rollback
      for (const item of items) {
        try {
          await this.rollbackSingleItem(item, transactionId);
          console.log(`✅ Rollback completed for: ${item.name}`);
        } catch (error) {
          const errorMessage = `Failed to rollback ${item.name}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(`❌ ${errorMessage}`);
          errors.push(errorMessage);
        }
      }
      
      // Log rollback completion
      await this.logRollbackActivity(transactionId, items, errors);
      
      return {
        success: errors.length === 0,
        errors
      };
      
    } catch (error) {
      const criticalError = `Critical rollback error: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ Critical rollback failure:', error);
      errors.push(criticalError);
      
      return {
        success: false,
        errors
      };
    }
  }
  
  /**
   * Rollback a single item's inventory
   */
  private static async rollbackSingleItem(
    item: RollbackItem,
    transactionId: string
  ): Promise<void> {
    console.log(`🔄 Rolling back item: ${item.name} (${item.productId})`);
    
    // Get product ingredients to reverse the deduction
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('product_ingredients')
      .select(`
        required_quantity,
        inventory_stock_id,
        inventory_item:inventory_stock(
          id,
          item,
          stock_quantity,
          store_id
        )
      `)
      .eq('product_catalog_id', item.productId);
    
    if (ingredientsError) {
      throw new Error(`Failed to get ingredients for rollback: ${ingredientsError.message}`);
    }
    
    if (!ingredients || ingredients.length === 0) {
      // Try recipe ingredients if no product ingredients found
      const { data: recipeIngredients, error: recipeError } = await supabase
        .from('recipe_ingredients')
        .select(`
          quantity as required_quantity,
          inventory_stock_id,
          inventory_item:inventory_stock(
            id,
            item,
            stock_quantity,
            store_id
          )
        `)
        .eq('recipe_id', (await this.getProductRecipeId(item.productId)));
      
      if (recipeError || !recipeIngredients || recipeIngredients.length === 0) {
        console.warn(`⚠️ No ingredients found for rollback of ${item.name} - skipping`);
        return;
      }
      
      // Use recipe ingredients
      await this.restoreIngredientStock(recipeIngredients, item, transactionId);
    } else {
      // Use product ingredients
      await this.restoreIngredientStock(ingredients, item, transactionId);
    }
  }
  
  /**
   * Restore stock for ingredients
   */
  private static async restoreIngredientStock(
    ingredients: any[],
    item: RollbackItem,
    transactionId: string
  ): Promise<void> {
    for (const ingredient of ingredients) {
      const restoreQuantity = ingredient.required_quantity * item.quantity;
      const currentStock = ingredient.inventory_item?.stock_quantity || 0;
      const newStock = currentStock + restoreQuantity;
      
      console.log(`  Restoring ${ingredient.inventory_item?.item}: ${currentStock} + ${restoreQuantity} = ${newStock}`);
      
      // Update inventory stock
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', ingredient.inventory_stock_id);
      
      if (updateError) {
        throw new Error(`Failed to restore stock for ${ingredient.inventory_item?.item}: ${updateError.message}`);
      }
      
      // Log rollback movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_stock_id: ingredient.inventory_stock_id,
          movement_type: 'adjustment',
          quantity_change: restoreQuantity,
          previous_quantity: currentStock,
          new_quantity: newStock,
          reference_type: 'transaction_rollback',
          reference_id: transactionId,
          notes: `Rollback: ${ingredient.inventory_item?.item} for ${item.name} (Transaction: ${transactionId})`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (movementError) {
        console.error('Failed to log rollback movement:', movementError);
        // Don't fail the rollback for logging issues
      }
    }
  }
  
  /**
   * Get product recipe ID for recipe ingredient lookup
   */
  private static async getProductRecipeId(productId: string): Promise<string | null> {
    const { data: product } = await supabase
      .from('product_catalog')
      .select('recipe_id')
      .eq('id', productId)
      .single();
    
    return product?.recipe_id || null;
  }
  
  /**
   * Log rollback activity for audit purposes
   */
  private static async logRollbackActivity(
    transactionId: string,
    items: RollbackItem[],
    errors: string[]
  ): Promise<void> {
    try {
      const logData = {
        transaction_id: transactionId,
        rollback_type: 'inventory_deduction',
        items_count: items.length,
        items_details: items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity
        })),
        errors: errors,
        rollback_status: errors.length === 0 ? 'success' : 'partial_failure',
        created_at: new Date().toISOString()
      };
      
      // Could store in a rollback_logs table for audit purposes
      console.log('📝 Rollback activity logged:', logData);
      
    } catch (logError) {
      console.error('Failed to log rollback activity:', logError);
    }
  }
}

/**
 * Convenience function for simple rollback operations
 */
export const rollbackProcessedItems = async (
  items: RollbackItem[],
  transactionId: string
): Promise<void> => {
  const result = await InventoryRollbackService.rollbackTransaction(transactionId, items);
  
  if (!result.success) {
    const errorMessage = `Rollback failed: ${result.errors.join(', ')}`;
    console.error('❌ Rollback operation failed:', errorMessage);
    toast.error('Failed to rollback inventory changes');
    throw new Error(errorMessage);
  }
  
  console.log('✅ Inventory rollback completed successfully');
};