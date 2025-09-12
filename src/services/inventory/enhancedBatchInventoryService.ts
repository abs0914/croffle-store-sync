import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BatchInventoryDeduction {
  transactionId: string;
  receiptNumber: string;
  storeId: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
  processedIngredients?: number;
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: BatchInventoryDeduction[];
  errors: string[];
}

export const enhancedBatchInventoryService = {
  // Process inventory deductions for multiple transactions
  async processBatchDeductions(transactions: any[]): Promise<BatchProcessingResult> {
    const results: BatchInventoryDeduction[] = [];
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    toast.info(`Processing ${transactions.length} transactions...`);

    for (const transaction of transactions) {
      try {
        const deductionResult = await this.processTransactionInventory(transaction);
        results.push(deductionResult);
        
        if (deductionResult.status === 'success') {
          successful++;
        } else {
          failed++;
          if (deductionResult.error) {
            errors.push(`${transaction.receipt_number}: ${deductionResult.error}`);
          }
        }
      } catch (error) {
        failed++;
        const errorMsg = `Failed to process ${transaction.receipt_number}: ${error}`;
        errors.push(errorMsg);
        
        results.push({
          transactionId: transaction.id,
          receiptNumber: transaction.receipt_number,
          storeId: transaction.store_id,
          items: transaction.transaction_items || [],
          status: 'failed',
          error: errorMsg
        });
      }
    }

    const result = {
      totalProcessed: transactions.length,
      successful,
      failed,
      results,
      errors
    };

    if (successful > 0) {
      toast.success(`✅ Successfully processed ${successful} transactions`);
    }
    
    if (failed > 0) {
      toast.error(`❌ Failed to process ${failed} transactions`);
    }

    return result;
  },

  // Process inventory deduction for a single transaction
  async processTransactionInventory(transaction: any): Promise<BatchInventoryDeduction> {
    try {
      // Get transaction items
      const { data: transactionItems, error: itemsError } = await supabase
        .from('transaction_items')
        .select('name, quantity')
        .eq('transaction_id', transaction.id);

      if (itemsError) {
        throw new Error(`Failed to get transaction items: ${itemsError.message}`);
      }

      const items = transactionItems || [];
      let processedIngredients = 0;

      // Process each transaction item
      for (const item of items) {
        const ingredientResult = await this.deductIngredientsForItem(
          item.name, 
          item.quantity, 
          transaction.store_id
        );
        processedIngredients += ingredientResult.ingredientsProcessed;
      }

      return {
        transactionId: transaction.id,
        receiptNumber: transaction.receipt_number,
        storeId: transaction.store_id,
        items,
        status: 'success',
        processedIngredients
      };
    } catch (error) {
      console.error('Error processing transaction inventory:', error);
      
      return {
        transactionId: transaction.id,
        receiptNumber: transaction.receipt_number || 'N/A',
        storeId: transaction.store_id,
        items: [],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Deduct ingredients for a specific item
  async deductIngredientsForItem(
    itemName: string, 
    quantity: number, 
    storeId: string
  ): Promise<{ ingredientsProcessed: number; errors: string[] }> {
    try {
      // Find recipe ingredients for this item
const { data: recipeIngredients, error: recipeError } = await supabase
  .from('recipe_ingredients')
  .select(`
    inventory_stock_id,
    quantity,
    unit,
    recipe_id,
    inventory_stock!inner(
      id,
      item,
      stock_quantity
    ),
    recipes!inner(
      name,
      store_id
    )
  `)
  .eq('recipes.name', itemName)
  .eq('recipes.store_id', storeId)
  .eq('recipes.is_active', true);

      if (recipeError) {
        throw new Error(`Recipe lookup failed: ${recipeError.message}`);
      }

      if (!recipeIngredients || recipeIngredients.length === 0) {
        return { ingredientsProcessed: 0, errors: [`No recipe found for ${itemName}`] };
      }

      const errors: string[] = [];
      let ingredientsProcessed = 0;

      // Process each ingredient directly using joined inventory_stock
      for (const ingredient of recipeIngredients) {
        try {
          const inventory = (ingredient as any).inventory_stock as { id: string; item: string; stock_quantity: number } | null;
          if (!inventory || !ingredient.inventory_stock_id) {
            errors.push(`No inventory linked for ingredient (unit: ${ingredient.unit})`);
            continue;
          }
          const required = (ingredient.quantity || 0) * quantity;
          const available = inventory.stock_quantity || 0;
          if (available < required) {
            errors.push(`${inventory.item}: need ${required}, have ${available}`);
            continue;
          }
          const newQty = available - required;
          const { error: updErr } = await supabase
            .from('inventory_stock')
            .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', inventory.id);
          if (updErr) {
            errors.push(`${inventory.item}: update failed - ${updErr.message}`);
          } else {
            ingredientsProcessed++;
          }
        } catch (e) {
          errors.push(e instanceof Error ? e.message : 'Unknown error');
        }
      }

      return { ingredientsProcessed, errors };
    } catch (error) {
      console.error('Error deducting ingredients for item:', error);
      return { 
        ingredientsProcessed: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  },

  // Deduct a single ingredient from inventory (deprecated - mappings removed)
  async deductSingleIngredient(
    _ingredientName: string,
    _quantityToDeduct: number,
    _storeId: string
  ): Promise<void> {
    throw new Error('Deprecated function - use direct deduction from recipe_ingredients with inventory_stock join');
  },

  // Validate inventory readiness for transactions
  async validateInventoryReadiness(transactions: any[]): Promise<{
    ready: boolean;
    issues: string[];
    missingMappings: string[];
    insufficientStock: string[];
  }> {
    const issues: string[] = [];
    const missingMappings: string[] = [];
    const insufficientStock: string[] = [];

    try {
      for (const transaction of transactions) {
        // Get transaction items (simplified - would need proper query in real implementation)
        const items = transaction.transaction_items || [];
        
        for (const item of items) {
          // Check if recipe exists and has ingredients
          const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .select('id, name')
            .eq('name', item.name)
            .eq('store_id', transaction.store_id)
            .eq('is_active', true)
            .maybeSingle();

          if (recipeError || !recipe) {
            issues.push(`No active recipe found for ${item.name}`);
            continue;
          }

          // Check ingredient mappings and stock levels
          const { data: ingredients, error: ingredientsError } = await supabase
            .from('recipe_ingredients')
            .select(`
              quantity,
              inventory_stock_id,
              inventory_stock(stock_quantity)
            `)
            .eq('recipe_id', recipe.id);

          if (ingredientsError) {
            issues.push(`Failed to check ingredients for ${item.name}: ${ingredientsError.message}`);
            continue;
          }

          for (const ingredient of ingredients || []) {
            const requiredQuantity = (ingredient.quantity || 0) * item.quantity;
            const availableStock = (ingredient as any).inventory_stock?.stock_quantity || 0;

            if (availableStock < requiredQuantity) {
              insufficientStock.push(
                `ingredient: need ${requiredQuantity}, have ${availableStock}`
              );
            }
          }
        }
      }

      return {
        ready: issues.length === 0 && missingMappings.length === 0 && insufficientStock.length === 0,
        issues,
        missingMappings,
        insufficientStock
      };
    } catch (error) {
      console.error('Error validating inventory readiness:', error);
      return {
        ready: false,
        issues: [`Validation failed: ${error}`],
        missingMappings: [],
        insufficientStock: []
      };
    }
  },

  // Get processing statistics
  async getProcessingStats(storeId?: string): Promise<{
    totalTransactions: number;
    processedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    lastProcessedAt: string | null;
  }> {
    try {
      // This would need proper implementation with transaction tracking
      // For now, return placeholder stats
      return {
        totalTransactions: 0,
        processedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        lastProcessedAt: null
      };
    } catch (error) {
      console.error('Error getting processing stats:', error);
      return {
        totalTransactions: 0,
        processedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        lastProcessedAt: null
      };
    }
  }
};

/**
 * Enhanced batch inventory deduction function for transactions with Mix & Match support
 * This is the main function expected by the integration layer
 */
export const enhancedBatchDeductInventoryForTransaction = async (
  transactionId: string,
  storeId: string,
  transactionItems: Array<{
    product_id?: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>,
  timeoutMs: number = 30000
): Promise<{
  success: boolean;
  deductedItems: any[];
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
  itemsProcessed: number;
}> => {
  const startTime = Date.now();
  
  console.log(`🎯 Enhanced batch deduction starting for transaction ${transactionId}`);
  
  try {
    // Convert transaction items to the format expected by the batch service
    const mockTransaction = {
      id: transactionId,
      receipt_number: `TXN-${transactionId}`,
      store_id: storeId,
      transaction_items: transactionItems.map(item => ({
        name: item.name,
        quantity: item.quantity
      }))
    };
    
    // Use the enhanced batch inventory service to process the transaction
    const result = await enhancedBatchInventoryService.processTransactionInventory(mockTransaction);
    
    const processingTimeMs = Date.now() - startTime;
    
    if (result.status === 'success') {
      console.log(`✅ Enhanced batch deduction completed successfully in ${processingTimeMs}ms`);
      
      return {
        success: true,
        deductedItems: result.items || [],
        errors: [],
        warnings: [],
        processingTimeMs,
        itemsProcessed: result.processedIngredients || 0
      };
    } else {
      console.log(`⚠️ Enhanced batch deduction completed with errors: ${result.error}`);
      
      return {
        success: false,
        deductedItems: [],
        errors: [result.error || 'Unknown error'],
        warnings: [],
        processingTimeMs,
        itemsProcessed: 0
      };
    }
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    console.error(`❌ Enhanced batch deduction failed:`, error);
    
    return {
      success: false,
      deductedItems: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
      processingTimeMs,
      itemsProcessed: 0
    };
  }
};