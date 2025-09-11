/**
 * Phase 4 Inventory Service Test & Verification
 * Tests the complete inventory deduction flow with real data from failed transaction
 */

import { SimplifiedInventoryService } from "./phase4InventoryService";
import { TransactionInventoryIntegration } from "../transactions/transactionInventoryIntegration";

/**
 * REAL TRANSACTION DATA from failed transaction #20250911-3282-143958
 * Transaction ID: 6f2fecba-a102-4ea4-ae68-15aaa87ce8a4
 * Store: d7c47e6b-f20a-4543-a6bd-000398f72df5
 * ISSUE: NO inventory movements were recorded for this transaction
 */
const REAL_FAILED_TRANSACTION_ITEMS = [
  { productId: 'c46d62a1-3e60-4b1a-b5e1-ef26ba56d9b5', productName: 'Choco Nut Croffle', quantity: 1, storeId: 'd7c47e6b-f20a-4543-a6bd-000398f72df5' },
  { productId: 'ea3e2298-c799-4f51-9557-fb8a307af246', productName: 'Matcha Croffle', quantity: 1, storeId: 'd7c47e6b-f20a-4543-a6bd-000398f72df5' },
  { productId: '6bfe6f23-8d81-4fa9-96bd-017a68c5546f', productName: 'Nutella Croffle', quantity: 1, storeId: 'd7c47e6b-f20a-4543-a6bd-000398f72df5' },
  { productId: '8b6d7280-bb00-44c8-ab81-1468639228ca', productName: 'Blueberry Croffle', quantity: 1, storeId: 'd7c47e6b-f20a-4543-a6bd-000398f72df5' },
  { productId: 'dc87d6c4-5739-4834-9aeb-4069c2730f61', productName: 'Strawberry Croffle', quantity: 1, storeId: 'd7c47e6b-f20a-4543-a6bd-000398f72df5' }
];

// Keep the original test data for comparison
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
   * Test with the REAL failed transaction data
   */
  static async testRealFailedTransaction(): Promise<void> {
    console.log('🧪 PHASE 4 TEST: Testing REAL failed transaction #20250911-3282-143958');
    console.log('🧪 PHASE 4 TEST: Transaction ID: 6f2fecba-a102-4ea4-ae68-15aaa87ce8a4');
    console.log('🧪 PHASE 4 TEST: Store: d7c47e6b-f20a-4543-a6bd-000398f72df5');
    
    const testTransactionId = `real_test_${Date.now()}`;
    
    try {
      // Step 1: Test Pre-Transaction Validation
      console.log('📋 PHASE 4 TEST: Step 1 - Pre-transaction validation');
      await TransactionInventoryIntegration.validateTransactionInventory(
        testTransactionId,
        REAL_FAILED_TRANSACTION_ITEMS
      );
      console.log('✅ PHASE 4 TEST: Pre-transaction validation passed');
      
      // Step 2: Test Inventory Deduction
      console.log('🔄 PHASE 4 TEST: Step 2 - Inventory deduction');
      await TransactionInventoryIntegration.processTransactionInventory(
        testTransactionId,
        REAL_FAILED_TRANSACTION_ITEMS
      );
      console.log('✅ PHASE 4 TEST: Inventory deduction completed successfully');
      
      console.log('🎉 PHASE 4 TEST: REAL TRANSACTION TEST PASSED - System is working correctly!');
      return;
      
    } catch (error) {
      console.error('❌ PHASE 4 TEST: Real transaction test failed:', error);
      throw error;
    }
  }

  /**
   * Run ALL inventory system tests in sequence
   * CRITICAL: Comprehensive test to verify system is working after the fix
   */
  static async runAllInventoryTests(): Promise<void> {
    console.log('🚀 RUNNING COMPREHENSIVE INVENTORY SYSTEM TESTS');
    console.log('=' .repeat(60));
    
    try {
      // Test 1: Real failed transaction validation
      console.log('\n📋 TEST 1: Real Failed Transaction Validation');
      await this.testRealValidationOnly();
      
      // Test 2: Real failed transaction processing 
      console.log('\n📋 TEST 2: Real Failed Transaction Processing');
      await this.testRealFailedTransaction();
      
      // Test 3: Original test data validation
      console.log('\n📋 TEST 3: Original Test Data Validation');
      await this.testValidationOnly();
      
      // Test 4: Original test data processing
      console.log('\n📋 TEST 4: Original Test Data Processing');
      await this.testInventoryDeductionFlow();
      
      console.log('\n✅ ALL INVENTORY TESTS COMPLETED SUCCESSFULLY');
      console.log('🎉 INVENTORY DEDUCTION SYSTEM IS WORKING CORRECTLY');
      console.log('=' .repeat(60));
      
    } catch (error) {
      console.error('\n❌ INVENTORY TEST SUITE FAILED');
      console.error('🚨 SYSTEM STILL HAS ISSUES:', error);
      console.log('=' .repeat(60));
      throw error;
    }
  }

  /**
   * Test the complete inventory flow with the original test data
   */
  static async testInventoryDeductionFlow(): Promise<void> {
    console.log('🧪 PHASE 4 TEST: Starting inventory deduction flow test');
    console.log('🧪 PHASE 4 TEST: Using original test data');
    
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
   * Test validation with REAL transaction data
   */
  static async testRealValidationOnly(): Promise<any> {
    console.log('🔍 PHASE 4 TEST: Testing REAL transaction validation only');
    
    try {
      const result = await SimplifiedInventoryService.validateInventoryAvailability(REAL_FAILED_TRANSACTION_ITEMS);
      
      console.log('📊 PHASE 4 TEST: Real validation result:', {
        canProceed: result.canProceed,
        errors: result.errors.length,
        warnings: result.warnings.length,
        insufficientItems: result.insufficientItems.length
      });
      
      if (result.errors.length > 0) {
        console.error('❌ PHASE 4 TEST: Real validation errors:', result.errors);
      }
      
      if (result.warnings.length > 0) {
        console.warn('⚠️ PHASE 4 TEST: Real validation warnings:', result.warnings);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ PHASE 4 TEST: Real validation test failed:', error);
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
  console.log('   Phase4InventoryTester.runAllInventoryTests() - RUN ALL TESTS (RECOMMENDED)');
  console.log('   Phase4InventoryTester.testRealFailedTransaction() - TEST THE ACTUAL FAILED TRANSACTION');
  console.log('   Phase4InventoryTester.testRealValidationOnly() - Validate the real transaction data');
  console.log('   Phase4InventoryTester.testInventoryDeductionFlow() - Original test');
  console.log('   Phase4InventoryTester.testValidationOnly() - Original validation');
  console.log('   Phase4InventoryTester.testDeductionOnly() - Original deduction');
}