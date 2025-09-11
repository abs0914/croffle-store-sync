/**
 * Simplified Transaction Inventory Integration
 * 
 * Clean integration layer for POS transactions using the simplified audit system
 */

import { SimplifiedInventoryAuditService, SimpleDeductionItem } from "@/services/inventory/simplifiedInventoryAuditService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
}

/**
 * Simple transaction inventory processing
 * Uses only inventory_movements for audit trail
 */
export class SimplifiedTransactionInventoryIntegration {
  
  /**
   * Validate inventory availability before transaction
   * Lightweight validation without complex fallback logic
   */
  static async validateTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<{ canProceed: boolean; errors: string[] }> {
    console.log(`🔍 SIMPLE VALIDATION: Checking inventory for transaction ${transactionId}`);
    
    const errors: string[] = [];
    
    try {
      for (const item of items) {
        // Get recipe ingredients
        const { data: productData } = await supabase
          .from('product_catalog')
          .select(`
            recipe_id,
            recipes!inner (
              recipe_ingredients!inner (
                ingredient_name,
                quantity,
                inventory_stock!inner (
                  id,
                  stock_quantity
                )
              )
            )
          `)
          .eq('id', item.productId)
          .eq('recipes.recipe_ingredients.inventory_stock.store_id', item.storeId)
          .eq('recipes.recipe_ingredients.inventory_stock.is_active', true);
        
        if (!productData || productData.length === 0) {
          console.warn(`⚠️ SIMPLE VALIDATION: No recipe found for ${item.productName}`);
          continue; // Don't block transaction for non-recipe items
        }
        
        const recipe = productData[0].recipes;
        if (!recipe?.recipe_ingredients) continue;
        
        // Check each ingredient
        for (const ingredient of recipe.recipe_ingredients) {
          const requiredQuantity = ingredient.quantity * item.quantity;
          const availableStock = ingredient.inventory_stock.stock_quantity;
          
          if (availableStock < requiredQuantity) {
            errors.push(
              `Insufficient ${ingredient.ingredient_name}: need ${requiredQuantity}, have ${availableStock}`
            );
          }
        }
      }
      
      const canProceed = errors.length === 0;
      
      if (!canProceed) {
        console.error(`❌ SIMPLE VALIDATION: Transaction blocked - ${errors.length} inventory issues`);
        toast.error(`Inventory insufficient: ${errors[0]}`);
      } else {
        console.log(`✅ SIMPLE VALIDATION: Transaction can proceed`);
      }
      
      return { canProceed, errors };
      
    } catch (error) {
      console.error('❌ SIMPLE VALIDATION: Validation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Validation failed';
      return { canProceed: false, errors: [errorMsg] };
    }
  }
  
  /**
   * Process inventory deduction after successful payment
   * Uses simplified audit system
   */
  static async processTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.log(`🔄 SIMPLE PROCESSING: Deducting inventory for transaction ${transactionId}`);
    
    try {
      // Convert to simple deduction items
      const deductionItems: SimpleDeductionItem[] = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        storeId: item.storeId
      }));
      
      // Use simplified service to process deductions
      const result = await SimplifiedInventoryAuditService.deductTransactionItems(
        transactionId,
        deductionItems
      );
      
      if (result.success) {
        console.log(`✅ SIMPLE PROCESSING: Transaction inventory processed successfully`);
        if (result.warnings.length > 0) {
          console.warn(`⚠️ SIMPLE PROCESSING: ${result.warnings.length} warnings:`, result.warnings);
        }
      } else {
        console.error(`❌ SIMPLE PROCESSING: Transaction inventory failed:`, result.errors);
        toast.error(`Inventory deduction failed: ${result.errors[0]}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ SIMPLE PROCESSING: Processing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Processing failed';
      return { 
        success: false, 
        errors: [errorMsg], 
        warnings: [] 
      };
    }
  }
  
  /**
   * Format transaction items for simplified processing
   */
  static formatItemsForInventory(
    transactionItems: any[],
    storeId: string
  ): TransactionItem[] {
    return transactionItems.map(item => ({
      productId: item.product_id || item.id,
      productName: item.name || item.product_name || 'Unknown Product',
      quantity: item.quantity || 1,
      storeId: storeId
    }));
  }
}