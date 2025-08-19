import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TransactionValidationService } from "@/services/validation/transactionValidationService";
import { handleTransactionInventoryUpdate } from "@/services/transactions/inventoryIntegrationService";
import { logInventoryTransaction } from "@/services/transactionService";

export interface EnhancedTransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface EnhancedTransactionRequest {
  storeId: string;
  items: EnhancedTransactionItem[];
  customerId?: string;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  cashierId?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  receiptNumber?: string;
  errors: string[];
  warnings: string[];
  validationsPassed: boolean;
  inventoryUpdated: boolean;
}

/**
 * Enhanced Transaction Processing Service
 * Includes comprehensive validation and error handling to prevent inventory deduction issues
 */
export class EnhancedTransactionService {

  /**
   * Process a complete transaction with full validation and inventory integration
   */
  static async processTransaction(request: EnhancedTransactionRequest): Promise<TransactionResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let transactionId: string | null = null;
    let receiptNumber: string | null = null;

    try {
      console.log('🚀 Starting enhanced transaction processing:', request);

      // Phase 1: Pre-transaction validation
      console.log('🔍 Phase 1: Pre-transaction validation...');
      const validationResult = await TransactionValidationService.performPreTransactionCheck(
        request.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity
        })),
        request.storeId
      );

      if (!validationResult.canProceed) {
        return {
          success: false,
          errors: validationResult.blockers,
          warnings: validationResult.warnings,
          validationsPassed: false,
          inventoryUpdated: false
        };
      }

      warnings.push(...validationResult.warnings);

      // Phase 2: Generate receipt number
      const receiptNum = await this.generateReceiptNumber();
      receiptNumber = receiptNum;

      // Phase 3: Create transaction record
      console.log('📝 Phase 3: Creating transaction record...');
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          store_id: request.storeId,
          customer_id: request.customerId,
          payment_method: request.paymentMethod,
          subtotal: request.subtotal,
          tax: request.tax,
          discount: request.discount,
          total: request.total,
          receipt_number: receiptNumber,
          status: 'completed',
          items: JSON.stringify(request.items),
          shift_id: null,
          user_id: request.cashierId || null
        })
        .select('id')
        .single();

      if (transactionError) {
        throw new Error(`Transaction creation failed: ${transactionError.message}`);
      }

      transactionId = transaction.id;

      // Phase 4: Create transaction items
      console.log('📦 Phase 4: Creating transaction items...');
      const transactionItems = request.items.map(item => ({
        transaction_id: transactionId!,
        product_id: item.productId,
        name: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.totalPrice
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) {
        throw new Error(`Transaction items creation failed: ${itemsError.message}`);
      }

      // Phase 5: Process inventory deduction
      console.log('🔄 Phase 5: Processing inventory deduction...');
      const inventorySuccess = await handleTransactionInventoryUpdate(
        transactionId,
        request.items.map(item => ({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity
        })),
        request.storeId
      );

      if (!inventorySuccess) {
        console.warn('⚠️ Inventory deduction failed - transaction created but inventory not updated');
        warnings.push('Transaction completed but inventory deduction failed');
        
        // Log this as a critical error for monitoring
        await this.logCriticalError('inventory_deduction_failed', {
          transactionId,
          receiptNumber,
          storeId: request.storeId,
          items: request.items
        });
      }

      // Phase 6: Log transaction completion
      console.log('📊 Phase 6: Logging transaction...');
      await this.logTransactionCompletion(transactionId, request.storeId, inventorySuccess);

      const result: TransactionResult = {
        success: true,
        transactionId,
        receiptNumber,
        errors,
        warnings,
        validationsPassed: true,
        inventoryUpdated: inventorySuccess
      };

      console.log('✅ Enhanced transaction processing completed:', result);

      if (inventorySuccess) {
        toast.success(`Transaction completed successfully! Receipt: ${receiptNumber}`);
      } else {
        toast.warning(`Transaction completed with inventory warnings. Receipt: ${receiptNumber}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Enhanced transaction processing failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);

      // Attempt transaction rollback if transaction was created
      if (transactionId) {
        await this.rollbackTransaction(transactionId);
      }

      toast.error(`Transaction failed: ${errorMsg}`);

      return {
        success: false,
        transactionId: transactionId || undefined,
        receiptNumber: receiptNumber || undefined,
        errors,
        warnings,
        validationsPassed: false,
        inventoryUpdated: false
      };
    }
  }

  /**
   * Generate enhanced receipt number with better uniqueness
   */
  private static async generateReceiptNumber(): Promise<string> {
    const now = new Date();
    const dateString = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeString = now.getHours().toString().padStart(2, '0') + 
                     now.getMinutes().toString().padStart(2, '0') + 
                     now.getSeconds().toString().padStart(2, '0');
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `${dateString}-${randomString}-${timeString}`;
  }

  /**
   * Log critical errors for monitoring and alerting
   */
  private static async logCriticalError(errorType: string, context: any): Promise<void> {
    try {
      // Log critical error to console and could integrate with external monitoring
      console.error('🚨 CRITICAL ERROR LOGGED:', {
        errorType,
        context,
        timestamp: new Date().toISOString(),
        severity: 'critical'
      });
    } catch (logError) {
      console.error('Exception logging critical error:', logError);
    }
  }

  /**
   * Log transaction completion for auditing
   */
  private static async logTransactionCompletion(
    transactionId: string, 
    storeId: string, 
    inventoryUpdated: boolean
  ): Promise<void> {
    try {
      // This could integrate with existing audit logging systems
      console.log('📊 Transaction completion logged:', {
        transactionId,
        storeId,
        inventoryUpdated,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log transaction completion:', error);
    }
  }

  /**
   * Rollback transaction in case of failure
   */
  private static async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      console.log('🔄 Rolling back transaction:', transactionId);
      
      // Delete transaction items
      await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', transactionId);

      // Mark transaction as failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transactionId);

      console.log('✅ Transaction rollback completed');
    } catch (error) {
      console.error('❌ Transaction rollback failed:', error);
    }
  }

  /**
   * Validate and fix transaction before processing (auto-healing)
   */
  static async validateAndFixBeforeProcessing(
    request: EnhancedTransactionRequest
  ): Promise<{
    canProceed: boolean;
    fixedIssues: string[];
    remainingBlockers: string[];
    warnings: string[];
  }> {
    const fixedIssues: string[] = [];
    const remainingBlockers: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('🔧 Auto-healing transaction validation...');

      // Attempt validation with auto-fix
      const validationResult = await TransactionValidationService.validateAndFixTransaction(
        request.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity
        })),
        request.storeId,
        true // Enable auto-fix
      );

      fixedIssues.push(...validationResult.fixesApplied);

      if (!validationResult.canProceed) {
        remainingBlockers.push(...validationResult.validationResult.errors);
      }

      warnings.push(...validationResult.validationResult.warnings);

      return {
        canProceed: validationResult.canProceed,
        fixedIssues,
        remainingBlockers,
        warnings
      };
    } catch (error) {
      console.error('❌ Auto-healing validation failed:', error);
      return {
        canProceed: false,
        fixedIssues,
        remainingBlockers: [error instanceof Error ? error.message : 'Validation failed'],
        warnings
      };
    }
  }

  /**
   * Get transaction processing health status
   */
  static async getProcessingHealthStatus(storeId: string): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
    lastChecked: string;
  }> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check recent transaction processing success rate
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('status')
        .eq('store_id', storeId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      if (recentTransactions && recentTransactions.length > 0) {
        const failedCount = recentTransactions.filter(t => t.status === 'failed').length;
        const failureRate = failedCount / recentTransactions.length;

        if (failureRate > 0.05) { // More than 5% failure rate
          issues.push(`High transaction failure rate: ${(failureRate * 100).toFixed(1)}%`);
          recommendations.push('Investigate recent transaction failures');
        }
      }

      // Check product synchronization health
      const syncValidation = await TransactionValidationService.performPreTransactionCheck(
        [], // Empty items to just check store readiness
        storeId
      );

      if (!syncValidation.canProceed) {
        issues.push(...syncValidation.blockers);
        recommendations.push(...syncValidation.recommendations);
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        recommendations,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Health status check failed:', error);
      return {
        isHealthy: false,
        issues: ['Health check failed'],
        recommendations: ['Contact system administrator'],
        lastChecked: new Date().toISOString()
      };
    }
  }
}