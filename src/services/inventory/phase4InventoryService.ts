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
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const insufficientItems: Array<{ingredient: string; required: number; available: number}> = [];
    
    try {
      for (const item of items) {
        // Get recipe ingredients for this product
        const { data: recipeData } = await supabase
          .from('recipes')
          .select(`
            id,
            recipe_ingredients (
              ingredient_name,
              quantity,
              unit
            )
          `)
          .eq('product_id', item.productId)
          .eq('is_active', true)
          .maybeSingle();

        if (!recipeData?.recipe_ingredients) {
          // Product doesn't use recipes - check if it's a direct inventory item
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
          continue;
        }

        // Validate recipe ingredients
        for (const ingredient of recipeData.recipe_ingredients) {
          const requiredQuantity = ingredient.quantity * item.quantity;
          
          // Find inventory stock for this ingredient
          const { data: inventoryStock } = await supabase
            .from('inventory_stock')
            .select('id, item, stock_quantity')
            .eq('store_id', item.storeId)
            .eq('item', ingredient.ingredient_name)
            .eq('is_active', true)
            .maybeSingle();

          if (!inventoryStock) {
            errors.push(`Missing inventory for ingredient: ${ingredient.ingredient_name}`);
            continue;
          }

          if (inventoryStock.stock_quantity < requiredQuantity) {
            insufficientItems.push({
              ingredient: ingredient.ingredient_name,
              required: requiredQuantity,
              available: inventoryStock.stock_quantity
            });
            errors.push(`Insufficient ${ingredient.ingredient_name}: need ${requiredQuantity}, have ${inventoryStock.stock_quantity}`);
          }
        }
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
      return {
        canProceed: false,
        errors: [`Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings,
        insufficientItems
      };
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
      // Start transaction
      const { data: transaction, error: txError } = await supabase.rpc('begin_transaction');
      if (txError) {
        throw new Error(`Failed to start transaction: ${txError.message}`);
      }

      try {
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
          // Rollback transaction
          await supabase.rpc('rollback_transaction');
          console.error('❌ PHASE 4: Deduction failed, transaction rolled back');
          
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

        // Commit transaction
        await supabase.rpc('commit_transaction');
        
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

      } catch (innerError) {
        // Rollback on any error
        await supabase.rpc('rollback_transaction');
        throw innerError;
      }

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
      // Get recipe for this product
      const { data: recipeData } = await supabase
        .from('recipes')
        .select(`
          id,
          recipe_ingredients (
            ingredient_name,
            quantity,
            unit
          )
        `)
        .eq('product_id', item.productId)
        .eq('is_active', true)
        .maybeSingle();

      if (!recipeData?.recipe_ingredients) {
        // Handle direct product
        const result = await this.deductDirectProduct(transactionId, item);
        return result;
      }

      // Process recipe ingredients
      for (const ingredient of recipeData.recipe_ingredients) {
        const deductionAmount = ingredient.quantity * item.quantity;
        
        // Get current inventory
        const { data: inventoryStock } = await supabase
          .from('inventory_stock')
          .select('id, stock_quantity')
          .eq('store_id', item.storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (!inventoryStock) {
          errors.push(`Inventory not found: ${ingredient.ingredient_name}`);
          continue;
        }

        if (inventoryStock.stock_quantity < deductionAmount) {
          validationFailures.push({
            ingredient: ingredient.ingredient_name,
            required: deductionAmount,
            available: inventoryStock.stock_quantity
          });
          errors.push(`Insufficient ${ingredient.ingredient_name}`);
          continue;
        }

        // Perform deduction
        const newQuantity = inventoryStock.stock_quantity - deductionAmount;
        
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventoryStock.id);

        if (updateError) {
          errors.push(`Failed to update ${ingredient.ingredient_name}: ${updateError.message}`);
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
            notes: `PHASE 4: ${item.productName} (${item.quantity}x)`,
            created_by: 'system'
          });

        if (movementError) {
          console.warn('Movement record failed (non-critical):', movementError);
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
   * Send real-time deduction failure alert
   */
  private static async sendDeductionFailureAlert(
    transactionId: string,
    errors: string[]
  ): Promise<void> {
    try {
      // Store alert in database for persistence
      await supabase
        .from('system_alerts')
        .insert({
          alert_type: 'inventory_deduction_failure',
          severity: 'high',
          title: 'Inventory Deduction Failed',
          message: `Transaction ${transactionId} failed inventory deduction: ${errors.join(', ')}`,
          metadata: {
            transaction_id: transactionId,
            errors,
            timestamp: new Date().toISOString()
          },
          is_resolved: false
        });

      // Show user notification
      toast.error(`🚨 Inventory deduction failed: ${errors[0]}${errors.length > 1 ? ` (${errors.length - 1} more)` : ''}`);

      console.error('🚨 PHASE 4: Deduction failure alert sent', { transactionId, errors });
    } catch (error) {
      console.error('❌ Failed to send deduction failure alert:', error);
    }
  }

  /**
   * Send critical system failure alert
   */
  private static async sendCriticalFailureAlert(
    transactionId: string,
    error: any
  ): Promise<void> {
    try {
      await supabase
        .from('system_alerts')
        .insert({
          alert_type: 'critical_system_failure',
          severity: 'critical',
          title: 'Critical Inventory System Failure',
          message: `URGENT: Critical failure in inventory deduction system for transaction ${transactionId}`,
          metadata: {
            transaction_id: transactionId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
          },
          is_resolved: false
        });

      toast.error('🚨 CRITICAL: Inventory system failure - IT support required');
      
      console.error('🚨 PHASE 4: Critical failure alert sent', { transactionId, error });
    } catch (alertError) {
      console.error('❌ Failed to send critical failure alert:', alertError);
    }
  }

  /**
   * Log successful deduction for monitoring
   */
  private static async logSuccessfulDeduction(
    transactionId: string,
    deductedItems: Array<{ingredient: string; deducted: number; remaining: number}>
  ): Promise<void> {
    try {
      await supabase
        .from('inventory_audit_log')
        .insert({
          transaction_id: transactionId,
          operation_type: 'deduction',
          status: 'success',
          items_processed: deductedItems.length,
          metadata: {
            deducted_items: deductedItems,
            timestamp: new Date().toISOString()
          }
        });

      console.log('✅ PHASE 4: Successful deduction logged', { transactionId, itemsCount: deductedItems.length });
    } catch (error) {
      console.warn('⚠️ Failed to log successful deduction (non-critical):', error);
    }
  }
}