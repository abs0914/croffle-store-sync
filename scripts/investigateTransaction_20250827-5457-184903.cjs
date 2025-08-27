#!/usr/bin/env node

/**
 * Transaction Investigation: #20250827-5457-184903
 * 
 * Comprehensive analysis of transaction from Robinsons North store
 * to verify inventory deduction functionality after Phase 1 & 2 fixes
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Target transaction details
const TARGET_TRANSACTION_ID = '20250827-5457-184903';
const TARGET_STORE = 'Robinsons North';

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

async function main() {
  console.log('🔍 TRANSACTION INVESTIGATION REPORT');
  console.log('=' .repeat(80));
  console.log(`Transaction ID: ${TARGET_TRANSACTION_ID}`);
  console.log(`Store: ${TARGET_STORE}`);
  console.log(`Investigation Date: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(80));
  
  const investigation = {
    transactionDetails: null,
    transactionItems: [],
    productAnalysis: [],
    inventoryAnalysis: [],
    deductionStatus: null,
    overallAssessment: null,
    recommendations: []
  };

  try {
    // Step 1: Verify Transaction Details
    console.log('\n📋 STEP 1: TRANSACTION VERIFICATION');
    console.log('-'.repeat(50));
    
    await verifyTransactionDetails(investigation);
    
    // Step 2: Analyze Product Ingredient Mappings
    console.log('\n🧪 STEP 2: INGREDIENT MAPPING ANALYSIS');
    console.log('-'.repeat(50));
    
    await analyzeProductMappings(investigation);
    
    // Step 3: Test Inventory Deduction
    console.log('\n📦 STEP 3: INVENTORY DEDUCTION ANALYSIS');
    console.log('-'.repeat(50));
    
    await analyzeInventoryDeduction(investigation);
    
    // Step 4: Generate Comprehensive Assessment
    console.log('\n🎯 STEP 4: COMPREHENSIVE ASSESSMENT');
    console.log('-'.repeat(50));
    
    generateComprehensiveAssessment(investigation);
    
    // Step 5: Provide Recommendations
    console.log('\n💡 STEP 5: RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    generateRecommendations(investigation);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    
    // Provide manual analysis framework
    console.log('\n📊 MANUAL INVESTIGATION FRAMEWORK');
    console.log('-'.repeat(50));
    
    generateManualInvestigationGuide();
  }
}

async function verifyTransactionDetails(investigation) {
  try {
    // Search for the transaction
    const transactions = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transactions?select=*&receipt_number=eq.${TARGET_TRANSACTION_ID}`,
      method: 'GET',
      headers
    });
    
    if (transactions.length === 0) {
      console.log('❌ TRANSACTION NOT FOUND');
      console.log(`   Transaction ${TARGET_TRANSACTION_ID} does not exist in the database`);
      console.log('   This could indicate:');
      console.log('   1. Transaction ID is incorrect');
      console.log('   2. Transaction was not properly recorded');
      console.log('   3. Database connectivity issues');
      
      investigation.transactionDetails = null;
      investigation.overallAssessment = 'TRANSACTION_NOT_FOUND';
      return;
    }
    
    const transaction = transactions[0];
    investigation.transactionDetails = transaction;
    
    console.log('✅ TRANSACTION FOUND');
    console.log(`   Transaction ID: ${transaction.id}`);
    console.log(`   Receipt Number: ${transaction.receipt_number}`);
    console.log(`   Store ID: ${transaction.store_id}`);
    console.log(`   Total Amount: ₱${transaction.total}`);
    console.log(`   Payment Method: ${transaction.payment_method}`);
    console.log(`   Created: ${new Date(transaction.created_at).toLocaleString()}`);
    console.log(`   Status: ${transaction.status || 'Completed'}`);
    
    // Get transaction items
    const transactionItems = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transaction.id}`,
      method: 'GET',
      headers
    });
    
    investigation.transactionItems = transactionItems;
    
    console.log(`\n📦 TRANSACTION ITEMS (${transactionItems.length}):`);
    transactionItems.forEach((item, i) => {
      console.log(`   ${i + 1}. Product ID: ${item.product_id}`);
      console.log(`      Product Name: ${item.product_name || 'Not specified'}`);
      console.log(`      Quantity: ${item.quantity}`);
      console.log(`      Unit Price: ₱${item.unit_price}`);
      console.log(`      Total: ₱${item.total_price}`);
    });
    
    // Verify store information
    const stores = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/stores?select=*&id=eq.${transaction.store_id}`,
      method: 'GET',
      headers
    });
    
    if (stores.length > 0) {
      const store = stores[0];
      console.log(`\n🏪 STORE VERIFICATION:`);
      console.log(`   Store Name: ${store.name}`);
      console.log(`   Store ID: ${store.id}`);
      console.log(`   Active: ${store.is_active ? 'Yes' : 'No'}`);
      
      if (store.name.toLowerCase().includes('robinsons') && store.name.toLowerCase().includes('north')) {
        console.log(`   ✅ Store matches expected: ${TARGET_STORE}`);
      } else {
        console.log(`   ⚠️  Store name mismatch: Expected "${TARGET_STORE}", got "${store.name}"`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Transaction verification failed: ${error.message}`);
    investigation.transactionDetails = { error: error.message };
  }
}

async function analyzeProductMappings(investigation) {
  if (!investigation.transactionDetails || !investigation.transactionItems.length) {
    console.log('⚠️  Cannot analyze mappings - transaction details unavailable');
    return;
  }
  
  console.log('Analyzing ingredient mappings for each product...');
  
  for (const item of investigation.transactionItems) {
    try {
      console.log(`\n🔍 ANALYZING: ${item.product_name || `Product ID ${item.product_id}`}`);
      
      // Get product details
      const productDetails = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?select=*&id=eq.${item.product_id}`,
        method: 'GET',
        headers
      });
      
      if (productDetails.length === 0) {
        console.log('   ❌ Product not found in catalog');
        investigation.productAnalysis.push({
          productId: item.product_id,
          productName: item.product_name,
          status: 'PRODUCT_NOT_FOUND',
          mappings: 0,
          expectedMappings: 0
        });
        continue;
      }
      
      const product = productDetails[0];
      console.log(`   Product: ${product.product_name}`);
      console.log(`   Price: ₱${product.price}`);
      console.log(`   Recipe ID: ${product.recipe_id || 'None'}`);
      
      if (!product.recipe_id) {
        console.log('   ⚠️  No recipe - ingredient mapping not required');
        investigation.productAnalysis.push({
          productId: item.product_id,
          productName: product.product_name,
          status: 'NO_RECIPE_REQUIRED',
          mappings: 0,
          expectedMappings: 0
        });
        continue;
      }
      
      // Get recipe ingredients
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      console.log(`   Recipe ingredients: ${recipeIngredients.length}`);
      
      // Get product ingredient mappings
      const mappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${product.id}`,
        method: 'GET',
        headers
      });
      
      console.log(`   Ingredient mappings: ${mappings.length}`);
      
      // Analyze mapping completeness
      const mappingAnalysis = {
        productId: item.product_id,
        productName: product.product_name,
        productPrice: product.price,
        recipeId: product.recipe_id,
        expectedMappings: recipeIngredients.length,
        actualMappings: mappings.length,
        mappingDetails: [],
        status: 'UNKNOWN'
      };
      
      // Check each mapping
      mappings.forEach((mapping, i) => {
        const inventory = mapping.inventory_item;
        console.log(`     ${i + 1}. ${inventory ? inventory.item : 'MISSING INVENTORY'}`);
        console.log(`        Required: ${mapping.required_quantity} ${mapping.unit}`);
        console.log(`        Available: ${inventory ? inventory.stock_quantity : 'N/A'} ${inventory ? inventory.unit : ''}`);
        
        mappingAnalysis.mappingDetails.push({
          inventoryItem: inventory ? inventory.item : null,
          requiredQuantity: mapping.required_quantity,
          availableQuantity: inventory ? inventory.stock_quantity : 0,
          sufficient: inventory ? inventory.stock_quantity >= mapping.required_quantity : false
        });
      });
      
      // Determine status
      if (mappings.length === 0) {
        mappingAnalysis.status = 'NO_MAPPINGS';
        console.log('   ❌ NO INGREDIENT MAPPINGS FOUND');
      } else if (mappings.length < recipeIngredients.length) {
        mappingAnalysis.status = 'INCOMPLETE_MAPPINGS';
        console.log(`   ⚠️  INCOMPLETE MAPPINGS: ${mappings.length}/${recipeIngredients.length}`);
      } else if (mappings.length === recipeIngredients.length) {
        const allSufficient = mappingAnalysis.mappingDetails.every(m => m.sufficient);
        mappingAnalysis.status = allSufficient ? 'COMPLETE_AND_SUFFICIENT' : 'COMPLETE_BUT_INSUFFICIENT_STOCK';
        console.log(`   ✅ COMPLETE MAPPINGS: ${allSufficient ? 'All stock sufficient' : 'Some stock insufficient'}`);
      }
      
      investigation.productAnalysis.push(mappingAnalysis);
      
    } catch (error) {
      console.log(`   ❌ Error analyzing product: ${error.message}`);
      investigation.productAnalysis.push({
        productId: item.product_id,
        productName: item.product_name,
        status: 'ANALYSIS_ERROR',
        error: error.message
      });
    }
  }
}

async function analyzeInventoryDeduction(investigation) {
  if (!investigation.transactionDetails) {
    console.log('⚠️  Cannot analyze inventory deduction - transaction details unavailable');
    return;
  }
  
  console.log('Analyzing inventory deduction for transaction...');
  
  const deductionAnalysis = {
    transactionId: investigation.transactionDetails.id,
    transactionTime: investigation.transactionDetails.created_at,
    deductionAttempted: false,
    deductionSuccessful: false,
    syncLogs: [],
    inventoryChanges: [],
    issues: []
  };
  
  try {
    // Check for inventory sync logs
    const syncLogs = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_sync_logs?select=*&transaction_id=eq.${investigation.transactionDetails.id}&order=created_at.desc`,
      method: 'GET',
      headers
    });
    
    if (syncLogs.length > 0) {
      console.log(`✅ INVENTORY SYNC LOGS FOUND: ${syncLogs.length}`);
      deductionAnalysis.deductionAttempted = true;
      deductionAnalysis.syncLogs = syncLogs;
      
      syncLogs.forEach((log, i) => {
        console.log(`   ${i + 1}. Status: ${log.sync_status}`);
        console.log(`      Time: ${new Date(log.created_at).toLocaleString()}`);
        console.log(`      Details: ${log.sync_details || 'None'}`);
        if (log.error_details) {
          console.log(`      Error: ${log.error_details}`);
          deductionAnalysis.issues.push(log.error_details);
        }
      });
      
      const successfulLogs = syncLogs.filter(log => log.sync_status === 'success');
      deductionAnalysis.deductionSuccessful = successfulLogs.length > 0;
      
    } else {
      console.log('⚠️  NO INVENTORY SYNC LOGS FOUND');
      console.log('   This could indicate:');
      console.log('   1. Inventory deduction was not attempted');
      console.log('   2. Sync logging is not implemented');
      console.log('   3. Deduction service is not working');
      deductionAnalysis.deductionAttempted = false;
    }
    
    // Analyze current inventory levels vs expected
    console.log('\n📊 INVENTORY LEVEL ANALYSIS:');
    
    for (const productAnalysis of investigation.productAnalysis) {
      if (productAnalysis.status === 'COMPLETE_AND_SUFFICIENT' || productAnalysis.status === 'COMPLETE_BUT_INSUFFICIENT_STOCK') {
        console.log(`\n   Product: ${productAnalysis.productName}`);
        
        productAnalysis.mappingDetails.forEach(mapping => {
          if (mapping.inventoryItem) {
            const transactionItem = investigation.transactionItems.find(item => item.product_id === productAnalysis.productId);
            const quantityPurchased = transactionItem ? transactionItem.quantity : 1;
            const expectedDeduction = mapping.requiredQuantity * quantityPurchased;
            
            console.log(`     ${mapping.inventoryItem}:`);
            console.log(`       Current Stock: ${mapping.availableQuantity}`);
            console.log(`       Expected Deduction: ${expectedDeduction} (${mapping.requiredQuantity} × ${quantityPurchased})`);
            
            deductionAnalysis.inventoryChanges.push({
              inventoryItem: mapping.inventoryItem,
              currentStock: mapping.availableQuantity,
              expectedDeduction: expectedDeduction,
              productName: productAnalysis.productName
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.log(`❌ Inventory deduction analysis failed: ${error.message}`);
    deductionAnalysis.issues.push(`Analysis error: ${error.message}`);
  }
  
  investigation.deductionStatus = deductionAnalysis;
}

function generateComprehensiveAssessment(investigation) {
  console.log('Generating comprehensive assessment...');
  
  let overallStatus = 'UNKNOWN';
  let statusEmoji = '❓';
  
  // Determine overall status based on analysis
  if (!investigation.transactionDetails) {
    overallStatus = 'TRANSACTION_NOT_FOUND';
    statusEmoji = '❌';
  } else if (investigation.productAnalysis.length === 0) {
    overallStatus = 'NO_PRODUCTS_TO_ANALYZE';
    statusEmoji = '⚠️';
  } else {
    const completeProducts = investigation.productAnalysis.filter(p => 
      p.status === 'COMPLETE_AND_SUFFICIENT' || p.status === 'COMPLETE_BUT_INSUFFICIENT_STOCK'
    ).length;
    
    const totalProducts = investigation.productAnalysis.filter(p => 
      p.status !== 'NO_RECIPE_REQUIRED'
    ).length;
    
    if (completeProducts === totalProducts && totalProducts > 0) {
      overallStatus = 'INVENTORY_DEDUCTION_FUNCTIONAL';
      statusEmoji = '✅';
    } else if (completeProducts > 0) {
      overallStatus = 'PARTIALLY_FUNCTIONAL';
      statusEmoji = '⚠️';
    } else {
      overallStatus = 'INVENTORY_DEDUCTION_BROKEN';
      statusEmoji = '❌';
    }
  }
  
  investigation.overallAssessment = overallStatus;
  
  console.log(`${statusEmoji} OVERALL ASSESSMENT: ${overallStatus.replace('_', ' ')}`);
  
  // Detailed assessment
  if (investigation.transactionDetails) {
    console.log(`\n📊 TRANSACTION SUMMARY:`);
    console.log(`   Transaction Amount: ₱${investigation.transactionDetails.total}`);
    console.log(`   Products in Transaction: ${investigation.transactionItems.length}`);
    console.log(`   Products Requiring Mappings: ${investigation.productAnalysis.filter(p => p.status !== 'NO_RECIPE_REQUIRED').length}`);
    
    const mappingStats = investigation.productAnalysis.reduce((stats, product) => {
      switch (product.status) {
        case 'COMPLETE_AND_SUFFICIENT':
          stats.fullyFunctional++;
          break;
        case 'COMPLETE_BUT_INSUFFICIENT_STOCK':
          stats.mappedButLowStock++;
          break;
        case 'INCOMPLETE_MAPPINGS':
          stats.partiallyMapped++;
          break;
        case 'NO_MAPPINGS':
          stats.notMapped++;
          break;
      }
      return stats;
    }, { fullyFunctional: 0, mappedButLowStock: 0, partiallyMapped: 0, notMapped: 0 });
    
    console.log(`\n📈 MAPPING STATUS BREAKDOWN:`);
    console.log(`   ✅ Fully Functional: ${mappingStats.fullyFunctional} products`);
    console.log(`   ⚠️  Mapped but Low Stock: ${mappingStats.mappedButLowStock} products`);
    console.log(`   🔄 Partially Mapped: ${mappingStats.partiallyMapped} products`);
    console.log(`   ❌ Not Mapped: ${mappingStats.notMapped} products`);
  }
}

function generateRecommendations(investigation) {
  const recommendations = [];
  
  if (investigation.overallAssessment === 'TRANSACTION_NOT_FOUND') {
    recommendations.push('🔍 Verify transaction ID and check database connectivity');
    recommendations.push('📋 Confirm transaction was properly recorded in the system');
  } else if (investigation.overallAssessment === 'INVENTORY_DEDUCTION_FUNCTIONAL') {
    recommendations.push('✅ Transaction demonstrates successful inventory synchronization');
    recommendations.push('📊 Use this as a model for testing other fixed products');
    recommendations.push('🔄 Continue monitoring for consistent performance');
  } else if (investigation.overallAssessment === 'PARTIALLY_FUNCTIONAL') {
    recommendations.push('🔧 Complete ingredient mappings for remaining products');
    recommendations.push('📦 Address inventory stock level issues');
    recommendations.push('🧪 Test inventory deduction after fixes');
  } else if (investigation.overallAssessment === 'INVENTORY_DEDUCTION_BROKEN') {
    recommendations.push('🚨 Apply systematic ingredient mapping fixes to these products');
    recommendations.push('🔧 Use Phase 1 & 2 methodology to create complete mappings');
    recommendations.push('📊 Prioritize based on product value and frequency');
  }
  
  // Specific product recommendations
  investigation.productAnalysis.forEach(product => {
    if (product.status === 'NO_MAPPINGS') {
      recommendations.push(`🔧 Create ingredient mappings for ${product.productName}`);
    } else if (product.status === 'INCOMPLETE_MAPPINGS') {
      recommendations.push(`📋 Complete remaining ${product.expectedMappings - product.actualMappings} mappings for ${product.productName}`);
    } else if (product.status === 'COMPLETE_BUT_INSUFFICIENT_STOCK') {
      recommendations.push(`📦 Restock inventory items for ${product.productName}`);
    }
  });
  
  investigation.recommendations = recommendations;
  
  console.log('Based on investigation findings:');
  recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
}

function generateManualInvestigationGuide() {
  console.log('Manual investigation steps to perform:');
  console.log('');
  console.log('1. 📋 TRANSACTION VERIFICATION:');
  console.log('   - Search for transaction in database by receipt number');
  console.log('   - Verify transaction details (date, amount, store)');
  console.log('   - Check transaction items and product IDs');
  console.log('');
  console.log('2. 🧪 INGREDIENT MAPPING CHECK:');
  console.log('   - For each product, check if recipe_id exists');
  console.log('   - Count recipe_ingredients for each product');
  console.log('   - Count product_ingredients mappings');
  console.log('   - Verify inventory_stock items exist and are active');
  console.log('');
  console.log('3. 📦 INVENTORY DEDUCTION ANALYSIS:');
  console.log('   - Check for inventory_sync_logs related to transaction');
  console.log('   - Compare current stock levels with expected levels');
  console.log('   - Look for error messages or failed deduction attempts');
  console.log('');
  console.log('4. 🎯 ASSESSMENT AND RECOMMENDATIONS:');
  console.log('   - Determine if transaction represents fixed or unfixed products');
  console.log('   - Identify specific issues preventing inventory deduction');
  console.log('   - Provide targeted recommendations for resolution');
}

main();
