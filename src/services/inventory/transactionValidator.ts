import { supabase } from "@/integrations/supabase/client";
import { InventorySyncMonitor } from "./inventorySyncMonitor";
import { toast } from "sonner";

export interface TransactionValidationResult {
  canComplete: boolean;
  errors: string[];
  warnings: string[];
  syncStatus?: string;
  recommendedActions: string[];
}

export interface PreTransactionValidation {
  isValid: boolean;
  issues: string[];
  missingIngredients: Array<{
    productName: string;
    ingredientName: string;
    required: number;
    available: number;
  }>;
}

export class TransactionValidator {
  private static instance: TransactionValidator;

  static getInstance(): TransactionValidator {
    if (!TransactionValidator.instance) {
      TransactionValidator.instance = new TransactionValidator();
    }
    return TransactionValidator.instance;
  }

  /**
   * Validate transaction before completion
   */
  async validateTransactionCompletion(transactionId: string): Promise<TransactionValidationResult> {
    console.log('🔍 Validating transaction for completion:', transactionId);

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendedActions: string[] = [];

    try {
      // 1. Check if transaction exists and is in valid state
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .maybeSingle();

      if (transactionError) {
        errors.push(`Failed to fetch transaction: ${transactionError.message}`);
        return { canComplete: false, errors, warnings, recommendedActions };
      }

      if (!transaction) {
        errors.push('Transaction not found');
        return { canComplete: false, errors, warnings, recommendedActions };
      }

      if (transaction.status === 'completed') {
        warnings.push('Transaction is already completed');
      }

      // 2. Validate inventory sync status using the monitor
      const monitor = InventorySyncMonitor.getInstance();
      const syncValidation = await monitor.validateTransactionSync(transactionId);
      
      if (!syncValidation.isValid) {
        errors.push(...syncValidation.errors);
        recommendedActions.push('Review inventory sync issues before completing transaction');
      }
      
      warnings.push(...syncValidation.warnings);

      // 3. Check for transaction items without proper inventory sync
      const { data: transactionItems, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId);

      if (itemsError) {
        errors.push(`Failed to fetch transaction items: ${itemsError.message}`);
        return { canComplete: false, errors, warnings, recommendedActions };
      }

      if (!transactionItems || transactionItems.length === 0) {
        errors.push('Transaction has no items');
        return { canComplete: false, errors, warnings, recommendedActions };
      }

      // 4. Verify inventory movements exist for recipe-based products
      const { count: movementCount } = await supabase
        .from('inventory_movements')
        .select('*', { count: 'exact', head: true })
        .eq('reference_id', transactionId)
        .eq('reference_type', 'transaction');

      const actualMovements = movementCount || 0;

      if (transactionItems.length > actualMovements) {
        // Check if all items are direct products (which should have movements)
        const { data: directProducts } = await supabase
          .from('inventory_stock')
          .select('id, item')
          .eq('store_id', transaction.store_id)
          .in('item', transactionItems.map(item => item.product_type || ''));

        if (directProducts && directProducts.length > 0 && actualMovements === 0) {
          errors.push('No inventory movements found for direct products');
          recommendedActions.push('Check inventory deduction service and product mappings');
        }
      }

      // 5. Check for negative inventory levels that might result from this transaction
      const { data: lowStockItems } = await supabase
        .from('inventory_stock')
        .select('item, stock_quantity')
        .eq('store_id', transaction.store_id)
        .lt('stock_quantity', 0);

      if (lowStockItems && lowStockItems.length > 0) {
        warnings.push(`${lowStockItems.length} items have negative stock levels`);
        recommendedActions.push('Review negative stock items and adjust inventory');
      }

      // 6. Final determination
      const canComplete = errors.length === 0;

      return {
        canComplete,
        errors,
        warnings,
        syncStatus: syncValidation.isValid ? 'valid' : 'invalid',
        recommendedActions
      };

    } catch (error) {
      console.error('❌ Error validating transaction:', error);
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        canComplete: false,
        errors,
        warnings,
        recommendedActions: ['Fix validation errors before retrying']
      };
    }
  }

  /**
   * Pre-validate transaction items before processing
   */
  async preValidateTransaction(storeId: string, items: Array<{
    productId: string;
    quantity: number;
    productName?: string;
  }>): Promise<PreTransactionValidation> {
    console.log('🔍 Pre-validating transaction items...');

    const issues: string[] = [];
    const missingIngredients: Array<{
      productName: string;
      ingredientName: string;
      required: number;
      available: number;
    }> = [];

    try {
      for (const item of items) {
        // Check if product exists and has proper configuration
        const { data: productInfo, error: productError } = await supabase
          .from('product_catalog')
          .select('product_name, recipe_id, store_id')
          .eq('id', item.productId)
          .eq('store_id', storeId)
          .maybeSingle();

        if (productError) {
          issues.push(`Error fetching product ${item.productId}: ${productError.message}`);
          continue;
        }

        if (!productInfo) {
          issues.push(`Product ${item.productId} not found in catalog`);
          continue;
        }

        // Check for direct inventory mapping
        const { data: directInventory } = await supabase
          .from('inventory_stock')
          .select('item, stock_quantity')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .or(`item.ilike.${productInfo.product_name},item.ilike.%${productInfo.product_name}%`)
          .limit(1)
          .maybeSingle();

        if (directInventory) {
          // Direct inventory product - check stock
          if (directInventory.stock_quantity < item.quantity) {
            missingIngredients.push({
              productName: productInfo.product_name,
              ingredientName: directInventory.item,
              required: item.quantity,
              available: directInventory.stock_quantity
            });
          }
          continue;
        }

        // Recipe-based product - check ingredient availability
        if (productInfo.recipe_id) {
          const { data: recipeIngredients } = await supabase
            .from('recipe_ingredients')
            .select(`
              ingredient_name,
              quantity,
              unit,
              inventory_stock:inventory_stock_id (
                item,
                stock_quantity
              )
            `)
            .eq('recipe_id', productInfo.recipe_id);

          if (recipeIngredients) {
            for (const ingredient of recipeIngredients) {
              if (ingredient.inventory_stock) {
                const requiredQuantity = ingredient.quantity * item.quantity;
                const availableQuantity = ingredient.inventory_stock.stock_quantity || 0;

                if (availableQuantity < requiredQuantity) {
                  missingIngredients.push({
                    productName: productInfo.product_name,
                    ingredientName: ingredient.ingredient_name,
                    required: requiredQuantity,
                    available: availableQuantity
                  });
                }
              } else {
                issues.push(`Ingredient "${ingredient.ingredient_name}" for product "${productInfo.product_name}" has no inventory mapping`);
              }
            }
          }
        } else {
          // No recipe and no direct inventory mapping
          issues.push(`Product "${productInfo.product_name}" has no recipe or direct inventory mapping`);
        }
      }

      const isValid = issues.length === 0 && missingIngredients.length === 0;

      return {
        isValid,
        issues,
        missingIngredients
      };

    } catch (error) {
      console.error('❌ Error in pre-validation:', error);
      return {
        isValid: false,
        issues: [`Pre-validation error: ${error instanceof Error ? error.message : String(error)}`],
        missingIngredients: []
      };
    }
  }

  /**
   * Show validation results to user
   */
  showValidationResults(validation: TransactionValidationResult): void {
    if (!validation.canComplete) {
      // Show critical errors
      toast.error(`Transaction cannot be completed: ${validation.errors.join(', ')}`);
      
      if (validation.recommendedActions.length > 0) {
        console.log('📋 Recommended actions:', validation.recommendedActions);
      }
    } else if (validation.warnings.length > 0) {
      // Show warnings but allow completion
      toast.warning(`Transaction has warnings: ${validation.warnings.join(', ')}`);
    }
  }

  /**
   * Show pre-validation results
   */
  showPreValidationResults(validation: PreTransactionValidation): void {
    if (!validation.isValid) {
      if (validation.missingIngredients.length > 0) {
        const ingredientList = validation.missingIngredients
          .map(ing => `${ing.ingredientName}: need ${ing.required}, have ${ing.available}`)
          .join(', ');
        
        toast.error(`Insufficient ingredients: ${ingredientList}`);
      }

      if (validation.issues.length > 0) {
        toast.error(`Product configuration issues: ${validation.issues.join(', ')}`);
      }
    }
  }
}

// Export singleton instance
export const transactionValidator = TransactionValidator.getInstance();