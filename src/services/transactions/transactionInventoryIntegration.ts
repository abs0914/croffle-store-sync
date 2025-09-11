/**
 * Transaction-Inventory Integration Service
 * Ensures Phase 4 Inventory Service is properly called during checkout
 */

import { SimplifiedInventoryService } from "@/services/inventory/phase4InventoryService";
import { toast } from "sonner";

interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  storeId: string;
}

/**
 * CRITICAL: Inventory Integration for Transactions
 * This service MUST be called during ALL transaction processing
 */
export class TransactionInventoryIntegration {
  
  /**
   * Pre-transaction validation
   * BLOCKS transaction if inventory is insufficient
   */
  static async validateTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<void> {
    console.log('🔒 TRANSACTION VALIDATION: Starting mandatory inventory check');
    console.log('🔒 TRANSACTION VALIDATION: Items to validate:', items);
    
    try {
      // MANDATORY: Call Phase 4 validation
      const validationResult = await SimplifiedInventoryService.validateInventoryAvailability(items);
      
      if (!validationResult.canProceed) {
        console.error('🚨 TRANSACTION BLOCKED: Inventory validation failed', validationResult.errors);
        toast.error(`Transaction blocked: ${validationResult.errors[0]}`);
        throw new Error(`Inventory validation failed: ${validationResult.errors.join(', ')}`);
      }
      
      if (validationResult.warnings.length > 0) {
        console.warn('⚠️ TRANSACTION WARNINGS:', validationResult.warnings);
        validationResult.warnings.forEach(warning => {
          toast.warning(warning);
        });
      }
      
      console.log('✅ TRANSACTION VALIDATION: Inventory check passed');
      
    } catch (error) {
      console.error('❌ TRANSACTION VALIDATION: Critical failure', error);
      throw error; // Re-throw to block transaction
    }
  }
  
  /**
   * Post-transaction inventory deduction
   * MUST be called after successful payment processing
   */
  static async processTransactionInventory(
    transactionId: string,
    items: TransactionItem[]
  ): Promise<void> {
    console.log('🔄 TRANSACTION PROCESSING: Starting inventory deduction');
    console.log('🔄 TRANSACTION PROCESSING: Transaction ID:', transactionId);
    console.log('🔄 TRANSACTION PROCESSING: Items to deduct:', items);
    
    try {
      // MANDATORY: Call Phase 4 deduction
      const deductionResult = await SimplifiedInventoryService.performInventoryDeduction(
        transactionId,
        items
      );
      
      if (!deductionResult.success) {
        console.error('🚨 INVENTORY DEDUCTION FAILED:', deductionResult.errors);
        toast.error('Critical: Inventory deduction failed - manual intervention required');
        
        // Create audit trail for failed deduction
        await this.logInventoryDeductionFailure(transactionId, items, deductionResult.errors);
        
        throw new Error(`Inventory deduction failed: ${deductionResult.errors.join(', ')}`);
      }
      
      console.log('✅ TRANSACTION PROCESSING: Inventory deduction completed successfully');
      console.log('✅ TRANSACTION PROCESSING: Deducted items:', deductionResult.deductedItems);
      
      // Success notification
      toast.success(`Inventory updated for ${deductionResult.deductedItems.length} ingredients`);
      
    } catch (error) {
      console.error('❌ TRANSACTION PROCESSING: Critical inventory failure', error);
      throw error; // Re-throw to trigger transaction rollback if possible
    }
  }
  
  /**
   * Emergency inventory audit for failed transaction
   */
  private static async logInventoryDeductionFailure(
    transactionId: string,
    items: TransactionItem[],
    errors: string[]
  ): Promise<void> {
    try {
      console.error('🚨 CRITICAL: Logging inventory deduction failure', {
        transactionId,
        itemCount: items.length,
        errors,
        timestamp: new Date().toISOString()
      });
      
      // Could integrate with audit system here
      // For now, console logging is sufficient for debugging
      
    } catch (auditError) {
      console.error('❌ Failed to log inventory deduction failure:', auditError);
    }
  }
  
  /**
   * Helper method to convert transaction data to inventory format
   */
  static formatItemsForInventory(
    transactionItems: any[],
    storeId: string
  ): TransactionItem[] {
    return transactionItems.map(item => ({
      productId: item.productId || item.id,
      productName: item.productName || item.name,
      quantity: item.quantity,
      storeId: storeId
    }));
  }
}