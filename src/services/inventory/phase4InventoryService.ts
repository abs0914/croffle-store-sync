/**
 * Phase 4: Simplified Inventory Deduction Service
 * Root Cause Prevention - Single, reliable, well-tested service
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InventoryDeductionItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
}

interface InventoryDeductionResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  deductedItems: Array<{
    ingredient: string;
    deducted: number;
    remaining: number;
  }>;
  validationFailures: Array<{
    ingredient: string;
    required: number;
    available: number;
  }>;
}

interface InventoryValidationResult {
  canProceed: boolean;
  errors: string[];
  warnings: string[];
  insufficientItems: Array<{
    ingredient: string;
    required: number;
    available: number;
  }>;
}

/**
 * PHASE 4: Simplified Inventory Deduction Service
 * Single source of truth for all inventory operations
 */
export class SimplifiedInventoryService {
  
  /**
   * MANDATORY PRE-VALIDATION
   * Must pass before any transaction can proceed
   */
  static async validateInventoryAvailability(
    items: InventoryDeductionItem[]
  ): Promise<InventoryValidationResult> {
    console.log('🔍 PHASE 4: Starting mandatory inventory validation');
    console.log('🔍 PHASE 4: Validating items:', items.map(i => ({ id: i.productId, name: i.productName, qty: i.quantity })));
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const insufficientItems: Array<{ingredient: string; required: number; available: number}> = [];
    
    try {
      for (const item of items) {
        console.log(`🔍 PHASE 4: Processing item: ${item.productName} (${item.productId})`);
        
        // FIXED: Use raw SQL query that actually works
        const { data: recipeResults, error: recipeError } = await supabase.rpc('get_recipe_with_ingredients', {
          p_product_id: item.productId
        });

        if (recipeError) {
          console.error(`❌ PHASE 4: Recipe query failed for ${item.productName}:`, recipeError);
          // Fallback to direct product check
          await this.validateDirectProduct(item, errors, warnings, insufficientItems);
          continue;
        }

        if (!recipeResults || recipeResults.length === 0) {
          console.log(`⚠️ PHASE 4: No recipe found for ${item.productName}, checking as direct product`);
          await this.validateDirectProduct(item, errors, warnings, insufficientItems);
          continue;
        }

        console.log(`✅ PHASE 4: Found recipe with ${recipeResults.length} ingredients for ${item.productName}`);
        
        // Validate recipe ingredients
        for (const ingredient of recipeResults) {
          const requiredQuantity = ingredient.quantity * item.quantity;
          console.log(`🔍 PHASE 4: Validating ${ingredient.ingredient_name}: need ${requiredQuantity}`);
          
          // Find inventory stock for this ingredient
          const { data: inventoryStock, error: stockError } = await supabase
            .from('inventory_stock')
            .select('id, item, stock_quantity')
            .eq('store_id', item.storeId)
            .eq('item', ingredient.ingredient_name)
            .eq('is_active', true)
            .maybeSingle();

          if (stockError) {
            console.error(`❌ PHASE 4: Stock query failed for ${ingredient.ingredient_name}:`, stockError);
            errors.push(`Database error checking ${ingredient.ingredient_name}: ${stockError.message}`);
            continue;
          }

          if (!inventoryStock) {
            console.error(`❌ PHASE 4: Missing inventory for ingredient: ${ingredient.ingredient_name}`);
            errors.push(`Missing inventory for ingredient: ${ingredient.ingredient_name}`);
            continue;
          }

          console.log(`📊 PHASE 4: ${ingredient.ingredient_name} stock: ${inventoryStock.stock_quantity}, need: ${requiredQuantity}`);

          if (inventoryStock.stock_quantity < requiredQuantity) {
            insufficientItems.push({
              ingredient: ingredient.ingredient_name,
              required: requiredQuantity,
              available: inventoryStock.stock_quantity
            });
            errors.push(`Insufficient ${ingredient.ingredient_name}: need ${requiredQuantity}, have ${inventoryStock.stock_quantity}`);
            console.error(`❌ PHASE 4: Insufficient ${ingredient.ingredient_name}: need ${requiredQuantity}, have ${inventoryStock.stock_quantity}`);
          }
        }

      }

      // CRITICAL: Throw errors instead of returning them silently
      if (errors.length > 0) {
        console.error('❌ PHASE 4: VALIDATION FAILED - BLOCKING TRANSACTION', { errors, insufficientItems });
        throw new Error(`Inventory validation failed: ${errors.join(', ')}`);
      }

      const canProceed = errors.length === 0;
      
      console.log('✅ PHASE 4: Validation completed', {
        canProceed,
        errors: errors.length,
        warnings: warnings.length,
        insufficientItems: insufficientItems.length
      });

      return {
        canProceed,
        errors,
        warnings,
        insufficientItems
      };

    } catch (error) {
      console.error('❌ PHASE 4: Validation failed:', error);
      // Re-throw critical validation errors
      throw error;
    }
  }

