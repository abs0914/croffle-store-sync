import { supabase } from "@/integrations/supabase/client";
import { validateProductsForInventory } from "@/services/inventory/inventoryValidationService";
import { transactionRepairService } from "./transactionRepairService";

interface InventorySyncOptions {
  skipOnFailure?: boolean;
  allowPartialSync?: boolean;
  repairOnFailure?: boolean;
}

interface InventorySyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsFailed: number;
  repairAttempted?: boolean;
  warnings: string[];
  errors: string[];
  canProceedWithTransaction: boolean;
}

class ResilientInventoryService {
  private static instance: ResilientInventoryService;

  static getInstance(): ResilientInventoryService {
    if (!ResilientInventoryService.instance) {
      ResilientInventoryService.instance = new ResilientInventoryService();
    }
    return ResilientInventoryService.instance;
  }

  /**
   * Enhanced inventory sync with resilience options
   */
  async syncInventoryWithResilience(
    transactionId: string,
    storeId: string,
    items: Array<{ productId: string; name: string; quantity: number }>,
    options: InventorySyncOptions = {}
  ): Promise<InventorySyncResult> {
    const result: InventorySyncResult = {
      success: false,
      itemsProcessed: 0,
      itemsFailed: 0,
      warnings: [],
      errors: [],
      canProceedWithTransaction: false
    };

    console.log('🔄 Starting resilient inventory sync for transaction:', transactionId);

    try {
      // Step 1: Validate all products
      const productIds = items.map(item => item.productId);
      const validationResults = await validateProductsForInventory(productIds);

      const validItems: typeof items = [];
      const invalidItems: typeof items = [];

      items.forEach(item => {
        const validation = validationResults.get(item.productId);
        if (validation?.isValid && validation.canDeductInventory) {
          validItems.push(item);
        } else {
          invalidItems.push(item);
          result.warnings.push(`${item.name}: ${validation?.reason || 'Unknown issue'}`);
        }
      });

      // Step 2: Attempt repair if enabled and there are invalid items
      if (options.repairOnFailure && invalidItems.length > 0) {
        console.log('🔧 Attempting repair for', invalidItems.length, 'invalid items');
        
        const repairResult = await transactionRepairService.repairTransactionItems(
          invalidItems.map(item => ({
            id: item.productId,
            product_name: item.name,
            quantity: item.quantity,
            price: 0 // Price not needed for repair
          })),
          storeId
        );

        result.repairAttempted = true;

        // Re-validate repaired items
        for (const repairLog of repairResult.repairLog) {
          if (repairLog.success && repairLog.repaired) {
            const repairedItem = invalidItems.find(item => 
              repairResult.items.some(ri => ri.product_name === item.name)
            );
            if (repairedItem) {
              validItems.push(repairedItem);
              invalidItems.splice(invalidItems.indexOf(repairedItem), 1);
              result.warnings.push(`Repaired: ${repairedItem.name}`);
            }
          }
        }
      }

      // Step 3: Process valid items
      for (const item of validItems) {
        try {
          const syncSuccess = await this.deductInventoryForItem(item, storeId);
          if (syncSuccess) {
            result.itemsProcessed++;
          } else {
            result.itemsFailed++;
            result.errors.push(`Failed to deduct inventory for: ${item.name}`);
          }
        } catch (error) {
          result.itemsFailed++;
          result.errors.push(`Error processing ${item.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }

      // Step 4: Determine if transaction can proceed
      const totalItems = items.length;
      const successRate = result.itemsProcessed / totalItems;

      if (options.allowPartialSync) {
        // Allow transaction if at least 50% of items were processed successfully
        result.canProceedWithTransaction = successRate >= 0.5;
        if (successRate < 1) {
          result.warnings.push(`Partial inventory sync: ${result.itemsProcessed}/${totalItems} items processed`);
        }
      } else if (options.skipOnFailure) {
        // Always allow transaction, but log issues
        result.canProceedWithTransaction = true;
        if (result.itemsFailed > 0) {
          result.warnings.push(`Inventory sync skipped for ${result.itemsFailed} items`);
        }
      } else {
        // Default: require all items to be processed successfully
        result.canProceedWithTransaction = result.itemsFailed === 0;
      }

      result.success = result.canProceedWithTransaction;

      // Log the sync result
      await this.logInventorySyncResult(transactionId, result);

      console.log('✅ Resilient inventory sync completed:', {
        processed: result.itemsProcessed,
        failed: result.itemsFailed,
        canProceed: result.canProceedWithTransaction
      });

      return result;

    } catch (error) {
      console.error('🚨 Resilient inventory sync error:', error);
      
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      result.canProceedWithTransaction = options.skipOnFailure || false;

      return result;
    }
  }

  /**
   * Deduct inventory for a single item
   */
  private async deductInventoryForItem(
    item: { productId: string; name: string; quantity: number },
    storeId: string
  ): Promise<boolean> {
    try {
      // Get product with recipe ingredients
      const { data: product, error } = await supabase
        .from('product_catalog')
        .select(`
          id,
          recipe_id,
          recipes!inner(
            id,
            recipe_ingredients(
              ingredient_id,
              quantity,
              unit,
              inventory_stock(id, item, stock_quantity, fractional_stock_quantity)
            )
          )
        `)
        .eq('id', item.productId)
        .single();

      if (error || !product?.recipes?.recipe_ingredients) {
        console.warn('⚠️ No recipe ingredients found for:', item.name);
        return false;
      }

      // Deduct inventory for each ingredient
      for (const ingredient of product.recipes.recipe_ingredients) {
        if (!ingredient.inventory_stock) continue;

        const requiredQuantity = ingredient.quantity * item.quantity;
        const currentStock = ingredient.inventory_stock.stock_quantity || 0;
        const currentFractional = ingredient.inventory_stock.fractional_stock_quantity || 0;

        if (currentStock < requiredQuantity && currentFractional < requiredQuantity) {
          console.warn('⚠️ Insufficient stock for ingredient:', ingredient.inventory_stock.item);
          continue; // Continue with other ingredients rather than fail completely
        }

        // Update inventory
        const newStock = Math.max(0, currentStock - requiredQuantity);
        const newFractional = Math.max(0, currentFractional - requiredQuantity);

        await supabase
          .from('inventory_stock')
          .update({
            stock_quantity: newStock,
            fractional_stock_quantity: newFractional,
            updated_at: new Date().toISOString()
          })
          .eq('id', ingredient.inventory_stock.id);
      }

      return true;
    } catch (error) {
      console.error('❌ Error deducting inventory for', item.name, error);
      return false;
    }
  }

  /**
   * Log inventory sync results for audit
   */
  private async logInventorySyncResult(
    transactionId: string,
    result: InventorySyncResult
  ): Promise<void> {
    try {
      await supabase.rpc('log_inventory_sync_result', {
        p_transaction_id: transactionId,
        p_sync_status: result.success ? 'success' : 'partial_failure',
        p_error_details: result.errors.join('; ') || null,
        p_items_processed: result.itemsProcessed,
        p_sync_duration_ms: 0, // Could be calculated if needed
        p_affected_inventory_items: JSON.stringify({
          processed: result.itemsProcessed,
          failed: result.itemsFailed,
          warnings: result.warnings
        })
      });
    } catch (error) {
      console.error('⚠️ Failed to log inventory sync result:', error);
    }
  }
}

export const resilientInventoryService = ResilientInventoryService.getInstance();