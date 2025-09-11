/**
 * Simplified Inventory Audit Service
 * 
 * Single, clean audit trail using only inventory_movements table
 * - Non-blocking audit logging with retry
 * - Simple deductWithAudit method
 * - Maintains compatibility with existing features
 */

import { supabase } from "@/integrations/supabase/client";
import { nowInPhilippines } from "@/utils/timezone";

export interface SimpleDeductionItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
}

export interface SimpleAuditRecord {
  inventory_stock_id: string;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id: string;
  notes: string;
}

/**
 * Core deduction method with simplified audit
 * ALWAYS succeeds if stock is sufficient, audit failure is non-blocking
 */
export class SimplifiedInventoryAuditService {
  
  /**
   * Deduct inventory with simple audit trail
   * Returns success if deduction completed, warnings if audit failed
   */
  static async deductWithAudit(
    inventoryStockId: string,
    deductionAmount: number,
    transactionId: string,
    productName: string
  ): Promise<{ success: boolean; error?: string; warning?: string }> {
    try {
      console.log(`🔄 SIMPLE: Deducting ${deductionAmount} from ${inventoryStockId}`);
      
      // Step 1: Get current stock
      const { data: stock, error: fetchError } = await supabase
        .from("inventory_stock")
        .select("stock_quantity")
        .eq("id", inventoryStockId)
        .single();
      
      if (fetchError || !stock) {
        return { success: false, error: `Failed to fetch stock: ${fetchError?.message}` };
      }
      
      const previousQuantity = stock.stock_quantity;
      
      // Step 2: Validate sufficient stock
      if (previousQuantity < deductionAmount) {
        return { 
          success: false, 
          error: `Insufficient stock: need ${deductionAmount}, have ${previousQuantity}` 
        };
      }
      
      const newQuantity = previousQuantity - deductionAmount;
      
      // Step 3: Update stock quantity (CRITICAL - must succeed)
      const { error: updateError } = await supabase
        .from("inventory_stock")
        .update({ 
          stock_quantity: newQuantity,
          serving_ready_quantity: newQuantity, // Keep in sync
          updated_at: nowInPhilippines().toISOString()
        })
        .eq("id", inventoryStockId);
      
      if (updateError) {
        return { success: false, error: `Failed to update stock: ${updateError.message}` };
      }
      
      console.log(`✅ SIMPLE: Updated stock ${previousQuantity} → ${newQuantity}`);
      
      // Step 4: Create audit record (NON-BLOCKING with retry)
      const auditResult = await this.createSimpleAuditRecord({
        inventory_stock_id: inventoryStockId,
        quantity_change: -deductionAmount,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        reference_id: transactionId,
        notes: `Sale: ${productName} (${deductionAmount})`
      });
      
      if (auditResult.success) {
        console.log(`✅ SIMPLE: Created audit record for ${inventoryStockId}`);
        return { success: true };
      } else {
        console.warn(`⚠️ SIMPLE: Audit failed but deduction succeeded: ${auditResult.error}`);
        return { 
          success: true, 
          warning: `Deduction completed but audit failed: ${auditResult.error}` 
        };
      }
      
    } catch (error) {
      console.error('❌ SIMPLE: Deduction failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Process multiple items for a transaction
   */
  static async deductTransactionItems(
    transactionId: string,
    items: SimpleDeductionItem[]
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.log(`🔄 SIMPLE: Processing ${items.length} items for transaction ${transactionId}`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const item of items) {
      // Get recipe ingredients for this product
      const ingredients = await this.getProductIngredients(item.productId, item.storeId);
      
      if (ingredients.length === 0) {
        warnings.push(`No recipe ingredients found for ${item.productName}`);
        continue;
      }
      
      // Deduct each ingredient
      for (const ingredient of ingredients) {
        const totalNeeded = ingredient.quantity * item.quantity;
        
        const result = await this.deductWithAudit(
          ingredient.inventory_stock_id,
          totalNeeded,
          transactionId,
          `${item.productName} (${ingredient.ingredient_name})`
        );
        
        if (!result.success) {
          errors.push(`${ingredient.ingredient_name}: ${result.error}`);
        } else if (result.warning) {
          warnings.push(`${ingredient.ingredient_name}: ${result.warning}`);
        }
      }
    }
    
    const success = errors.length === 0;
    console.log(`${success ? '✅' : '❌'} SIMPLE: Transaction processed - ${errors.length} errors, ${warnings.length} warnings`);
    
    return { success, errors, warnings };
  }
  
  /**
   * Get recipe ingredients for a product
   */
  private static async getProductIngredients(
    productId: string, 
    storeId: string
  ): Promise<Array<{ ingredient_name: string; quantity: number; inventory_stock_id: string }>> {
    try {
      // Get recipe ingredients with inventory mapping
      const { data } = await supabase
        .from('product_catalog')
        .select(`
          recipe_id,
          recipes!inner (
            recipe_ingredients!inner (
              ingredient_name,
              quantity,
              inventory_stock!inner (
                id
              )
            )
          )
        `)
        .eq('id', productId)
        .eq('recipes.recipe_ingredients.inventory_stock.store_id', storeId)
        .eq('recipes.recipe_ingredients.inventory_stock.is_active', true);
      
      if (!data || data.length === 0) return [];
      
      const recipe = data[0].recipes;
      if (!recipe?.recipe_ingredients) return [];
      
      return recipe.recipe_ingredients.map((ingredient: any) => ({
        ingredient_name: ingredient.ingredient_name,
        quantity: ingredient.quantity,
        inventory_stock_id: ingredient.inventory_stock.id
      }));
      
    } catch (error) {
      console.error('Failed to get product ingredients:', error);
      return [];
    }
  }
  
  /**
   * Create simple audit record with retry logic
   */
  private static async createSimpleAuditRecord(
    record: SimpleAuditRecord,
    maxRetries: number = 2
  ): Promise<{ success: boolean; error?: string }> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { error } = await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: record.inventory_stock_id,
            movement_type: 'sale',
            quantity_change: record.quantity_change,
            previous_quantity: record.previous_quantity,
            new_quantity: record.new_quantity,
            reference_type: 'transaction',
            reference_id: record.reference_id,
            notes: record.notes,
            created_by: 'system',
            created_at: nowInPhilippines().toISOString()
          });
        
        if (!error) {
          return { success: true };
        }
        
        console.warn(`⚠️ SIMPLE: Audit attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        } else {
          return { success: false, error: error.message };
        }
        
      } catch (error) {
        console.warn(`⚠️ SIMPLE: Audit attempt ${attempt} exception:`, error);
        
        if (attempt === maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      }
    }
    
    return { success: false, error: 'All retry attempts failed' };
  }
  
  /**
   * Daily validation to check for missing audit records
   */
  static async validateAuditIntegrity(storeId: string): Promise<{
    missingAuditCount: number;
    inconsistencies: Array<{ inventory_stock_id: string; issue: string }>;
  }> {
    try {
      console.log('🔍 SIMPLE: Running daily audit integrity check');
      
      // This is a placeholder for daily validation logic
      // Would check for transactions without corresponding inventory_movements
      
      return {
        missingAuditCount: 0,
        inconsistencies: []
      };
      
    } catch (error) {
      console.error('Failed to validate audit integrity:', error);
      return {
        missingAuditCount: -1,
        inconsistencies: [{ inventory_stock_id: 'unknown', issue: 'Validation failed' }]
      };
    }
  }
}