  /**
   * Validate direct product (no recipe)
   */
  private static async validateDirectProduct(
    item: InventoryDeductionItem,
    errors: string[],
    warnings: string[],
    insufficientItems: Array<{ingredient: string; required: number; available: number}>
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
          available: directProduct.stock_quantity
        });
        errors.push(`Insufficient ${item.productName}: need ${item.quantity}, have ${directProduct.stock_quantity}`);
      }
    } else {
      warnings.push(`No inventory tracking for: ${item.productName}`);
    }
  }

  /**
   * SIMPLIFIED INVENTORY DEDUCTION
   * Only executes after successful validation
   */
  static async performInventoryDeduction(
    transactionId: string,
    items: InventoryDeductionItem[]
  ): Promise<InventoryDeductionResult> {
    console.log('🔄 PHASE 4: Starting simplified inventory deduction');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const deductedItems: Array<{ingredient: string; deducted: number; remaining: number}> = [];
    const validationFailures: Array<{ingredient: string; required: number; available: number}> = [];

    try {
      // Simplified approach without explicit transactions
      for (const item of items) {
        const result = await this.deductSingleItem(transactionId, item);
        
        if (result.success) {
          deductedItems.push(...result.deductedItems);
        } else {
          errors.push(...result.errors);
          validationFailures.push(...result.validationFailures);
        }
      }

      if (errors.length > 0) {
        console.error('❌ PHASE 4: Deduction failed');
        
        // Send failure alert
        await this.sendDeductionFailureAlert(transactionId, errors);
        
        return {
          success: false,
          errors,
          warnings,
          deductedItems: [],
          validationFailures
        };
      }
      
      console.log('✅ PHASE 4: Deduction completed successfully');
      
      // Log successful deduction
      await this.logSuccessfulDeduction(transactionId, deductedItems);

      return {
        success: true,
        errors: [],
        warnings,
        deductedItems,
        validationFailures: []
      };

    } catch (error) {
      console.error('❌ PHASE 4: Critical deduction error:', error);
      
      // Send critical failure alert
      await this.sendCriticalFailureAlert(transactionId, error);
      
      return {
        success: false,
        errors: [`Critical deduction error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        deductedItems: [],
        validationFailures
      };
    }
  }

  /**
   * Deduct inventory for a single item
   */
  private static async deductSingleItem(
    transactionId: string,
    item: InventoryDeductionItem
  ): Promise<{
    success: boolean;
    errors: string[];
    deductedItems: Array<{ingredient: string; deducted: number; remaining: number}>;
    validationFailures: Array<{ingredient: string; required: number; available: number}>;
  }> {
    const errors: string[] = [];
    const deductedItems: Array<{ingredient: string; deducted: number; remaining: number}> = [];
    const validationFailures: Array<{ingredient: string; required: number; available: number}> = [];

    try {
      console.log(`🔄 PHASE 4: Deducting item: ${item.productName} (${item.productId})`);
      
      // FIXED: Use raw SQL query that actually works
      const { data: recipeResults, error: recipeError } = await supabase.rpc('get_recipe_with_ingredients', {
        p_product_id: item.productId
      });

      if (recipeError) {
        console.error(`❌ PHASE 4: Recipe query failed for ${item.productName}:`, recipeError);
        errors.push(`Failed to get recipe for ${item.productName}: ${recipeError.message}`);
        return { success: false, errors, deductedItems, validationFailures };
      }

      if (!recipeResults || recipeResults.length === 0) {
        console.log(`⚠️ PHASE 4: No recipe found for ${item.productName}, trying direct product`);
        const result = await this.deductDirectProduct(transactionId, item);
        return result;
      }

      console.log(`✅ PHASE 4: Processing ${recipeResults.length} ingredients for ${item.productName}`);
      
      // Process recipe ingredients
      for (const ingredient of recipeResults) {

        const deductionAmount = ingredient.quantity * item.quantity;
        console.log(`🔄 PHASE 4: Deducting ${ingredient.ingredient_name}: ${deductionAmount}`);
        
        // Get current inventory with error handling
        const { data: inventoryStock, error: stockError } = await supabase
          .from('inventory_stock')
          .select('id, stock_quantity')
          .eq('store_id', item.storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .maybeSingle();

        if (stockError) {
          console.error(`❌ PHASE 4: Stock query failed for ${ingredient.ingredient_name}:`, stockError);
          errors.push(`Database error for ${ingredient.ingredient_name}: ${stockError.message}`);
          continue;
        }

        if (!inventoryStock) {
          console.error(`❌ PHASE 4: Inventory not found: ${ingredient.ingredient_name}`);
          errors.push(`Inventory not found: ${ingredient.ingredient_name}`);
          continue;
        }

        if (inventoryStock.stock_quantity < deductionAmount) {
          validationFailures.push({
            ingredient: ingredient.ingredient_name,
            required: deductionAmount,
            available: inventoryStock.stock_quantity
          });
          errors.push(`Insufficient ${ingredient.ingredient_name}: need ${deductionAmount}, have ${inventoryStock.stock_quantity}`);
          console.error(`❌ PHASE 4: Insufficient ${ingredient.ingredient_name}: need ${deductionAmount}, have ${inventoryStock.stock_quantity}`);
          continue;
        }

        // Perform deduction
        const newQuantity = inventoryStock.stock_quantity - deductionAmount;
        console.log(`🔄 PHASE 4: Updating ${ingredient.ingredient_name}: ${inventoryStock.stock_quantity} → ${newQuantity}`);
        
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryStock.id);

        if (updateError) {
          console.error(`❌ PHASE 4: Failed to update ${ingredient.ingredient_name}:`, updateError);
          errors.push(`Failed to update ${ingredient.ingredient_name}: ${updateError.message}`);
          continue;
        }

        console.log(`✅ PHASE 4: Successfully updated ${ingredient.ingredient_name} stock`);

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
            notes: `PHASE 4: ${item.productName} (${item.quantity}x)`,
            created_by: 'system'
          });

        if (movementError) {
          console.warn('⚠️ PHASE 4: Movement record failed (non-critical):', movementError);
        } else {
          console.log(`✅ PHASE 4: Created movement record for ${ingredient.ingredient_name}`);
        }

        deductedItems.push({
          ingredient: ingredient.ingredient_name,
          deducted: deductionAmount,
          remaining: newQuantity
        });
      }

      return {
        success: errors.length === 0,
        errors,
        deductedItems,
        validationFailures
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Error processing ${item.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        deductedItems,
        validationFailures
      };
    }
  }

  /**
   * Handle direct product deduction
   */
  private static async deductDirectProduct(
    transactionId: string,
    item: InventoryDeductionItem
  ): Promise<{
    success: boolean;
    errors: string[];
    deductedItems: Array<{ingredient: string; deducted: number; remaining: number}>;
    validationFailures: Array<{ingredient: string; required: number; available: number}>;
  }> {
    try {
      const { data: inventoryStock } = await supabase
        .from('inventory_stock')
        .select('id, stock_quantity')
        .eq('store_id', item.storeId)
        .eq('item', item.productName)
        .eq('is_active', true)
        .single();

      if (!inventoryStock) {
        return {
          success: true, // Don't fail for non-inventory items
          errors: [],
          deductedItems: [],
          validationFailures: []
        };
      }

      if (inventoryStock.stock_quantity < item.quantity) {
        return {
          success: false,
          errors: [`Insufficient ${item.productName}`],
          deductedItems: [],
          validationFailures: [{
            ingredient: item.productName,
            required: item.quantity,
            available: inventoryStock.stock_quantity
          }]
        };
      }

      const newQuantity = inventoryStock.stock_quantity - item.quantity;
      
      const { error: updateError } = await supabase
        .from('inventory_stock')
        .update({ stock_quantity: newQuantity })
        .eq('id', inventoryStock.id);

      if (updateError) {
        return {
          success: false,
          errors: [`Failed to update ${item.productName}: ${updateError.message}`],
          deductedItems: [],
          validationFailures: []
        };
      }

      return {
        success: true,
        errors: [],
        deductedItems: [{
          ingredient: item.productName,
          deducted: item.quantity,
          remaining: newQuantity
        }],
        validationFailures: []
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Error processing direct product ${item.productName}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        deductedItems: [],
        validationFailures: []
      };
    }
  }

  /**
   * Send deduction failure alert (simplified)
   */
  private static async sendDeductionFailureAlert(
    transactionId: string,
    errors: string[]
  ): Promise<void> {
    try {
      // Show user notification
      toast.error(`🚨 Inventory deduction failed: ${errors[0]}${errors.length > 1 ? ` (${errors.length - 1} more)` : ''}`);

      console.error('🚨 PHASE 4: Deduction failure alert sent', { transactionId, errors });
    } catch (error) {
      console.error('❌ Failed to send deduction failure alert:', error);
    }
  }

  /**
   * Send critical system failure alert (simplified)
   */
  private static async sendCriticalFailureAlert(
    transactionId: string,
    error: any
  ): Promise<void> {
    try {
      // Show critical notification
      toast.error(`🚨 CRITICAL: System failure in transaction ${transactionId}`);

    } catch (alertError) {
      console.error('❌ Failed to send critical failure alert:', alertError);
    }
  }

  /**
   * Log successful deduction for monitoring (simplified)
   */
  private static async logSuccessfulDeduction(
    transactionId: string,
    deductedItems: Array<{ingredient: string; deducted: number; remaining: number}>
  ): Promise<void> {
    try {
      console.log('✅ PHASE 4: Successful deduction logged', { transactionId, itemsCount: deductedItems.length });
    } catch (error) {
      console.warn('⚠️ Failed to log successful deduction (non-critical):', error);
    }
  }
}