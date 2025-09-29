/**
 * Simplified Transaction Inventory Integration
 * 
 * Clean integration layer for POS transactions with combo expansion support
 * and comprehensive audit trail logging
 */

import { SimplifiedInventoryAuditService, SimpleDeductionItem } from "@/services/inventory/simplifiedInventoryAuditService";
import { deductInventoryForTransactionEnhanced, deductInventoryForTransactionEnhancedWithAuth } from "@/services/inventory/enhancedInventoryDeductionService";
import { ComboExpansionService, ComboExpansionItem } from "@/services/transactions/comboExpansionService";
import { inventoryAuditService } from "@/services/inventory/inventoryAuditService";
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
   * **PHASE 2**: Enhanced processing with comprehensive monitoring
   */
  static async processTransactionInventoryWithAuth(
    transactionId: string,
    items: TransactionItem[],
    userId: string
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    // **PHASE 2**: Start performance monitoring
    inventoryAuditService.startPerformanceTimer(transactionId);
    
    console.log(`🔄 ENHANCED PROCESSING: Deducting inventory for transaction ${transactionId} with user ${userId}`);
    
    // **CRITICAL DEBUG**: Track every step
    console.log(`🚨 DEBUG: SimplifiedTransactionInventoryIntegration.processTransactionInventoryWithAuth CALLED`);
    console.log(`🚨 DEBUG: Transaction ID: ${transactionId}, User ID: ${userId}, Items count: ${items.length}`);
    console.log(`🚨 DEBUG: Items data:`, JSON.stringify(items, null, 2));
    
    try {
      // **NEW: COMBO EXPANSION** - First expand any combo products
      console.log(`🔄 COMBO EXPANSION: Checking for combo products in ${items.length} items`);
      
      const expansionResult = await ComboExpansionService.expandComboItems(items);
      
      if (!expansionResult.success) {
        console.error(`❌ COMBO EXPANSION FAILED:`, expansionResult.errors);
        
        // **PHASE 2**: Log combo expansion failure
        await inventoryAuditService.logInventoryEvent({
          transactionId,
          storeId: items[0]?.storeId || 'unknown',
          operationType: 'validation',
          status: 'failure',
          itemsProcessed: items.length,
          processingTimeMs: inventoryAuditService.getElapsedTime(transactionId),
          userId,
          metadata: {
            error_type: 'combo_expansion_failure',
            errors: expansionResult.errors,
            original_items: items.length
          }
        });
        
        return {
          success: false,
          errors: [`Combo expansion failed: ${expansionResult.errors.join(', ')}`],
          warnings: []
        };
      }
      
      console.log(`✅ COMBO EXPANSION: Processed ${expansionResult.combosProcessed} combos, resulting in ${expansionResult.expandedItems.length} items`);
      
      // Use expanded items for inventory deduction
      const enhancedItems = expansionResult.expandedItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity
      }));
      
      console.log(`🚨 DEBUG: Enhanced items (post-expansion):`, enhancedItems);
      
      // Get store ID from first item (all items should be from same store)
      const storeId = items[0]?.storeId;
      if (!storeId) {
        console.error(`🚨 DEBUG: No store ID found in items`);
        
        // **PHASE 2**: Log missing store ID
        await inventoryAuditService.logInventoryEvent({
          transactionId,
          storeId: 'unknown',
          operationType: 'validation',
          status: 'failure',
          itemsProcessed: 0,
          processingTimeMs: inventoryAuditService.getElapsedTime(transactionId),
          userId,
          metadata: {
            error_type: 'missing_store_id',
            errors: ['Store ID is required for inventory deduction']
          }
        });
        
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
      
      // **PHASE 2**: Log comprehensive audit event
      const processingTime = inventoryAuditService.getElapsedTime(transactionId);
      
      await inventoryAuditService.logInventoryEvent({
        transactionId,
        storeId,
        operationType: result.isMixMatch ? 'mix_match_deduction' : 'regular_deduction',
        status: result.success ? 'success' : 'failure',
        itemsProcessed: result.deductedItems.length,
        processingTimeMs: processingTime,
        userId,
        metadata: {
          productNames: enhancedItems.map(item => item.productName),
          deductedItems: result.deductedItems.map(item => ({
            itemName: item.itemName,
            quantityDeducted: item.quantityDeducted,
            newStock: item.newStock
          })),
          skippedItems: result.skippedItems || [],
          errors: result.errors,
          combosProcessed: expansionResult.combosProcessed,
          is_mix_match: result.isMixMatch,
          original_items_count: items.length,
          expanded_items_count: enhancedItems.length
        }
      });
      
      // Combine combo expansion warnings with deduction warnings
      const allWarnings = [
        ...(expansionResult.combosProcessed > 0 ? [`Expanded ${expansionResult.combosProcessed} combo products`] : []),
        ...(result.skippedItems || [])
      ];
      
      if (result.success) {
        console.log(`✅ ENHANCED PROCESSING: Transaction inventory processed successfully in ${processingTime}ms`);
        console.log(`📊 ENHANCED PROCESSING: Deducted ${result.deductedItems.length} items${result.isMixMatch ? ' (Mix & Match detected)' : ''}`);
        if (expansionResult.combosProcessed > 0) {
          console.log(`🎯 COMBO SUCCESS: Successfully processed ${expansionResult.combosProcessed} combo products`);
        }
        if (result.skippedItems && result.skippedItems.length > 0) {
          console.log(`⚠️ ENHANCED PROCESSING: Skipped ${result.skippedItems.length} items: ${result.skippedItems.join(', ')}`);
        }
      } else {
        console.error(`❌ ENHANCED PROCESSING: Transaction inventory failed in ${processingTime}ms:`, result.errors);
        toast.error(`Inventory deduction failed: ${result.errors[0]}`);
      }
      
      return { 
        success: result.success, 
        errors: result.errors, 
        warnings: allWarnings
      };
      
    } catch (error) {
      const processingTime = inventoryAuditService.getElapsedTime(transactionId);
      
      console.error('🚨 DEBUG: Exception in processTransactionInventoryWithAuth:', error);
      console.error('❌ ENHANCED PROCESSING: Processing failed:', error);
      
      // **PHASE 2**: Log processing exception
      await inventoryAuditService.logInventoryEvent({
        transactionId,
        storeId: items[0]?.storeId || 'unknown',
        operationType: 'regular_deduction',
        status: 'failure',
        itemsProcessed: 0,
        processingTimeMs: processingTime,
        userId,
        metadata: {
          error_type: 'processing_exception',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          stack_trace: error instanceof Error ? error.stack : undefined
        }
      });
      
      const errorMsg = error instanceof Error ? error.message : 'Processing failed';
      return { 
        success: false, 
        errors: [errorMsg], 
        warnings: [] 
      };
    }
  }

  /**
   * **PHASE 1 FIX**: Enhanced authentication fallback with retry logic
   */
  static async getAuthenticatedUserWithRetry(maxRetries: number = 2): Promise<{ userId: string | null; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔐 AUTH RETRY: Attempt ${attempt}/${maxRetries}`);
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.warn(`⚠️ AUTH RETRY ${attempt}: ${error.message}`);
          if (attempt < maxRetries) {
            // Exponential backoff: 100ms, 300ms, etc.
            const delay = 100 * (Math.pow(3, attempt - 1));
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          return { userId: null, error: `Authentication failed after ${maxRetries} attempts: ${error.message}` };
        }
        
        if (!user) {
          console.warn(`⚠️ AUTH RETRY ${attempt}: No user in session`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          return { userId: null, error: 'No authenticated user found after retries' };
        }
        
        console.log(`✅ AUTH SUCCESS: User ${user.id} authenticated on attempt ${attempt}`);
        return { userId: user.id };
        
      } catch (error) {
        console.error(`❌ AUTH RETRY ${attempt} ERROR:`, error);
        if (attempt === maxRetries) {
          return { userId: null, error: `Auth service error: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return { userId: null, error: 'Authentication failed - max retries exceeded' };
  }

  /**
   * Legacy method - maintained for backward compatibility
   * **PHASE 1 FIX**: Now uses enhanced authentication with retry logic
   */
  static async processTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    console.warn('⚠️ LEGACY CALL: processTransactionInventory called without user context');
    
    // **PHASE 1 FIX**: Use enhanced authentication with retry logic
    const authResult = await this.getAuthenticatedUserWithRetry();
    
    if (!authResult.userId) {
      console.error(`❌ LEGACY CALL: ${authResult.error}`);
      return {
        success: false,
        errors: [`Authentication failed: ${authResult.error}`],
        warnings: ['Consider migrating to processTransactionInventoryWithAuth method for better reliability']
      };
    }
    
    console.log(`✅ LEGACY CALL: Authentication succeeded, proceeding with user ${authResult.userId}`);
    return this.processTransactionInventoryWithAuth(transactionId, items, authResult.userId);
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