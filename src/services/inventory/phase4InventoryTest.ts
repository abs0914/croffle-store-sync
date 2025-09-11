/**
 * Phase 4 Inventory Service Test & Verification
 * Tests the complete inventory deduction flow with real data from failed transaction
 */

import { SimplifiedInventoryService } from "./phase4InventoryService";
import { TransactionInventoryIntegration } from "../transactions/transactionInventoryIntegration";

/**
 * Test data from the failed transaction #20250911-8198-142040
 */
const FAILED_TRANSACTION_ITEMS = [
  { productId: 'a37947b5-eadf-4d09-a23f-55a2414389ab', productName: 'Bottled Water', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: '48df620d-ea20-4198-98ff-5d2f94ffc775', productName: 'Cafe Latte Iced', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: '4e41111d-d228-48af-affc-90903a301cc8', productName: 'Caramel Latte Iced', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: '51273336-a060-4826-818f-04a9eed02097', productName: 'Glaze Croffle', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: '6a219611-0973-4245-9576-6efa0dcea3d9', productName: 'Iced Tea', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: 'ea3e2298-c799-4f51-9557-fb8a307af246', productName: 'Matcha Croffle', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: 'dc87d6c4-5739-4834-9aeb-4069c2730f61', productName: 'Strawberry Croffle', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: '8710e0ed-f31d-43d6-bfbf-6c3b67cbd856', productName: 'Strawberry Kiss Blended', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' },
  { productId: '31f10d67-42c9-4c50-88a8-039ec51893a2', productName: 'Tiramisu Croffle', quantity: 1, storeId: '9c35a9b4-b4f2-415b-8c54-26dcf57b7c22' }
];

export class Phase4InventoryTester {
  
  /**
   * Test the complete inventory flow with the exact data from the failed transaction
   */
  static async testInventoryDeductionFlow(): Promise<void> {
    console.log('🧪 PHASE 4 TEST: Starting inventory deduction flow test');
    console.log('🧪 PHASE 4 TEST: Using data from failed transaction #20250911-8198-142040');
    
    const testTransactionId = `test_${Date.now()}`;
    
    try {
      // Step 1: Test Pre-Transaction Validation
      console.log('📋 PHASE 4 TEST: Step 1 - Pre-transaction validation');
      await TransactionInventoryIntegration.validateTransactionInventory(
        testTransactionId,
        FAILED_TRANSACTION_ITEMS
      );
      console.log('✅ PHASE 4 TEST: Pre-transaction validation passed');
      
      // Step 2: Test Inventory Deduction
      console.log('🔄 PHASE 4 TEST: Step 2 - Inventory deduction');
      await TransactionInventoryIntegration.processTransactionInventory(
        testTransactionId,
        FAILED_TRANSACTION_ITEMS
      );
      console.log('✅ PHASE 4 TEST: Inventory deduction completed successfully');
      
      console.log('🎉 PHASE 4 TEST: ALL TESTS PASSED - System is working correctly!');
      return;
      
    } catch (error) {
      console.error('❌ PHASE 4 TEST: Test failed:', error);
      throw error;
    }
  }
  
  /**
   * Test individual validation for debugging
   */
  static async testValidationOnly(): Promise<any> {
    console.log('🔍 PHASE 4 TEST: Testing validation only');
    
    try {
      const result = await SimplifiedInventoryService.validateInventoryAvailability(FAILED_TRANSACTION_ITEMS);
      
      console.log('📊 PHASE 4 TEST: Validation result:', {
        canProceed: result.canProceed,
        errors: result.errors.length,
        warnings: result.warnings.length,
        insufficientItems: result.insufficientItems.length
      });
      
      if (result.errors.length > 0) {
        console.error('❌ PHASE 4 TEST: Validation errors:', result.errors);
      }
      
      if (result.warnings.length > 0) {
        console.warn('⚠️ PHASE 4 TEST: Validation warnings:', result.warnings);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ PHASE 4 TEST: Validation test failed:', error);
      throw error;
    }
  }
  
  /**
   * Test deduction only (assumes validation passed)
   */
  static async testDeductionOnly(): Promise<any> {
    console.log('⚡ PHASE 4 TEST: Testing deduction only');
    
    const testTransactionId = `test_deduction_${Date.now()}`;
    
    try {
      const result = await SimplifiedInventoryService.performInventoryDeduction(
        testTransactionId,
        FAILED_TRANSACTION_ITEMS
      );
      
      console.log('📊 PHASE 4 TEST: Deduction result:', {
        success: result.success,
        deductedItems: result.deductedItems.length,
        errors: result.errors.length,
        warnings: result.warnings.length
      });
      
      if (result.success) {
        console.log('✅ PHASE 4 TEST: Deduction successful, deducted items:', result.deductedItems);
      } else {
        console.error('❌ PHASE 4 TEST: Deduction failed:', result.errors);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ PHASE 4 TEST: Deduction test failed:', error);
      throw error;
    }
  }
}

// Expose the test functions globally for console testing
if (typeof window !== 'undefined') {
  (window as any).Phase4InventoryTester = Phase4InventoryTester;
  
  console.log('🧪 PHASE 4 TEST: Test functions available in console:');
  console.log('   Phase4InventoryTester.testInventoryDeductionFlow()');
  console.log('   Phase4InventoryTester.testValidationOnly()');
  console.log('   Phase4InventoryTester.testDeductionOnly()');
}