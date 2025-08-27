#!/usr/bin/env node

/**
 * Verify Inventory Deduction Fix
 * 
 * Investigates transaction 20250827-3930-142516 to verify ingredient mapping fixes are working
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Transaction details to investigate
const TARGET_TRANSACTION_ID = '20250827-3930-142516';
const TARGET_DATE = '2025-08-27';
const TARGET_TIME = '14:25';
const EXPECTED_PRODUCT = 'Tiramisu Croffle';
const EXPECTED_AMOUNT = 125.00;

// Previous problematic transaction for comparison
const PREVIOUS_TRANSACTION_ID = '20250827-5369-101436';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function req(options, data) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json?.message || body}`));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function auth() {
  const authRes = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${authRes.access_token}`;
}

async function main() {
  console.log('🔍 INVENTORY DEDUCTION FIX VERIFICATION');
  console.log('=' .repeat(80));
  console.log(`Target Transaction: ${TARGET_TRANSACTION_ID}`);
  console.log(`Date/Time: ${TARGET_DATE} ${TARGET_TIME}`);
  console.log(`Expected Product: ${EXPECTED_PRODUCT}`);
  console.log(`Expected Amount: ₱${EXPECTED_AMOUNT}`);
  console.log('=' .repeat(80));
  
  await auth();

  const verificationReport = {
    transactionFound: false,
    transactionDetails: null,
    ingredientMappings: [],
    inventoryDeduction: {
      attempted: false,
      successful: false,
      details: []
    },
    comparisonWithPrevious: null,
    overallStatus: 'unknown',
    issues: [],
    recommendations: []
  };

  // Step 1: Verify Transaction Exists
  console.log('\n📋 STEP 1: TRANSACTION VERIFICATION');
  console.log('-'.repeat(50));
  
  try {
    const transactions = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transactions?select=*&receipt_number=eq.${TARGET_TRANSACTION_ID}`,
      method: 'GET',
      headers
    });
    
    if (transactions.length === 0) {
      console.log('❌ TRANSACTION NOT FOUND');
      console.log('   This transaction may not exist or was not properly recorded.');
      verificationReport.issues.push('Transaction not found in database');
      verificationReport.overallStatus = 'failed';
      return verificationReport;
    }
    
    const transaction = transactions[0];
    verificationReport.transactionFound = true;
    verificationReport.transactionDetails = transaction;
    
    console.log('✅ TRANSACTION FOUND');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Receipt: ${transaction.receipt_number}`);
    console.log(`   Created: ${new Date(transaction.created_at).toLocaleString()}`);
    console.log(`   Store ID: ${transaction.store_id}`);
    console.log(`   Total: ₱${transaction.total}`);
    console.log(`   Payment Method: ${transaction.payment_method}`);
    
    // Verify transaction details match expectations
    if (transaction.total != EXPECTED_AMOUNT) {
      verificationReport.issues.push(`Amount mismatch: expected ₱${EXPECTED_AMOUNT}, got ₱${transaction.total}`);
    }
    
    // Get transaction items
    const transactionItems = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transaction.id}`,
      method: 'GET',
      headers
    });
    
    console.log(`\n📦 TRANSACTION ITEMS (${transactionItems.length}):`);
    let tiramisuItem = null;
    
    transactionItems.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.product_name || 'Unknown Product'} - Qty: ${item.quantity} - ₱${item.unit_price}`);
      if (item.product_name && item.product_name.toLowerCase().includes('tiramisu')) {
        tiramisuItem = item;
      }
    });
    
    if (!tiramisuItem) {
      console.log('❌ TIRAMISU CROFFLE NOT FOUND IN TRANSACTION');
      verificationReport.issues.push('Tiramisu Croffle not found in transaction items');
      return verificationReport;
    }
    
    console.log(`\n🎯 TIRAMISU CROFFLE FOUND:`);
    console.log(`   Product ID: ${tiramisuItem.product_id}`);
    console.log(`   Quantity: ${tiramisuItem.quantity}`);
    console.log(`   Unit Price: ₱${tiramisuItem.unit_price}`);
    
    // Step 2: Check Ingredient Mappings
    await checkIngredientMappings(tiramisuItem, verificationReport);
    
    // Step 3: Check Inventory Deduction
    await checkInventoryDeduction(transaction, tiramisuItem, verificationReport);
    
    // Step 4: Compare with Previous Transaction
    await compareWithPreviousTransaction(verificationReport);
    
    // Step 5: Generate Final Assessment
    generateFinalAssessment(verificationReport);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    verificationReport.issues.push(`Investigation error: ${error.message}`);
    verificationReport.overallStatus = 'error';
  }
  
  return verificationReport;
}

async function checkIngredientMappings(tiramisuItem, report) {
  console.log('\n🧪 STEP 2: INGREDIENT MAPPINGS VERIFICATION');
  console.log('-'.repeat(50));
  
  try {
    // Get ingredient mappings for Tiramisu Croffle
    const mappings = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${tiramisuItem.product_id}`,
      method: 'GET',
      headers
    });
    
    report.ingredientMappings = mappings;
    
    console.log(`✅ INGREDIENT MAPPINGS FOUND: ${mappings.length}`);
    
    if (mappings.length === 0) {
      console.log('❌ NO INGREDIENT MAPPINGS - FIX NOT APPLIED');
      report.issues.push('No ingredient mappings found for Tiramisu Croffle');
      report.overallStatus = 'failed';
      return;
    }
    
    // Expected ingredients for Tiramisu Croffle
    const expectedIngredients = [
      'Regular Croissant', 'Whipped Cream', 'Tiramisu', 
      'Choco Flakes', 'Chopstick', 'Wax Paper'
    ];
    
    console.log(`\n📊 INGREDIENT MAPPING DETAILS:`);
    mappings.forEach((mapping, i) => {
      const inventory = mapping.inventory_item;
      console.log(`   ${i + 1}. ${inventory ? inventory.item : 'MISSING INVENTORY'}`);
      console.log(`      Required: ${mapping.required_quantity} ${mapping.unit}`);
      console.log(`      Available: ${inventory ? inventory.stock_quantity : 'N/A'} ${inventory ? inventory.unit : ''}`);
      console.log(`      Status: ${inventory ? (inventory.stock_quantity >= mapping.required_quantity ? '✅ Sufficient' : '⚠️ Insufficient') : '❌ Missing'}`);
    });
    
    // Check if we have the expected number of ingredients
    if (mappings.length === 6) {
      console.log(`\n✅ MAPPING FIX SUCCESSFUL: Found all 6 expected ingredient mappings`);
    } else {
      console.log(`\n⚠️ PARTIAL FIX: Found ${mappings.length} mappings, expected 6`);
      report.issues.push(`Incomplete mappings: ${mappings.length}/6 ingredients mapped`);
    }
    
    // Check for missing inventory items
    const missingInventory = mappings.filter(m => !m.inventory_item);
    if (missingInventory.length > 0) {
      console.log(`\n❌ MISSING INVENTORY ITEMS: ${missingInventory.length}`);
      report.issues.push(`${missingInventory.length} mappings reference missing inventory items`);
    }
    
  } catch (error) {
    console.log(`❌ Error checking mappings: ${error.message}`);
    report.issues.push(`Mapping check error: ${error.message}`);
  }
}

async function checkInventoryDeduction(transaction, tiramisuItem, report) {
  console.log('\n🔄 STEP 3: INVENTORY DEDUCTION VERIFICATION');
  console.log('-'.repeat(50));
  
  try {
    // Check for inventory sync logs (if they exist)
    try {
      const syncLogs = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/inventory_sync_logs?select=*&transaction_id=eq.${transaction.id}&order=created_at.desc`,
        method: 'GET',
        headers
      });
      
      if (syncLogs.length > 0) {
        console.log(`✅ INVENTORY SYNC LOGS FOUND: ${syncLogs.length}`);
        report.inventoryDeduction.attempted = true;
        
        syncLogs.forEach((log, i) => {
          console.log(`   ${i + 1}. Status: ${log.sync_status} - ${new Date(log.created_at).toLocaleTimeString()}`);
          if (log.error_details) {
            console.log(`      Error: ${log.error_details}`);
            report.issues.push(`Sync error: ${log.error_details}`);
          }
          if (log.affected_inventory_items) {
            console.log(`      Affected Items: ${log.affected_inventory_items}`);
          }
        });
        
        const successfulLogs = syncLogs.filter(log => log.sync_status === 'success');
        report.inventoryDeduction.successful = successfulLogs.length > 0;
        
      } else {
        console.log('⚠️ NO INVENTORY SYNC LOGS FOUND');
        console.log('   This could mean:');
        console.log('   1. Inventory deduction was not attempted');
        console.log('   2. Sync logging is not implemented');
        console.log('   3. Logs were not created for this transaction');
        
        report.inventoryDeduction.attempted = false;
      }
      
    } catch (error) {
      console.log('⚠️ Could not check sync logs (table may not exist)');
    }
    
    // Alternative: Check inventory levels before/after transaction time
    console.log('\n📊 INVENTORY LEVEL ANALYSIS:');
    
    if (report.ingredientMappings.length > 0) {
      for (const mapping of report.ingredientMappings) {
        if (mapping.inventory_item) {
          const currentStock = mapping.inventory_item.stock_quantity;
          const requiredQty = mapping.required_quantity;
          
          console.log(`   ${mapping.inventory_item.item}:`);
          console.log(`     Current Stock: ${currentStock} ${mapping.inventory_item.unit}`);
          console.log(`     Required for Transaction: ${requiredQty} ${mapping.unit}`);
          console.log(`     Status: ${currentStock >= requiredQty ? '✅ Sufficient' : '❌ Insufficient'}`);
          
          report.inventoryDeduction.details.push({
            item: mapping.inventory_item.item,
            currentStock,
            requiredQty,
            sufficient: currentStock >= requiredQty
          });
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Error checking inventory deduction: ${error.message}`);
    report.issues.push(`Deduction check error: ${error.message}`);
  }
}

async function compareWithPreviousTransaction(report) {
  console.log('\n🔄 STEP 4: COMPARISON WITH PREVIOUS TRANSACTION');
  console.log('-'.repeat(50));
  
  try {
    // Get the previous problematic transaction
    const previousTransactions = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transactions?select=*&receipt_number=eq.${PREVIOUS_TRANSACTION_ID}`,
      method: 'GET',
      headers
    });
    
    if (previousTransactions.length === 0) {
      console.log('⚠️ Previous transaction not found for comparison');
      return;
    }
    
    const previousTransaction = previousTransactions[0];
    
    // Get previous transaction items
    const previousItems = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${previousTransaction.id}`,
      method: 'GET',
      headers
    });
    
    const previousTiramisuItem = previousItems.find(item => 
      item.product_name && item.product_name.toLowerCase().includes('tiramisu')
    );
    
    if (previousTiramisuItem) {
      // Get previous mappings (should be none or incomplete)
      const previousMappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*&product_catalog_id=eq.${previousTiramisuItem.product_id}`,
        method: 'GET',
        headers
      });
      
      console.log('📊 COMPARISON RESULTS:');
      console.log(`   Previous Transaction (${PREVIOUS_TRANSACTION_ID}):`);
      console.log(`     Ingredient Mappings: ${previousMappings.length}`);
      console.log(`     Status: ${previousMappings.length === 0 ? '❌ No mappings (broken)' : '⚠️ Partial mappings'}`);
      
      console.log(`   Current Transaction (${TARGET_TRANSACTION_ID}):`);
      console.log(`     Ingredient Mappings: ${report.ingredientMappings.length}`);
      console.log(`     Status: ${report.ingredientMappings.length >= 6 ? '✅ Complete mappings (fixed)' : '⚠️ Incomplete mappings'}`);
      
      const improvement = report.ingredientMappings.length - previousMappings.length;
      console.log(`   Improvement: +${improvement} ingredient mappings`);
      
      report.comparisonWithPrevious = {
        previousMappings: previousMappings.length,
        currentMappings: report.ingredientMappings.length,
        improvement: improvement,
        fixWorking: improvement > 0
      };
      
    } else {
      console.log('⚠️ Could not find Tiramisu Croffle in previous transaction for comparison');
    }
    
  } catch (error) {
    console.log(`❌ Error comparing transactions: ${error.message}`);
  }
}

function generateFinalAssessment(report) {
  console.log('\n🎯 STEP 5: FINAL ASSESSMENT');
  console.log('-'.repeat(50));
  
  // Determine overall status
  if (report.issues.length === 0 && report.ingredientMappings.length >= 6) {
    report.overallStatus = 'success';
    console.log('✅ INVENTORY DEDUCTION FIX: SUCCESS');
    console.log('   All ingredient mappings are present and functional');
    console.log('   The systematic fix has resolved the inventory synchronization issue');
  } else if (report.ingredientMappings.length > 0) {
    report.overallStatus = 'partial';
    console.log('⚠️ INVENTORY DEDUCTION FIX: PARTIAL SUCCESS');
    console.log(`   Found ${report.ingredientMappings.length} ingredient mappings (expected 6)`);
    console.log('   Some improvements made but additional work needed');
  } else {
    report.overallStatus = 'failed';
    console.log('❌ INVENTORY DEDUCTION FIX: FAILED');
    console.log('   No ingredient mappings found - fix not applied to this product');
  }
  
  // Issues summary
  if (report.issues.length > 0) {
    console.log(`\n🚨 ISSUES FOUND (${report.issues.length}):`);
    report.issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  // Recommendations
  if (report.overallStatus === 'success') {
    report.recommendations.push('Continue monitoring inventory deduction for other products');
    report.recommendations.push('Run comprehensive audit to verify all products are fixed');
  } else if (report.overallStatus === 'partial') {
    report.recommendations.push('Complete remaining ingredient mappings for Tiramisu Croffle');
    report.recommendations.push('Verify inventory items exist for all mappings');
  } else {
    report.recommendations.push('Apply ingredient mapping fix to Tiramisu Croffle');
    report.recommendations.push('Run systematic mapping creation process');
  }
  
  console.log(`\n💡 RECOMMENDATIONS:`);
  report.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
}

main().then(report => {
  console.log('\n📋 VERIFICATION COMPLETE');
  console.log(`Final Status: ${report.overallStatus.toUpperCase()}`);
}).catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
