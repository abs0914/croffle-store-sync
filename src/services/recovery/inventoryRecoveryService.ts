import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecoveryResult {
  success: boolean;
  processedTransactions: number;
  failedTransactions: number;
  inventoryDeductions: number;
  errors: string[];
  summary: string;
}

export interface TransactionItem {
  transactionId: string;
  productId: string;
  productName: string;
  quantity: number;
  receiptNumber: string;
  createdAt: string;
}

/**
 * Comprehensive Inventory Recovery Service
 * Handles retroactive inventory deduction for missed transactions
 */
export class InventoryRecoveryService {
  
  /**
   * Deploy missing products from product_catalog to products table for a specific store
   */
  static async deployMissingProducts(storeId: string): Promise<{ deployed: number; errors: string[] }> {
    try {
      console.log('🔄 Starting product deployment for store:', storeId);
      
      // Use the existing deployment function
      const { data: deployResult, error } = await supabase
        .rpc('deploy_products_to_all_stores');

      if (error) {
        throw error;
      }

      const result = deployResult[0];
      console.log('✅ Product deployment completed:', result);
      
      return {
        deployed: result.deployed_count || 0,
        errors: result.details || []
      };
    } catch (error) {
      console.error('❌ Product deployment failed:', error);
      return {
        deployed: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Process retroactive inventory deduction for a specific date and store
   */
  static async processRetroactiveDeduction(
    storeId: string, 
    targetDate: string
  ): Promise<RecoveryResult> {
    try {
      console.log('🔄 Starting retroactive inventory deduction:', { storeId, targetDate });
      
      // Get all completed transactions for the target date
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select(`
          id,
          receipt_number,
          created_at,
          transaction_items (
            product_id,
            name,
            quantity
          )
        `)
        .eq('store_id', storeId)
        .gte('created_at', `${targetDate} 00:00:00`)
        .lt('created_at', `${targetDate.split('T')[0]} 23:59:59`)
        .eq('status', 'completed');

      if (transactionError) {
        throw transactionError;
      }

      if (!transactions || transactions.length === 0) {
        return {
          success: true,
          processedTransactions: 0,
          failedTransactions: 0,
          inventoryDeductions: 0,
          errors: [],
          summary: 'No transactions found for the specified date'
        };
      }

      console.log(`📦 Found ${transactions.length} transactions to process`);

      let processedCount = 0;
      let failedCount = 0;
      let deductionCount = 0;
      const errors: string[] = [];

      // Process each transaction
      for (const transaction of transactions) {
        try {
          console.log(`Processing transaction: ${transaction.receipt_number}`);
          
          let transactionSuccess = true;
          
          // Process each item in the transaction
          for (const item of transaction.transaction_items || []) {
            try {
              const success = await this.deductInventoryForProduct(
                item.product_id,
                item.quantity,
                transaction.id,
                `Retroactive deduction for ${transaction.receipt_number}`
              );
              
              if (success) {
                deductionCount++;
              } else {
                transactionSuccess = false;
                errors.push(`Failed to deduct inventory for ${item.name} in transaction ${transaction.receipt_number}`);
              }
            } catch (itemError) {
              transactionSuccess = false;
              const errorMsg = itemError instanceof Error ? itemError.message : String(itemError);
              errors.push(`Error processing ${item.name}: ${errorMsg}`);
            }
          }
          
          if (transactionSuccess) {
            processedCount++;
          } else {
            failedCount++;
          }
        } catch (transactionError) {
          failedCount++;
          const errorMsg = transactionError instanceof Error ? transactionError.message : String(transactionError);
          errors.push(`Transaction ${transaction.receipt_number}: ${errorMsg}`);
        }
      }

      const result: RecoveryResult = {
        success: failedCount === 0,
        processedTransactions: processedCount,
        failedTransactions: failedCount,
        inventoryDeductions: deductionCount,
        errors,
        summary: `Processed ${processedCount}/${transactions.length} transactions, ${deductionCount} inventory deductions`
      };

      console.log('✅ Retroactive deduction completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Retroactive deduction failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        processedTransactions: 0,
        failedTransactions: 0,
        inventoryDeductions: 0,
        errors: [errorMsg],
        summary: `Recovery failed: ${errorMsg}`
      };
    }
  }

  /**
   * Deduct inventory for a specific product (with error handling for missing products)
   */
  private static async deductInventoryForProduct(
    productId: string,
    quantity: number,
    transactionId: string,
    notes: string
  ): Promise<boolean> {
    try {
      // Import the existing deduction service
      const { deductIngredientsForProduct } = await import('@/services/productCatalog/ingredientDeductionService');
      
      const success = await deductIngredientsForProduct(productId, quantity, transactionId);
      
      if (success) {
        console.log(`✅ Inventory deducted for product ${productId}: ${quantity} units`);
      } else {
        console.warn(`⚠️ Failed to deduct inventory for product ${productId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Error deducting inventory for product ${productId}:`, error);
      return false;
    }
  }

  /**
   * Validate current inventory levels after recovery
   */
  static async validateInventoryLevels(storeId: string): Promise<{
    isValid: boolean;
    negativeStock: Array<{ item: string; currentStock: number }>;
    warnings: string[];
  }> {
    try {
      console.log('🔍 Validating inventory levels for store:', storeId);
      
      // Check for negative stock quantities
      const { data: negativeStockItems, error } = await supabase
        .from('inventory_stock')
        .select('item, stock_quantity')
        .eq('store_id', storeId)
        .lt('stock_quantity', 0)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      const warnings: string[] = [];
      
      // Check for items with very low stock
      const { data: lowStockItems } = await supabase
        .from('inventory_stock')
        .select('item, stock_quantity, minimum_threshold')
        .eq('store_id', storeId)
        .eq('is_active', true);

      lowStockItems?.forEach(item => {
        if (item.stock_quantity < (item.minimum_threshold || 10)) {
          warnings.push(`Low stock: ${item.item} (${item.stock_quantity} remaining)`);
        }
      });

      return {
        isValid: (negativeStockItems?.length || 0) === 0,
        negativeStock: negativeStockItems?.map(item => ({ item: item.item, currentStock: item.stock_quantity })) || [],
        warnings
      };
    } catch (error) {
      console.error('❌ Inventory validation failed:', error);
      return {
        isValid: false,
        negativeStock: [],
        warnings: ['Inventory validation failed']
      };
    }
  }

  /**
   * Comprehensive recovery execution for a specific store and date
   */
  static async executeComprehensiveRecovery(
    storeId: string,
    targetDate: string
  ): Promise<RecoveryResult> {
    try {
      console.log('🚀 Starting comprehensive inventory recovery:', { storeId, targetDate });
      
      // Phase 1: Deploy missing products
      console.log('📦 Phase 1: Deploying missing products...');
      const deployResult = await this.deployMissingProducts(storeId);
      
      if (deployResult.errors.length > 0) {
        console.warn('⚠️ Product deployment had issues:', deployResult.errors);
      }

      // Phase 2: Process retroactive deductions
      console.log('🔄 Phase 2: Processing retroactive deductions...');
      const recoveryResult = await this.processRetroactiveDeduction(storeId, targetDate);

      // Phase 3: Validate inventory levels
      console.log('🔍 Phase 3: Validating inventory levels...');
      const validationResult = await this.validateInventoryLevels(storeId);

      // Combine results
      const finalResult: RecoveryResult = {
        ...recoveryResult,
        errors: [...recoveryResult.errors, ...deployResult.errors],
        summary: `
Recovery completed:
- Products deployed: ${deployResult.deployed}
- Transactions processed: ${recoveryResult.processedTransactions}/${recoveryResult.processedTransactions + recoveryResult.failedTransactions}
- Inventory deductions: ${recoveryResult.inventoryDeductions}
- Inventory validation: ${validationResult.isValid ? 'PASSED' : 'FAILED'}
- Negative stock items: ${validationResult.negativeStock.length}
- Warnings: ${validationResult.warnings.length}
        `.trim()
      };

      console.log('✅ Comprehensive recovery completed:', finalResult);
      
      // Show user notification
      if (finalResult.success && validationResult.isValid) {
        toast.success(`Recovery completed successfully! Processed ${finalResult.processedTransactions} transactions with ${finalResult.inventoryDeductions} inventory deductions.`);
      } else {
        toast.warning(`Recovery completed with issues. Check console for details.`);
      }

      return finalResult;
    } catch (error) {
      console.error('❌ Comprehensive recovery failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      toast.error(`Recovery failed: ${errorMsg}`);
      
      return {
        success: false,
        processedTransactions: 0,
        failedTransactions: 0,
        inventoryDeductions: 0,
        errors: [errorMsg],
        summary: `Comprehensive recovery failed: ${errorMsg}`
      };
    }
  }
}