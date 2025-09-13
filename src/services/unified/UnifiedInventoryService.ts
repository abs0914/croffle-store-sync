/**
 * UNIFIED INVENTORY SERVICE
 * 
 * Single source of truth for all inventory operations.
 * Consolidates functionality from:
 * - SimplifiedInventoryService (Phase 4)
 * - MixMatchInventoryIntegration
 * - EnhancedInventoryDeductionService
 * - BatchInventoryService
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UnifiedInventoryItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface UnifiedInventoryResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  deductedItems: Array<{
    ingredient: string;
    deducted: number;
    remaining: number;
    inventoryStockId: string;
  }>;
  processingTimeMs: number;
  itemsProcessed: number;
  movementsCreated: number;
}

export interface UnifiedValidationResult {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
  insufficientItems: Array<{
    ingredient: string;
    required: number;
    available: number;
    inventoryStockId: string;
  }>;
}

/**
 * Unified Inventory Service - Single Point of Entry
 */
export class UnifiedInventoryService {
  
  /**
   * MAIN ENTRY POINT: Process transaction inventory with full validation
   */
  static async processTransaction(
    transactionId: string,
    storeId: string,
    items: UnifiedInventoryItem[]
  ): Promise<UnifiedInventoryResult> {
    const startTime = Date.now();
    console.log('🔄 UNIFIED: Starting inventory processing', { transactionId, storeId, itemCount: items.length });

    try {
      // Step 1: Pre-validation (MANDATORY)
      console.log('🔍 UNIFIED: Step 1 - Validation');
      const validation = await this.validateInventoryAvailability(items);
      
      if (!validation.canProceed) {
        console.error('❌ UNIFIED: Validation failed - blocking transaction', validation.errors);
        throw new Error(`Inventory validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 2: Inventory deduction
      console.log('🔄 UNIFIED: Step 2 - Deduction');
      const deductionResult = await this.performInventoryDeduction(transactionId, items);

      // Step 3: Critical failure checks
      console.log('🔍 UNIFIED: Step 3 - Critical checks');
      if (deductionResult.movementsCreated === 0 && items.length > 0) {
        const errorMsg = `CRITICAL: No inventory movements created for ${items.length} items`;
        console.error('❌ UNIFIED:', errorMsg);
        throw new Error(errorMsg);
      }

      const processingTimeMs = Date.now() - startTime;
      console.log(`✅ UNIFIED: Processing completed successfully in ${processingTimeMs}ms`);
      
      // Step 4: Success logging
      await this.logSuccessfulTransaction(transactionId, deductionResult, processingTimeMs);

      return {
        ...deductionResult,
        processingTimeMs,
        itemsProcessed: items.length
      };

    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error('❌ UNIFIED: Critical error in inventory processing:', error);
      
      // Critical failure logging
      await this.logCriticalFailure(transactionId, error, processingTimeMs);
      
      throw error; // Re-throw to prevent transaction completion
    }
  }

  /**
   * STEP 1: Comprehensive inventory validation
   */
  static async validateInventoryAvailability(
    items: UnifiedInventoryItem[]
  ): Promise<UnifiedValidationResult> {
    console.log('🔍 UNIFIED: Starting inventory validation for', items.length, 'items');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const insufficientItems: UnifiedValidationResult['insufficientItems'] = [];

    try {
      for (const item of items) {
        await this.validateSingleItem(item, errors, warnings, insufficientItems);
      }

      const canProceed = errors.length === 0;
      
      console.log('🔍 UNIFIED: Validation completed', {
        canProceed,
        errors: errors.length,
        warnings: warnings.length,
        insufficientItems: insufficientItems.length
      });

      return { canProceed, errors, warnings, insufficientItems };

    } catch (error) {
      console.error('❌ UNIFIED: Validation error:', error);
      throw error;
    }
  }

  /**
   * STEP 2: Unified inventory deduction
   */
  static async performInventoryDeduction(
    transactionId: string,
    items: UnifiedInventoryItem[]
  ): Promise<Omit<UnifiedInventoryResult, 'processingTimeMs' | 'itemsProcessed'>> {
    console.log('🔄 UNIFIED: Starting inventory deduction for', items.length, 'items');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const deductedItems: UnifiedInventoryResult['deductedItems'] = [];
    let movementsCreated = 0;

    try {
      for (const item of items) {
        const itemResult = await this.deductSingleItem(transactionId, item);
        
        if (itemResult.success) {
          deductedItems.push(...itemResult.deductedItems);
          movementsCreated += itemResult.movementsCreated;
        } else {
          errors.push(...itemResult.errors);
        }
        
        warnings.push(...itemResult.warnings);
      }

      // Critical check: Fail if any errors occurred
      if (errors.length > 0) {
        console.error('❌ UNIFIED: Deduction failed with errors:', errors);
        throw new Error(`Inventory deduction failed: ${errors.join(', ')}`);
      }

      console.log(`✅ UNIFIED: Deduction completed - ${movementsCreated} movements created`);

      return {
        success: true,
        errors: [],
        warnings,
        deductedItems,
        movementsCreated
      };

    } catch (error) {
      console.error('❌ UNIFIED: Critical deduction error:', error);
      throw error;
    }
  }

  /**
   * Validate a single inventory item
   */
  private static async validateSingleItem(
    item: UnifiedInventoryItem,
    errors: string[],
    warnings: string[],
    insufficientItems: UnifiedValidationResult['insufficientItems']
  ): Promise<void> {
    console.log(`🔍 UNIFIED: Validating ${item.productName} (${item.productId})`);

    try {
      // Check if item has a recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('product_catalog')
        .select(`
          recipe_id,
          recipes!inner (
            id,
            is_active,
            recipe_ingredients (
              quantity,
              inventory_stock_id,
              inventory_stock!recipe_ingredients_inventory_stock_id_fkey(id, item, stock_quantity)
            )
          )
        `)
        .eq('id', item.productId)
        .eq('is_available', true)
        .eq('recipes.is_active', true)
        .not('recipe_id', 'is', null);

      if (recipeError || !recipeData || recipeData.length === 0) {
        // Try as direct product
        await this.validateDirectProduct(item, errors, warnings, insufficientItems);
        return;
      }

      const recipe = recipeData[0].recipes;
      if (!recipe?.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
        // Try as direct product
        await this.validateDirectProduct(item, errors, warnings, insufficientItems);
        return;
      }

      // Validate recipe ingredients
      for (const ingredient of recipe.recipe_ingredients) {
        if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
          continue;
        }

        const inventoryStock = ingredient.inventory_stock;
        const requiredQuantity = ingredient.quantity * item.quantity;

        if (inventoryStock.stock_quantity < requiredQuantity) {
          insufficientItems.push({
            ingredient: inventoryStock.item,
            required: requiredQuantity,
            available: inventoryStock.stock_quantity,
            inventoryStockId: inventoryStock.id
          });
          errors.push(`Insufficient ${inventoryStock.item}: need ${requiredQuantity}, have ${inventoryStock.stock_quantity}`);
        }
      }

    } catch (error) {
      console.error(`❌ UNIFIED: Validation error for ${item.productName}:`, error);
      errors.push(`Validation error for ${item.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate direct product (no recipe)
   */
  private static async validateDirectProduct(
    item: UnifiedInventoryItem,
    errors: string[],
    warnings: string[],
    insufficientItems: UnifiedValidationResult['insufficientItems']
  ): Promise<void> {
    const { data: directProduct } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .eq('store_id', item.storeId)
      .eq('item', item.productName)
      .eq('is_active', true)
      .maybeSingle();

    if (directProduct) {
      if (directProduct.stock_quantity < item.quantity) {
        insufficientItems.push({
          ingredient: item.productName,
          required: item.quantity,
          available: directProduct.stock_quantity,
          inventoryStockId: directProduct.id
        });
        errors.push(`Insufficient ${item.productName}: need ${item.quantity}, have ${directProduct.stock_quantity}`);
      }
    } else {
      warnings.push(`No inventory tracking for: ${item.productName}`);
    }
  }

  /**
   * Deduct inventory for a single item
   */
  private static async deductSingleItem(
    transactionId: string,
    item: UnifiedInventoryItem
  ): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
    deductedItems: UnifiedInventoryResult['deductedItems'];
    movementsCreated: number;
  }> {
    console.log(`🔄 UNIFIED: Deducting ${item.productName} (${item.productId})`);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const deductedItems: UnifiedInventoryResult['deductedItems'] = [];
    let movementsCreated = 0;

    try {
      // Get recipe data
      const { data: recipeData, error: recipeError } = await supabase
        .from('product_catalog')
        .select(`
          recipe_id,
          recipes!inner (
            id,
            is_active,
            recipe_ingredients (
              quantity,
              inventory_stock_id,
              inventory_stock!recipe_ingredients_inventory_stock_id_fkey(id, item, stock_quantity)
            )
          )
        `)
        .eq('id', item.productId)
        .eq('is_available', true)
        .eq('recipes.is_active', true)
        .not('recipe_id', 'is', null);

      if (recipeError || !recipeData || recipeData.length === 0) {
        // Handle as direct product
        const directResult = await this.deductDirectProduct(transactionId, item);
        return directResult;
      }

      const recipe = recipeData[0].recipes;
      if (!recipe?.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
        // Handle as direct product
        const directResult = await this.deductDirectProduct(transactionId, item);
        return directResult;
      }

      // Process recipe ingredients
      for (const ingredient of recipe.recipe_ingredients) {
        if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) {
          warnings.push(`No inventory mapping for ingredient in ${item.productName}`);
          continue;
        }

        const inventoryStock = ingredient.inventory_stock;
        const deductionAmount = ingredient.quantity * item.quantity;
        const newQuantity = inventoryStock.stock_quantity - deductionAmount;

        // Update inventory stock
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryStock.id);

        if (updateError) {
          errors.push(`Failed to update ${inventoryStock.item}: ${updateError.message}`);
          continue;
        }

        // Create movement record
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: inventoryStock.id,
            reference_id: transactionId,
            reference_type: 'transaction',
            movement_type: 'outbound',
            quantity_change: -deductionAmount,
            new_quantity: newQuantity,
            previous_quantity: inventoryStock.stock_quantity,
            notes: `UNIFIED: ${item.productName} (${item.quantity}x)`,
            created_by: 'system'
          });

        if (movementError) {
          warnings.push(`Movement record failed for ${inventoryStock.item}: ${movementError.message}`);
        } else {
          movementsCreated++;
        }

        deductedItems.push({
          ingredient: inventoryStock.item,
          deducted: deductionAmount,
          remaining: newQuantity,
          inventoryStockId: inventoryStock.id
        });

        console.log(`✅ UNIFIED: Deducted ${inventoryStock.item}: ${deductionAmount} (${inventoryStock.stock_quantity} → ${newQuantity})`);
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
        deductedItems,
        movementsCreated
      };

    } catch (error) {
      console.error(`❌ UNIFIED: Error deducting ${item.productName}:`, error);
      return {
        success: false,
        errors: [`Error deducting ${item.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        deductedItems,
        movementsCreated
      };
    }
  }

  /**
   * Handle direct product deduction
   */
  private static async deductDirectProduct(
    transactionId: string,
    item: UnifiedInventoryItem
  ): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
    deductedItems: UnifiedInventoryResult['deductedItems'];
    movementsCreated: number;
  }> {
    const { data: inventoryStock } = await supabase
      .from('inventory_stock')
      .select('id, item, stock_quantity')
      .eq('store_id', item.storeId)
      .eq('item', item.productName)
      .eq('is_active', true)
      .maybeSingle();

    if (!inventoryStock) {
      return {
        success: true, // Don't fail for non-inventory items
        errors: [],
        warnings: [`No inventory tracking for: ${item.productName}`],
        deductedItems: [],
        movementsCreated: 0
      };
    }

    const newQuantity = inventoryStock.stock_quantity - item.quantity;

    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory_stock')
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryStock.id);

    if (updateError) {
      return {
        success: false,
        errors: [`Failed to update ${item.productName}: ${updateError.message}`],
        warnings: [],
        deductedItems: [],
        movementsCreated: 0
      };
    }

    // Create movement record
    let movementsCreated = 0;
    const { error: movementError } = await supabase
      .from('inventory_movements')
      .insert({
        inventory_stock_id: inventoryStock.id,
        reference_id: transactionId,
        reference_type: 'transaction',
        movement_type: 'outbound',
        quantity_change: -item.quantity,
        new_quantity: newQuantity,
        previous_quantity: inventoryStock.stock_quantity,
        notes: `UNIFIED: Direct product ${item.productName}`,
        created_by: 'system'
      });

    if (!movementError) {
      movementsCreated = 1;
    }

    return {
      success: true,
      errors: [],
      warnings: movementError ? [`Movement record failed for ${item.productName}`] : [],
      deductedItems: [{
        ingredient: item.productName,
        deducted: item.quantity,
        remaining: newQuantity,
        inventoryStockId: inventoryStock.id
      }],
      movementsCreated
    };
  }

  /**
   * Logging methods
   */
  private static async logSuccessfulTransaction(
    transactionId: string,
    result: Omit<UnifiedInventoryResult, 'processingTimeMs' | 'itemsProcessed'>,
    processingTimeMs: number
  ): Promise<void> {
    try {
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'success',
        p_items_processed: result.deductedItems.length,
        p_sync_duration_ms: processingTimeMs,
        p_affected_inventory_items: JSON.stringify(result.deductedItems)
      });
    } catch (error) {
      console.warn('⚠️ UNIFIED: Failed to log success:', error);
    }
  }

  private static async logCriticalFailure(
    transactionId: string,
    error: any,
    processingTimeMs: number
  ): Promise<void> {
    try {
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: 'critical_failure',
        p_error_details: error instanceof Error ? error.message : 'Unknown error',
        p_items_processed: 0,
        p_sync_duration_ms: processingTimeMs
      });
    } catch (logError) {
      console.warn('⚠️ UNIFIED: Failed to log critical failure:', logError);
    }
  }
}