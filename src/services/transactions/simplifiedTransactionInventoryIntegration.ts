/**
 * Simplified Transaction Inventory Integration
 * 
 * Clean integration layer for POS transactions using the simplified audit system
 */

import { SimplifiedInventoryAuditService, SimpleDeductionItem } from "@/services/inventory/simplifiedInventoryAuditService";
import { deductInventoryForTransactionEnhanced, deductInventoryForTransactionEnhancedWithAuth } from "@/services/inventory/enhancedInventoryDeductionService";
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
   * Skip validation for Mix & Match products since they use smart deduction
   */
  static async validateTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<{ canProceed: boolean; errors: string[] }> {
    console.log(`🔍 SIMPLE VALIDATION: Checking inventory for transaction ${transactionId}`);
    
    const errors: string[] = [];
    
    try {
      for (const item of items) {
        // Check if this is a Mix & Match product
        const isMixMatch = item.productName.toLowerCase().includes('croffle overload') || 
                          item.productName.toLowerCase().includes('mini croffle');
        
        if (isMixMatch) {
          console.log(`🎯 SIMPLE VALIDATION: Skipping validation for Mix & Match product: ${item.productName}`);
          continue; // Skip validation for Mix & Match - let smart deduction handle it
        }
        
        // Get recipe ingredients for non-Mix & Match products
        const { data: productData } = await supabase
          .from('product_catalog')
          .select(`
            recipe_id,
            recipes!inner (
              recipe_ingredients_with_names!inner (
                ingredient_name,
                quantity,
                inventory_stock!recipe_ingredients_inventory_stock_id_fkey (
                  id,
                  stock_quantity
                )
              )
            )
          `)
          .eq('id', item.productId)
          .eq('recipes.recipe_ingredients_with_names.inventory_stock.store_id', item.storeId)
          .eq('recipes.recipe_ingredients_with_names.inventory_stock.is_active', true);
        
        if (!productData || productData.length === 0) {
          console.warn(`⚠️ SIMPLE VALIDATION: No recipe found for ${item.productName}`);
          continue; // Don't block transaction for non-recipe items
        }
        
        const recipe = productData[0].recipes;
        if (!recipe?.recipe_ingredients_with_names) continue;
        
        // Check each ingredient
        for (const ingredient of recipe.recipe_ingredients_with_names) {
          const requiredQuantity = ingredient.quantity * item.quantity;
          const availableStock = ingredient.inventory_stock?.stock_quantity || 0;
          
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
   * Uses enhanced deduction system that handles Mix & Match products intelligently
   * Now with proper authentication context
   */
  static async processTransactionInventoryWithAuth(
    transactionId: string,
    items: TransactionItem[],
    userId: string
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.log(`🔄 ENHANCED PROCESSING: Deducting inventory for transaction ${transactionId} with user ${userId}`);
    
    // **CRITICAL DEBUG**: Track every step
    console.log(`🚨 DEBUG: SimplifiedTransactionInventoryIntegration.processTransactionInventoryWithAuth CALLED`);
    console.log(`🚨 DEBUG: Transaction ID: ${transactionId}, User ID: ${userId}, Items count: ${items.length}`);
    console.log(`🚨 DEBUG: Items data:`, JSON.stringify(items, null, 2));
    
    try {
      // Use enhanced deduction service that auto-detects Mix & Match products
      const enhancedItems = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity
      }));
      
      console.log(`🚨 DEBUG: Enhanced items mapped:`, enhancedItems);
      
      // Get store ID from first item (all items should be from same store)
      const storeId = items[0]?.storeId;
      if (!storeId) {
        console.error(`🚨 DEBUG: No store ID found in items`);
        throw new Error('Store ID is required for inventory deduction');
      }
      
      console.log(`🚨 DEBUG: Store ID extracted: ${storeId}`);
      console.log(`🚨 DEBUG: About to call deductInventoryForTransactionEnhancedWithAuth...`);
      
      const result = await deductInventoryForTransactionEnhancedWithAuth(
        transactionId,
        storeId,
        enhancedItems,
        userId // Pass authenticated user ID
      );
      
      console.log(`🚨 DEBUG: deductInventoryForTransactionEnhancedWithAuth returned:`, result);
      
      if (result.success) {
        console.log(`✅ ENHANCED PROCESSING: Transaction inventory processed successfully`);
        console.log(`📊 ENHANCED PROCESSING: Deducted ${result.deductedItems.length} items${result.isMixMatch ? ' (Mix & Match detected)' : ''}`);
        if (result.skippedItems && result.skippedItems.length > 0) {
          console.log(`⚠️ ENHANCED PROCESSING: Skipped ${result.skippedItems.length} items: ${result.skippedItems.join(', ')}`);
        }
      } else {
        console.error(`❌ ENHANCED PROCESSING: Transaction inventory failed:`, result.errors);
        toast.error(`Inventory deduction failed: ${result.errors[0]}`);
      }
      
      return { 
        success: result.success, 
        errors: result.errors, 
        warnings: result.skippedItems || [] 
      };
      
    } catch (error) {
      console.error('🚨 DEBUG: Exception in processTransactionInventoryWithAuth:', error);
      console.error('❌ ENHANCED PROCESSING: Processing failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Processing failed';
      return { 
        success: false, 
        errors: [errorMsg], 
        warnings: [] 
      };
    }
  }

  /**
   * Legacy method - maintained for backward compatibility
   * Uses the new method with null user context (will log warnings)
   */
  static async processTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.warn('⚠️ LEGACY CALL: processTransactionInventory called without user context');
    
    // Try to get user from current session
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (!userId) {
      console.error('❌ LEGACY CALL: No user context available');
      return {
        success: false,
        errors: ['No user context available for inventory deduction'],
        warnings: []
      };
    }
    
    return this.processTransactionInventoryWithAuth(transactionId, items, userId);
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