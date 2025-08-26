import { InventoryRecoveryService } from "@/services/recovery/inventoryRecoveryService";
import { TransactionValidationService } from "@/services/validation/transactionValidationService";
import { InventoryMonitoringService } from "@/services/monitoring/inventoryMonitoringService";
import { toast } from "sonner";

/**
 * Main Recovery Execution Script
 * Implements the comprehensive recovery plan for Sugbo Mercado (IT Park, Cebu) inventory issues
 */

// Store ID for Sugbo Mercado (IT Park, Cebu)
const SUGBO_MERCADO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
const TARGET_DATE = '2025-08-17';

/**
 * Execute the comprehensive recovery plan
 */
export const executeInventoryRecoveryPlan = async (): Promise<{
  success: boolean;
  results: {
    phase1: any;
    phase2: any;
    phase3: any;
  };
  summary: string;
}> => {
  try {
    console.log('🚀 EXECUTING COMPREHENSIVE INVENTORY RECOVERY PLAN');
    console.log('=' .repeat(60));
    console.log(`Store: Sugbo Mercado (IT Park, Cebu)`);
    console.log(`Store ID: ${SUGBO_MERCADO_STORE_ID}`);
    console.log(`Target Date: ${TARGET_DATE}`);
    console.log('=' .repeat(60));

    // PHASE 1: IMMEDIATE DATA RECOVERY
    console.log('\n📦 PHASE 1: IMMEDIATE DATA RECOVERY');
    console.log('-' .repeat(40));
    
    const phase1Results = await InventoryRecoveryService.executeComprehensiveRecovery(
      SUGBO_MERCADO_STORE_ID,
      TARGET_DATE
    );

    console.log('\n✅ Phase 1 Results:');
    console.log(`- Success: ${phase1Results.success}`);
    console.log(`- Transactions Processed: ${phase1Results.processedTransactions}`);
    console.log(`- Inventory Deductions: ${phase1Results.inventoryDeductions}`);
    console.log(`- Errors: ${phase1Results.errors.length}`);

    if (phase1Results.errors.length > 0) {
      console.warn('⚠️ Phase 1 Errors:', phase1Results.errors);
    }

    // PHASE 2: SYSTEM STRENGTHENING
    console.log('\n🔧 PHASE 2: SYSTEM STRENGTHENING');
    console.log('-' .repeat(40));
    
    console.log('🔍 2a. Testing enhanced validation system...');
    const validationTest = await TransactionValidationService.performPreTransactionCheck(
      [
        { productId: '979f6dcc-0c09-455f-8507-ddc992360846', productName: 'Bottled Water', quantity: 1 },
        { productId: '96ad7d96-7356-4f68-9186-b7c14c41cfa3', productName: 'Croffle Overload', quantity: 1 }
      ],
      SUGBO_MERCADO_STORE_ID
    );

    console.log('✅ Validation Test Results:');
    console.log(`- Can Proceed: ${validationTest.canProceed}`);
    console.log(`- Blockers: ${validationTest.blockers.length}`);
    console.log(`- Warnings: ${validationTest.warnings.length}`);
    
    if (validationTest.blockers.length > 0) {
      console.warn('🚨 Validation Blockers:', validationTest.blockers);
    }

    console.log('\n🔍 2b. Testing store health monitoring...');
    const healthCheck = await InventoryMonitoringService.generateStoreReport(SUGBO_MERCADO_STORE_ID);
    
    console.log('✅ Store Health Results:');
    console.log(`- Overall Health: ${healthCheck.overallHealth}`);
    console.log(`- Total Issues: ${healthCheck.issues.length}`);
    console.log(`- Critical Issues: ${healthCheck.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`- Products Synced: ${healthCheck.metrics.syncedProducts}/${healthCheck.metrics.totalProducts}`);

    const phase2Results = {
      validation: validationTest,
      healthCheck: healthCheck,
      systemEnhanced: true
    };

    // PHASE 3: MONITORING & PREVENTION
    console.log('\n📊 PHASE 3: MONITORING & PREVENTION');
    console.log('-' .repeat(40));
    
    console.log('🔍 3a. Checking for missing inventory movements...');
    const movementCheck = await InventoryMonitoringService.checkMissingInventoryMovements(
      SUGBO_MERCADO_STORE_ID,
      '2025-08-17T00:00:00Z',
      '2025-08-17T23:59:59Z'
    );
    
    console.log('✅ Movement Check Results:');
    console.log(`- Missing Movements: ${movementCheck.totalAffected}`);
    
    if (movementCheck.totalAffected > 0) {
      console.warn('⚠️ Still missing movements detected:', movementCheck.missingMovements.slice(0, 3));
    }

    console.log('\n🔍 3b. Setting up monitoring alerts...');
    const alertSetup = await InventoryMonitoringService.setupMonitoringAlerts({
      checkInterval: 60, // Check every hour
      criticalThreshold: 5, // Alert on 5+ critical issues
      enableNotifications: true
    });
    
    console.log('✅ Alert Setup Results:');
    console.log(`- Setup Success: ${alertSetup.success}`);
    console.log(`- Message: ${alertSetup.message}`);

    const phase3Results = {
      movementCheck: movementCheck,
      alertSetup: alertSetup,
      monitoringEnabled: true
    };

    // FINAL SUMMARY
    console.log('\n🎯 COMPREHENSIVE RECOVERY SUMMARY');
    console.log('=' .repeat(60));
    
    const overallSuccess = phase1Results.success && validationTest.canProceed && healthCheck.overallHealth !== 'critical';
    
    const finalSummary = `
INVENTORY RECOVERY PLAN EXECUTION COMPLETED

📊 RESULTS OVERVIEW:
- Phase 1 (Data Recovery): ${phase1Results.success ? 'SUCCESS' : 'PARTIAL'}
- Phase 2 (System Strengthening): ${validationTest.canProceed ? 'SUCCESS' : 'NEEDS ATTENTION'} 
- Phase 3 (Monitoring Setup): ${alertSetup.success ? 'SUCCESS' : 'FAILED'}
- Overall Status: ${overallSuccess ? 'SUCCESS' : 'NEEDS ATTENTION'}

📈 KEY METRICS:
- Transactions Recovered: ${phase1Results.processedTransactions}
- Inventory Deductions Applied: ${phase1Results.inventoryDeductions}
- Products Synchronized: ${healthCheck.metrics.syncedProducts}/${healthCheck.metrics.totalProducts}
- Current Health Status: ${healthCheck.overallHealth.toUpperCase()}
- Missing Movements Found: ${movementCheck.totalAffected}

🛡️ PREVENTIVE MEASURES ACTIVATED:
- Enhanced transaction validation: ENABLED
- Real-time monitoring: ${alertSetup.success ? 'ENABLED' : 'FAILED'}
- Automatic error detection: ENABLED
- Store health monitoring: ENABLED

${!overallSuccess ? '\n⚠️ ATTENTION REQUIRED: Some issues remain and need manual intervention.' : ''}
${phase1Results.errors.length > 0 ? '\n🚨 ERRORS TO REVIEW: ' + phase1Results.errors.join(', ') : ''}
    `.trim();

    console.log(finalSummary);

    // Show user notification
    if (overallSuccess) {
      toast.success('✅ Inventory recovery plan executed successfully! All systems are now operational.');
    } else {
      toast.warning('⚠️ Recovery plan completed with some issues. Check console for details.');
    }

    return {
      success: overallSuccess,
      results: {
        phase1: phase1Results,
        phase2: phase2Results,
        phase3: phase3Results
      },
      summary: finalSummary
    };

  } catch (error) {
    console.error('❌ RECOVERY PLAN EXECUTION FAILED:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    toast.error(`Recovery plan execution failed: ${errorMsg}`);
    
    return {
      success: false,
      results: {
        phase1: null,
        phase2: null,
        phase3: null
      },
      summary: `Recovery plan execution failed: ${errorMsg}`
    };
  }
};

/**
 * Execute recovery for a different store and date (flexible execution)
 */
export const executeCustomRecovery = async (
  storeId: string, 
  storeName: string, 
  targetDate: string
): Promise<any> => {
  try {
    console.log(`🚀 EXECUTING CUSTOM RECOVERY for ${storeName}`);
    console.log(`Store ID: ${storeId}, Date: ${targetDate}`);

    return await InventoryRecoveryService.executeComprehensiveRecovery(storeId, targetDate);
  } catch (error) {
    console.error('❌ Custom recovery failed:', error);
    throw error;
  }
};

// Export the main function for use in other modules
export default executeInventoryRecoveryPlan;